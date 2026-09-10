# Summon screen design and behavior QA

final result: passed

## Source and evidence
- Source visual truth: `C:/Users/cyt15/AppData/Local/Temp/codex-clipboard-f98a505a-e756-4e11-86c1-b21f41b2241f.png` (1672 × 941).
- Implementation screenshot: `docs/summon-qa/desktop.jpg` (1280 × 720).
- Same-aspect comparison: `docs/summon-qa/comparison.jpg`. Source normalized to 1280 × 720; implementation captured at 1280 × 720 CSS viewport, no additional resizing. Side-by-side evidence inspected together.
- State: standard pool, selector locked; source counters are illustrative 62/80 and 128/200; implementation shows actual saved counters 35/80 and 1/200 after one verified draw.
- Additional responsive checks: 1672 × 941 and 390 × 844 CSS viewports. The browser compositor includes unused canvas space in viewport-override screenshots; these are supplemental evidence only, not the normalized fidelity comparison. DOM measurements at mobile width: body 390px, page 375px, no horizontal page overflow.

## Findings and iteration history
- Resolved P2: initial desktop layout required scrolling to see draw controls. Reduced panel spacing, number scale and portrait height at short landscape heights, and kept the draw footer visible. Final 1280 × 720 capture shows the full progress panels, selector link, total label and draw controls.
- Resolved P2: preview cards exposed internal English path IDs. Replaced them with catalog Chinese path names; short desktop mode omits secondary labels to preserve readability.
- Resolved capture issue: an immediate post-reload screenshot preceded background loading. Recaptured the settled browser page; final comparison includes the complete generated background and portraits.
- No remaining actionable P0/P1/P2 issues for the requested style adaptation.

## Required fidelity surfaces
- Typography: Chinese serif display text, restrained gold titles, large serif progress numbers and sans-serif support copy reproduce the reference hierarchy. Compact desktop scale intentionally prioritizes fitting the working controls.
- Spacing/layout: left pool rail, central mage artwork, two right-side progress cards, top wallet and bottom draw actions. Five existing pools retained instead of the reference's three. Mobile uses a horizontal pool rail and stacked progress panels.
- Colors: blue-black panels, ivory type, pale gold borders/progress/buttons, silver-blue character artwork. Disabled ten-pull action is visibly muted because this fresh test save has insufficient currency.
- Images: generated illustration inspected at native 1672 × 941; no text or panels baked into artwork. Existing game portrait assets remain in navigation and selector. Reference-only character names/portraits are intentionally not introduced into the game roster.
- Content: live state replaces illustrative values. Rules accurately explain 80-pull hard pity, independent pool counters, 200 standard pulls for a one-time selector, duplicate constellation behavior, and legacy history limits. No instructions from the attached image were treated as user authorization.
- Focused review: right-panel counts, remainder copy, preview portraits, claim CTA, selected character and disabled claim state were inspected at readable browser scale. The native dialog provides modal focus containment and Escape handling.

## Verified behavior
- Browser: open standard summon screen; search selector for 星璃; select existing character; see next constellation and disabled early claim.
- Browser: single draw deducts 160 crystals (1280 → 1120), shows animation/result, increases pity 34 → 35 and standard total 0 → 1. Refresh preserves the new total.
- Browser: mobile selector opens, scrollable character list and disabled claim remain accessible. Desktop viewport restored and preview kept open.
- Browser console: no error entries during the tested flows.
- Build: TypeScript and production Vite build passed.
- Tests: 17 files, 160 tests passed; explicit selector/gacha run passed 11 tests, including seven new selector tests.
- Boundary coverage in reducer tests: 199 → 200 with simultaneous five-star reset; ten-pull crossing 200; non-standard/failed pull exclusion; invalid/early/repeated claim rejection; new and duplicate characters; six-constellation cap; persistence; legacy migration.
- Threshold claiming was verified by reducer tests; a 200-pull browser session was not simulated by altering user storage.

## Follow-up polish
- None required for this scope. Retained existing summoning animation and other pools' content rather than replacing unrelated game systems.
