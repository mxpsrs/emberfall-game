// Offline FBX geometry, native skin and animation export using ufbx (MIT/Unlicense).
// cc -O2 -I/path/to/ufbx export-rigged-fbx.c /path/to/ufbx/ufbx.c -lm -o export-rigged-fbx
// export-rigged-fbx INPUT.fbx OUTPUT.json
#include "ufbx.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
static void string(FILE *f,const char *s){fputc('"',f);for(;*s;s++){if(*s=='"'||*s=='\\')fputc('\\',f);if((unsigned char)*s>=32)fputc(*s,f);}fputc('"',f);}
static void matrix(FILE *f,ufbx_matrix m){fprintf(f,"[%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g]",m.m00,m.m01,m.m02,m.m03,m.m10,m.m11,m.m12,m.m13,m.m20,m.m21,m.m22,m.m23);}
int main(int argc,char **argv){
 if(argc!=3)return 2;ufbx_load_opts opts={0};opts.target_axes=ufbx_axes_right_handed_y_up;opts.target_unit_meters=1;opts.generate_missing_normals=true;
 ufbx_error error;ufbx_scene *scene=ufbx_load_file(argv[1],&opts,&error);if(!scene){fprintf(stderr,"FBX load failed: %s\n",error.description.data);return 1;}
 FILE *f=fopen(argv[2],"wb");if(!f)return 1;fprintf(f,"{\"nodes\":[");
 for(size_t i=0;i<scene->nodes.count;i++){ufbx_node *n=scene->nodes.data[i];if(i)fputc(',',f);fprintf(f,"{\"name\":");string(f,n->name.data);fprintf(f,",\"parent\":%d,\"rest\":",n->parent?(int)n->parent->typed_id:-1);matrix(f,n->node_to_world);fputc('}',f);}
 fprintf(f,"],\"materials\":[");
 for(size_t i=0;i<scene->materials.count;i++){ufbx_material *m=scene->materials.data[i];ufbx_material_map *map=m->pbr.base_color.texture||m->pbr.base_color.has_value?&m->pbr.base_color:&m->fbx.diffuse_color;ufbx_vec4 color=map->value_vec4;if(!map->has_value)color=(ufbx_vec4){1,1,1,1};if(i)fputc(',',f);fprintf(f,"{\"name\":");string(f,m->name.data);fprintf(f,",\"color\":[%.6g,%.6g,%.6g],\"texture\":",color.x,color.y,color.z);string(f,map->texture?map->texture->filename.data:"");fputc('}',f);}
 fprintf(f,"],\"meshes\":[");int meshCount=0;
 for(size_t ni=0;ni<scene->nodes.count;ni++){
  ufbx_node *node=scene->nodes.data[ni];ufbx_mesh *m=node->mesh;if(!m)continue;
  if(m->skin_deformers.count>1){fprintf(stderr,"Multiple skin deformers need an explicit export policy\n");return 1;}
  ufbx_skin_deformer *skin=m->skin_deformers.count?m->skin_deformers.data[0]:NULL;ufbx_matrix inverse=ufbx_matrix_invert(&node->geometry_to_world);
  if(meshCount++)fputc(',',f);fprintf(f,"{\"name\":");string(f,node->name.data);fprintf(f,",\"deforms\":[");
  size_t count=skin?skin->clusters.count:1;
  for(size_t i=0;i<count;i++){if(i)fputc(',',f);ufbx_matrix bind=skin?ufbx_matrix_mul(&skin->clusters.data[i]->geometry_to_bone,&inverse):inverse;fprintf(f,"{\"node\":%u,\"bind\":",skin?skin->clusters.data[i]->bone_node->typed_id:node->typed_id);matrix(f,bind);fputc('}',f);}
  fprintf(f,"],\"vertices\":[");int vertices=0;uint32_t *indices=malloc(m->max_face_triangles*3*sizeof(uint32_t));
  for(size_t fi=0;fi<m->faces.count;fi++){
   uint32_t triangles=ufbx_triangulate_face(indices,m->max_face_triangles*3,m,m->faces.data[fi]);uint32_t material=m->face_material.count?m->face_material.data[fi]:0;
   int materialId=material<node->materials.count?(int)node->materials.data[material]->typed_id:-1;
   for(uint32_t k=0;k<triangles*3;k++){
    uint32_t index=indices[k],vertex=m->vertex_indices.data[index];ufbx_vec3 p=ufbx_get_vertex_vec3(&m->vertex_position,index),n=ufbx_get_vertex_vec3(&m->vertex_normal,index);
    p=ufbx_transform_position(&node->geometry_to_world,p);n=ufbx_transform_direction(&node->geometry_to_world,n);double length=sqrt(n.x*n.x+n.y*n.y+n.z*n.z);if(length>0){n.x/=length;n.y/=length;n.z/=length;}
    ufbx_vec2 uv={0};if(m->vertex_uv.exists)uv=ufbx_get_vertex_vec2(&m->vertex_uv,index);
    uint32_t joints[4]={0};double weights[4]={1,0,0,0};
    if(skin){ufbx_skin_vertex v=skin->vertices.data[vertex];if(!v.num_weights){fprintf(stderr,"Unweighted vertex in skinned mesh\n");return 1;}double sum=0;for(int j=0;j<4;j++){weights[j]=0;if((uint32_t)j<v.num_weights){ufbx_skin_weight w=skin->weights.data[v.weight_begin+j];joints[j]=w.cluster_index;weights[j]=w.weight;sum+=w.weight;}}for(int j=0;j<4;j++)weights[j]/=sum;}
    if(vertices++)fputc(',',f);fprintf(f,"[%.8g,%.8g,%.8g,%.8g,%.8g,%.8g,%.8g,%.8g,%d,%u,%u,%u,%u,%.8g,%.8g,%.8g,%.8g]",p.x,p.y,p.z,n.x,n.y,n.z,uv.x,uv.y,materialId,joints[0],joints[1],joints[2],joints[3],weights[0],weights[1],weights[2],weights[3]);
   }
  }free(indices);fprintf(f,"]}");
 }
 fprintf(f,"],\"animations\":[");
 for(size_t ai=0;ai<scene->anim_stacks.count;ai++){
  ufbx_anim_stack *a=scene->anim_stacks.data[ai];double duration=a->time_end-a->time_begin;int frames=(int)ceil(duration*24)+1;if(frames>24000){fprintf(stderr,"Animation duration exceeds export limit\n");return 1;}if(ai)fputc(',',f);
  fprintf(f,"{\"name\":");string(f,a->name.data);fprintf(f,",\"duration\":%.9g,\"frames\":[",duration);
  for(int frame=0;frame<frames;frame++){double t=a->time_begin+(frames>1?duration*frame/(frames-1):0);ufbx_scene *pose=ufbx_evaluate_scene(scene,a->anim,t,NULL,&error);if(!pose)return 1;if(frame)fputc(',',f);fputc('[',f);for(size_t j=0;j<pose->nodes.count;j++){if(j)fputc(',',f);matrix(f,pose->nodes.data[j]->node_to_world);}fputc(']',f);ufbx_free_scene(pose);}fprintf(f,"]}");
 }
 fprintf(f,"]}\n");fclose(f);ufbx_free_scene(scene);return 0;
}
