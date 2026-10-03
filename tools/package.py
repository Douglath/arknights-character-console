#!/usr/bin/env python3
"""Build an allowlisted local ZIP release; never upload or publish it."""
import argparse
import json
from pathlib import Path
import sys
import zipfile

from verify import ROOT, safe_path, sha256, verify

FILES = ('LICENSE', 'NOTICE', 'ASSET-USAGE.md', 'THIRD_PARTY_NOTICES.md', 'README.md',
         'Start-Console.cmd', 'Start-Console.sh', 'version.json', '.gitignore',
         '.gitattributes', 'manifests/models.json')
DIRECTORIES = ('LICENSES', 'docs', 'tools', 'roster', 'showoff/models', 'showoff/runtime-modules/vendor')
EXCLUDED_PARTS = {'.git', '__pycache__', '.pytest_cache', 'node_modules', 'test-results',
                  'playwright-report', 'coverage', 'test-output', 'test-outputs', '.venv'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo', '.zip', '.log', '.tmp', '.bak'}


def package(output):
    verify(models_only=True)
    version = '1.0.0'
    prefix = 'arknights-character-console-v' + version
    output = output.resolve()
    if output == ROOT or output.is_relative_to(ROOT):
        raise ValueError('Release output must be outside the source directory.')
    selected = set()
    for relative in FILES:
        path = safe_path(ROOT, relative)
        if not path.is_file():
            raise ValueError(f'Missing required release file: {relative}')
        selected.add(relative)
    for relative in DIRECTORIES:
        directory = safe_path(ROOT, relative)
        if not directory.is_dir():
            raise ValueError(f'Missing release directory: {relative}')
        for path in directory.rglob('*'):
            rel = path.relative_to(ROOT)
            if not path.is_file() or any(p in EXCLUDED_PARTS for p in rel.parts):
                continue
            if path.suffix.lower() in EXCLUDED_SUFFIXES or path.name in ('SHA256SUMS.txt', '.DS_Store'):
                continue
            safe_path(ROOT, rel.as_posix())
            selected.add(rel.as_posix())
    entries = [{'path': relative, 'bytes': (ROOT / relative).stat().st_size,
                'sha256': sha256(ROOT / relative)} for relative in sorted(selected)]
    manifest = ROOT / 'manifests/files.json'
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({'schema': 1, 'files': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    verify()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / (prefix + '.zip')
    temporary = archive.with_suffix('.zip.tmp')
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED,
                             compresslevel=6, allowZip64=True) as bundle:
            for relative in sorted(selected | {'manifests/files.json'}):
                bundle.write(ROOT / relative, prefix + '/' + relative)
        temporary.replace(archive)
    finally:
        if temporary.exists():
            temporary.unlink()
    digest = sha256(archive)
    (output / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    print(f'Packaged {len(entries) + 1} files; source bytes {sum(e["bytes"] for e in entries) + manifest.stat().st_size:,}; ZIP bytes {archive.stat().st_size:,}.')
    print(archive)
    print(f'SHA-256: {digest}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'arknights-character-console-release')
    args = parser.parse_args()
    try:
        package(args.output)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'PACKAGING FAILED: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
