'use strict';
const TREE_APPEARANCE={
 normal:{model:'ResourceTree_normal',height:4.2,tint:[.62,.74,.57]},
 oak:{model:'ResourceTree_oak',height:6.1,tint:[.47,.64,.47]},
 willow:{model:'ResourceTree_willow',height:4.8,tint:[.52,.68,.53]},
 maple:{model:'ResourceTree_maple',height:7.2,tint:[.82,.74,.59]},
 yew:{model:'ResourceTree_yew',height:6.8,tint:[.57,.71,.58]},
 magic:{model:'ResourceTree_magic',height:6.1,tint:[.58,.76,.77]}
};
function treeAppearance(o){return TREE_APPEARANCE[o.resourceId]||TREE_APPEARANCE.normal;}
function drawSpeciesTree(r,o,x,z){
 const look=treeAppearance(o),mesh=rebuiltModels[look.model],height=look.height*(.96+(Math.abs(o.id||0)%3)*.04),k=height/(mesh.bounds[1][1]-mesh.bounds[0][1]);
 rebuiltPlace(r,look.model,x,-mesh.bounds[0][1]*k,z,k,(o.id||0)*2.399,k,look.tint);return height;
}
