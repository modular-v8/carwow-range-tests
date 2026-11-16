# Dashboard content guidelines

## Purpose

Write clear, neutral text that helps readers understand the vehicle test data. Apply these principles across the dashboard, including downloads and accessible descriptions. Use `DESIGN.md` for visual styling, `CHART-GUIDELINES.md` for chart presentation and numeric formatting, and `WEB-GUIDELINES.md` for interface behaviour.

Exercise judgement rather than treating the examples below as a blacklist. Choose the wording from the data, the task and the surrounding context. Content changes must preserve the meaning of measurements and application behaviour.

## Voice

Use plain British English, familiar words and sentence case. Prefer specific descriptions to promotional or theatrical language. Keep necessary qualifications while removing filler.

Antipatterns:
- Slogans such as “Beyond the brochure”.
- Personification such as “Every charge tells a story”.

## Headings and navigation

Name the subject or task directly. Headings should make sense on their own; navigation should make destinations easy to distinguish. Let length follow clarity rather than a fixed word count.

Antipatterns:
- Vague headings such as “The highs and lows”.
- A heading and subtitle that say the same thing.

## Chart titles and subtitles

Use descriptive titles for exploratory charts. A finding-based title is appropriate only when the displayed data supports it and it remains accurate after filtering or updates. Use subtitles to add relevant scope, aggregation or context rather than decoration.

Antipatterns:
- A fixed conclusion that becomes false when filters change.
- A subtitle containing assumed test conditions or a stale sample size.

## Terminology and statistical meaning

Use consistent terms across views. Preserve distinctions between different measurements, populations and calculations. Describe only what the source and analysis establish; choose terminology after checking their definitions.

Antipatterns:
- Treating calculated efficiency and video-reported efficiency as interchangeable.
- Calling a manufacturer “best” because it ranks highest in this test collection.

## Labels, units and numbers

Make measures, units, categories and dates unambiguous. Match the active unit selection and use suitable, consistent precision. Labels should help readers interpret the data without unnecessary repetition.

Summary cards use whole numbers for counts, distances and headline percentages. Small-scale measures such as efficiency may retain one meaningful decimal where whole-number rounding would conceal useful differences. Do not pad values with trailing zeros. Use the precision policy in `CHART-GUIDELINES.md`; retain underlying precision for calculations and data exports.

Antipatterns:
- Showing kilometres on an axis and miles in its tooltip.
- Displaying a missing measurement as zero.

## Tooltips and accessibility

Provide enough context to identify and understand a value. Make essential information available without hover or colour recognition. Accessible descriptions should complement visible text and remain accurate as the chart changes. Exports should make sense independently of the dashboard.

Antipatterns:
- Identifying a series only as “the blue line”.
- An accessible description that repeats the title without explaining the chart.

## Sources and notes

Identify the original data source and distinguish it from local storage. Keep essential qualifications close to the relevant chart; put shared methodology in a suitable common location. Notes should clarify interpretation rather than overwhelm it.

Antipatterns:
- Listing only a local filename as the data’s provenance.
- Hiding a limitation that changes the interpretation in a distant methodology section.

## Controls and status messages

Describe actions and states plainly. Explain recovery when useful, and ensure every message matches the actual behaviour. Keep terminology consistent with the rest of the interface.

Antipatterns:
- Vague action text such as “Click here”.
- Saying data is up to date when an update failed and older results remain visible.

## References

Adapted from the following professional sources. These are project principles, not a reproduction of any one organisation’s style guide. In particular, the preference for descriptive titles reflects this dashboard’s exploratory, filterable nature; some sources favour finding-based titles.

- [Datawrapper: Annotating your visualization](https://www.datawrapper.de/docs/annotate-tab) — titles, descriptions, notes and sources.
- [Tableau: Best practices for designing accessible views](https://help.tableau.com/current/pro/desktop/en-us/accessibility_best_practice.htm) — clear wording and accessible context.
- [IBM Carbon: Chart anatomy](https://www.carbondesignsystem.com/building-blocks/data-visualization/chart-anatomy) — titles, labels, legends and tooltips.
- [Storytelling with Data: Graph titles](https://www.storytellingwithdata.com/blog/2022/1/12/you-asked-why-dont-you-capitalize-your-graph-titles) — sentence case and title hierarchy.
- [Datawrapper: Alternative descriptions](https://www.datawrapper.de/academy/how-to-write-good-alternative-descriptions-for-your-data-visualization) — useful accessible chart descriptions.
