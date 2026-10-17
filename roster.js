// Jan's roster: Engineering 7-7 Day + Training roster, Shift B.
// The official 2026 sheet repeats exactly every 28 days (checked day by day,
// 1 Jan 2026 to 31 Jan 2027, see tools/check-roster.js), so the app only
// stores one 4-week cycle and counts forward from 1 Jan 2026.
(function (root) {
  // D = day shift, T = training, O = off. Index 0 is Thu 1 Jan 2026.
  const PATTERN = 'DOOOOODDDDDOOOTDDDDDOOOOODDD';
  const ANCHOR_UTC = Date.UTC(2026, 0, 1);
  const CHECKED_FROM = '2026-01-01';
  const CHECKED_UNTIL = '2027-01-31'; // last day on the official sheet

  const SHIFTS = {
    D: { name: 'Day shift', start: 7 * 60, end: 19 * 60 },
    T: { name: 'Training', start: 8 * 60, end: 15 * 60 },
    O: null,
  };

  // South African public holidays (2026 from the roster sheet, 2027 added).
  const HOLIDAYS = {
    '2026-01-01': "New Year's Day",
    '2026-03-21': 'Human Rights Day',
    '2026-04-03': 'Good Friday',
    '2026-04-06': 'Family Day',
    '2026-04-27': 'Freedom Day',
    '2026-05-01': "Workers' Day",
    '2026-06-16': 'Youth Day',
    '2026-08-09': "National Women's Day",
    '2026-08-10': 'Public holiday',
    '2026-09-24': 'Heritage Day',
    '2026-12-16': 'Day of Reconciliation',
    '2026-12-25': 'Christmas Day',
    '2026-12-26': 'Day of Goodwill',
    '2027-01-01': "New Year's Day",
    '2027-03-21': 'Human Rights Day',
    '2027-03-22': 'Public holiday',
    '2027-03-26': 'Good Friday',
    '2027-03-29': 'Family Day',
    '2027-04-27': 'Freedom Day',
    '2027-05-01': "Workers' Day",
    '2027-06-16': 'Youth Day',
    '2027-08-09': "National Women's Day",
    '2027-09-24': 'Heritage Day',
    '2027-12-16': 'Day of Reconciliation',
    '2027-12-25': 'Christmas Day',
    '2027-12-26': 'Day of Goodwill',
    '2027-12-27': 'Public holiday',
  };

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dayNumber = (d) =>
    Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - ANCHOR_UTC) / 864e5);

  const codeFor = (d) => PATTERN[((dayNumber(d) % 28) + 28) % 28];
  const isWork = (d) => codeFor(d) !== 'O';
  const shiftFor = (d) => SHIFTS[codeFor(d)];
  const holidayFor = (d) => HOLIDAYS[iso(d)] || null;
  const isChecked = (d) => iso(d) >= CHECKED_FROM && iso(d) <= CHECKED_UNTIL;

  // A stretch is a run of work days (shift or training) or a run of off days.
  function stretchAt(d) {
    const work = isWork(d);
    let start = startOfDay(d);
    let end = start;
    while (isWork(addDays(start, -1)) === work) start = addDays(start, -1);
    while (isWork(addDays(end, 1)) === work) end = addDays(end, 1);
    return { work, start, end, days: dayNumber(end) - dayNumber(start) + 1 };
  }

  function stretchesAfter(d, count) {
    const out = [];
    let cursor = addDays(stretchAt(d).end, 1);
    while (out.length < count) {
      const s = stretchAt(cursor);
      out.push(s);
      cursor = addDays(s.end, 1);
    }
    return out;
  }

  function nextWorkDay(from) {
    let d = startOfDay(from);
    while (!isWork(d)) d = addDays(d, 1);
    return d;
  }

  // The first weekend (Sat + Sun) with both days off, counting the weekend
  // we're in right now.
  function nextFreeWeekend(now) {
    const today = startOfDay(now);
    let sat = addDays(today, -((today.getDay() + 1) % 7)); // most recent Saturday
    for (let i = 0; i < 60; i++) {
      const sun = addDays(sat, 1);
      if (sun >= today && !isWork(sat) && !isWork(sun)) return { sat, sun };
      sat = addDays(sat, 7);
    }
    return null;
  }

  function statusAt(now) {
    const today = startOfDay(now);
    const code = codeFor(today);
    const shift = SHIFTS[code];
    const mins = now.getHours() * 60 + now.getMinutes();
    let phase = 'off-day';
    if (shift) phase = mins < shift.start ? 'before' : mins < shift.end ? 'during' : 'after';
    return { today, code, shift, mins, phase, atWork: phase === 'during' };
  }

  const api = {
    PATTERN, SHIFTS, HOLIDAYS, CHECKED_UNTIL,
    iso, startOfDay, addDays, dayNumber,
    codeFor, isWork, shiftFor, holidayFor, isChecked,
    stretchAt, stretchesAfter, nextWorkDay, nextFreeWeekend, statusAt,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Roster = api;
})(typeof window !== 'undefined' ? window : globalThis);
