# Changes

One line per release: date, version, what changed.

- 2026-10-17 — v1 (test copy, not released) — Main page started: login with 6-digit key, phone setup, sync bar with waiting count, LOAD IT bar, room tiles by role and estate, milestones for Owner and HQ.
- 2026-10-17 — v1 (test copy, not released) — App named Estate Book (Buku Ladang), replacing "Sugut DMS" on the header and login page.
- 2026-10-17 — v1 (test copy, not released) — "EB" letters replaced by a small open-book mark; the app is only ever called Estate Book.
- 2026-10-17 — v1 (test copy, not released) — Short name E-Book: under the full name on the header and login page, and as the name under the phone icon.
- 2026-10-17 — v1 (test copy, not released) — Google script for the test sheet (server/core.gs): login by key, save one entry at a time, same entry never written twice, keys kept scrambled.
- 2026-10-17 — v1 (test copy, not released) — Google script live on the E-Book TEST sheet (company account). Tested: login right/wrong key, save, same entry sent twice written once, other estate refused.
- 2026-10-17 — v1 (test copy, not released) — Check page (checks/core.html): 11 automatic checks plus a by-hand flight-mode test. Requests no longer send Google sign-in cookies (fixes laptops signed in to two accounts).
- 2026-10-17 — v1 (test copy, not released) — Checks run in Chrome against the test sheet: 11 of 11 pass (login re-checked 3 of 3). Login now says "office busy, try again" instead of "wrong key" when the office side is slow or has a problem.
- 2026-10-17 — v1 (test copy, not released) — E-Book online at https://shasabah.github.io/e-book/ (company GitHub account shasabah, repository e-book). DMS untouched.
- 2026-10-17 — v1 (test copy, not released) — Pasted sending links are cleaned of hidden spaces and line breaks (iPhone check failed with "string did not match the expected pattern"). Check page explains a bad link or a bad office answer in plain words.
- 2026-10-17 — v1 (test copy, not released) — iPhone: 11 of 11 checks pass. The phone now keeps a copy of the whole app (sw.js), so E-Book opens with no signal; LOAD IT switches to a new copy when the version goes up. Check page has a by-hand "open with no signal" test.
- 2026-10-17 — v1 (test copy, not released) — Offline fix: a page link with "?…" at the end now also opens from the phone copy (iPhone showed "not connected to the internet").
- 2026-10-17 — v1 (test copy, not released) — iPhone, flight mode and Wi-Fi off: E-Book opens; 2 entries saved offline were sent when Wi-Fi returned. Foundation steps 1–4 done.
- 2026-10-17 — v1 (test copy, not released) — Shared lists for Sugut: 4 blocks (130.65 Ha, from the 2027 business plan), 13 draft task codes (from the Jun 2025 piece-rate form), 10 made-up test workers. Rates kept off GitHub, in the "Sugut lists to confirm" sheet.
- 2026-10-17 — v1 (test copy, not released) — Task list rebuilt from the official Sugut rate list (05/10/2022): 28 tasks in 6 sections, pay type per task (unit, day, hour, steps), Sunday and public holiday approval rules. Confirm sheet v2 in Drive.
- 2026-10-18 — v1 (test copy, not released) — Sugut lots loaded from the QField map (lists/lots.js): 164 lots, 130.65 Ha, 17,835 palms; block totals match the 2027 business plan. Work and crop will be keyed by lot. Nearest-lot lookup from GPS added.
- 2026-10-18 — v1 (test copy, not released) — New role Staff (Kakitangan / Field staff) for the staff in charge at an estate with no clerk on site (Sugut: Ferezelly). Test key 777777 (T-STF). Clerk test user now covers SSGT and PTAN (one clerk for both estates). Run setupTestCopy once more in the script to add T-STF.
- 2026-10-18 — v2 (test copy) — Field & Harvest room, screen 1: morning muster chit (Chit muster pagi). Mandor, job code, block and lots for the gang; Hadir / Sakit / Cuti / Tak hadir per worker; own job and lots per worker; mandor confirms on the staff's phone; one row per worker in tab FH_MUSTER; chit text for WhatsApp; corrections write new rows that point to the old ones (removed workers get a 'removed' row). Rooms now open inside the main page (same header and sync bar). Brief approved 18 Oct.
- 2026-10-18 — v2 — Fix: anything marked hidden now stays hidden (the empty message panel was covering the page after login, blocking taps on room tiles).
- 2026-10-18 — v2 — Google script: FH_MUSTER tab made by setupTestCopy; lot numbers like 1-5 kept as text (the sheet would turn them into dates).
