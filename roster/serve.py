"""Offline character console: Python 3.10+, standard library only.

python roster/serve.py [--port 8781] [--no-browser]
Default port falls back to an available port. Explicit --port must be free;
--port 0 asks the OS to choose an available port.
"""
import argparse
import errno
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
RELEASES = 'https://github.com/Douglath/arknights-character-console/releases'
ALLOWED_DIRS = (
    'roster/site', 'roster/shared', 'roster/data', 'roster/assets',
    'showoff/models', 'showoff/runtime-modules/vendor', 'LICENSES',
)
ALLOWED_FILES = {
    'LICENSE', 'LICENSE.md', 'COPYRIGHT.md', 'THIRD_PARTY_NOTICES.md',
    'ASSET-LICENSE.md', 'ATTRIBUTION.md', 'NOTICE', 'ASSET-USAGE.md', 'README.md',
}


def allowed(rel):
    return rel in ALLOWED_FILES or any(
        rel == prefix or rel.startswith(prefix + '/') for prefix in ALLOWED_DIRS
    )


def public_file(route):
    """Reject traversal, hidden files, directory listings and symlink escapes."""
    rel = route.removeprefix('/')
    if '\\' in rel or ':' in rel or '\x00' in rel:
        return None
    if any(part.startswith('.') for part in rel.split('/')) or not allowed(rel):
        return None
    try:
        candidate = (ROOT / rel).resolve()
        if not candidate.is_relative_to(ROOT):
            return None
        real_rel = candidate.relative_to(ROOT).as_posix()
        if not allowed(real_rel) or any(part.startswith('.') for part in real_rel.split('/')):
            return None
        if candidate.is_dir():
            return public_file('/' + real_rel + '/index.html')
        return candidate if candidate.is_file() else None
    except (OSError, ValueError, RuntimeError):
        return None


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'text/javascript', '.js': 'text/javascript',
        '.glb': 'model/gltf-binary', '.webp': 'image/webp',
        '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        # GET and HEAD share the same validation.
        try:
            route = unquote(urlsplit(self.path).path, errors='strict')
        except (ValueError, UnicodeError):
            self.send_error(404)
            return None
        if route in ('/', '/roster', '/roster/'):
            self.send_response(302)
            self.send_header('Location', '/roster/site/')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        path = public_file(route)
        if path is None:
            self.send_error(404)
            return None
        try:
            stream = path.open('rb')
        except OSError:
            self.send_error(404)
            return None
        self.send_response(200)
        mime = 'text/plain; charset=utf-8' if path.name in ('LICENSE', 'NOTICE') else self.guess_type(str(path))
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(path.stat().st_size))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        return stream

    def list_directory(self, path):
        self.send_error(404)
        return None

    def log_message(self, *_):
        pass


def check_resources():
    try:
        records = json.loads((ROOT / 'roster/data/roster.json').read_text(encoding='utf-8'))['records']
        if not isinstance(records, list) or not records:
            raise ValueError('The model list is empty or invalid.')
        required = set()
        for record in records:
            model = record['glb']
            if not isinstance(model, str) or not model.startswith('models/') or not model.endswith('.glb'):
                raise ValueError('The model list contains an invalid model path.')
            required.add('showoff/' + model)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ValueError('Missing or invalid roster/data/roster.json: ' + str(exc)) from exc
    missing = sorted(path for path in required if public_file('/' + path) is None)
    essentials = (
        'roster/site/index.html',
        'showoff/runtime-modules/vendor/three/build/three.module.js',
        'showoff/runtime-modules/vendor/three/build/three.core.js',
        'showoff/runtime-modules/vendor/three/examples/jsm/loaders/GLTFLoader.js',
    )
    missing.extend(path for path in essentials if public_file('/' + path) is None)
    if missing:
        sample = '\n'.join('  ' + path for path in missing[:5])
        raise ValueError(f'Missing {len(missing)} required resource(s):\n{sample}')
    return len(required)


def main():
    if sys.version_info < (3, 10):
        print('Python 3.10 or newer is required. Install Python from https://www.python.org/downloads/', file=sys.stderr)
        return 1
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--port', type=int, default=None)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if args.port is not None and not 0 <= args.port <= 65535:
        parser.error('--port must be between 0 and 65535')
    try:
        models = check_resources()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        print('\nDownload and extract the complete offline ZIP from the public Releases page:', file=sys.stderr)
        print(RELEASES, file=sys.stderr)
        print('The GitHub source-code ZIP does not include the model assets.\nIf no release is listed yet, the complete ZIP has not been published.', file=sys.stderr)
        return 1
    port = 8781 if args.port is None else args.port
    try:
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
        except OSError as exc:
            if args.port is not None or exc.errno not in (errno.EADDRINUSE, errno.EACCES, 10048, 10013):
                raise
            server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    except OSError as exc:
        print(f'Cannot start local server: {exc}\nTry --port 0 to use an available port.', file=sys.stderr)
        return 1
    url = f'http://127.0.0.1:{server.server_port}/roster/site/'
    print(json.dumps({'console': url, 'models': models}), flush=True)
    print('Keep this window open. Press Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
