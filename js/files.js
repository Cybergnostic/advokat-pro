// SHARED FILE STORAGE (Cloudflare R2)
async function storeFiles(fileList, actionId){
  var files=Array.from(fileList||[]); if(!files.length) return [];
  if(!actionId) throw new Error('Nedostaje ID radnje.');
  var saved=[];
  for(var i=0;i<files.length;i++){
    var form=new FormData();
    form.append('actionId',actionId);
    form.append('file',files[i]);
    var res=await fetch('/api/files',{method:'POST',body:form,credentials:'same-origin'});
    var data=null; try{data=await res.json();}catch(_){}
    if(!res.ok) throw new Error((data&&data.error)||('HTTP '+res.status));
    saved.push(data);
  }
  return saved;
}

function openStoredFile(id){
  if(!id)return;
  window.open('/api/files?id='+encodeURIComponent(id),'_blank','noopener');
}

async function deleteStoredFiles(items){
  var ids=(items||[]).map(function(x){return typeof x==='string'?x:x.id;}).filter(Boolean);
  for(var i=0;i<ids.length;i++){
    var res=await fetch('/api/files?id='+encodeURIComponent(ids[i]),{method:'DELETE',credentials:'same-origin'});
    if(!res.ok){
      var data=null;try{data=await res.json();}catch(_){}
      throw new Error((data&&data.error)||('HTTP '+res.status));
    }
  }
}

function fmtFileSize(n){
  if(!n)return '0 B'; if(n<1024)return n+' B'; if(n<1048576)return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB';
}
