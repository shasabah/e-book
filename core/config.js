// Foundation settings.
// The sending link (Google script) is NOT kept here. Each phone gets it once
// in Phone setup and keeps it on the phone, so no live link sits in GitHub.
window.EA = window.EA || {};
EA.config = {
  // true while building on the test copy: uses made-up people from
  // lists/test-users.js and pretends to send when no link is set.
  TEST_MODE: true,
  // A phone that has waited this long without sending shows a red warning.
  WARN_AFTER_HOURS: 24
};
