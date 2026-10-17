// Checks roster.js against every day of the official sheet (Shift B).
// Run: node tools/check-roster.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'roster.js'));
const sheet = require('./sheet-shift-b-2026.json'); // [["2026-01-01","D"], ...]

let bad = 0;
for (const [day, code] of sheet) {
  const [y, m, d] = day.split('-').map(Number);
  const got = R.codeFor(new Date(y, m - 1, d));
  if (got !== code) { bad++; console.log(`MISMATCH ${day}: sheet ${code}, app ${got}`); }
}
console.log(`${sheet.length} sheet days checked, ${bad} mismatches`);

// Holidays that fall on a Sunday must have a Monday "Public holiday" after them.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
for (const [day, name] of Object.entries(R.HOLIDAYS)) {
  const [y, m, d] = day.split('-').map(Number);
  const wd = DAYS[new Date(y, m - 1, d).getDay()];
  if (name === 'Public holiday' && wd !== 'Mon') { bad++; console.log(`HOLIDAY ${day} is ${wd}, expected Mon`); }
}
process.exit(bad ? 1 : 0);
