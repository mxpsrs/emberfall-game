"""Retarget CC0 Universal Animation Library motion onto the shipped human rigs.

Usage: python scripts/import-authored-motion.py .asset-cache/quaternius
The original character meshes and world art are preserved. The two source packs
are available from quaternius.itch.io; source names and hashes are recorded below.
"""
import base64
import hashlib
import json
import math
import pathlib
import struct
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]


def packed(values, dtype='<f4'):
    return base64.b64encode(np.asarray(values, dtype=dtype).tobytes()).decode()


def trs(t, q, s):
    x, y, z, w = q
    m = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w), t[0]],
                  [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w), t[1]],
                  [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y), t[2]],
                  [0, 0, 0, 1]], dtype=float)
    m[:3, :3] *= s
    return m


class Gltf:
    def __init__(self, path):
        self.path = path
        raw = path.read_bytes()
        if path.suffix == '.glb':
            length = struct.unpack_from('<I', raw, 12)[0]
            self.g = json.loads(raw[20:20+length])
            binary_length = struct.unpack_from('<I', raw, 20+length)[0]
            self.buffers = [raw[28+length:28+length+binary_length]]
        else:
            self.g = json.loads(raw)
            self.buffers = [base64.b64decode(b['uri'].split(',')[1])
                            if b['uri'].startswith('data:') else (path.parent/b['uri']).read_bytes()
                            for b in self.g['buffers']]
        self.nodes = self.g['nodes']
        self.names = {n['name']: i for i, n in enumerate(self.nodes)}
        self.parent = {c: i for i, n in enumerate(self.nodes) for c in n.get('children', [])}
        self.accessors = {}
        self.animations = {}
        for a in self.g.get('animations', []):
            channels = []
            for ch in a['channels']:
                sampler = a['samplers'][ch['sampler']]
                assert sampler.get('interpolation', 'LINEAR') in ('LINEAR', 'STEP')
                channels.append((ch['target']['node'], ch['target']['path'],
                                 self.acc(sampler['input']).ravel(), self.acc(sampler['output']),
                                 sampler.get('interpolation', 'LINEAR')))
            self.animations[a['name']] = channels
        self.rest = self.pose()

    def acc(self, index):
        if index in self.accessors:
            return self.accessors[index]
        a = self.g['accessors'][index]
        v = self.g['bufferViews'][a['bufferView']]
        dtype = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        item = np.dtype(dtype).itemsize
        result = np.ndarray((a['count'], width), dtype=dtype, buffer=self.buffers[v['buffer']],
                            offset=v.get('byteOffset', 0)+a.get('byteOffset', 0),
                            strides=(v.get('byteStride', item*width), item)).copy()
        self.accessors[index] = result
        return result

    def duration(self, name):
        return max(ch[2][-1] for ch in self.animations[name])

    def pose(self, name=None, age=0, overrides=None):
        changes = {}
        for node, prop, times, values, interpolation in self.animations.get(name, []):
            lo = max(0, min(len(times)-1, np.searchsorted(times, age, side='right')-1))
            hi = min(lo+1, len(times)-1)
            t = np.clip((age-times[lo])/(times[hi]-times[lo]), 0, 1) if hi != lo else 0
            a, b = values[lo], values[hi]
            if prop == 'rotation' and np.dot(a, b) < 0:
                b = -b
            value = a if interpolation == 'STEP' else a+(b-a)*t
            if prop == 'rotation':
                value = value/np.linalg.norm(value)
            changes.setdefault(node, {})[prop] = value
        for node, values in (overrides or {}).items():
            changes.setdefault(node, {}).update(values)
        out = {}

        def visit(i):
            if i not in out:
                n = self.nodes[i]
                c = changes.get(i, {})
                m = np.array(n['matrix']).reshape(4, 4).T if 'matrix' in n else trs(
                    c.get('translation', n.get('translation', [0, 0, 0])),
                    c.get('rotation', n.get('rotation', [0, 0, 0, 1])),
                    c.get('scale', n.get('scale', [1, 1, 1])))
                out[i] = visit(self.parent[i])@m if i in self.parent else m
            return out[i]

        for i in range(len(self.nodes)):
            visit(i)
        return out


def quaternion(r):
    # Eigen decomposition is stable for rotations close to 180 degrees too.
    xx, yx, zx = r[:, 0]
    xy, yy, zy = r[:, 1]
    xz, yz, zz = r[:, 2]
    k = np.array([[xx-yy-zz, yx+xy, zx+xz, zy-yz],
                  [yx+xy, yy-xx-zz, zy+yz, xz-zx],
                  [zx+xz, zy+yz, zz-xx-yy, yx-xy],
                  [zy-yz, xz-zx, yx-xy, xx+yy+zz]])/3
    _, vectors = np.linalg.eigh(k)
    q = vectors[:, -1]
    return q if q[3] >= 0 else -q


class Retarget:
    def __init__(self, source, target):
        self.source, self.target = source, target
        self.joints = target.g['skins'][0]['joints']
        self.order = {node: i for i, node in enumerate(self.joints)}
        self.parents = [self.order.get(target.parent.get(node), -1) for node in self.joints]
        assert all(parent < i for i, parent in enumerate(self.parents))
        self.local = {i: np.linalg.inv(target.rest[target.parent[i]])@target.rest[i]
                      if i in target.parent else target.rest[i] for i in range(len(target.nodes))}
        self.scale = target.rest[target.names['pelvis']][1, 3]/source.rest[source.names['pelvis']][1, 3]
        self.rest_inverse = {name: np.linalg.inv(source.rest[i][:3, :3]) for name, i in source.names.items()}

    def pose(self, clip, age):
        src = self.source.pose(clip, age)
        out = {}

        def visit(i):
            if i in out:
                return out[i]
            name = self.target.nodes[i]['name']
            parent = self.target.parent.get(i)
            m = visit(parent)@self.local[i] if parent is not None else self.local[i].copy()
            if name in self.source.names:
                source_node = self.source.names[name]
                m[:3, :3] = src[source_node][:3, :3]@self.rest_inverse[name]@self.target.rest[i][:3, :3]
                if name == 'pelvis':
                    m[:3, 3] += (src[source_node][:3, 3]-self.source.rest[source_node][:3, 3])*self.scale
            out[i] = m
            return m

        for i in range(len(self.target.nodes)):
            visit(i)
        return out

    def local_trs(self, pose):
        result = []
        for node, parent in zip(self.joints, self.parents):
            m = np.linalg.inv(pose[self.joints[parent]])@pose[node] if parent >= 0 else pose[node]
            scale = np.linalg.norm(m[:3, :3], axis=0)
            rotation = m[:3, :3]/scale
            q = quaternion(rotation)
            assert np.max(abs(trs(m[:3, 3], q, scale)-m)) < 1e-5
            result.append([*m[:3, 3], *q, *scale])
        return result

    def grip(self, side):
        pose = self.pose('Sword_Idle', 0)
        hand = np.linalg.inv(pose[self.target.names['hand_'+side]])
        point = lambda name: (hand@pose[self.target.names[name+'_'+side]])[:3, 3]
        center = (point('middle_01')+point('middle_03'))*.5
        center[2] = np.mean([point(n+'_01')[2] for n in ['index', 'middle', 'ring', 'pinky']])
        socket = np.eye(4)
        socket[:3, :3] = [[0, 0, 1], [1, 0, 0], [0, 1, 0]]
        socket[:3, 3] = center
        return socket[:3].ravel().tolist()


def build(cache):
    source = Gltf(next(cache.rglob('UAL1_Standard.glb')))
    dest = ROOT/'dist/assets/realms/models.js'
    out = json.loads(dest.read_text().removeprefix('const REALM_MODELS=').strip().removesuffix(';'))
    sources = {'animation': {'file': source.path.name, 'sha256': hashlib.sha256(source.path.read_bytes()).hexdigest()}}
    clips = {'idle': ('Idle_Loop', 2.5), 'swordIdle': ('Sword_Idle', 1.667),
             'walk': ('Walk_Loop', 1.333), 'run': ('Jog_Fwd_Loop', .933),
             'melee': ('Sword_Attack', 1.05), 'unarmed': ('Punch_Cross', .65),
             'magic': ('Spell_Simple_Shoot', .65)}
    for sex, avatar in out['avatars'].items():
        target = Gltf(next(cache.rglob('Superhero_'+sex.capitalize()+'_FullBody.gltf')))
        rig = Retarget(source, target)
        assert len(rig.joints) == avatar['joints']
        bind = target.acc(target.g['skins'][0]['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        names = [target.nodes[j]['name'] for j in rig.joints]
        avatar['rig'] = {'names': names, 'parents': rig.parents, 'bind': packed(bind[:, :3]),
                         'head': names.index('Head'), 'right': names.index('hand_r'), 'left': names.index('hand_l'),
                         'rightGrip': rig.grip('r'), 'leftGrip': rig.grip('l')}
        foot = np.frombuffer(base64.b64decode(avatar['mesh']['p']), dtype='<f4').reshape(-1, 3)
        foot_ids = np.flatnonzero(foot[:, 1] < .25)
        foot = np.c_[foot[foot_ids], np.ones(len(foot_ids))]
        weights = np.frombuffer(base64.b64decode(avatar['mesh']['w']), dtype='u1').reshape(-1, 4)[foot_ids].astype(float)
        weights /= weights.sum(axis=1)[:, None]
        influences = np.frombuffer(base64.b64decode(avatar['mesh']['j']), dtype='u1').reshape(-1, 4)[foot_ids]
        for name, (original, duration) in clips.items():
            frames = math.ceil(duration*30)+1
            poses = []
            for f in range(frames):
                phase = f/(frames-1)
                local = np.asarray(rig.local_trs(rig.pose(original, source.duration(original)*phase)))
                if name == 'run':
                    # Blend the author's walk and jog for this game's travel speed;
                    # the full sprinting stride was too long for four tiles/second.
                    walk = np.asarray(rig.local_trs(rig.pose('Walk_Loop', source.duration('Walk_Loop')*phase)))
                    signs = np.where((local[:, 3:7]*walk[:, 3:7]).sum(axis=1)<0, -1, 1)
                    local[:, 3:7] *= signs[:, None]
                    local = (local+walk)*.5
                    local[:, 3:7] /= np.linalg.norm(local[:, 3:7], axis=1)[:, None]
                elif name == 'melee':
                    # Keep a planted lower body for a stationary attack. Preserve
                    # the authored upper-body turn by transferring pelvis rotation
                    # into the first spine joint before applying the resting legs.
                    idle = np.asarray(rig.local_trs(rig.pose('Sword_Idle', source.duration('Sword_Idle')*phase)))
                    pelvis, spine = names.index('pelvis'), names.index('spine_01')
                    matrix = lambda v: trs(v[:3], v[3:7], v[7:])
                    turn = np.linalg.inv(matrix(idle[pelvis]))@matrix(local[pelvis])@matrix(local[spine])
                    local[spine, 3:7] = quaternion(turn[:3, :3]/np.linalg.norm(turn[:3, :3], axis=0))
                    for j, bone_name in enumerate(names):
                        if bone_name in ('root', 'pelvis') or bone_name.startswith(('thigh_', 'calf_', 'foot_', 'ball_')):
                            local[j] = idle[j]
                elif name == 'magic':
                    # This character casts while carrying a staff in the right
                    # hand. Layer the author's closed grip over the casting arm.
                    grip = np.asarray(rig.local_trs(rig.pose('Sword_Idle', 0)))
                    for j, bone_name in enumerate(names):
                        if bone_name.endswith('_r') and bone_name.startswith(('index_', 'middle_', 'ring_', 'pinky_', 'thumb_')):
                            local[j] = grip[j]
                world = []
                for j, values in enumerate(local):
                    m = trs(values[:3], values[3:7], values[7:])
                    world.append(world[rig.parents[j]]@m if rig.parents[j]>=0 else m)
                palette = np.asarray(world)@bind
                skinned = np.einsum('nwab,nb->nwa', palette[influences], foot)
                floor = np.min((skinned[:, :, 1]*weights).sum(axis=1))
                # Preserve the run's flight phase; only correct ground penetration.
                local[0, 1] += max(0, .003-float(floor))
                poses.append(local)
            avatar['clips'][name] = {'duration': duration, 'frames': frames, 'trs': packed(poses),
                                     'source': original, 'sourceDuration': float(source.duration(original))}
            if name == 'run': avatar['clips'][name]['layers'] = '50% Walk_Loop / 50% Jog_Fwd_Loop'
            if name == 'melee': avatar['clips'][name]['layers'] = 'Sword_Attack upper body / Sword_Idle planted legs'
            if name == 'magic': avatar['clips'][name]['layers'] = 'Spell_Simple_Shoot / right-hand staff grip'
        # Keep the previous bow pose until a bow-specific motion is integrated.
        # It is deliberately not labelled as part of this authored-motion import.
        sources[sex] = {'file': target.path.name, 'sha256': hashlib.sha256(target.path.read_bytes()).hexdigest()}
        print('Retargeted', sex, len(clips), 'authored clips;', len(rig.joints), 'joints, including fingers', flush=True)
    out['motionSource'] = {'pack': 'Quaternius Universal Animation Library, Standard, CC0 1.0', 'files': sources}
    dest.write_text('const REALM_MODELS='+json.dumps(out, separators=(',', ':'))+';\n')
    credits = ROOT/'dist/assets/realms/CREDITS.txt'
    text = credits.read_text()
    if 'Universal Animation Library' not in text:
        credits.write_text(text+'\nCharacter motion: Quaternius Universal Animation Library (Standard), CC0 1.0.\nhttps://quaternius.itch.io/universal-animation-library\nRetargeted to the Universal Base Characters; runtime interpolation and equipment sockets adapted for Veldren.\n')


if __name__ == '__main__':
    build(pathlib.Path(sys.argv[1]))
