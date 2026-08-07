// RADNJA FORM
var _tip='rociste',_st='buduci';
function setTip(tip){
  _tip=tip;document.getElementById('tp-pod').className='tg'+(tip==='podnesak'?' agr':'');document.getElementById('tp-roc').className='tg'+(tip==='rociste'?' ab':'');
  document.getElementById('ra-sw').style.display=tip==='rociste'?'block':'none';
  document.getElementById('ra-file-wrap').style.display=tip==='podnesak'?'block':'none';
  document.getElementById('ra-sala').closest('.fg').style.display=tip==='rociste'?'block':'none';
  if(tip==='rociste')setSt('buduci');raLista();
}
function setSt(s){_st=s;var m={odrzano:'agr',odlozeno:'ar',buduci:'ab'};['od','ol','bu'].forEach(function(x,i){var k=['odrzano','odlozeno','buduci'][i];document.getElementById('st-'+x).className='tg'+(k===s?' '+m[k]:'');});}
function raLista(){
  var pid=document.getElementById('ra-pred').value;var p=D.p.find(function(x){return x.id===pid;});var lista=getRL(p?p.vrsta:'parnicni',_tip,p?p.uloga:'default');var sel=document.getElementById('ra-naziv');sel.replaceChildren();
  lista.forEach(function(r){var opt=document.createElement('option');opt.value=r.n;opt.textContent=r.n;sel.appendChild(opt);});
}
async function saveRadnja(){
  var pid=document.getElementById('ra-pred').value,dat=document.getElementById('ra-dat').value,naziv=document.getElementById('ra-naziv').value;
  if(!pid){alert('Izaberite predmet.');return;}if(!dat){alert('Unesite datum.');return;}if(!naziv){alert('Izaberite naziv radnje.');return;}
  var fileInput=document.getElementById('ra-files');
  var obj={id:newId(),pid:pid,dat:dat,vr:document.getElementById('ra-vr').value,sala:document.getElementById('ra-sala').value.trim(),nap:document.getElementById('ra-nap').value.trim(),tip:_tip,naziv:naziv,status:_tip==='rociste'?_st:'done',files:[],iznos:0};
  try{
    var result=await dbMutate({entity:'action',action:'create',record:obj});
    obj.iznos=Number(result&&result.fee_amount||0);
    if(_tip==='podnesak'&&fileInput&&fileInput.files&&fileInput.files.length){obj.files=await storeFiles(fileInput.files,obj.id);}
  }catch(e){
    try{await dbMutate({entity:'action',action:'delete',id:obj.id});}catch(_){}
    dbError(e);return;
  }
  D.ra.push(obj);
  closeM('radnja');scheduleAlarms();render();if(fileInput)fileInput.value='';if(calSel)renderCal();
}
