(() => {
  const R = window.Roster;
  const $ = (id) => document.getElementById(id);

  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  const pad = (n) => String(n).padStart(2, '0');
  const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  const hours = (shift) => `${hm(shift.start)}–${hm(shift.end % 1440)}`;
  const fmtDay = (d) => `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const sameDay = (a, b) => R.iso(a) === R.iso(b);
  const daysBetween = (a, b) => R.dayNumber(b) - R.dayNumber(a);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function fmtRange(a, b) {
    if (sameDay(a, b)) return fmtDay(a);
    if (a.getMonth() === b.getMonth()) return `${DAY[a.getDay()]} ${a.getDate()} – ${fmtDay(b)}`;
    return `${fmtDay(a)} – ${fmtDay(b)}`;
  }

  function duration(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function whenWord(d, today) {
    const diff = daysBetween(today, d);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    return `on ${fmtDay(d)}`;
  }

  function shiftLabel(d) {
    const shift = R.shiftFor(d);
    if (shift) return `${shift.name}, ${hours(shift)}`;
    const carry = R.carryInto(d);
    return carry ? `Off duty from ${hm(carry)}` : 'Off duty';
  }

  /* ---------------- Today ---------------- */

  let lastPeg = null;

  function backAtWork(today) {
    const next = R.nextWorkDay(R.addDays(today, 1));
    const shift = R.shiftFor(next);
    const what = { T: ' for training', N: ' for night shift' }[R.codeFor(next)] || '';
    return `Back at the mine ${whenWord(next, today)} at ${hm(shift.start)}${what}`;
  }

  function renderToday(now) {
    const st = R.statusAt(now);
    const today = st.today;
    let head, line1, line2;

    if (st.phase === 'during') {
      head = 'At the mine';
      line1 = `${st.shift.name}, ${hours(st.shift)}`;
      line2 = `Off duty in ${duration(st.shift.end - st.mins)}`;
    } else if (st.phase === 'before') {
      head = 'Off duty';
      line1 = `${st.shift.name} starts at ${hm(st.shift.start)} today`;
      line2 = `That's in ${duration(st.shift.start - st.mins)}`;
    } else if (st.phase === 'after') {
      head = 'Off duty';
      const tomorrow = R.addDays(today, 1);
      if (R.isWork(tomorrow)) {
        line1 = `${st.shift.name} done for today`;
      } else {
        const off = R.stretchAt(tomorrow);
        line1 = `${st.shift.name} done. Next ${plural(off.days, 'day')} off`;
      }
      line2 = backAtWork(today);
    } else {
      head = 'Off duty';
      const off = R.stretchAt(today);
      const k = daysBetween(off.start, today) + 1;
      line1 = off.days > 1 && k === off.days ? 'Last day off' : `Day ${k} of ${off.days} off`;
      line2 = backAtWork(today);
    }

    const holiday = R.holidayFor(today);
    $('today-kicker').textContent = holiday ? `Right now · ${holiday}` : 'Right now';
    const headEl = $('answer-head');
    headEl.textContent = head;
    headEl.classList.toggle('is-mine', st.atWork);
    $('answer-line1').textContent = line1;
    $('answer-line2').textContent = line2;

    const peg = st.atWork ? 'mine' : 'off';
    if (peg !== lastPeg) {
      $('board').dataset.at = peg;
      const tag = $('tag');
      tag.classList.remove('swing');
      void tag.offsetWidth; // restart the swing
      tag.classList.add('swing');
      lastPeg = peg;
    }

    renderStretches(today);
    renderWeekend(now);
  }

  function renderStretches(today) {
    const items = R.stretchesAfter(today, 4).map((s) => {
      let note = '';
      if (s.work) {
        const training = [];
        const nights = [];
        for (let d = s.start; d <= s.end; d = R.addDays(d, 1)) {
          if (R.codeFor(d) === 'T') training.push(d);
          if (R.codeFor(d) === 'N') nights.push(d);
        }
        const parts = [];
        if (training.length) parts.push(`${fmtDay(training[0])} is training, ${hours(R.SHIFTS.T)}`);
        if (nights.length) {
          const when = nights.length > 1 ? `Night shifts ${fmtRange(nights[0], nights[nights.length - 1])}` : `${fmtDay(nights[0])} is night shift`;
          parts.push(`${when}, ${hours(R.SHIFTS.N)}`);
        }
        note = parts.length ? parts.join(' · ') : `Day shifts, ${hours(R.SHIFTS.D)}`;
      }
      const hols = [];
      for (let d = s.start; d <= s.end; d = R.addDays(d, 1)) {
        const h = R.holidayFor(d);
        if (h) hols.push(`${h} on ${fmtDay(d)}`);
      }
      if (hols.length) note = note ? `${note} · ${hols.join(', ')}` : hols.join(', ');

      return `
        <li class="stretch ${s.work ? 'is-work' : 'is-off'}">
          <span class="stretch-bar" aria-hidden="true"></span>
          <div>
            <p class="stretch-title">${s.work ? 'At the mine' : 'Off duty'}</p>
            <p class="stretch-dates">${fmtRange(s.start, s.end)}</p>
            ${note ? `<p class="stretch-note">${escapeHtml(note)}</p>` : ''}
          </div>
          <span class="stretch-days">${plural(s.days, 'day')}</span>
        </li>`;
    });
    $('stretches').innerHTML = items.join('');
  }

  function renderWeekend(now) {
    const w = R.nextFreeWeekend(now);
    const el = $('weekend');
    if (!w) { el.hidden = true; return; }
    el.hidden = false;
    const thisWeekend = daysBetween(R.startOfDay(now), w.sat) <= 0;
    el.innerHTML = thisWeekend
      ? '<b>This weekend is free.</b> Jan is off Saturday and Sunday.'
      : `<b>Next weekend off:</b> ${fmtRange(w.sat, w.sun)}`;
  }

  /* ---------------- Week ---------------- */

  let weekOffset = 0;

  function mondayOf(d) {
    return R.addDays(R.startOfDay(d), -((d.getDay() + 6) % 7));
  }

  function renderWeek(now) {
    const today = R.startOfDay(now);
    const monday = R.addDays(mondayOf(today), weekOffset * 7);
    const sunday = R.addDays(monday, 6);

    const titles = { '-1': 'Last week', 0: 'This week', 1: 'Next week' };
    $('week-title').textContent = titles[weekOffset] || `Week of ${monday.getDate()} ${MON[monday.getMonth()]}`;

    let shifts = 0;
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const d = R.addDays(monday, i);
      const code = R.codeFor(d);
      const shift = R.SHIFTS[code];
      if (shift) shifts++;
      const isToday = sameDay(d, today);
      const holiday = R.holidayFor(d);

      const bar = (c, from, to) =>
        `<span class="fill fill--${c}" style="left:${(from / 1440) * 100}%;width:${((to - from) / 1440) * 100}%"></span>`;
      // A night shift is drawn up to midnight here and finishes on the next row.
      const carry = R.carryInto(d);
      const fill = (carry ? bar(R.codeFor(R.addDays(d, -1)), 0, carry) : '')
        + (shift ? bar(code, shift.start, Math.min(shift.end, 1440)) : '');
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const nowLine = isToday ? `<span class="now" style="left:${(nowMins / 1440) * 100}%"></span>` : '';
      const hol = holiday ? ` · <span class="hol">${escapeHtml(holiday)}</span>` : '';

      rows.push(`
        <li class="wrow${isToday ? ' is-today' : ''}">
          <div class="wday">
            <span class="wday-name">${isToday ? 'Today' : DAY[d.getDay()]}</span>
            <span class="wday-num">${d.getDate()}</span>
          </div>
          <div>
            <div class="track" aria-hidden="true">${fill}${nowLine}</div>
            <p class="wlabel${shift ? '' : ' is-off'}">${shiftLabel(d)}${hol}</p>
          </div>
        </li>`);
    }
    $('week-rows').innerHTML = rows.join('');
    $('week-sub').textContent = `${fmtRange(monday, sunday)} · ${plural(shifts, 'shift')}, ${7 - shifts} off`;
    $('week-back').hidden = weekOffset === 0;
  }

  /* ---------------- Month ---------------- */

  let monthOffset = 0;
  let selected = null; // Date picked in the month grid

  function renderMonth(now) {
    const today = R.startOfDay(now);
    const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;

    if (!selected || selected.getMonth() !== first.getMonth() || selected.getFullYear() !== first.getFullYear()) {
      selected = monthOffset === 0 ? today : first;
    }

    $('month-title').textContent = `${MONTH[first.getMonth()]} ${first.getFullYear()}`;

    let shifts = 0;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span></span>');
    for (let n = 1; n <= daysIn; n++) {
      const d = new Date(first.getFullYear(), first.getMonth(), n);
      const code = R.codeFor(d);
      if (code !== 'O') shifts++;
      const cls = [
        'mcell', `c-${code}`,
        sameDay(d, today) ? 'is-today' : '',
        sameDay(d, selected) ? 'is-selected' : '',
        R.holidayFor(d) ? 'is-hol' : '',
      ].filter(Boolean).join(' ');
      const label = `${fmtDay(d)}: ${shiftLabel(d)}${R.holidayFor(d) ? `, ${R.holidayFor(d)}` : ''}`;
      cells.push(`<button class="${cls}" type="button" data-day="${n}" aria-label="${escapeHtml(label)}" aria-pressed="${sameDay(d, selected)}">${n}</button>`);
    }
    $('month-grid').innerHTML = cells.join('');
    $('month-sub').textContent = `${plural(shifts, 'shift')} · ${daysIn - shifts} days off`;
    $('month-back').hidden = monthOffset === 0;

    const hol = R.holidayFor(selected);
    const when = sameDay(selected, today) ? `Today, ${fmtDay(selected)}` : fmtDay(selected);
    $('month-detail').innerHTML = `${when} · ${shiftLabel(selected)}${hol ? ` · <span class="hol">${escapeHtml(hol)}</span>` : ''}`;

    const last = new Date(first.getFullYear(), first.getMonth(), daysIn);
    let changed = 0;
    for (let n = 1; n <= daysIn; n++) if (R.isChanged(new Date(first.getFullYear(), first.getMonth(), n))) changed++;
    const except = changed ? `, apart from ${plural(changed, 'changed day')}` : '';
    $('month-note').textContent = R.isChecked(first) && R.isChecked(last)
      ? `Matches the official Shift B roster${except}. The pattern repeats every 4 weeks.`
      : `Worked out from the 4-week pattern${except}. Check it against the new roster when it comes out.`;
  }

  $('month-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.mcell');
    if (!btn) return;
    const today = R.startOfDay(new Date());
    selected = new Date(today.getFullYear(), today.getMonth() + monthOffset, Number(btn.dataset.day));
    renderMonth(new Date());
    const again = $('month-grid').querySelector(`[data-day="${btn.dataset.day}"]`);
    if (again) again.focus();
  });

  /* ---------------- Tabs + paging ---------------- */

  const tabs = [...document.querySelectorAll('.tab')];

  function showView(name, focus) {
    tabs.forEach((t) => {
      const on = t.dataset.view === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
      $(`view-${t.dataset.view}`).hidden = !on;
    });
    window.scrollTo(0, 0);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showView(t.dataset.view));
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      showView(tabs[(i + step + tabs.length) % tabs.length].dataset.view, true);
    });
  });

  $('week-prev').addEventListener('click', () => { weekOffset--; renderWeek(new Date()); });
  $('week-next').addEventListener('click', () => { weekOffset++; renderWeek(new Date()); });
  $('week-back').addEventListener('click', () => { weekOffset = 0; renderWeek(new Date()); });
  $('month-prev').addEventListener('click', () => { monthOffset--; renderMonth(new Date()); });
  $('month-next').addEventListener('click', () => { monthOffset++; renderMonth(new Date()); });
  $('month-back').addEventListener('click', () => { monthOffset = 0; renderMonth(new Date()); });

  /* ---------------- Clock ---------------- */

  function renderAll() {
    const now = new Date();
    $('clock').textContent = `${fmtDay(now)} · ${hm(now.getHours() * 60 + now.getMinutes())}`;
    renderToday(now);
    renderWeek(now);
    renderMonth(now);
  }

  renderAll();
  setInterval(renderAll, 30 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderAll();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
