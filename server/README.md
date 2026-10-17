# Putting the E-Book script on a test sheet

About 10 minutes. Use a NEW Google Sheet. Do not use the DMS sheet.

1. **Make the test sheet.** In Google Drive: New > Google Sheets. Name it `E-Book TEST`.
2. **Open the script.** In the sheet: Extensions > Apps Script (or a new project at script.google.com). Put the sheet's ID in SHEET_ID at the top. Delete what is there.
   Paste everything from `server/core.gs`. Click Save. Name the project `E-Book TEST script`.
3. **Make the test tabs and people.** At the top, pick `setupTestCopy` in the list, then click Run.
   Google asks for permission the first time: choose your account > Advanced > Go to E-Book TEST script > Allow.
   Back in the sheet you will see two new tabs: USERS (6 made-up people) and CHECK.
4. **Put it online.** Deploy > New deployment > type: Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click Deploy. Copy the **Web app URL** (starts with https://script.google.com/macros/…).
5. **Give the link to the app.** Open E-Book on your phone > Phone setup > paste the link in "Sending link" > SAVE.
   Log in with 111111 (made-up Owner). If it opens, the script works.

## Later changes to the script

Deploy > Manage deployments > pencil on the SAME deployment > Version: New version > Deploy.
The link stays the same, so no phone needs a new link.

## Adding a real person (only at the pilot)

In the script editor, run `addUser` from a small function, for example:
`function addOne() { addUser('SSGT-C01', 'Name', 'Clerk', 'SSGT', '482913'); }`
The key is scrambled before it is saved, so nobody can read it from the sheet.

## Switching a person off

Run `switchOff('SSGT-C01')`. Their old rows stay. They can no longer log in.

## Keep private

- The sheet: only you and the backup admin can edit. Everyone else view-only.
- Never paste the Web app link into GitHub or a WhatsApp group. Give it to each phone in Phone setup.
