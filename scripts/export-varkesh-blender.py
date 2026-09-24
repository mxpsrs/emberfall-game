"""Bake the supplied DragoTST Blender rig, including its curved B-bone segments.

Run with Blender's bpy Python and pass the original .blend and an output folder.
The original actions remain identified separately from Veldren-authored
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
    rig, body = bpy.data.objects['Armature'], bpy.data.objects['Dragon Mesh']
    source_actions = [{'name':a.name, 'range':list(a.frame_range),
                       'curves':len(a.fcurves)} for a in bpy.data.actions]
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    rig.animation_data.action = None
    for p in rig.pose.bones:
        p.matrix_basis.identity()
    rig.animation_data.action = bpy.data.actions['Walk Loop']
    scene.frame_set(1)
    bpy.context.view_layer.update()
    baseline = {p.name:p.matrix_basis.copy() for p in rig.pose.bones}
    axes = {p.name:(p.parent.matrix @ p.parent.bone.matrix_local.inverted() @ p.bone.matrix_local).to_3x3()
            if p.parent else p.bone.matrix_local.to_3x3() for p in rig.pose.bones}
    rig_world = rig.matrix_world.copy()
    rig.animation_data.action = None
    # Control widgets are editor helpers and never become creature geometry.
    for obj in bpy.data.objects:
        obj.hide_render = obj not in (body, rig)
    # Keep the original mesh topology and corner normals.
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
        rig.pose.bones[name].location += axes[name].inverted() @ Vector(offset)

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
        rig.animation_data.action = None
        reset()
        if clip in ('walk','run'):
            rig.animation_data.action = bpy.data.actions['Walk Loop']
            frame = 1 + 117*t
            scene.frame_set(int(frame), subframe=frame-int(frame))
            bpy.context.view_layer.update()
            return
        cycle = t*math.tau
        breath = math.sin(cycle)
        if clip == 'idle':
            shift('Pelvis',(0,0,.30*breath))
            turn('Torso',(.012*breath,0,0))
            shift('HeadIK',(.15*math.sin(cycle),0,.38*breath))
            for i in range(1,7):
                turn('Tail'+str(i),(0,0,.015*math.sin(cycle-i*.5)))
            for side,sign in [('L',1),('R',-1)]:
                shift('Wing IK.'+side,(sign*.20*breath,0,.12*breath))
        elif clip == 'attack':
            pull = curve(t,[(0,0),(.28,1),(.53,-1),(.63,-.7),(1,0)])
            reach = curve(t,[(0,0),(.28,-.5),(.53,1),(.63,.75),(1,0)])
            open_jaw = curve(t,[(0,0),(.25,1),(.44,1),(.53,.06),(.66,0),(1,0)])
            shift('HeadIK',(0,4*pull,-1.4*reach))
            shift('Pelvis',(0,-1.2*reach,-.45*reach))
            turn('Torso',(.045*reach,0,0))
            turn('Jaw IK',(-.58*open_jaw,0,0))
            for side,sign in [('L',1),('R',-1)]:
                shift('Wing IK.'+side,(sign*.6*math.sin(math.pi*t),-.6*reach,0))
            for i in range(1,7):
                turn('Tail'+str(i),(0,0,.04*math.sin(math.pi*t-i*.18)*math.sin(math.pi*t)))
        elif clip == 'cast':
            inhale = curve(t,[(0,0),(.30,1),(.50,.5),(.70,.3),(1,0)])
            exhale = curve(t,[(0,0),(.30,0),(.52,1),(.78,1),(1,0)])
            shift('Pelvis',(0,1.0*inhale,.5*inhale))
            turn('Torso',(-.055*inhale,0,0))
            shift('HeadIK',(0,2*inhale-3*exhale,2.0*inhale-1.2*exhale))
            turn('Jaw IK',(-.62*max(inhale*.7,exhale),0,0))
            for side,sign in [('L',1),('R',-1)]:
                shift('Wing IK.'+side,(sign*1.2*inhale,.7*inhale,.5*inhale))
            for i in range(1,7):
                turn('Tail'+str(i),(0,0,.015*math.sin(cycle-i*.5)))
        elif clip == 'hit':
            recoil=curve(t,[(0,0),(.23,1),(.55,.4),(1,0)])
            shift('HeadIK',(1.1*recoil,2.2*recoil,1.2*recoil))
            turn('Torso',(-.05*recoil,0,.035*recoil))
            shift('Pelvis',(0,.5*recoil,-.35*recoil))
        elif clip == 'death':
            fall=curve(t,[(0,0),(.16,.08),(.52,.7),(.76,1),(1,1)])
            settle=math.sin(max(0,t-.76)/.24*math.pi)*.28 if t>.76 else 0
            # The wing hands and hind feet stay planted while the chest folds
            # onto the ground. Rolling the whole wide-winged body on its side
            # would raise a wing and make the corpse taller than the living rig.
            shift('Pelvis',(0,-1.8*fall,-11*fall+settle))
            turn('Torso',(.085*fall,0,.035*fall))
            shift('HeadIK',(0,-1.2*fall,.7*fall))
            turn('TailBase',(.18*fall,0,0))
            turn('Jaw IK',(-.15*fall,0,0))
            for side,sign in [('L',1),('R',-1)]:
                shift('Leg IK.'+side,(sign*.5*fall,-.6*fall,0))
                shift('Wing IK.'+side,(sign*1.0*fall,.8*fall,0))
            for i in range(1,7):
                turn('Tail'+str(i),(0,0,.018*fall))
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

    # Blender's preserve-volume modifier uses dual-quaternion blending. The
    # game uses linear palettes. Compensate the bind vertices/normals against
    # Blender's evaluated grounded stance, then measure every delivered motion
    # against the original preserve-volume body below.
    source_positions = np.array([list(axis @ body.matrix_world @ v.co) for v in body.data.vertices])
    reference = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    reference_mesh = reference.to_mesh()
    golden_rest = np.array([list(axis @ reference.matrix_world @ v.co) for v in reference_mesh.vertices])
    normal_matrix = (axis @ reference.matrix_world).to_3x3().inverted().transposed()
    golden_normals = np.array([list((normal_matrix @ n.vector).normalized()) for n in reference_mesh.corner_normals])
    reference.to_mesh_clear()
    palette = np.asarray([np.array(m @ b) for m,b in zip(world_matrices(),bind)])
    composite = np.zeros((len(source_positions),4,4))
    for j in range(4):
        ids = [w[j][0] for w in weights]
        amounts = np.array([w[j][1] for w in weights])
        composite += palette[ids] * amounts[:,None,None]
    original_positions = source_positions.copy()
    source_positions = np.linalg.solve(composite,np.c_[golden_rest,np.ones(len(golden_rest))][...,None])[:,:,0][:,:3]
    normal_inverse = np.linalg.inv(composite[:,:3,:3])

    mesh = body.data
    mesh.calc_loop_triangles()
    vertices = []
    normal_matrix = (axis @ body.matrix_world).to_3x3().inverted().transposed()
    for triangle in mesh.loop_triangles:
        for loop_index in triangle.loops:
            loop = mesh.loops[loop_index]
            v = mesh.vertices[loop.vertex_index]
            p = source_positions[v.index]
            normal = normal_inverse[v.index] @ golden_normals[loop_index]
            normal /= np.linalg.norm(normal)
            uv = mesh.uv_layers.active.data[loop_index].uv
            influence = weights[v.index]
            vertices.append([*p,*normal,*uv,triangle.material_index,
                             *[i for i,w in influence],*[w for i,w in influence]])

    def matrix_data(m):
        return [v for row in m for v in row][:12]

    pose('idle',0)
    resting = world_matrices()
    durations = {'idle':3.2,'walk':117/24,'run':3.3,'attack':1.55,
                 'cast':2.3,'hit':.55,'death':2.8}
    animations, errors, error_percentiles = [], {}, {}
    for clip,duration in durations.items():
        frames = []
        count = math.ceil(duration*24)+1
        worst = 0.0
        sampled_errors = []
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
                distances = np.linalg.norm(converted-golden,axis=1)
                sampled_errors.extend(distances.tolist())
                worst = max(worst,float(distances.max()))
        errors[clip] = worst
        error_percentiles[clip] = dict(zip(["mean","p95","p99"], [float(np.mean(sampled_errors)),float(np.percentile(sampled_errors,95)),float(np.percentile(sampled_errors,99))]))
        animations.append({'name':('Native/Walk Loop' if clip=='walk' else 'Native/Walk Loop (faster)' if clip=='run' else 'Veldren/'+clip),'duration':duration,'frames':frames})
        print(clip,'frames',count,'max skin error',round(worst,6),flush=True)

    result = {
        'nodes':[{'name':name+(f'/segment{segment}' if segment is not None else ''),
                  'parent':-1,'rest':matrix_data(resting[i])} for i,(name,segment) in enumerate(parts)],
        'materials':[{'name':m.name} for m in body.data.materials],
        'meshes':[{'name':'Dragon Mesh','deforms':[{'node':i,'bind':matrix_data(b)} for i,b in enumerate(bind)],'vertices':vertices}],
        'animations':animations
    }
    (output/'export.json').write_text(json.dumps(result,separators=(',',':')))
    audit = {'sourceActions':source_actions,'authoredActions':[c for c in durations if c not in ('walk','run')],
             'nativeRuntimeActions':{'walk':{'source':'Walk Loop','frames':[1,118]},'run':{'source':'Walk Loop','frames':[1,118],'duration':3.3}},
             'sourceBones':len(rig.data.bones),'weightedBones':len(ordered),
             'bakedSegmentJoints':len(parts),'sourceVertices':len(mesh.vertices),
             'triangles':len(mesh.loop_triangles),'maxDiscardedWeight':max(weight_loss),
             'skinErrorSourceUnits':errors,'skinErrorPercentilesSourceUnits':error_percentiles,'bindCompensation':'Grounded preserve-volume stance baked into bind vertices and split normals; animated error measured against original Blender evaluation',
             'maxBindCompensationSourceUnits':float(np.linalg.norm(source_positions-original_positions,axis=1).max()),
             'axis':'Blender (x,y,z) -> game (x,z,-y)',
             'sourceHierarchy':[{'name':b.name,'parent':b.parent.name if b.parent else None,
                                'segments':b.bbone_segments} for b in rig.data.bones]}
    (output/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps({k:v for k,v in audit.items() if k!='sourceHierarchy'}),flush=True)


if __name__ == '__main__':
    main(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve())
