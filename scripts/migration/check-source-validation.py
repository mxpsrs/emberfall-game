"""Permit only unchanged, explicitly recorded defects in preserved original source.
Production/authoring derivatives are checked strictly by validate-gltf.mjs.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
expected={r['path']:r for r in json.loads((ROOT/'migration/source-validation-baseline.json').read_text())}
actual=json.loads((ROOT/'migration/reports/original-validation.json').read_text())
errors=[]
for row in actual['records']:
 if not row['errors']:continue
 old=expected.get(row['path'])
 if not old or row['sha256']!=old['sha256'] or row['errors']!=old['errors']:errors.append({'path':row['path'],'error':'New or changed original-source validation defect'})
if errors:raise ValueError(json.dumps(errors))
print('Preserved original-source defects match exact recorded bytes; production validation remains strict.')
