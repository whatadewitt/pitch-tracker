# Product

## Register

product

## Users

Volunteer youth-baseball coaches and parents tracking pitch counts for a Little
League team. Primary context: standing at or near the field, **outdoors in bright
sunlight**, holding a phone **one-handed** while watching the game. They take
quick glances between pitches, not focused reading sessions. Often not technical
users.

## Product Purpose

A phone-first PWA to (1) count a pitcher's pitches live with large +/- controls,
(2) record each outing, and (3) automatically flag who is unavailable to pitch
based on configurable pitch-count → rest-day rules (Little League style). Success
= a coach can tell at a glance who's available today and tally pitches without
fumbling, and the data survives across sessions on their device. No accounts, no
backend; data lives in `localStorage`.

## Brand Personality

Sporty and energetic, but legibility-first. Three words: **energetic, confident,
clear**. It should feel like a focused dugout tool, not a spreadsheet. Color and
motion can have life, but never at the expense of glance-ability in sunlight.

## Anti-references

- **Generic AI-app look**: no purple/blue gradients, glassmorphism, gradient
  text, hero-metric blocks, or endless identical icon+title+text card grids.
- **Gambling / odds-app vibe**: no neon, no flashy betting-slip aesthetic (the
  sibling project is a betting app; this must not borrow that feel).
- **Cluttered stats dashboard**: no dense tables or tiny text competing with the
  live-counting task.

## Design Principles

1. **Glanceable in sunlight.** High contrast and large type win every styling
   tie-break. If a choice trades legibility for elegance, legibility wins.
2. **One-handed, one-thumb.** The primary live actions (pick pitcher, +/-, save)
   must be reachable and tappable with a thumb; targets stay generously large.
3. **The count is the hero.** The current pitch count and who's available are the
   two things that must read instantly; everything else is secondary.
4. **Trustworthy state.** Nothing is lost: in-progress counts and history persist,
   and destructive actions are confirmed.
5. **Energetic, not noisy.** Personality comes from confident color and crisp
   motion, never from decoration that slows the read.

## Accessibility & Inclusion

Target **WCAG 2.1 AA, leaning AAA on contrast** given bright-sun use. Body text
≥ 4.5:1 (aim 7:1 for primary readouts), large/bold text ≥ 3:1. All interactive
targets ≥ 44x44px. Full keyboard operability with visible focus states. Honor
`prefers-reduced-motion`. Status must not rely on color alone (pair the
available/resting dot with a text label).
