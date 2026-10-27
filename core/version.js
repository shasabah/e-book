// The one and only place the app's version is kept. Works on the page and inside sw.js.
// RELEASE is what people see (1.0 = Field & Harvest for the Sugut trial; the second number goes up
// for an improvement, the first for a new room). Add a line to CHANGES.md at every change.
// VERSION is the build count: it goes up by one at every publish, so LOAD IT knows a newer copy is out.
var EA = (typeof self !== 'undefined' ? self : window).EA = (typeof self !== 'undefined' ? self : window).EA || {};
EA.RELEASE = '1.46';
EA.VERSION = 79;
