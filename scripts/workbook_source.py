"""Shared read-only workbook parser and save watcher."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import math
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import openpyxl
from openpyxl.utils.cell import range_boundaries

BASE = Path(__file__).resolve().parent


def number(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return float(value)
    return None


def date(value):
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    return value.isoformat() if isinstance(value, dt.date) else str(value or '').strip()


def table(book, name, required):
    for sheet in book:
        if name not in sheet.tables:
            continue
        definition = sheet.tables[name]
        left, top, right, bottom = range_boundaries(definition.ref)
        headers = [str(sheet.cell(top, c).value or '').strip() for c in range(left, right + 1)]
        missing = set(required) - set(headers)
        if missing:
            raise ValueError(f'{name}: missing columns: {", ".join(sorted(missing))}')
        # A contiguous row appended immediately below a table also participates.
        while bottom < sheet.max_row and any(sheet.cell(bottom + 1, c).value is not None for c in range(left, right + 1)):
            bottom += 1
        end = bottom - int(bool(definition.totalsRowShown or definition.totalsRowCount))
        return [
            (r, dict(zip(headers, [sheet.cell(r, c).value for c in range(left, right + 1)])))
            for r in range(top + 1, end + 1)
            if any(sheet.cell(r, c).value is not None for c in range(left, right + 1))
        ]
    raise ValueError(f'Missing Excel table: {name}')


def parse_workbook(blob):
    book = openpyxl.load_workbook(io.BytesIO(blob), data_only=True)
    issues = []
    try:
        general = table(book, 'EV_Data', ['Category', 'Make', 'Model', 'Test Date', 'Actual Range (mi)', 'Claimed Range (mi)', 'Battery Capacity (kWh)', 'Distance covered after 0% Battery (mi)'])
        ev, general_ice, seen = [], [], {}

        def record(row, source_row, category):
            make = str(row.get('Make') or '').strip()
            model = str(row.get('Model') or '').strip()
            if not make or not model:
                issues.append(f'{category} row {source_row}: missing make/model; row excluded.')
                return None
            trim = str(row.get('Trim') or '').strip()
            name = ' '.join(filter(None, [make, model, trim]))
            day = date(row.get('Test Date'))
            year = row.get('Model Year')
            year = str(int(year)) if number(year) is not None else str(year or '')
            key = '|'.join([category, make, model, trim, year, day])
            seen[key] = seen.get(key, 0) + 1
            rec = dict(id=f'{key}|{seen[key]}', name=name, make=make, model=model, trim=trim, year=year, date=day, category=category, sourceRow=source_row)
            for field, col in [('actual', 'Actual Range (mi)'), ('claimed', 'Claimed Range (mi)'), ('capacity', 'Battery Capacity (kWh)'), ('weight', 'Weight (kg)'), ('reserve', 'Distance covered after 0% Battery (mi)'), ('reportedEfficiency', 'Overall Efficiency (mi/kWh) - as given in video')]:
                raw = row.get(col)
                val = number(raw)
                if val is not None and (val < 0 or (field in ('claimed', 'capacity', 'weight') and val == 0)):
                    val = None
                if raw is not None and val is None:
                    issues.append(f'{name}, {day}: invalid {col}; treated as missing.')
                rec[field] = val
            if rec['reserve'] is not None and (rec['actual'] is None or rec['reserve'] > rec['actual']):
                issues.append(f'{name}, {day}: distance after 0% exceeds total or total is missing; reserve excluded.')
                rec['reserve'] = None
            rec['achievement'] = 100 * rec['actual'] / rec['claimed'] if rec['actual'] is not None and rec['claimed'] else None
            rec['efficiency'] = rec['actual'] / rec['capacity'] if rec['actual'] is not None and rec['capacity'] else None
            rec['beforeZero'] = rec['actual'] - rec['reserve'] if rec['actual'] is not None and rec['reserve'] is not None else None
            rec['shortfall'] = rec['claimed'] - rec['actual'] if rec['claimed'] is not None and rec['actual'] is not None else None
            return rec

        for index, row in general:
            category = str(row.get('Category') or '').strip().upper()
            if category not in ('EV', 'ICE'):
                issues.append(f'EV_Data row {index}: unknown category; row excluded.')
                continue
            rec = record(row, index, category)
            if rec:
                (ev if category == 'EV' else general_ice).append(rec)
        ice = []
        for index, row in table(book, 'ICE_Data', ['Make', 'Model', 'Test Date', 'Actual Range (mi)']):
            rec = record(row, index, 'ICE')
            if rec:
                ice.append(rec)
                matches = [x for x in general_ice if x['name'] == rec['name'] and x['date'] == rec['date']]
                if len(matches) != 1 or matches[0]['actual'] != rec['actual']:
                    issues.append(f'{rec["name"]}: ICE_Data differs from EV_Data; ICE_Data used for the combustion benchmark.')
        points = table(book, 'Battery_Depletion', ['Make', 'Test Date', 'Distance Covered (mi)', 'Remaining Battery (%)'])
        series, excluded = {}, 0
        for index, row in points:
            matches = [x for x in ev if x['make'] == str(row.get('Make') or '').strip() and x['date'] == date(row.get('Test Date'))]
            x, y = number(row.get('Distance Covered (mi)')), number(row.get('Remaining Battery (%)'))
            if len(matches) != 1 or x is None or x < 0 or y is None or not 0 <= y <= 1:
                excluded += 1
                issues.append(f'Battery_Depletion row {index}: missing/invalid point or ambiguous make + test date; point excluded.')
                continue
            vehicle = matches[0]
            series.setdefault(vehicle['id'], dict(id=vehicle['id'], name=vehicle['name'], date=vehicle['date'], points=[]))['points'].append([x, y * 100])
        for item in series.values():
            item['points'] = sorted([list(p) for p in set(tuple(p) for p in item['points'])])
        return dict(ev=ev, ice=ice, series=list(series.values()), issues=issues, sourceRows=len(general), plotRows=len(points), plotExcluded=excluded)
    finally:
        book.close()


class WorkbookSource:
    """Debounce Excel's atomic save, retry failed reads, retain the last good data."""
    def __init__(self, path, debounce=0.6):
        self.path = Path(path).resolve()
        self.debounce = debounce
        self.lock = threading.Lock()
        self.candidate = self.last_signature = None
        self.stable_since = 0
        self.next_retry = 0
        self.state = dict(status='loading', data=None, version=None, saved=None, refreshed=None, message='Reading Data.xlsx…')

    def snapshot(self):
        with self.lock:
            return dict(self.state, app='range-observatory-swiss', workbook=self.path.name)

    def poll(self):
        now = time.monotonic()
        if now < self.next_retry:
            return
        try:
            stat = self.path.stat()
            signature = (stat.st_mtime_ns, stat.st_size)
            if signature != self.candidate:
                self.candidate, self.stable_since = signature, now
            if now - self.stable_since < self.debounce:
                return
            if signature == self.last_signature and self.state['status'] == 'connected':
                return
            blob = self.path.read_bytes()
            after = self.path.stat()
            if (after.st_mtime_ns, after.st_size) != signature:
                raise OSError('Workbook is still being saved')
            data = parse_workbook(blob)
            with self.lock:
                self.state = dict(status='connected', data=data, version=hashlib.sha256(blob).hexdigest(), saved=dt.datetime.fromtimestamp(stat.st_mtime, dt.timezone.utc).isoformat(), refreshed=dt.datetime.now(dt.timezone.utc).isoformat(), message='Connected to Data.xlsx')
            self.last_signature = signature
        except Exception as exc:
            self.next_retry = now + 1
            with self.lock:
                self.state = dict(self.state, status='stale' if self.state['data'] is not None else 'invalid', message=f'{type(exc).__name__}: {exc}. Retrying automatically.')

    def watch(self, stop):
        while not stop.is_set():
            self.poll()
            stop.wait(0.3)

