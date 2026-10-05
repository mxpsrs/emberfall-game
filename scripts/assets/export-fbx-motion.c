// Offline FBX conversion using ufbx (https://github.com/ufbx/ufbx, MIT/Unlicense).
// Build with ufbx.c and ufbx.h, then run: export-fbx-motion INPUT.fbx OUTPUT.json
// Only the converted in-game motion/geometry is shipped, never this dependency.
#include "ufbx.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

static void string(FILE *f, const char *s) {
 fputc('"',f);for(;*s;s++){if(*s=='"'||*s=='\\')fputc('\\',f);if((unsigned char)*s>=32)fputc(*s,f);}fputc('"',f);
}
static void matrix(FILE *f, ufbx_matrix m) {
 fprintf(f,"[%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g,%.9g]",m.m00,m.m01,m.m02,m.m03,m.m10,m.m11,m.m12,m.m13,m.m20,m.m21,m.m22,m.m23);
}
int main(int argc,char **argv) {
 if(argc!=3)return 2;
 ufbx_load_opts opts={0};opts.target_axes=ufbx_axes_right_handed_y_up;opts.target_unit_meters=1;opts.generate_missing_normals=true;
 ufbx_error err;ufbx_scene *scene=ufbx_load_file(argv[1],&opts,&err);
 if(!scene){fprintf(stderr,"FBX load: %s\n",err.description.data);return 1;}
 FILE *f=fopen(argv[2],"wb");if(!f)return 1;
 fprintf(f,"{\"nodes\":[");
 for(size_t i=0;i<scene->nodes.count;i++){
  ufbx_node *n=scene->nodes.data[i];if(i)fputc(',',f);fprintf(f,"{\"name\":");string(f,n->name.data);
  fprintf(f,",\"parent\":%d,\"rest\":",n->parent?(int)n->parent->typed_id:-1);matrix(f,n->node_to_world);fputc('}',f);
 }
 fprintf(f,"],\"meshes\":[");int mesh_count=0;
 for(size_t ni=0;ni<scene->nodes.count;ni++){
  ufbx_node *node=scene->nodes.data[ni];ufbx_mesh *m=node->mesh;if(!m)continue;
  if(mesh_count++)fputc(',',f);fprintf(f,"{\"name\":");string(f,node->name.data);fprintf(f,",\"vertices\":[");int vertex_count=0;
  uint32_t *indices=malloc(m->max_face_triangles*3*sizeof(uint32_t));
  for(size_t fi=0;fi<m->faces.count;fi++){
   uint32_t count=ufbx_triangulate_face(indices,m->max_face_triangles*3,m,m->faces.data[fi]);
   for(uint32_t k=0;k<count*3;k++){
    uint32_t index=indices[k];ufbx_vec3 p=ufbx_get_vertex_vec3(&m->vertex_position,index),n=ufbx_get_vertex_vec3(&m->vertex_normal,index);
    p=ufbx_transform_position(&node->geometry_to_world,p);n=ufbx_transform_direction(&node->geometry_to_world,n);
    double length=sqrt(n.x*n.x+n.y*n.y+n.z*n.z);if(length>0){n.x/=length;n.y/=length;n.z/=length;}
    ufbx_vec2 uv={0};if(m->vertex_uv.exists)uv=ufbx_get_vertex_vec2(&m->vertex_uv,index);
    if(vertex_count++)fputc(',',f);fprintf(f,"[%.8g,%.8g,%.8g,%.8g,%.8g,%.8g,%.8g,%.8g]",p.x,p.y,p.z,n.x,n.y,n.z,uv.x,uv.y);
   }
  }
  free(indices);fprintf(f,"]}");
 }
 fprintf(f,"],\"animations\":[");
 for(size_t ai=0;ai<scene->anim_stacks.count;ai++){
  ufbx_anim_stack *a=scene->anim_stacks.data[ai];double duration=a->time_end-a->time_begin;int count=(int)ceil(duration*30)+1;if(ai)fputc(',',f);
  fprintf(f,"{\"name\":");string(f,a->name.data);fprintf(f,",\"duration\":%.9g,\"frames\":[",duration);
  for(int frame=0;frame<count;frame++){
   double t=a->time_begin+(count>1?duration*frame/(count-1):0);ufbx_scene *posed=ufbx_evaluate_scene(scene,a->anim,t,NULL,&err);if(!posed)return 1;
   if(frame)fputc(',',f);fputc('[',f);for(size_t j=0;j<posed->nodes.count;j++){if(j)fputc(',',f);matrix(f,posed->nodes.data[j]->node_to_world);}fputc(']',f);ufbx_free_scene(posed);
  }
  fprintf(f,"]}");
 }
 fprintf(f,"]}\n");fclose(f);ufbx_free_scene(scene);return 0;
}
