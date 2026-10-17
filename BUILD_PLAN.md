# Estate App — Build Plan

Taken from the Growth Plan (22 slides) and the Builder's Rule Book, 17 Oct 2026.
Builder: Yu Chen, with Claude. One room at a time. One data store: the Estate App.

## Order of work

| Step | What | Done when | Date |
|---|---|---|---|
| 0 | Decisions | Builder, one data store, staff helpers named | M1 · 23 Oct 2026 |
| 1 | Foundation | One login; blocks, workers, task codes and rates loaded | M2 · 30 Nov 2026 |
| 2 | Durian moves in | Durian runs inside the new layout, tested at Sugut | inside step 1 |
| 3 | Field & Harvest pilot, SSGT | Sugut keys daily work per worker and block; mill tickets checked | M3 · 4 Jan 2027 |
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
- Opening with no signal: built 17 Oct (sw.js keeps a copy on the phone). To test on iPhone: flight mode + Wi-Fi off, reopen the link.
- Shared lists filled from real estate data (blocks, task codes, rates) at the pilot.
- Move Durian into rooms/durian/ as its own release.
- checks/core.html: 11 of 11 pass on iPhone (17 Oct). App online at shasabah.github.io/e-book. Wi-Fi-off entry test still to confirm.
