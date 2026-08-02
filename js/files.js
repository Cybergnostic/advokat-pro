// OFFLINE FILE STORAGE (IndexedDB)
var AP_FILE_DB='advokat-pro-files';
var AP_FILE_STORE='files';
function fileDb(){
  return new Promise(function(resolve,reject){
    var req=indexedDB.open(AP_FILE_DB,1);
    req.onupgradeneeded=function(){
      if(!req.result.objectStoreNames.contains(AP_FILE_STORE)) req.result.createObjectStore(AP_FILE_STORE,{keyPath:'id'});
    };
    req.onsuccess=function(){resolve(req.result);};
    req.onerror=function(){reject(req.error);};
  });
}
async function storeFiles(fileList){
  var files=Array.from(fileList||[]); if(!files.length) return [];
  var db=await fileDb();
  var saved=[];
  for(var i=0;i<files.length;i++){
    var f=files[i];
    var id='f_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2,8);
    await new Promise(function(resolve,reject){
      var tx=db.transaction(AP_FILE_STORE,'readwrite');
      tx.objectStore(AP_FILE_STORE).put({id:id,name:f.name,type:f.type||'application/octet-stream',size:f.size,blob:f,createdAt:new Date().toISOString()});
      tx.oncomplete=resolve; tx.onerror=function(){reject(tx.error);};
    });
    saved.push({id:id,name:f.name,type:f.type||'application/octet-stream',size:f.size});
  }
  db.close(); return saved;
}
async function getStoredFile(id){
  var db=await fileDb();
  return new Promise(function(resolve,reject){
    var tx=db.transaction(AP_FILE_STORE,'readonly');
    var req=tx.objectStore(AP_FILE_STORE).get(id);
    req.onsuccess=function(){db.close();resolve(req.result||null);};
    req.onerror=function(){db.close();reject(req.error);};
  });
}
async function openStoredFile(id){
  try{
    var rec=await getStoredFile(id); if(!rec){alert('Datoteka nije pronađena na ovom uređaju.');return;}
    var url=URL.createObjectURL(rec.blob);
    var a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.download=rec.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url);},30000);
  }catch(e){console.error(e);alert('Datoteka nije mogla da se otvori.');}
}
async function deleteStoredFiles(items){
  var ids=(items||[]).map(function(x){return typeof x==='string'?x:x.id;}).filter(Boolean); if(!ids.length)return;
  var db=await fileDb();
  await new Promise(function(resolve,reject){
    var tx=db.transaction(AP_FILE_STORE,'readwrite'); var store=tx.objectStore(AP_FILE_STORE);
    ids.forEach(function(id){store.delete(id);});
    tx.oncomplete=resolve; tx.onerror=function(){reject(tx.error);};
  }); db.close();
}
function fmtFileSize(n){
  if(!n)return '0 B'; if(n<1024)return n+' B'; if(n<1048576)return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB';
}
