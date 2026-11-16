"""Build a standalone HTML comparison; no source dashboards are modified."""
import argparse
import datetime as dt
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dashboard_source', ROOT/'scripts/workbook_source.py')
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


def build(output=None):
    output = Path(output) if output else ROOT/'dist'
    output.mkdir(parents=True, exist_ok=True)
    data = source.parse_workbook((ROOT/'Data.xlsx').read_bytes())
    saved = dt.datetime.fromtimestamp((ROOT/'Data.xlsx').stat().st_mtime, dt.timezone.utc).isoformat()
    frames = []
    for folder in ('dashboard-without-guidelines', 'dashboard-with-guidelines'):
        static = ROOT/folder/'static'
        app = (static/'app.mjs').read_text(encoding='utf-8-sig')
        # Keep battery selection behaviour aligned in the comparison without editing the baseline.
        if folder == 'dashboard-without-guidelines':
            app = app.replace('new Set(available.slice(0,5).map(s=>s.id))', 'new Set(available.map(s=>s.id))')
            app = app.replace('<button data-battery="latest">Latest 5</button>', '')
            app = app.replace('<button data-battery="all">Select all</button>', '<button data-battery="all">All vehicles</button>')
            app = app.replace("b.dataset.battery==='all'?available:b.dataset.battery==='latest'?available.slice(0,5):[]", "b.dataset.battery==='all'?available:[]")
        deps = []
        for dep in re.findall(r"^import .*? from ['\"]\./(.*?)['\"];", app, re.M):
            deps.append((static/dep).read_text(encoding='utf-8-sig').replace('export ', ''))
        app = re.sub(r'^import .*?;\s*', '', app, flags=re.M)
        app = app[:app.index('let polling=false;')]
        loader = '''
state.data=SNAPSHOT;refreshOptions();render();
window.comparisonPage=page=>{state.page=page;render();};
const mode=location.protocol==='about:' && parent.location.protocol.startsWith('http') && parent.location.search.includes('live=1');
function statusNote(text){$('#live-status').textContent=text;}
statusNote(mode?'Connecting to workbook…':'Saved workbook snapshot');
$('#saved').textContent=' · Workbook saved '+new Date(SAVED).toLocaleString('en-GB');
document.querySelector('footer>span:last-child').textContent=mode?'Saved Excel changes refresh automatically.':'Static snapshot. Rebuild to include later Excel edits.';
let lastVersion=null;
async function update(){try{const response=await fetch(new URL('api/data',parent.location.href),{cache:'no-store'});if(!response.ok)throw Error();const result=await response.json();statusNote(result.status==='connected'?'Workbook connected':'Showing previous data; workbook unavailable');if(result.data&&result.version!==lastVersion){state.data=result.data;lastVersion=result.version;refreshOptions();render();}}catch(e){statusNote('Disconnected; showing previous data');}finally{setTimeout(update,1200);}}
if(mode)update();
let comparisonResize;window.addEventListener('resize',()=>{clearTimeout(comparisonResize);comparisonResize=setTimeout(render,100);});
'''
        js = '\n'.join(deps) + '\nconst SNAPSHOT='+json.dumps(data)+';const SAVED='+json.dumps(saved)+';\n'+app+loader
        html = (static/'index.html').read_text(encoding='utf-8-sig')
        html = html.replace('<link rel="stylesheet" href="/style.css">', '<style>'+(static/'style.css').read_text(encoding='utf-8-sig')+'\nhtml{overflow:hidden!important;scroll-behavior:auto!important}body{overflow:visible!important}.chart-scroll,.table-wrap,.vehicle-list{max-height:none!important;height:auto!important;overflow-y:visible!important}.sidebar{scrollbar-width:none}'+ '</style>')
        html = html.replace('<script type="module" src="/app.mjs"></script>', '<script>'+js.replace('</script', '<\\/script')+'</script>')
        frames.append(html)
    template=(ROOT/'scripts/templates/comparison.html').read_text(encoding='utf-8')
    template=template.replace('/* FRAME_DOCUMENTS */', 'const frameDocuments='+json.dumps(frames).replace('<','\\u003c')+';')
    (output/'index.html').write_text(template,encoding='utf-8')
    (output/'.nojekyll').write_text('')
    print(output/'index.html')
    return output


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path)
    build(parser.parse_args().output)
