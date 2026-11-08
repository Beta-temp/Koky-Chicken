# Visual asset audit — 2026-11-08

## Menu inventory on `main`

`data/menu.json` contains 46 menu entries in seven categories:

| Category | Items |
|---|---:|
| Broasted Chicken Meals | 8 |
| Chicken Strips Meals | 8 |
| Burgers & Sandwiches | 6 |
| Pizza | 9 |
| Pasta | 2 |
| Extras | 8 |
| Drinks | 5 |
| **Total** | **46** |

Every menu entry has a distinct `img` path in the current `main` file.

## Asset path check

- `img/dishes/` contains 45 image files.
- 45 of the 46 menu image paths resolve.
- Missing asset: `img/dishes/extra-turkey.jpg` (menu item `extra-turkey`).
- The 45 existing files have 45 distinct Git blob SHAs, so there are no byte-identical files.
- Distinct file hashes do not prove visually distinct photographs. A sample visual check found that `broasted-2-pcs.jpg` and `broasted-family-6-pcs.jpg` are very similar, and some existing menu images are noticeably low-resolution. A complete visual uniqueness review remains outstanding.

## Existing PR #1

PR #1 (`feature/koky-food-visuals`) is still open as a draft. At the time of this audit its branch is 3 commits ahead and 14 commits behind `main`, with a diverged history. Its changes are limited to `index.html`, `menu.html`, and `css/menu-premium.css`. The current `main` already contains its hero path changes, but not its failed-image fallback fix.

To avoid overwriting or force-updating the diverged branch, this partial follow-up starts from current `main` on a new branch.

## Safe partial change in this branch

- Corrected the menu-card fallback selector so a failed image reveals the existing “photo coming soon” fallback instead of leaving the image area blank.
- Bumped the menu-premium stylesheet query version so browsers fetch the updated CSS.
- No changes were made to menu names, categories, variants, prices, cart, language switching, checkout, or order logic.

## Not completed

- 46 newly generated, individually matched dish photographs: **0 integrated**.
- Two dedicated hero assets: generated as local candidates, but **not committed or wired into the site**.
- Missing `extra-turkey.jpg` asset: still outstanding.
- Full image-by-image visual uniqueness review, desktop/mobile screenshot review, and browser checkout smoke tests: not performed.

The full visual refresh should remain a draft until the 46 item-specific photographs and both hero assets are committed, every path is verified, and desktop/mobile rendering is reviewed.
