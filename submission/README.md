# Submission materials

## `deck.html` — 8-slide submission deck

Eight because that is the submission limit.

Open it in a browser. Arrow keys, space, or click to advance; `Home`/`End` jump
to the ends.

It uses the product's own Modernist tokens — Archivo, `#ec3013` on `#f3f2f2`,
zero radius, no gradients — so the deck and the thing it describes read as one
piece of work. The forecast chart is CSS rectangles rather than a chart library,
so nothing fetches at presentation time except the typeface.


## `Anumaan.pptx` — the file to upload

A genuine PowerPoint file, not a PDF renamed. Every element is a real shape or
text box, so it opens, edits and presents in PowerPoint, Keynote or Google
Slides.

Regenerate after any change with:

```bash
npm run pptx
```

Headings are set in **Arial Black**, not the product's Archivo. Archivo is not
installed on this machine and almost certainly not on a judge's either, and a
`.pptx` naming a missing font substitutes something arbitrary at open time —
a worse outcome than picking a close substitute deliberately. Arial Black is
heavy and geometric, and present on Windows, macOS and Google Slides. The
identity here comes from the flat shapes and the single accent more than the
letterforms.

`deck.html` is still the better thing to *present* from — exact type, hover
states, and the progress bar. Use the `.pptx` for the upload.

### Exporting to PDF (from `deck.html`)

Most submission portals want a PDF or PPT. To produce one:

1. Open `deck.html` in Chrome
2. `Ctrl+P`
3. **Destination:** Save as PDF
4. **Layout:** Landscape
5. **More settings → Background graphics: ON** *(required — without it the two
   red slides print as white type on white paper)*
6. Save

Each slide is laid out as its own 1600×900 page, so the export is one slide per
page with no manual pagination.

If the portal specifically demands `.pptx`, import the PDF into PowerPoint or
Google Slides (File → Import slides) — the layout survives, since every slide is
a fixed-size page.

## Slide order

| # | Slide | The point it makes |
|---|---|---|
| 1 | Title | The one-sentence claim |
| 2 | Problem + gap | A restaurant on memory; incumbents digitise recording, not deciding |
| 3 | What is built | Three surfaces, one source of truth |
| 4 | It notices before anyone asks | **The differentiator** — propose, approve, log |
| 5 | Guardrails are code | The 3/3 prompt-compliance finding |
| 6 | The model narrates | Forecast is arithmetic; the measured quota reversal |
| 7 | Evidence + scope | 16 eval cases, 13/0/3, and what was cut |
| 8 | Try it | Three things to attempt live |

**Slides 4 and 5 carry the argument.** Everything else is context for them — if
you are cut short, protect those two.

Three slides were merged to reach the limit: the problem with the competitive
gap, honesty with the architecture findings, and the eval results with the scope
cuts. Nothing was dropped outright.

## See also

- `TALKTRACK.md` — how to explain the forecast, the agent and the guardrails in
  plain language, plus the questions worth being ready for
- `RUNSHEET.md` — the one-screen timing card for while you are presenting
- `../DEMO.md` — the full six-minute script with reasoning
- `../README.md` — full technical write-up
