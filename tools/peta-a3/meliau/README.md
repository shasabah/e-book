# Meliau lot map — DRAFT (19 Nov 2026), not in the app

Traced from Christy's `LA3_LotsByBlock_BlackWhite.pdf` (Pi X Ventures, drone 2 Jul 2022), a picture, not a
survey file. Position from the grid labels on each page, tied to the overview map's own map position
(`LA3_OvervieweMap_MeliauEstate.pdf`, GeoPDF). Each lot = the area inside its blue outline, grown to the middle
of the line.

`meliau_lots_draft.json`: blocks 02–05, lot numbers (top-left, across then down, 120 m rows), the map's own Ha and
palms, the traced Ha, outline (WGS84 lon/lat) and a centre point inside the lot.
- Labelled lots: traced Ha within 6% of the map's Ha (most within 3%).
- Lots with no label on the map (the drawing program hides labels that would overlap): Ha measured, palms
  unknown (`ha: null`). Not guessed.
- 5-19 (0.50 Ha, 72 palms) and 5-20 (0.15 Ha, 22 palms): on the map but too thin to trace.
- Blocks 01 and 06: not done. Many hidden labels (about 750 and 1,090 palms) and lots cut by the river near the
  ramp. Needs the source file from Christy / Pi X Ventures, or a walk with Ramnah.

Numbers are NOT agreed. Nothing here goes into `lists/lots.js` until Yu Chen and Ramnah agree the numbers
(Rule 10: brief first). g2–g5.json = which traced pieces make each lot (page, region ids).
