# dashboard-with-guidelines

This folder contains the improved dashboard interface. Its application code and visual design remain separate from the other version.

Use **Start Dashboard.cmd in the repository root** to open both versions through one server on port 8775. This folder no longer contains a server or launcher. See [root setup instructions](../README.md).

Both versions use root `Data.xlsx` through `scripts/workbook_source.py`. Saved workbook changes refresh the local comparison automatically. `python scripts/build_comparison.py` builds the no-server snapshot in root `dist/index.html`.

Tests in this folder use the shared workbook reader; temporary copies are used for save tests. Historical results in VERIFICATION.md describe earlier versions and may mention superseded paths or launch commands.
