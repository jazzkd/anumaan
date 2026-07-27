/**
 * Bounds check for the generated deck.
 *
 *   npm run pptx:check [file]
 *
 * pptxgenjs positions in inches and will happily place a shape past the edge of
 * the canvas without complaining — which is exactly how the whole deck ended up
 * off-slide when the layout was set to LAYOUT_16x9 (10 × 5.625in) while the
 * coordinates assumed LAYOUT_WIDE (13.333 × 7.5in). Same aspect ratio, so it
 * looked plausible right up until someone opened it.
 *
 * This walks every shape's position and extent and reports anything crossing
 * the slide edge, so that failure is caught by a command rather than by a judge.
 */

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const EMU = 914400;
const file =
  process.argv[2] ??
  (existsSync("submission/Anumaan-latest.pptx")
    ? "submission/Anumaan-latest.pptx"
    : "submission/Anumaan.pptx");

if (!existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

// A .pptx is a zip; unpack it with the platform's own tooling rather than
// pulling in a dependency for one check.
const dir = mkdtempSync(join(tmpdir(), "pptxcheck-"));
const zipCopy = join(dir, "deck.zip");
execFileSync("node", [
  "-e",
  `require('fs').copyFileSync(${JSON.stringify(file)}, ${JSON.stringify(zipCopy)})`,
]);
execFileSync("powershell", [
  "-NoProfile",
  "-Command",
  `Expand-Archive -LiteralPath '${zipCopy}' -DestinationPath '${dir}' -Force`,
]);

const slideDir = join(dir, "ppt", "slides");
const pres = readFileSync(join(dir, "ppt", "presentation.xml"), "utf8");
const size = pres.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
const W = Number(size?.[1] ?? 0);
const H = Number(size?.[2] ?? 0);

console.log(`\n${file}`);
console.log(`slide canvas: ${(W / EMU).toFixed(3)}in × ${(H / EMU).toFixed(3)}in\n`);

let problems = 0;
const files = readdirSync(slideDir)
  .filter((f) => f.endsWith(".xml"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

for (const f of files) {
  const xml = readFileSync(join(slideDir, f), "utf8");
  const boxes = [
    ...xml.matchAll(
      /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g
    ),
  ];

  const over = boxes
    .map(([, x, y, cx, cy]) => ({
      right: Number(x) + Number(cx),
      bottom: Number(y) + Number(cy),
      x: Number(x),
      y: Number(y),
    }))
    .filter(
      (b) => b.right > W + 9144 || b.bottom > H + 9144 || b.x < -9144 || b.y < -9144
    );

  if (over.length === 0) {
    console.log(`  ok    ${f.padEnd(12)} ${boxes.length} shapes, all within bounds`);
  } else {
    problems += over.length;
    console.log(`  BLEED ${f.padEnd(12)} ${over.length} of ${boxes.length} shapes off-canvas`);
    for (const b of over.slice(0, 4)) {
      console.log(
        `          right ${(b.right / EMU).toFixed(2)}in (max ${(W / EMU).toFixed(2)})` +
          `  bottom ${(b.bottom / EMU).toFixed(2)}in (max ${(H / EMU).toFixed(2)})`
      );
    }
  }
}

console.log(
  problems === 0
    ? "\nNo overflow. Every shape sits inside the slide.\n"
    : `\n${problems} shape(s) cross the slide edge.\n`
);
process.exitCode = problems === 0 ? 0 : 1;
