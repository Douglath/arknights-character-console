#!/usr/bin/env python3
"""Verify the console's models and, when available, its release file manifest."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def safe_path(root, relative):
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative:
        raise ValueError(f'Unsafe relative path: {relative!r}')
    parts = PurePosixPath(relative)
    if parts.is_absolute() or '..' in parts.parts or parts.as_posix() != relative:
        raise ValueError(f'Unsafe relative path: {relative!r}')
    target = root.joinpath(*parts.parts).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f'Path escapes package: {relative!r}')
    return target


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify(root=ROOT, models_only=False):
    roster = json.loads((root / 'roster/data/roster.json').read_text(encoding='utf-8'))
    records, summary = roster['records'], roster['summary']
    require(len(records) == 426, f'Expected 426 records, found {len(records)}')
    for field in ('key', 'asset'):
        require(len({r[field] for r in records}) == len(records), f'Duplicate {field}')
    for field, record_field in (('models', 'key'), ('forms', 'form'), ('persons', 'person')):
        actual = len({r[record_field] for r in records})
        require(summary[field] == actual, f'Summary {field}: {summary[field]} != {actual}')
    expected_models = set()
    for record in records:
        key = record['key']
        require(isinstance(record['asset'], str) and '/' not in record['asset'], f'Unsafe asset: {key}')
        require(record['glb'].startswith('models/'), f'Unexpected model path: {key}')
        model = safe_path(root, 'showoff/' + record['glb'])
        expected_models.add(model)
        require(model.is_file(), f'Missing GLB: {key}')
        require(sha256(model) == record['glbSha256'], f'GLB SHA mismatch: {key}')
        portrait = safe_path(root, 'roster/data/portraits/' + record['asset'] + '.webp')
        require(portrait.is_file(), f'Missing portrait: {key}')
        with model.open('rb') as stream:
            header = stream.read(20)
            require(len(header) == 20, f'Truncated GLB: {key}')
            magic, version, size, length, kind = struct.unpack('<5I', header)
            require(magic == 0x46546C67 and version == 2 and size == model.stat().st_size,
                    f'Invalid GLB header: {key}')
            require(kind == 0x4E4F534A and 0 < length <= size - 20, f'Invalid JSON chunk: {key}')
            data = json.loads(stream.read(length))
        for group in ('buffers', 'images'):
            for item in data.get(group, []):
                uri = item.get('uri')
                require(uri is None or (isinstance(uri, str) and uri.startswith('data:')),
                        f'External {group} URI: {key}')
    actual_models = {p.resolve() for p in (root / 'showoff/models').rglob('*.glb')}
    require(actual_models == expected_models, 'GLB file inventory differs from roster')
    print(f'Model verification passed: {len(records)} models, {summary["forms"]} forms, 426 portraits; no external GLB resources.')
    manifest = root / 'manifests/files.json'
    if models_only or not manifest.exists():
        print('Model checks only; release file manifest was not checked.' if models_only else
              'No manifests/files.json: only models and portrait presence were verified, not full-package integrity.')
        return
    data = json.loads(manifest.read_text(encoding='utf-8'))
    require(data.get('schema') == 1, 'Unsupported file manifest schema')
    seen = set()
    for entry in data['files']:
        relative = entry['path']
        require(relative not in seen and relative != 'manifests/files.json', f'Duplicate/self manifest entry: {relative}')
        seen.add(relative)
        path = safe_path(root, relative)
        require(path.is_file(), f'Missing release file: {relative}')
        require(path.stat().st_size == entry['bytes'], f'File size mismatch: {relative}')
        require(sha256(path) == entry['sha256'], f'File SHA mismatch: {relative}')
    require(bool(seen), 'Empty release file manifest')
    print(f'Release manifest verification passed: {len(seen)} files.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models-only', action='store_true')
    args = parser.parse_args()
    try:
        verify(models_only=args.models_only)
    except (OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print(f'VERIFICATION FAILED: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
