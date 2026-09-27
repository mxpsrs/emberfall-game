'use strict';
(function(root){
 function createVeldrenScenePanels({bridge,list,inspector,count,log}){
  const expanded=new Set(),defaults={MeshRenderer:{asset:'',visible:true,castShadows:true,receiveShadows:true},Light:{type:'point',intensity:1,color:[1,1,1],radius:8},Collider:{shape:'box',size:[1,1,1],solid:true},Interactable:{action:'examine',label:'Object'},SpawnPoint:{version:1,stationary:false,homeOffset:[0,0,0]},Gatherable:{kind:'tree',requiredLevel:1}},readOnly=new Set(['RuntimeBinding','LegacyWorldEdit','PlayerRepresentation','ActorController','CatalogIdentity','WorldGeneration','GeneratedProp','GeneratedBuilding','GeneratedSpawn','GeneratedGatherable','BuildingPart','BuildingModule']);let query='';
  const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  function action(label,ops){try{if(ops.some(op=>bridge.canonicalSelection().locked(op.id)||op.parent&&bridge.canonicalSelection().locked(op.parent)))throw Error('Unlock the entity or branch before editing');bridge.executeCommand(label,ops);render(query);inspect();}catch(error){log(error.message,'error');}}
  const button=(label,fn)=>{const b=element('button',label);b.type='button';b.onclick=fn;return b;};
  function render(filter=''){
   query=filter;const graph=bridge.sceneHierarchy(filter);if(!graph)return false;const selection=bridge.canonicalSelection(),chosen=new Set(selection.ids);list.replaceChildren();count.textContent=graph.visible.size+' entities';
   const rootDrop=element('div','Scene roots · drop here to unparent');rootDrop.className='hierarchy-root';rootDrop.ondragover=e=>e.preventDefault();rootDrop.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('application/veldren-entity');if(id)action('Unparent',[{op:'reparent',id,parent:'',preserveWorld:true}]);};list.append(rootDrop);
   let drawn=0;function visit(id,depth){if(!graph.visible.has(id)||drawn++>=2000)return;const n=graph.nodes.get(id),kids=graph.children.get(id)||[],row=element('div');row.className='canonical-row'+(chosen.has(id)?' selected':'')+(!n.active?' inactive':'');row.style.paddingLeft=(depth*14)+'px';row.draggable=true;row.setAttribute('role','treeitem');row.setAttribute('aria-selected',String(chosen.has(id)));row.dataset.entityId=id;
    const toggle=button(kids.length?(expanded.has(id)||query?'▾':'▸'):'·',e=>{e.stopPropagation();expanded.has(id)?expanded.delete(id):expanded.add(id);render(query);});toggle.setAttribute('aria-label','Expand '+n.name);row.append(toggle);
    const name=button(n.name,e=>{bridge.selectEntity(id,e.ctrlKey||e.metaKey||e.shiftKey);render(query);inspect();});name.className='canonical-name';name.title=id+'\n'+Object.keys(n.components).join(', ');name.ondblclick=()=>{const input=element('input');input.value=n.name;name.replaceWith(input);input.focus();input.select();input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape')render(query);};input.onblur=()=>{if(input.value!==n.name)action('Rename',[{op:'rename',id,name:input.value}]);else render(query);};};row.append(name);
    row.append(button(selection.hidden(id)?'Show':'Hide',e=>{e.stopPropagation();bridge.hideEntity(id,!selection.hidden(id));render(query);}),button(selection.locked(id)?'Unlock':'Lock',e=>{e.stopPropagation();bridge.lockEntity(id,!selection.locked(id));render(query);}));
    row.ondragstart=e=>e.dataTransfer.setData('application/veldren-entity',id);row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();e.stopPropagation();const child=e.dataTransfer.getData('application/veldren-entity');if(child)action('Reparent',[{op:'reparent',id:child,parent:id,preserveWorld:true}]);};list.append(row);
    if(query||expanded.has(id))for(const child of kids)visit(child,depth+1);
   }for(const id of graph.roots)visit(id,0);if(drawn>=2000)list.append(element('p','Search to narrow this hierarchy (2,000 visible rows).'));return true;
  }
  function fieldset(title){const f=element('fieldset');f.append(element('legend',title));inspector.append(f);return f;}
  function labeled(parent,label,input){const row=element('label'),span=element('span',label);row.append(span,input);parent.append(row);return input;}
  function assetPicker(parent,key,current,submit){const type=key==='asset'?'model':key==='material'?'material':'texture',wrapper=element('div'),search=element('input'),select=element('select');search.type='search';search.placeholder='Search '+type+' assets';search.setAttribute('aria-label','Search '+type+' assets');select.setAttribute('aria-label',key);wrapper.append(search,select);labeled(parent,key,wrapper);
   function populate(){const options=bridge.assetReferences(type,search.value);select.replaceChildren();if(current)select.append(new Option(current,current));if(type!=='model')select.append(new Option('Default',''));for(const record of options)if(record.id!==current)select.append(new Option(record.name+' · '+record.id,record.id));select.value=current;}
   search.oninput=populate;select.onchange=()=>submit(select.value);populate();return select;
  }
  function input(parent,key,value,submit,disabled=false){if(['asset','material','texture'].includes(key)&&typeof value==='string'&&!disabled)return assetPicker(parent,key,value,submit);
   const object=typeof value==='object',control=element(object?'textarea':'input');if(object){control.value=JSON.stringify(value);control.rows=2;}else if(typeof value==='boolean'){control.type='checkbox';control.checked=value;}else{control.type=typeof value==='number'?'number':'text';control.value=value??'';if(control.type==='number')control.step='any';}
   control.disabled=disabled;control.setAttribute('aria-label',key);control.onchange=()=>{try{const result=object?JSON.parse(control.value):typeof value==='boolean'?control.checked:typeof value==='number'?Number(control.value):control.value;if(typeof result==='number'&&!Number.isFinite(result))throw Error('Finite numeric value required');submit(result);}catch(error){log(error.message,'error');inspect();}};return labeled(parent,key,control);
  }
  function inspect(){
   inspector.replaceChildren();const selection=bridge.canonicalSelection(),ids=selection?.ids||[];if(!ids.length){inspector.append(element('p','Select an entity to edit its components.'));return;}const id=ids[0],node=bridge.sceneEntity(id);if(!node)return;
   inspector.append(element('h2',node.name),element('small',ids.length>1?ids.length+' selected · Inspector edits primary entity':id));
   const common=fieldset('Entity');input(common,'Name',node.name,name=>action('Rename',[{op:'rename',id,name}]));input(common,'Active in game',node.active,active=>action('Active state',[{op:'active',id,active}]));
   common.append(button('Focus',()=>bridge.focusSelection()),button('Duplicate',()=>{bridge.duplicateSelection();render(query);inspect();}),button('Delete',()=>{bridge.deleteSelection();render(query);inspect();}));
   const transform=fieldset('Local Transform');for(const [key,labels]of [['position',['X','Y','Z']],['rotation',['X','Y','Z','W']],['scale',['X','Y','Z']]]){
    const group=element('div');group.className='component-vector';transform.append(element('strong',key==='rotation'?'Rotation quaternion':key),group);
    (node.transform[key]||[]).forEach((value,index)=>input(group,labels[index],value,next=>{bridge.editTransformField(id,key,index,next);render(query);inspect();}));
   }
   if(node.transform.affine)input(transform,'Exact affine matrix',node.transform.affine,affine=>action('Edit affine transform',[{op:'transform',id,transform:{affine}}]));
   for(const [type,stored]of Object.entries(node.components)){const fields=type==='MeshRenderer'?{material:'',visible:true,castShadows:true,receiveShadows:true,...stored}:stored;const panel=fieldset(type),disabled=readOnly.has(type);for(const [key,value]of Object.entries(fields))input(panel,key,value,next=>action('Edit '+type+'.'+key,[{op:'field',id,component:type,field:key,value:next}]),disabled);
    if(!disabled)panel.append(button('Remove component',()=>action('Remove '+type,[{op:'removeComponent',id,component:type}])));
   }
   const add=fieldset('Add component'),types=element('select');for(const type of Object.keys(defaults))if(!node.components[type])types.append(new Option(type,type));add.append(types,button('Add',()=>{const component=types.value;if(!component)return;const fields=structuredClone(defaults[component]);if(component==='MeshRenderer')fields.asset=bridge.assetReferences('model','')[0]?.id||'';action('Add '+component,[{op:'addComponent',id,component,fields}]);}));
  }
  return {render,inspect};
 }
 root.createVeldrenScenePanels=createVeldrenScenePanels;
})(globalThis);
