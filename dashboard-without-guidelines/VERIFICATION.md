# Verification

Validated against the project workbook on 12 November 2026.

## Completed checks

- Source reconciliation: 62 EV tests, 27 EV manufacturers, 2 combustion vehicles, 54 matched battery series, 432 source battery observations.
- Aggregate claimed-range achievement: 85.1956224840686% (85.2% on the dashboard).
- 16 missing after-zero measurements remain missing. Nine missing weight measurements are excluded when weight is selected as a scatter axis.
- Derived metrics recompute from changed raw inputs even when Excel's derived formula caches remain unchanged.
- Blank vs zero reserve, impossible reserve, zero battery capacity, missing required headers and ambiguous battery matches are handled explicitly.
- Adding a contiguous row below EV_Data expands the dashboard population, even before the Excel table reference expands.
- A disposable workbook copy was atomically replaced to simulate an Excel save. The watcher detected the new version and changed measurements. An incomplete file retained the last valid data with a stale warning; a repaired file recovered automatically. The original Data.xlsx was not changed.
- Debounce waits for a stable file before parsing.
- JavaScript analysis checks cover equal-weight manufacturer means, missing values, ties, intersecting filters, precise unit conversion and CSV quoting.
- DOM-independent application checks exercise every view, expected chart element counts, manufacturer/search filters, miles/kilometres, both scatter axes and swapping, battery selection, table sorting, saved-version rerendering, filter persistence and stale warnings.
- The local HTTP service returns the page, scripts, stylesheet and a connected data API successfully.

## Source notice

Plotting row 415 contains `25% (Bar level)` as text. It is excluded as an unparsed observation and shown in the dashboard's source notices. The remaining points in that battery journey are retained. No value was guessed and the workbook was not edited.

## Verification limit

Visual browser inspection was not completed. The in-app browser automation was unavailable, and native browser access was stopped by the desktop environment because it could not verify the current browser URL. Frontend render/interaction checks are programmatic and do not establish pixel-level layout or real-browser accessibility. The application includes responsive styles, focusable chart marks, keyboard controls and mobile overflow handling, but those require a manual visual check in the user's browser.
