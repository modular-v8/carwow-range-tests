"""One local server for the comparison and live workbook data."""
import argparse
import json
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from build_comparison import ROOT, build, source

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8775);p.add_argument('--open',action='store_true');args=p.parse_args()
    directory=build();workbook=source.WorkbookSource(ROOT/'Data.xlsx');stop=threading.Event()
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*a,**k):super().__init__(*a,directory=str(directory),**k)
        def do_GET(self):
            route=self.path.split('?')[0]
            if route in ('/api/data','/before/api/data','/after/api/data'):
                snapshot=workbook.snapshot()
                if route.startswith('/before/'):snapshot['app']='range-observatory-v3'
                body=json.dumps(snapshot,allow_nan=False).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
            elif route.startswith(('/before/','/after/')):
                name=route.split('/')[1]
                self.directory=str(ROOT/('dashboard-without-guidelines' if name=='before' else 'dashboard-with-guidelines')/'static')
                self.path=self.path[len(name)+1:]
                if route in (f'/{name}/',f'/{name}/index.html',f'/{name}/app.mjs'):
                    filename='app.mjs' if route.endswith('/app.mjs') else 'index.html'
                    text=(__import__('pathlib').Path(self.directory)/filename).read_text(encoding='utf-8-sig')
                    text=text.replace('href="/style.css"',f'href="/{name}/style.css"').replace('src="/app.mjs"',f'src="/{name}/app.mjs"').replace("fetch('/api/data'",f"fetch('/{name}/api/data'")
                    body=text.encode();self.send_response(200);self.send_header('Content-Type','text/javascript; charset=utf-8' if filename.endswith('.mjs') else 'text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
                else:super().do_GET()
            else:super().do_GET()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    threading.Thread(target=workbook.watch,args=(stop,),daemon=True).start()
    url=f'http://127.0.0.1:{args.port}/?live=1';print(url,flush=True)
    if args.open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:stop.set();server.server_close()
if __name__=='__main__':main()
