# Peta petak A3 — the printed lot maps

Makes the A3 sheets the estate prints and puts on the wall: one per block, and one with the
whole estate. First made for Paitan on 13 Nov 2026 (Yu Chen: "I need each block with A3 size
printing and the whole estate in one A3 size printing for estate use").

It reads the estate's own survey shapefiles, the same files the app's lot outlines come from.
Nothing is traced and nothing is invented: the hectares and palm counts printed on the sheet
are the ones in `lists/lots.js`, and the outlines are the survey.

## What it needs

The shapefiles, in one folder (set `SRC` at the top of `shp.py`):

- `BLOCK 01 PTN.shp` + `.dbf` + `.prj` — one per block (lot outlines, with Id, HA, PALM)
- `ROAD BLOCK 01 PTN.shp` + `.dbf` — one per block (the road lines)
- `HOUSING PTN.shp` + `.dbf` — buildings

Christy keeps them. For Paitan they are in `SHA & PELITA JUJUR FILE/SHA`. They are in
Web Mercator; `shp.py` turns them into WGS84 lon/lat.

Each lot's centre point comes from `lists/lots.js`, so the number is printed inside its own lot.

## Running it

    python3 -I sheets.py            # writes out/*.html and prints the job list
    node pdf.js "$(python3 -I sheets.py | tail -1)"   # turns them into out/*.pdf

Print at 100%, never "fit to page", or the scale bar is wrong.

## For another estate

Change `SRC`, the block codes in `BLK`, and the `sheet(...)` lines at the bottom of `sheets.py`.
The map area in mm is the third-last argument; give a long block a short map height and more
table columns, a tall block a portrait sheet.
