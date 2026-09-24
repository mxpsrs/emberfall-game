"""Regression for native-cycle trimming at fractional sample boundaries."""
import importlib.util
from pathlib import Path
import numpy as np

path = Path(__file__).resolve().parents[1]/'scripts/import-approved-creature.py'
spec = importlib.util.spec_from_file_location('approved_import', path)
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
frames = np.zeros((4, 2, 10))
frames[:,:,7:] = 1
frames[:,:,0] = np.arange(4)[:,None]
# These quaternions represent the same orientation with alternating signs.
frames[:,:,6] = np.array([1,-1,1,-1])[:,None]
trimmed, duration = module.clip_window(frames, 3, {'range':[.5,1.5]})
trimmed = np.asarray(trimmed)
assert duration == 1
np.testing.assert_allclose(trimmed[0,:,0], .5)
np.testing.assert_allclose(trimmed[-1,:,0], 1.5)
np.testing.assert_allclose(np.linalg.norm(trimmed[:,:,3:7],axis=2), 1)
assert np.isfinite(trimmed).all()
for bounds in [[-1,1],[2,1],[0,4],[1,1]]:
    try: module.clip_window(frames, 3, {'range':bounds})
    except ValueError: pass
    else: raise AssertionError('Invalid source window was accepted')
original, duration = module.clip_window(frames, 3, 'native')
assert original is frames and duration == 3
print('PASS: native windows retain boundary poses and valid rotations; invalid ranges are rejected.')
