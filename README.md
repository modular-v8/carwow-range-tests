# Carwow EV range dashboards: before and after

[Open the live dashboard](https://modular-v8.github.io/carwow-range-tests/) — available publicly through GitHub Pages.

## Combined comparison

The comparison overlays both interactive dashboards at the same full width. Drag the vertical divider to reveal the original on the left and the improved design on the right. Vertical labels stay attached to the divider. There is no comparison toolbar or bottom slider. Focus the divider and use Left/Right arrows to adjust it; Home reveals the improved design and End reveals the original.

One outer page scrollbar controls both dashboards by relative document position. Wheel and touch scrolling over either design scroll the combined page. Long charts and vehicle lists expand instead of creating separate vertical scroll areas; horizontal table scrolling remains available where needed. Navigation and matching filters, units, chart controls, table sorting and battery selections are always synchronised. CSV/SVG downloads run only in the chosen design. The wrapper intercepts section links so they cannot open another comparison inside a dashboard.

After installing the Python dependencies below, run one server for both versions:

```powershell
.venv\Scripts\python.exe scripts/serve_comparison.py --open
```

Open `http://127.0.0.1:8775/?live=1`. Both panes read the root workbook and follow saved Excel changes. Double-click the root `Start Dashboard.cmd` to start it. There are no per-folder servers or launchers.

To run without any server:

```powershell
.venv\Scripts\python.exe scripts/build_comparison.py
```

Double-click `dist/index.html`, or send that file to someone else. It contains both interfaces and a saved workbook snapshot, including scripts and styles. It works from a local file URL; Google Fonts is optional and falls back to local fonts. It cannot detect later Excel edits: rebuild the file to update the snapshot. Generated `dist/` files are ignored by Git.

### Public link with GitHub Pages

Repository: [modular-v8/carwow-range-tests](https://github.com/modular-v8/carwow-range-tests). To enable public hosting:

1. Upload the source project, including `Data.xlsx`, both dashboard folders, `scripts/` and `.github/workflows/pages.yml`. Do not upload ignored local history, credentials, deployment metadata, dependencies or generated builds.
2. Use `main` as the default branch (or adjust `pages.yml`).
3. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
4. Run **Publish comparison to GitHub Pages** from the Actions tab, or push a change to `main`.
5. Share the URL shown by the successful deployment, normally `https://USERNAME.github.io/REPOSITORY/`.

GitHub hosts the static page; visitors do not need Python, your laptop or a local server. The site and its embedded workbook measurements are public. Committing a new `Data.xlsx` triggers a rebuild, while saving it only on your laptop does not update Pages. A public repository makes this straightforward on GitHub Free; check GitHub's plan requirements before choosing a private repository.

Reference: [GitHub Pages publishing with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Run `node scripts/test-comparison.mjs` after building to check direct-file loading, synchronised controls, pointer/keyboard divider behaviour and mobile full-width mode. This check imports the root Playwright dependency and uses installed Chrome by default; set `DASHBOARD_BROWSER_CHANNEL` for another installed channel.

## Application folders

- `dashboard-without-guidelines/static/`: preserved original interface.
- `dashboard-with-guidelines/static/`: revised interface and its design, content and chart guidelines.
- `scripts/workbook_source.py`: shared read-only workbook parser and save watcher.
- `scripts/serve_comparison.py`: the single server on port 8775.
- `Start Dashboard.cmd`: the only desktop launcher.

Both designs are served by the combined page. For isolated inspection and automated checks, the same server also provides `/before/` and `/after/`; neither requires another server.

## Setup

Install Python 3.10 or later, then run from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Double-click `Start Dashboard.cmd`. Keep its window open for live Excel updates; Ctrl+C stops the server. The launcher prefers the root virtual environment and can use an existing Python installation with openpyxl. On macOS/Linux run `python3 scripts/serve_comparison.py --open` after installing requirements. Use `--port NUMBER` to change the shared port.

## Checks

```powershell
python -m unittest discover -s dashboard-without-guidelines/tests -p "test_*.py" -v
python -m unittest discover -s dashboard-with-guidelines/tests -p "test_*.py" -v
npm test
```

With the single server running, `npm run test:before:frontend` and `npm run test:after:frontend` check both interfaces. Install root development dependencies with `npm ci` for browser checks. Build first with `python scripts/build_comparison.py`, then run `node scripts/test-comparison.mjs`. Browser checks import root Playwright. `npm run screenshots` captures both designs through the shared server.

## Data and attribution

Measurements were compiled from Carwow range tests. This project is independent of Carwow. Tests span different dates and conditions. See [third-party notices](THIRD_PARTY_NOTICES.md) for guidance sources. The local `docs/` and `comparison/` folders are excluded from Git; the required slider template is maintained in `scripts/templates/comparison.html`. The workbook is never modified by the application. Generated builds, deployment metadata, dependencies, archive and research content stay outside version control as specified by `.gitignore`.

The public comparison uses GoatCounter (`bhavyap.goatcounter.com`) for page-view analytics. Tracking loads once on the GitHub Pages domain; local previews and the two embedded dashboard views do not load separate trackers.
