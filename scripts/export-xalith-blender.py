"""Bake the supplied Bugoid2 Blender rig, including its curved B-bone segments.

Run with Blender's bpy Python and pass the original .blend and an output folder.
The original two actions remain identified separately from Emberfall-authored
motions. No embedded scripts run, and the source .blend is never overwritten.
"""
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector


def main(source, output):
    output.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    rig, body = bpy.data.objects['BUG Armature'], bpy.data.objects['BOOG']
    source_actions = [{'name':a.name, 'range':list(a.frame_range),
                       'curves':len(a.fcurves)} for a in bpy.data.actions]
    # The static library pose twists sideways. The end of the original landing
    # take is a symmetric, grounded stance suitable for locomotion and aiming.
    rig.animation_data.action = bpy.data.actions['PoseLib']
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    scene.frame_set(35)
    baseline = {p.name:p.matrix_basis.copy() for p in rig.pose.bones}
    rig_world = rig.matrix_world.copy()
    pelvis_pivot = rig_world @ rig.pose.bones['Pelvis'].head
    rig.animation_data.action = None
    # The meshes named Text are editor labels and never become creature geometry.
    for obj in bpy.data.objects:
        obj.hide_render = obj not in (body, rig)
    # Retain the original split normals; the 4.5 migration's auto-smooth modifier
    # does not change the mesh's original topology or weight indices.
    for mod in body.modifiers:
        if mod.type != 'ARMATURE':
            mod.show_viewport = mod.show_render = False

    axis = Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
    bone_names = set(rig.data.bones.keys())
    active = set()
    for v in body.data.vertices:
        active.update(body.vertex_groups[g.group].name for g in v.groups
                      if g.weight > 1e-8 and body.vertex_groups[g.group].name in bone_names)
    ordered = [b.name for b in rig.data.bones if b.name in active]
    slots, parts = {}, []
    for name in ordered:
        segments = rig.data.bones[name].bbone_segments
        for index in range(segments+1 if segments > 1 else 1):
            slots[name,index] = len(parts)
            parts.append((name,index if segments > 1 else None))

    def reset():
        rig.matrix_world = rig_world.copy()
        for name, matrix in baseline.items():
            rig.pose.bones[name].matrix_basis = matrix

    def shift(name, offset):
        bone = rig.pose.bones[name]
        # These translation controls are unparented; convert armature-space
        # displacements to the controller's own rest axes.
        assert bone.parent is None
        bone.location += bone.bone.matrix_local.to_3x3().inverted() @ Vector(offset)

    def turn(name, angles):
        bone = rig.pose.bones[name]
        for vector, angle in zip(((1,0,0),(0,1,0),(0,0,1)), angles):
            bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion(vector, angle)

    def ease(t):
        t = max(0, min(1, t))
        return t*t*(3-2*t)

    def curve(t, points):
        for (a,x), (b,y) in zip(points,points[1:]):
            if t <= b:
                return x+(y-x)*ease((t-a)/(b-a))
        return points[-1][1]

    def pose(clip, t):
        reset()
        cycle = t*math.tau
        breath = math.sin(cycle)
        if clip == 'idle':
            shift('Pelvis',(0,0,.06*breath))
            turn('Torso',(.012*breath,0,.008*math.sin(cycle)))
            turn('Head',(.018*math.sin(cycle+.4),0,.018*math.sin(cycle)))
            turn('abdomen',(.02*breath,0,0))
            for side, sign in [('l',1),('r',-1)]:
                turn('wingbase1.'+side,(.024*breath,0,sign*.018*breath))
                turn('wingbase2.'+side,(.019*breath,0,sign*.024*breath))
                turn('Jaw.'+side,(0,sign*.025*(1-math.cos(cycle)),0))
        elif clip in ('walk','run'):
            fast = clip == 'run'
            stride, lift = (1.65,.9) if fast else (1.15,.58)
            shift('Pelvis',(.10*math.sin(cycle),0,.09*(1-math.cos(cycle*2))))
            turn('Pelvis',(.13 if fast else .055,0,.035*math.sin(cycle)))
            turn('Torso',(-.04,0,-.05*math.sin(cycle)))
            turn('Head',(-.035,0,.025*math.sin(cycle)))
            turn('abdomen',(.055*math.sin(cycle*2),0,.045*math.sin(cycle)))
            for side, offset in [('l',0),('r',math.pi)]:
                wave = math.cos(cycle+offset)
                shift('LegIK.'+side,(0,stride*wave,lift*max(0,math.sin(cycle+offset))))
                shift('armIK.'+side,(0,-.62*wave,.12*max(0,-wave)))
                shift('smol armIK.'+side,(0,-.23*wave,.07*math.sin(cycle+offset)))
                turn('wingbase1.'+side,(.035*math.sin(cycle*2),0,0))
        elif clip in ('attack','attack2'):
            side, opposite, sign = ('l','r',1) if clip == 'attack' else ('r','l',-1)
            reach = curve(t,[(0,0),(.30,1),(.53,-1.25),(.65,-1.1),(1,0)])
            lift = curve(t,[(0,0),(.30,1.5),(.53,-.75),(.66,-.65),(1,0)])
            twist = curve(t,[(0,0),(.30,-.17),(.53,.24),(.67,.18),(1,0)])
            lunge = curve(t,[(0,0),(.3,-.2),(.53,.65),(.67,.55),(1,0)])
            spread = math.sin(math.pi*t)
            shift('armIK.'+side,(sign*.25*spread,reach*1.8,lift))
            shift('armIK.'+opposite,(-sign*.12*spread,-reach*.30,.1*lift))
            shift('Pelvis',(sign*.10*spread,-lunge,-.15*lunge))
            turn('Torso',(.08*lunge,0,sign*twist))
            turn('Head',(-.06*lunge,0,-sign*twist*.45))
            turn('abdomen',(-.04*lunge,0,-sign*twist*.4))
            turn('Claw.'+side,(.10*reach,0,0))
            for wing in ('wingbase1.','wingbase2.'):
                turn(wing+side,(.12*math.sin(math.pi*t),0,0))
        elif clip == 'hit':
            recoil = curve(t,[(0,0),(.24,1),(.50,.4),(1,0)])
            shift('Pelvis',(0,.2*recoil,-.11*recoil))
            turn('Torso',(-.12*recoil,0,.05*recoil))
            turn('Head',(-.16*recoil,0,-.06*recoil))
            for side in ('l','r'):
                shift('armIK.'+side,(0,.2*recoil,.13*recoil))
        elif clip == 'death':
            collapse = curve(t,[(0,0),(.15,.09),(.52,.8),(.70,1),(1,1)])
            roll = curve(t,[(0,0),(.30,.08),(.65,.82),(.85,1),(1,1)])
            settle = math.sin(max(0,t-.70)*math.pi/.30)*.10 if t>.70 else 0
            # Rotate the entire control rig around the hips so IK feet and
            # blades fall with the body. Rotating only the pelvis leaves the
            # world-space controllers planted and stretches a dying creature.
            rig.matrix_world = (Matrix.Translation(pelvis_pivot+Vector((.35*roll,0,-1.3*collapse+settle)))
                                @ Matrix.Rotation(1.52*roll,4,'Y')
                                @ Matrix.Translation(-pelvis_pivot) @ rig_world)
            turn('Torso',(.07*collapse,0,-.05*roll))
            turn('Head',(.12*collapse,0,.05*roll))
            turn('abdomen',(-.18*collapse,0,.14*roll))
            for side,sign in [('l',1),('r',-1)]:
                shift('LegIK.'+side,(-sign*.25*collapse,-.65*collapse,.15*roll))
                shift('armIK.'+side,(-sign*.5*collapse,.20*collapse,.20*collapse))
                shift('smol armIK.'+side,(-sign*.16*collapse,.3*collapse,.05*collapse))
                turn('wingbase1.'+side,(-.25*collapse,sign*.08*collapse,sign*.20*collapse))
                turn('wingbase2.'+side,(-.3*collapse,sign*.06*collapse,sign*.18*collapse))
        else:
            raise ValueError(clip)
        bpy.context.view_layer.update()

    reset()
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated = rig.evaluated_get(graph)
    bind = []
    for name, segment in parts:
        bone = evaluated.pose.bones[name]
        rest = bone.bone.matrix_local
        if segment is not None:
            rest = rest @ bone.bbone_segment_matrix(segment,rest=True)
        bind.append((axis @ rig.matrix_world @ rest).inverted())

    # A B-bone's adjacent segment joints reproduce its continuous deformation.
    # Keep the strongest four accumulated weights to fit the existing skin ABI.
    weights, weight_loss = [], []
    to_armature = rig.matrix_world.inverted() @ body.matrix_world
    for vertex in body.data.vertices:
        candidates = {}
        for group in vertex.groups:
            name = body.vertex_groups[group.group].name
            if name not in active or group.weight <= 1e-8:
                continue
            bone = evaluated.pose.bones[name]
            if bone.bone.bbone_segments > 1:
                index, blend = bone.bbone_segment_index(to_armature @ vertex.co)
                influences = [(index,1-blend),(index+1,blend)]
            else:
                influences = [(0,1)]
            for index, amount in influences:
                key = slots[name,index]
                candidates[key] = candidates.get(key,0)+group.weight*amount
        total = sum(candidates.values())
        if total <= 0:
            raise ValueError('Unweighted body vertex '+str(vertex.index))
        best = sorted(candidates.items(), key=lambda x:-x[1])[:4]
        retained = sum(w for _,w in best)
        weight_loss.append(1-retained/total)
        weights.append([(index,w/retained) for index,w in best]+[(0,0)]*(4-len(best)))

    mesh = body.data
    mesh.calc_loop_triangles()
    vertices, references = [], []
    normal_matrix = (axis @ body.matrix_world).to_3x3().inverted().transposed()
    for triangle in mesh.loop_triangles:
        for loop_index in triangle.loops:
            loop = mesh.loops[loop_index]
            v = mesh.vertices[loop.vertex_index]
            p = axis @ body.matrix_world @ v.co
            normal = (normal_matrix @ mesh.corner_normals[loop_index].vector).normalized()
            uv = mesh.uv_layers.active.data[loop_index].uv
            influence = weights[v.index]
            vertices.append([*p,*normal,*uv,triangle.material_index,
                             *[i for i,w in influence],*[w for i,w in influence]])
            references.append(v.index)

    def world_matrices():
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = rig.evaluated_get(graph)
        matrices = []
        for name,segment in parts:
            bone = evaluated.pose.bones[name]
            value = axis @ rig.matrix_world @ bone.matrix
            if segment is not None:
                value = value @ bone.bbone_segment_matrix(segment,rest=False)
            matrices.append(value)
        return matrices

    def matrix_data(m):
        return [v for row in m for v in row][:12]

    pose('idle',0)
    resting = world_matrices()
    durations = {'idle':2.8,'walk':1.1,'run':.78,'attack':1.45,
                 'attack2':1.45,'hit':.50,'death':2.3}
    animations, errors = [], {}
    source_positions = np.array([list(axis @ body.matrix_world @ v.co) for v in mesh.vertices])
    for clip,duration in durations.items():
        frames = []
        count = math.ceil(duration*24)+1
        worst = 0.0
        for frame in range(count):
            pose(clip,frame/(count-1))
            matrices = world_matrices()
            frames.append([matrix_data(m) for m in matrices])
            # Compare actual skinned points against Blender's evaluated body.
            # This catches bind-space, B-bone and weight-truncation mistakes.
            if frame in (0,count//4,count//2,count*3//4,count-1):
                palette = np.asarray([np.array(m @ b) for m,b in zip(matrices,bind)])
                p = np.c_[source_positions,np.ones(len(source_positions))]
                converted = np.zeros((len(p),3))
                for j in range(4):
                    indices = [w[j][0] for w in weights]
                    values = np.array([w[j][1] for w in weights])
                    converted += np.einsum('vij,vj->vi',palette[indices,:3,:],p)*values[:,None]
                original = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
                posed_mesh = original.to_mesh()
                golden = np.array([list(axis @ original.matrix_world @ v.co) for v in posed_mesh.vertices])
                original.to_mesh_clear()
                worst = max(worst,float(np.linalg.norm(converted-golden,axis=1).max()))
        errors[clip] = worst
        animations.append({'name':'Emberfall/'+clip,'duration':duration,'frames':frames})
        print(clip,'frames',count,'max skin error',round(worst,6),flush=True)

    result = {
        'nodes':[{'name':name+(f'/segment{segment}' if segment is not None else ''),
                  'parent':-1,'rest':matrix_data(resting[i])} for i,(name,segment) in enumerate(parts)],
        'materials':[{'name':m.name} for m in body.data.materials],
        'meshes':[{'name':'BOOG','deforms':[{'node':i,'bind':matrix_data(b)} for i,b in enumerate(bind)],'vertices':vertices}],
        'animations':animations
    }
    (output/'export.json').write_text(json.dumps(result,separators=(',',':')))
    audit = {'sourceActions':source_actions,'authoredActions':list(durations),
             'sourceBones':len(rig.data.bones),'weightedBones':len(ordered),
             'bakedSegmentJoints':len(parts),'sourceVertices':len(mesh.vertices),
             'triangles':len(mesh.loop_triangles),'maxDiscardedWeight':max(weight_loss),
             'skinErrorSourceUnits':errors,'axis':'Blender (x,y,z) -> game (x,z,-y)',
             'sourceHierarchy':[{'name':b.name,'parent':b.parent.name if b.parent else None,
                                'segments':b.bbone_segments} for b in rig.data.bones]}
    (output/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
    # A compact native Blender inspection render uses the unconverted source
    # geometry. Production-engine reviews are a separate conversion check.
    print(json.dumps({k:v for k,v in audit.items() if k!='sourceHierarchy'}),flush=True)


if __name__ == '__main__':
    main(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve())
