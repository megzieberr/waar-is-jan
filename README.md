# Waar is Jan?

A tiny home-screen app showing whether Jan is at the mine or off duty: Today, Week and Month views. English only. No login, no database.

- Roster: Engineering 7-7 Day + Training roster, Shift B. Day shift 07:00–19:00, training 08:00–15:00.
- `roster.js` stores one 28-day cycle (`PATTERN`) counted from Thu 1 Jan 2026. The 2026 sheet repeats exactly every 28 days.
- `tools/check-roster.js` compares the app with every day of the official sheet (1 Jan 2026 – 31 Jan 2027). Run `node tools/check-roster.js`: it must say 0 mismatches.
- Built 17 Oct 2026. Design: mine tag board (brass tag on "At the mine" / "Off duty" pegs), iron-ore red, Kalahari sand, hi-vis orange. Fonts: Saira Stencil One, Barlow, Barlow Condensed.

## When the 2027 roster arrives

1. Read Shift B from the new sheet into `tools/` as `[["2027-01-01","D"], ...]` (D, T or O).
2. Check it against the app. If the pattern changed, update `PATTERN` and the anchor in `roster.js`, and `CHECKED_UNTIL`.
3. Add any new public holidays to `HOLIDAYS`.
4. Bump `VERSION` in `sw.js`, then push.

## Any change

Bump `VERSION` in `sw.js`, or phones keep showing the old copy. Local preview: `waar-is-jan` in the projects folder's `.claude/launch.json` (port 5181).
