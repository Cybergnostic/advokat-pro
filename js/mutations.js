// DELETE / UPDATE
async function delPredmet(id){
  if(!confirm('Obrisati predmet? Predmet će biti označen kao obrisan i može se kasnije vratiti iz baze.'))return;
  try{await dbMutate({entity:'case',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.p=D.p.filter(function(x){return x.id!==id;});
  D.ra=D.ra.filter(function(x){return x.pid!==id;});
  D.k=D.k.filter(function(x){return x.pid!==id;});
  closeM('detail');render();
}
async function delRadnja(id,pid){
  if(!confirm('Obrisati ovu radnju? Biće označena kao obrisana, ne trajno uklonjena.'))return;
  try{await dbMutate({entity:'action',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.ra=D.ra.filter(function(x){return x.id!==id;});
  scheduleAlarms();if(pid)openDetail(pid);else{render();if(calSel)renderCal();}
}
async function delRok(id,pid){
  if(!confirm('Obrisati ovaj rok? Biće označen kao obrisan, ne trajno uklonjen.'))return;
  try{await dbMutate({entity:'deadline',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.k=D.k.filter(function(x){return x.id!==id;});
  scheduleAlarms();if(pid)openDetail(pid);else render();
}
function chooseCaseAssignee(id){
  if(!USERS.length)return;
  var p=D.p.find(function(x){return x.id===id;});if(!p)return;
  var list=USERS.map(function(u,i){return (i+1)+'. '+u.displayName+(u.role==='dev'?' (dev)':'');}).join('\n');
  var choice=prompt('Zaduženi korisnik za '+p.br+':\n\n'+list+'\n\nUnesite broj:');
  if(choice===null)return;
  var idx=parseInt(choice,10)-1;
  if(idx<0||idx>=USERS.length||!Number.isInteger(idx)){alert('Neispravan izbor.');return;}
  assignCase(id,USERS[idx].id);
}
async function assignCase(id,userId){
  var p=D.p.find(function(x){return x.id===id;});if(!p)return;
  var oldId=p.assignedUserId||'';
  var u=USERS.find(function(x){return x.id===userId;});if(!u)return;
  try{await dbMutate({entity:'case',action:'update',id:id,fields:{assignedUserId:userId}});}catch(e){
    var sel=document.getElementById('detail-assignee');if(sel)sel.value=oldId;
    dbError(e);return;
  }
  p.assignedUserId=userId;p.assignedUserName=u.displayName;
  if(document.getElementById('mo-detail').classList.contains('open'))openDetail(id);
  render();
}
async function addUplata(id){
  var iz=parseFloat(prompt('Iznos uplate (RSD):'));if(!iz||isNaN(iz)||iz<=0)return;
  var p=D.p.find(function(x){return x.id===id;});if(!p)return;
  var nap=prompt('Napomena uz uplatu (opciono):')||'';
  try{
    var result=await dbMutate({entity:'payment',action:'create',record:{pid:id,amount:iz,notes:nap}});
    var pay=result&&result.payment;if(!pay)throw new Error('Server nije vratio podatke o uplati.');
    if(!p.uplate)p.uplate=[];
    p.uplate.push(pay);
    p.plac=p.uplate.reduce(function(sum,x){return sum+Number(x.amount||0);},0);
  }catch(e){dbError(e);return;}
  openDetail(id);
}
async function delUplata(id,pid){
  if(!confirm('Obrisati ovu uplatu iz evidencije? Zapis ostaje sačuvan kao obrisan.'))return;
  var p=D.p.find(function(x){return x.id===pid;});if(!p)return;
  try{await dbMutate({entity:'payment',action:'delete',id:id});}catch(e){dbError(e);return;}
  p.uplate=(p.uplate||[]).filter(function(x){return x.id!==id;});
  p.plac=p.uplate.reduce(function(sum,x){return sum+Number(x.amount||0);},0);
  openDetail(pid);
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
