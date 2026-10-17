#!/usr/bin/env python3
"""Turn an OpenAPI/Swagger file into the spec JSON that api-reference-layout.html draws.

Usage:
  python3 openapi_to_spec.py swagger.yaml --allow allowlist.json --out spec.json
  python3 openapi_to_spec.py swagger.yaml --out spec.json          # no allowlist: everything shows "Not reviewed"

allowlist.json (optional, YOU own it, it is the source of truth for what is allowed):
  {"rates/getAll": "read", "rates/update": "write", "rates/delete": "off"}

Then paste spec.json into the <script id="spec"> block of the HTML (or run with --html to do it for you).
Needs: pip install pyyaml   (only if the file is YAML)
"""
import argparse, json, re, sys, hashlib

def load(path):
    raw = open(path, 'rb').read()
    txt = raw.decode('utf-8')
    if path.endswith(('.yaml', '.yml')):
        import yaml
        return yaml.safe_load(txt), hashlib.sha256(raw).hexdigest()[:16]
    return json.loads(txt), hashlib.sha256(raw).hexdigest()[:16]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec'); ap.add_argument('--allow'); ap.add_argument('--out', default='spec.json')
    ap.add_argument('--html', help='write the spec into this HTML file instead of only --out')
    ap.add_argument('--brand', default='YOUR ORG'); ap.add_argument('--title', default='API reference')
    a = ap.parse_args()

    api, fp = load(a.spec)
    allow = json.load(open(a.allow)) if a.allow else {}
    info = api.get('info', {})
    groups = {}
    for path, item in (api.get('paths') or {}).items():
        for method, op in item.items():
            if method not in ('get', 'post', 'put', 'patch', 'delete') or not isinstance(op, dict):
                continue
            key = path.strip('/').split('api/connector/v1/')[-1]
            tag = (op.get('tags') or [key.split('/')[0]])[0]
            mode = allow.get(key)
            status = {'read': {'s': 'pass', 't': 'Allowed'}, 'write': {'s': 'review', 't': 'Plan only'},
                      'off': {'s': 'off', 't': 'Closed'}}.get(mode, {'s': 'manual', 't': 'Not reviewed'})
            desc = (op.get('summary') or op.get('description') or '').strip().split('\n')[0][:160]
            groups.setdefault(tag, []).append({'mode': 'write' if mode == 'write' else 'read',
                                               'path': key, 'status': status, 'desc': desc})
    sections = [{'id': 'overview', 'group': 'Start', 'title': 'Overview', 'lede': info.get('description', '')[:300].split('\n')[0],
                 'blocks': [{'type': 'kv', 'items': [['API', info.get('title', '')], ['Version', str(info.get('version', ''))],
                            ['Operations in file', str(sum(len(v) for v in groups.values()))],
                            ['Allowed by us', str(len([1 for v in allow.values() if v != 'off']))],
                            ['File fingerprint', fp]]}]}]
    for tag in sorted(groups):
        sections.append({'id': 'op-' + re.sub(r'\W+', '_', tag.lower()), 'group': 'Operations', 'title': tag,
                         'lede': '', 'blocks': [{'type': 'ops', 'rows': sorted(groups[tag], key=lambda r: r['path'])}]})
    out = {'brand': a.brand, 'title': a.title, 'intro': info.get('title', ''), 'badge': '',
           'stamp': 'Built from %s %s (fingerprint %s)' % (info.get('title', 'API'), info.get('version', ''), fp), 'sections': sections}
    json.dump(out, open(a.out, 'w'), indent=1, ensure_ascii=False)
    if a.html:
        h = open(a.html, encoding='utf-8').read()
        h2 = re.sub(r'(<script type="application/json" id="spec">).*?(</script>)',
                    lambda m: m.group(1) + '\n' + json.dumps(out, ensure_ascii=False).replace('</', '<\\/') + '\n' + m.group(2), h, count=1, flags=re.S)
        open(a.html, 'w', encoding='utf-8').write(h2)
    print('wrote', a.out, '-', sum(len(v) for v in groups.values()), 'operations in', len(groups), 'groups')

if __name__ == '__main__':
    main()
