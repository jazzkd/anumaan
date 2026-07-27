# Submission materials

## `deck.html` — 11-slide submission deck

Open it in a browser. Arrow keys, space, or click to advance; `Home`/`End` jump
to the ends.

It uses the product's own Modernist tokens — Archivo, `#ec3013` on `#f3f2f2`,
zero radius, no gradients — so the deck and the thing it describes read as one
piece of work. The forecast chart is CSS rectangles rather than a chart library,
so nothing fetches at presentation time except the typeface.

### Exporting to PDF

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
| 2 | The problem | A restaurant running on memory |
| 3 | The gap | Incumbents digitise recording, not deciding |
| 4 | What is built | Three surfaces, one source of truth |
| 5 | Propose → approve → log | **The differentiator** |
| 6 | Guardrails are code | The 3/3 prompt-compliance finding |
| 7 | The model narrates | Forecast is arithmetic, grounding is architectural |
| 8 | Architecture | Decisions and why, including the LLM quota reversal |
| 9 | Evidence | 16 eval cases, 13/0/3 |
| 10 | Scope | What was cut, what never was |
| 11 | Try it | Three things to attempt live |

Slides 5 and 6 are the ones to slow down on. Everything else is context for
them.

## See also

- `../DEMO.md` — the timed six-minute live demo script
- `../README.md` — full technical write-up
