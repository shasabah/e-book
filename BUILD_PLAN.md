# Estate App — Build Plan

Taken from the Growth Plan (22 slides) and the Builder's Rule Book, 17 Oct 2026.
Builder: Yu Chen, with Claude. One room at a time. One data store: the Estate App.

## Order of work

| Step | What | Done when | Date |
|---|---|---|---|
| 0 | Decisions | Builder, one data store, staff helpers named | M1 · 23 Oct 2026 |
| 1 | Foundation | One login; blocks, workers, task codes and rates loaded | M2 · 30 Nov 2026 |
| 2 | Durian moves in | Moved to after the durian harvest (decided 18 Oct) | ~Jul 2027 |
| 3 | Field & Harvest pilot, SSGT | Sugut keys daily work per worker and lot; mill tickets checked | M3 · 4 Jan 2027 |
| 4 | Field & Harvest, all estates | March review comes from the app | M4 · 31 Mar 2027 |
| 5 | Sugut pay check | App pay matches Ekklesia Feb, Mar, Apr | M5 · 30 Apr 2027 |
| 6 | Purchase & Store | Pilot 1 Jun; all estates, paper requests stop | M6–M7 · 31 Aug 2027 |
| 7 | Fleet | Pilot KWNN 1 Oct; old FMMS closed | M8–M9 · 30 Nov 2027 |
| 8 | HR & Payroll | HR pilot Jan 2028; payroll beside Ekklesia 3 months | M10–M12 · 30 Jun 2028 |

No new rooms for field crews in peak crop (Aug–Nov).

## Foundation: built once, used by every room

1. **Main page (front door)** — one link, one login, room tiles by role and estate. ← started 17 Oct
2. **Login and roles** — 6-digit key; Owner, HQ, Clerk, Mandor, Store, Worker; tied to estates.
3. **Saving and sending** — save on the phone first, waiting count, send when there is signal.
4. **Update button** — one version number in core/version.js; LOAD IT bar when a new one is out.
5. **Shared lists** — estates and blocks, people, task codes and rates, suppliers and items, machines.
6. **Look** — header, colours, buttons, sync bar, phone and laptop layouts (core/look.css).
7. **Export** — one shared way to send any list to Excel.
8. **Google script** — server/core: checks the key on every request, writes one entry at a time.

## What the main page does (this first piece)

- Login with a 6-digit key. Remembers the person on that phone.
- Phone setup: phone code (P07) and the sending link, kept on the phone, never in GitHub.
- Header: who is logged in, their role, their estates. Blue for Owner and HQ screens.
- Sync bar on every screen: waiting count, last sent, SEND button, 24-hour warning.
- Red notice when there is no sending link, so nothing is keyed into nowhere.
- LOAD IT bar when a newer version is out.
- Room tiles: only the rooms that role needs. Rooms not open yet show their opening date.
- Owner and HQ see the next milestones on the laptop layout.
- Test copy: made-up people and keys only, clearly marked.

## Still to do for the foundation

- DONE 17 Oct: Google script live on the E-Book TEST sheet (yclee@shasabah.com) and tested.
- DONE 17 Oct: opens with no signal on iPhone (flight mode + Wi-Fi off); entries saved offline are sent when signal returns.
- Shared lists for Sugut started 17 Oct: blocks done; task codes and rates waiting for HQ / Sugut manager to confirm (sheet "E-Book – Sugut lists to confirm (v3)").
- DONE 18 Oct: Sugut lots loaded from the QField map (lists/lots.js): 164 lots under the 4 blocks, 130.65 Ha, 17,835 palms. Work and crop will be keyed by lot, not block.
- Durian move: postponed to after the 2027 durian harvest (decided 18 Oct). DMS keeps running as is.

## Next room: Field & Harvest, Sugut (4 Jan 2027)

1. DONE 18 Oct: brief approved by Yu Chen (Rule 10).
   - DONE 18 Oct: screen 1, morning muster chit (by lot), on the test copy.
   - DONE 18 Oct (v5): muster chit rebuilt like the Sugut paper chit: many jobs per chit, sections A–D, Mdr / M / F / Total, absence reasons, rainfall. Vehicles, crop balance, rejects and harvesting round come from later screens.
   - DONE 18 Oct (v10): screen 2, day's work by person and lot (quantity, bunches), job done / not done with reason and counter-measure, evening report.
   - Next: harvest and crop balance by lot, lorry request, mill ticket (ABW: harvester tonnes = bunches x ticket MT / bunches).
2. Build on the test copy; Sugut junior staff tests with made-up workers.
3. Pilot from 4 Jan beside the paper pocket check roll for about a month.
- DONE 17 Oct: checks 11 of 11 on iPhone; app online at shasabah.github.io/e-book.
