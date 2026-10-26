#!/usr/bin/env python3
"""Create the roadmap's milestones and issues on GitHub from issues.json.

Preview (default): prints what would be created and changes nothing.
Create:            GITHUB_TOKEN=... python3 scripts/github/create_issues.py --apply
The token needs "Issues: read and write" on the repository. Safe to run twice: items whose titles already exist are skipped.
"""
import json, os, sys, urllib.request, urllib.error

APPLY = '--apply' in sys.argv
data = json.load(open(os.path.join(os.path.dirname(__file__), 'issues.json')))
repo = data['repo']
token = os.environ.get('GITHUB_TOKEN', '')

def call(method, path, body=None):
    req = urllib.request.Request(f'https://api.github.com{path}', method=method, data=json.dumps(body).encode() if body else None,
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'openlobs-roadmap'})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'GitHub said {e.code} for {method} {path}: {e.read().decode()[:300]}')

if not APPLY:
    print(f'PREVIEW for {repo}. Nothing will be created. Add --apply to create.\n')
    print(f'{len(data["milestones"])} milestones:'); [print('  ', m['title']) for m in data['milestones']]
    print(f'\n{len(data["issues"])} issues:'); [print(f'  [{i["milestone"]}] {i["title"]}') for i in data['issues']]
    sys.exit(0)

if not token: raise SystemExit('Set GITHUB_TOKEN first.')
existing_ms = {m['title']: m['number'] for m in call('GET', f'/repos/{repo}/milestones?state=all&per_page=100')}
number = {}
for m in data['milestones']:
    if m['title'] in existing_ms: number[m['key']] = existing_ms[m['title']]; print('exists   milestone', m['title']); continue
    number[m['key']] = call('POST', f'/repos/{repo}/milestones', {'title': m['title'], 'description': m['description']})['number']; print('created  milestone', m['title'])
have = {i['title'] for p in range(1, 6) for i in call('GET', f'/repos/{repo}/issues?state=all&per_page=100&page={p}') if 'pull_request' not in i}
for i in data['issues']:
    if i['title'] in have: print('exists   ', i['title']); continue
    call('POST', f'/repos/{repo}/issues', {'title': i['title'], 'body': i['body'], 'milestone': number.get(i['milestone']), 'labels': i['labels']}); print('created  ', i['title'])
