// DELETE / UPDATE
async function delPredmet(id){
  if(!confirm('Obrisati predmet?'))return;
  try{await dbMutate({entity:'case',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.p=D.p.filter(function(x){return x.id!==id;});
  D.ra=D.ra.filter(function(x){return x.pid!==id;});
  D.k=D.k.filter(function(x){return x.pid!==id;});
  closeM('detail');render();
}
async function delRadnja(id,pid){
  try{await dbMutate({entity:'action',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.ra=D.ra.filter(function(x){return x.id!==id;});
  scheduleAlarms();if(pid)openDetail(pid);else{render();if(calSel)renderCal();}
}
async function delRok(id,pid){
  try{await dbMutate({entity:'deadline',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.k=D.k.filter(function(x){return x.id!==id;});
  scheduleAlarms();if(pid)openDetail(pid);else render();
}
async function addUplata(id){
  var iz=parseFloat(prompt('Iznos uplate (RSD):'));if(!iz||isNaN(iz))return;
  var p=D.p.find(function(x){return x.id===id;});if(!p)return;
  var novi=(p.plac||0)+iz;
  try{await dbMutate({entity:'case',action:'update',id:id,fields:{plac:novi}});}catch(e){dbError(e);return;}
  p.plac=novi;openDetail(id);
}
function openStUpdate(raId,pid){
  var ra=D.ra.find(function(x){return x.id===raId;});if(!ra)return;
  document.getElementById('upd-id').value=raId;document.getElementById('upd-pid').value=pid;
  document.getElementById('st-info').textContent=ra.naziv+' · '+fmtD(ra.dat);
  var m={odrzano:'agr',odlozeno:'ar',buduci:'ab'};
  ['od','ol','bu'].forEach(function(x,i){var k=['odrzano','odlozeno','buduci'][i];document.getElementById('upd-'+x).className='tg'+(k===ra.status?' '+m[k]:'');});
  document.getElementById('mo-status').classList.add('open');
}
async function updSt(s){
  var id=document.getElementById('upd-id').value;var pid=document.getElementById('upd-pid').value;
  var ra=D.ra.find(function(x){return x.id===id;});if(!ra)return;
  try{
    var result=await dbMutate({entity:'action',action:'update',id:id,fields:{status:s}});
    ra.iznos=Number(result&&result.fee_amount||0);
  }catch(e){dbError(e);return;}
  ra.status=s;scheduleAlarms();closeM('status');openDetail(pid);
}
