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
- Blocks 01 and 06 (added the same day, Yu Chen: "block 1 and 6 is missing"): every outline traced; labels matched
  only where the map is clear. Block 01: 15 of 22 labels placed, 9 lots with no label, 7 labels not yet matched
  (2.55/362, 2.75/350, 1.83/222, 2.25/288, 2.17/295, 3.44/410, 0.92/105). Block 06: 26 of 28 placed, 4 lots with
  no label, 2 not matched (0.39/49, a thin strip not drawn; 0.72/106). Block 06's north half from page 5, south
  half from page 1, checked for no overlap.

Numbers are NOT agreed. Nothing here goes into `lists/lots.js` until Yu Chen and Ramnah agree the numbers
(Rule 10: brief first). g2–g5.json = which traced pieces make each lot (page, region ids).

## Second pass, 19 Nov (Yu Chen: "try trace the map again and anywhere to fill up the gap")
Palms counted from the big drone map (BlockMap LA1, 6 pages A1): every healthy or abnormal palm is a drawn
circle; the circles inside each traced lot were counted (palms.py, count.py; tune.py set the circle size per page).
Checked on the labelled lots: the count is within about 5% of the label on average. Overplanted palms are not
drawn on that map, so a count is low where there is overplanting (Block 01 has 496).
- Lots with no label now carry `est` = counted palms (shown as "≈" on the sheets). Not a label value.
- 1-13 = 2.17 Ha / 295 and 1-18 = 0.92 Ha / 105, matched by size and count (`matched`).
- Still not matched: Block 01 2.55/362, 2.75/350, 1.83/222, 2.25/288, 3.44/410; Block 06 0.39/49, 0.72/106.

## Third pass, 19 Nov: BlockMap(LA1)_Meliau_13092023.pdf (Drive, 7 pages)
The same drone map as the second pass, a clearer copy (page 1 is there twice). No lot labels in it. Counts redone
(count_v2.py): median error against the labelled lots 2-4% per page. `est` updated. Suggestions only, not filled:
1-5 = 2.75/350, 1-10 = 2.25/288.

## Cross-check, 19 Nov (hectares by block against crop)
Block 01 is NOT complete: about 13 Ha inside the block outline has no traced lot (gaps01.json), because the lot
lines there do not close on the picture (the map also draws "Land Use" outlines in the same blue). The five
unmatched Block 01 labels add to 12.82 Ha. Crop Jan-18 Nov 2026 by block (tonnage book split) / land-list Ha:
B1 737.00/53.00=13.9, B2 657.34/43.97=15.0, B3 495.88/41.95=11.8, B4 776.20/39.74=19.5, B5 578.43/41.28=14.0,
B6 819.86/60.72=13.5 MT/Ha; estate 14.5.

## Gap fill, 19 Nov 12:30 (Yu Chen: "is that anywhere to close the gap for map? can you add for me")
Block 01 east cluster settled by palm counts and the label pointers: the ring + lens = 3.44/410 (counted 412 on
3.52 Ha); blob + triangle = 2.25/288, two parts; the strip between the lens and the long road lot = 0.92/105 (lower
edge uncertain; the earlier match of 0.92 to the triangle is withdrawn); 1-5 = 2.75/350; a west lot with no label
added (1.87 Ha, about 83 palms counted). Block 01 lots renumbered (26). Lots now cover 43.0 of 53.0 Ha; about 4 Ha
along the south boundary is outside every lot line (not a lot). Still unmatched: 2.55/362, 1.83/222.

## Position check, 19 Nov evening (Yu Chen: "cross check again meliau map error")
Each lot-map page was 20-45 m off from the roads drawn on the overview GeoPDF (my reading of the printed grid
labels, not the drawing). Matched each page to the overview roads (chamfer.py): mean distance to road fell from
14-19 m to 5-12 m. Shifts (m east, m north): p1 -28,-30; p2 -24,-17; p3 -19,+4; p4 -20,-28; p5 -18,-40 (page_fit.json).
All lot outlines and centre points moved by their page shift. Palm counts unchanged (counted in the map frame).
Result: the "4 Ha not a lot" strip in Block 01 was this error and is gone; blocks now covered 92-93%.
Still outside the estate line: parts of 1-12, 1-20, 1-26, 2-23, 4-2, 5-1; 2-19 almost all (about 5 palms, likely not
a lot). Small overlaps at page seams: 1-16/1-18 0.04 Ha, 6-14/6-16 0.05, 6-15/6-17 0.11.
The six block outlines on meliau-land (from the overview GeoPDF) were right and are unchanged.

## Repair pass, 19 Nov 9:30 pm (Yu Chen: "cross again all the map over again and see another chance to repair the error")
- Palms drawn light blue on the drone map are palms outside the block line; counting them too (run3.py) confirms the
  labels of the edge lots 2-23, 4-2, 5-1 (they reach past the block line on the drone map itself).
- Block 05 thin strip traced: 0.50/72 and 0.15/22 (split point estimated). Block 06 east strip traced: 0.39/49.
- Block 06: the 0.20/29 label line points to a wedge by the road junction, now traced; the piece called 6-27 before
  (about 6 palms) is not a lot and is dropped. 0.72/106 set on the lot it sits on (drawn 1.22 Ha: may hold a second lot).
- Block 01: two brown pieces split by their own label text joined = 2.55/362; 1.83/222 on the lot of that size.
- Overlaps at page seams taken out. All 120 labels on the map now sit on a lot; none used twice. Lots renumbered.
