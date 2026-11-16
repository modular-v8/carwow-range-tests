# Working on this repository

This repository keeps two runnable versions of the same dashboard for a before-and-after comparison.

- `dashboard-without-guidelines/` is the baseline. Preserve its application code and styling unless explicitly asked to change the baseline. Repository maintenance may update its setup documentation and launcher portability.
- `dashboard-with-guidelines/` is the version revised using design, content and chart guidance. Read its `DESIGN.md`, `CONTENT.md`, `CHART-GUIDELINES.md` and `WEB-GUIDELINES.md` before changing the interface.
- Both versions read the root `Data.xlsx`. Do not modify the workbook as part of code changes or tests. Tests use temporary copies.
- Keep the default ports distinct: 8773 before, 8774 after.
- `archive/` and `research/` contain local files excluded from version control except for their README files. They are not application dependencies.
- Do not depend on another dashboard's `node_modules`. Browser checks import the root development dependency.

Use `README.md` for setup and `docs/COMPARISON.md` for the comparison scope. Do not describe documentation alone as proof of implemented behaviour or of test coverage. Keep static deployment artifacts and local deployment metadata out of the repository.
