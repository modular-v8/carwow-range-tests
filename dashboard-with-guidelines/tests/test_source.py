"""Integration checks use disposable workbook copies; never edit Data.xlsx."""
import io
import copy
import json
import os
import sys
import time
import unittest
import uuid
from contextlib import contextmanager
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "scripts"))
from workbook_source import WorkbookSource, parse_workbook

SOURCE = ROOT.parent / 'Data.xlsx'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


@contextmanager
def scratch(prefix):
    # Default inherited Windows ACLs work in restricted workspaces; tempfile's
    # private-directory ACL can exclude the current sandbox token.
    path = ROOT / 'tests' / (prefix + uuid.uuid4().hex)
    path.mkdir()
    try:
        yield path
    finally:
        for child in path.iterdir():
            child.unlink()
        path.rmdir()


def edit_cell(blob, sheet, address, value):
    """Change a raw XML input, deliberately leaving derived formula caches stale."""
    out = io.BytesIO()
    target = f'xl/worksheets/sheet{sheet}.xml'
    with zipfile.ZipFile(io.BytesIO(blob)) as source, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dest:
        for entry in source.infolist():
            content = source.read(entry.filename)
            if entry.filename == target:
                tree = ET.fromstring(content)
                cell = tree.find(f'.//s:c[@r="{address}"]', NS)
                if cell is None:
                    raise AssertionError(f'Missing fixture cell {address}')
                for child in list(cell):
                    cell.remove(child)
                cell.attrib.pop('t', None)
                if isinstance(value, str):
                    cell.set('t', 'inlineStr')
                    inline = ET.SubElement(cell, '{'+NS['s']+'}is')
                    ET.SubElement(inline, '{'+NS['s']+'}t').text = value
                elif value is not None:
                    ET.SubElement(cell, '{'+NS['s']+'}v').text = str(value)
                content = ET.tostring(tree, encoding='utf-8', xml_declaration=True)
            dest.writestr(entry, content)
    return out.getvalue()


class WorkbookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blob = SOURCE.read_bytes()
        cls.data = parse_workbook(cls.blob)

    def test_source_counts_and_benchmarks(self):
        self.assertEqual(len(self.data['ev']), 62)
        self.assertEqual(len({r['make'] for r in self.data['ev']}), 27)
        self.assertEqual(sorted(r['actual'] for r in self.data['ice']), [433, 730])
        self.assertEqual(len(self.data['series']), 54)
        self.assertEqual(self.data['plotRows'], 432)
        self.assertEqual(self.data['plotExcluded'], 1)

    def test_expected_aggregates_and_missing_values(self):
        ev = self.data['ev']
        self.assertAlmostEqual(sum(r['achievement'] for r in ev)/len(ev), 85.1956224840686)
        self.assertEqual(sum(r['reserve'] is None for r in ev), 12)
        self.assertEqual(sum(r['weight'] is None for r in ev), 1)
        for r in ev:
            self.assertAlmostEqual(r['efficiency'], r['actual']/r['capacity'])
            if r['reserve'] is not None:
                self.assertAlmostEqual(r['beforeZero'] + r['reserve'], r['actual'])
        json.dumps(self.data, allow_nan=False)

    def test_input_edit_recomputes_despite_stale_excel_formulas(self):
        changed = parse_workbook(edit_cell(self.blob, 1, 'J2', 160))
        mini = next(r for r in changed['ev'] if r['sourceRow'] == 2)
        self.assertAlmostEqual(mini['achievement'], 160/145*100)
        self.assertAlmostEqual(mini['efficiency'], 160/32.6)
        self.assertEqual(mini['beforeZero'], 140)

    def test_blank_and_zero_reserve_are_different(self):
        blank = parse_workbook(edit_cell(self.blob, 1, 'P2', None))['ev'][0]
        zero = parse_workbook(edit_cell(self.blob, 1, 'P2', 0))['ev'][0]
        self.assertIsNone(blank['reserve'])
        self.assertIsNone(blank['beforeZero'])
        self.assertEqual(zero['reserve'], 0)
        self.assertEqual(zero['beforeZero'], zero['actual'])

    def test_impossible_reserve_and_zero_capacity_are_excluded(self):
        changed = edit_cell(edit_cell(self.blob, 1, 'P2', 1000), 1, 'G2', 0)
        parsed = parse_workbook(changed)
        self.assertIsNone(parsed['ev'][0]['reserve'])
        self.assertIsNone(parsed['ev'][0]['efficiency'])
        self.assertGreater(len(parsed['issues']), len(self.data['issues']))

    def test_ambiguous_battery_join_is_not_silently_assigned(self):
        # Rows 2 and 4 share a date. Rename row 4's manufacturer to row 2's.
        data = parse_workbook(edit_cell(self.blob, 1, 'B4', 'Mini'))
        self.assertGreater(data['plotExcluded'], self.data['plotExcluded'])
        self.assertFalse(any(s['id'].startswith('EV|Mini|') for s in data['series']))

    def test_required_header_error_is_actionable(self):
        with self.assertRaisesRegex(ValueError, 'missing columns: Claimed Range'):
            parse_workbook(edit_cell(self.blob, 1, 'H1', 'Wrong header'))

    def test_appended_record_is_read_before_excel_expands_table(self):
        out = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.blob)) as source, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dest:
            for entry in source.infolist():
                content = source.read(entry.filename)
                if entry.filename == 'xl/worksheets/sheet1.xml':
                    tree = ET.fromstring(content)
                    row = copy.deepcopy(tree.find('.//s:row[@r="2"]', NS))
                    row.set('r', '66')
                    for cell in row:
                        cell.set('r', cell.get('r').rstrip('0123456789')+'66')
                    tree.find('s:sheetData', NS).append(row)
                    content = ET.tostring(tree, encoding='utf-8', xml_declaration=True)
                dest.writestr(entry, content)
        data = parse_workbook(edit_cell(out.getvalue(), 1, 'B66', 'New Manufacturer'))
        self.assertEqual(len(data['ev']), 63)
        self.assertEqual(len({r['make'] for r in data['ev']}), 28)
        self.assertEqual(data['ev'][-1]['make'], 'New Manufacturer')

    def test_atomic_save_refresh_stale_data_and_recovery(self):
        with scratch('range-watch-') as temp:
            path = Path(temp)/'Data.xlsx'
            path.write_bytes(self.blob)
            watcher = WorkbookSource(path, debounce=0)
            watcher.poll()
            original = watcher.snapshot()
            self.assertEqual(original['status'], 'connected')
            replacement = path.with_suffix('.new')
            replacement.write_bytes(edit_cell(self.blob, 1, 'J2', 160))
            replacement.replace(path)
            watcher.poll()
            changed = watcher.snapshot()
            self.assertNotEqual(original['version'], changed['version'])
            self.assertEqual(changed['data']['ev'][0]['actual'], 160)
            path.write_bytes(b'incomplete Excel save')
            watcher.poll()
            self.assertEqual(watcher.snapshot()['status'], 'stale')
            self.assertEqual(watcher.snapshot()['data']['ev'][0]['actual'], 160)
            path.write_bytes(self.blob)
            watcher.next_retry = 0
            watcher.poll()
            self.assertEqual(watcher.snapshot()['status'], 'connected')
            self.assertEqual(watcher.snapshot()['data']['ev'][0]['actual'], 154)
            path.unlink()
            watcher.poll()
            self.assertEqual(watcher.snapshot()['status'], 'stale')

    def test_debounce_waits_for_stable_file(self):
        with scratch('range-debounce-') as temp:
            path = Path(temp)/'Data.xlsx'
            path.write_bytes(self.blob)
            watcher = WorkbookSource(path, debounce=.05)
            watcher.poll()
            self.assertEqual(watcher.snapshot()['status'], 'loading')
            time.sleep(.07)
            watcher.poll()
            self.assertEqual(watcher.snapshot()['status'], 'connected')


if __name__ == '__main__':
    unittest.main()
