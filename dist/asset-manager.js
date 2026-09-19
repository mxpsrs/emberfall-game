'use strict';
(function(){
  class VeldrenAssetError extends Error {
    constructor(message, details={}){
      super(message);
      this.name='VeldrenAssetError';
      Object.assign(this,details);
    }
  }

  class VeldrenAssetManager {
    constructor(options={}){
      this.registryPath=options.registryPath||'data/asset-registry.json';
      this.registry=null;
      this.assets=new Map();
      this.cache=new Map();
      this.inflight=new Map();
      this.loaders=new Map();
      this.errors=[];
      this.registerLoader('image',this._loadImage.bind(this));
      this.registerLoader('texture',this._loadImage.bind(this));
      this.registerLoader('audio',this._loadArrayBuffer.bind(this));
      this.registerLoader('json',this._loadJSON.bind(this));
      this.registerLoader('text',this._loadText.bind(this));
      this.registerLoader('embedded-model-library',this._loadEmbeddedLibrary.bind(this));
    }

    registerLoader(type,loader){
      if(!type||typeof loader!=='function')throw new TypeError('Asset loader requires a type and function.');
      this.loaders.set(type,loader);
      return this;
    }

    async init(){
      const response=await fetch(this._url(this.registryPath),{cache:'no-cache'});
      if(!response.ok)throw new VeldrenAssetError('Asset registry unavailable.',{path:this.registryPath,status:response.status});
      const registry=await response.json();
      if(!registry||!Array.isArray(registry.assets))throw new VeldrenAssetError('Asset registry is invalid.',{path:this.registryPath});
      this.registry=registry;
      this.assets.clear();
      for(const asset of registry.assets){
        if(!asset?.id||!asset?.path)continue;
        if(this.assets.has(asset.id))throw new VeldrenAssetError('Duplicate asset ID in registry.',{assetId:asset.id,path:asset.path});
        this.assets.set(asset.id,Object.freeze({...asset}));
      }
      return this;
    }

    has(id){return this.assets.has(id);}
    get(id){return this.assets.get(id)||null;}
    list(filter={}){
      const out=[...this.assets.values()];
      return out.filter(asset=>Object.entries(filter).every(([key,value])=>value==null||asset[key]===value));
    }

    async load(id,context={}){
      const asset=this.get(id);
      if(!asset)throw this._fail('Unknown asset ID.',{assetId:id,referencingObject:context.referencingObject||null});
      if(this.cache.has(id))return this.cache.get(id);
      if(this.inflight.has(id))return this.inflight.get(id);
      const task=this._load(asset,context).then(value=>{
        this.cache.set(id,value);
        this.inflight.delete(id);
        return value;
      }).catch(error=>{
        this.inflight.delete(id);
        throw error;
      });
      this.inflight.set(id,task);
      return task;
    }

    release(id){this.cache.delete(id);}
    clear(){this.cache.clear();this.inflight.clear();}

    async _load(asset,context){
      try{
        if(asset.type==='model' || asset.type==='gltf' || asset.type==='glb'){
          const loader=this.loaders.get(asset.type)||this.loaders.get('model');
          if(!loader)throw new VeldrenAssetError('No GLB/GLTF model loader is registered.',{assetId:asset.id,path:asset.path});
          return await loader(asset,this._url(asset.path),context);
        }
        const loader=this.loaders.get(asset.type);
        if(!loader)throw new VeldrenAssetError('No loader registered for asset type.',{assetId:asset.id,path:asset.path,assetType:asset.type});
        return await loader(asset,this._url(asset.path),context);
      }catch(error){
        if(error instanceof VeldrenAssetError)throw this._record(error,context);
        throw this._fail(error?.message||'Asset load failed.',{
          assetId:asset.id,
          path:asset.path,
          assetType:asset.type,
          missingDependency:error?.missingDependency||null,
          referencingObject:context.referencingObject||null,
          cause:error
        });
      }
    }

    _url(path){
      return typeof realmAssetURL==='function'?realmAssetURL(path):path;
    }

    _record(error,context={}){
      if(context.referencingObject&&!error.referencingObject)error.referencingObject=context.referencingObject;
      this.errors.push({
        time:new Date().toISOString(),
        assetId:error.assetId||null,
        path:error.path||null,
        missingDependency:error.missingDependency||null,
        referencingObject:error.referencingObject||null,
        message:error.message
      });
      console.error('[VeldrenAssetManager]',{
        assetId:error.assetId||null,
        path:error.path||null,
        missingDependency:error.missingDependency||null,
        referencingObject:error.referencingObject||null,
        error
      });
      return error;
    }

    _fail(message,details){return this._record(new VeldrenAssetError(message,details));}

    _loadImage(asset,url){
      return new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>resolve(image);
        image.onerror=()=>reject(new VeldrenAssetError('Image dependency unavailable.',{assetId:asset.id,path:asset.path,missingDependency:asset.path}));
        image.src=url;
      });
    }

    async _loadArrayBuffer(asset,url){
      const response=await fetch(url);
      if(!response.ok)throw new VeldrenAssetError('Binary asset unavailable.',{assetId:asset.id,path:asset.path,status:response.status});
      return response.arrayBuffer();
    }

    async _loadJSON(asset,url){
      const response=await fetch(url);
      if(!response.ok)throw new VeldrenAssetError('JSON asset unavailable.',{assetId:asset.id,path:asset.path,status:response.status});
      return response.json();
    }

    async _loadText(asset,url){
      const response=await fetch(url);
      if(!response.ok)throw new VeldrenAssetError('Text asset unavailable.',{assetId:asset.id,path:asset.path,status:response.status});
      return response.text();
    }

    async _loadEmbeddedLibrary(asset){
      const script=document.querySelector('script[src^="'+asset.path+'"]');
      if(!script)throw new VeldrenAssetError('Embedded model library is not loaded by the document.',{assetId:asset.id,path:asset.path});
      return {asset,script,embedded:true};
    }
  }

  window.VeldrenAssetError=VeldrenAssetError;
  window.VeldrenAssetManager=VeldrenAssetManager;
  window.assetManager=new VeldrenAssetManager();

  window.registerVeldrenModelLoader=function(loader){
    if(typeof loader!=='function')throw new TypeError('Model loader must be a function.');
    window.assetManager.registerLoader('model',loader);
    window.assetManager.registerLoader('gltf',loader);
    window.assetManager.registerLoader('glb',loader);
  };

  window.assetManagerReady=window.assetManager.init().catch(error=>{
    console.error('Veldren asset registry failed to initialize.',error);
    throw error;
  });
})();
