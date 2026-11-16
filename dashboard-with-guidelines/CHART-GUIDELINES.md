# Chart presentation guidelines

Apply these principles to charts, metric cards and chart exports. Use `CONTENT.md` for wording and `DESIGN.md` for the wider visual system. Choose the implementation; the antipatterns illustrate problems rather than prescribe replacements.

The sizes, precision defaults and tick targets below are project decisions informed by the references, not universal statistical standards. Prefer consistent roles and readable results over rigid dimensions.

## Typography

Use the dashboard font and a small, shared set of type roles. Default to 20px chart titles, 16px explanatory text and 14px axes, legends and value labels. Essential chart text must remain at least 14px at its actual displayed size. Metric values should share a responsive 40–56px role, with smaller, consistent units. Use tabular numerals for comparable values.

Measure rendered text, not just CSS declarations or SVG coordinates: scaling a wide SVG into a narrow panel also scales its lettering. Keep equivalent roles consistent across chart types and exports. Adapt layout before reducing essential text. Keep labels horizontal and preserve contrast.

Antipatterns:

- Several nearly identical font sizes chosen separately for individual panels.
- A nominally readable SVG font shrinking to illegible text when the chart fits its container.

## Numeric precision

Format by measure and context rather than using one decimal setting everywhere. Summary cards show integer counts, whole distance values and whole headline percentages. Allow up to one decimal for small-scale measures such as efficiency when needed to retain useful distinctions. Do not force trailing zeros.

Charts and tables should use consistent precision within each measure. Tooltips and detail tables may show more meaningful precision than cards, without exceeding what the source supports. Suppress negative zero. If rounding would turn a meaningful non-zero value into zero, use an appropriately qualified value or sufficient precision.

Round only for presentation. Calculate averages, rankings, ties, conversions and plotted positions from unrounded values. Retain available precision in data exports; chart images use presentation formatting. Changing units must not introduce arbitrary extra decimals.

Antipatterns:

- A count or headline distance displayed with a redundant “.0”.
- Rounding every efficiency value to an integer until distinct results appear identical.

## Axis intervals and domains

Use evenly spaced, rounded tick intervals on linear numeric axes. Select steps from a consistent nice-number series, such as 1, 2, 2.5, 5 or 10 multiplied by powers of ten. Expand the domain to suitable boundaries instead of dividing the padded data maximum into equal fractions. Format labels with enough precision to distinguish adjacent ticks.

Target roughly four to six major intervals when space permits; reduce density on smaller charts. Recompute ticks after unit, measure, filter or size changes. Keep gridlines aligned with major ticks and visually subordinate to the data. Comparable panels should share scales when direct comparison requires it; unrelated measures need not share a domain.

Start bar-length axes at zero. Line and scatter domains may be tighter when justified and clearly labelled. Include relevant reference values without clipping or crowding them. Use natural calendar intervals for date axes. “Axis intervals” means tick spacing here: do not introduce broken axes to solve layout problems.

Antipatterns:

- Arbitrary tick values produced by quartering the observed maximum, then rounding only their labels.
- The same tick count at every width, causing overlapping or duplicated labels.

## Graph size and layout

Size the usable plotting area around the comparison, label lengths and number of records. Use a small set of shared chart layouts rather than independent dimensions for each panel. Comparable charts should have consistent plot heights, margins and row spacing where their content permits.

Give dense comparisons adequate width; stack panels when a multi-column layout would compromise the plot. Choose line and scatter heights to reveal patterns without flattening or stretching them unnecessarily. Reserve room for axes, legends and notes outside the plot. Keep metric cards proportionate to the charts rather than letting large numbers dominate the page.

For long bar charts, preserve readable row spacing and access to every record. If scrolling is necessary, keep the numeric scale understandable while scrolling. Reflow on narrow screens before resorting to horizontal overflow. Do not silently remove records to make a chart fit.

Antipatterns:

- A fixed minimum chart width creating horizontal scrolling inside an otherwise spacious desktop panel.
- Applying one fixed height or aspect ratio to both a short summary chart and a long vehicle ranking.

## Consistency and verification

Centralise type roles, number formatting, tick selection and chart layout rules so the same decisions apply throughout the dashboard. Resolve conflicting inline styles and export-only overrides rather than adding more exceptions.

Inspect the actual rendered results at narrow mobile, tablet and desktop widths, including browser zoom. Check small and large selections, unit changes and different axis measures. Verify label legibility, tick spacing, unclipped values and useful plotting space. Inspect an exported chart as well. These checks concern presentation; preserve the existing calculations and source data.

Antipatterns:

- Fixing typography on screen while exported SVGs retain a separate, smaller type scale.
- Approving a chart from its source dimensions without checking its rendered panel.

## References

- [Datawrapper: Text in data visualizations](https://www.datawrapper.de/blog/text-in-data-visualizations) — limited type sizes, readable labels and suitable number precision.
- [Datawrapper: Number formats](https://www.datawrapper.de/docs/custom-number-formats-that-you-can-display-in-datawrapper) — optional decimals, grouping and formatting by magnitude.
- [Datawrapper: Axis ticks](https://www.datawrapper.de/blog/new-axis-ticks) — consistent axis behaviour and readable tick labels.
- [IBM Carbon: Chart anatomy](https://www.carbondesignsystem.com/building-blocks/data-visualization/chart-anatomy) — coordinated axes, gridlines, units and chart elements.
- [Tableau: Effective dashboards](https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm) — designing at the final display size and adapting layouts to devices.
