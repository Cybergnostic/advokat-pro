// POTRAŽIVANJA
var _potSt='pravnosnazno';
function potSt(s){
  _potSt=s;
  var ids=['pst-prav','pst-zalb','pst-izv','pst-del'];
  var vals=['pravnosnazno','zalbeno','izvrsno','delimicno'];
  var cols=['agr','ao','ab','ap'];
  ids.forEach(function(id,i){document.getElementById(id).className='tg'+(vals[i]===s?' '+cols[i]:'');});
}
async function savePot(){
  var pid=document.getElementById('pot-pid').value;
  var br=document.getElementById('pot-br').value.trim()||(pid?D.p.find(function(x){return x.id===pid;})||{br:''}:{br:''}).br;
  var iznos=parseFloat(document.getElementById('pot-iznos').value)||0;
  var klijent=document.getElementById('pot-klijent').value.trim();
  if(!br&&!pid){alert('Unesite broj predmeta ili izaberite iz liste.');return;}
  if(!iznos){alert('Unesite iznos potraživanja.');return;}
  var obj={id:Date.now().toString(),pid:pid||'',br:document.getElementById('pot-br').value.trim()||br,klijent:klijent,iznos:iznos,status:_potSt,dat:document.getElementById('pot-dat').value,nap:document.getElementById('pot-nap').value.trim(),datUnos:todayIso()};
  try{await dbMutate({entity:'claim',action:'create',record:obj});}catch(e){dbError(e);return;}
  D.pot.push(obj);closeM('pot');renderPot();
  document.getElementById('sn-pot').textContent=D.pot.filter(function(x){return x.status!=='placeno';}).length;
}
function openPotAct(id){
  var pot=D.pot.find(function(x){return x.id===id;}); if(!pot) return;
  document.getElementById('potact-id').value=id;
  document.getElementById('potact-title').textContent=pot.br||'Potraživanje';
  document.getElementById('potact-info').innerHTML='<div style="font-size:13px;color:var(--t2);margin-bottom:4px">Klijent: <b style="color:var(--tx)">'+esc(pot.klijent)+'</b></div><div class="pot-iznos">'+fmt(pot.iznos)+'</div><div style="margin-top:8px">'+potBdg(pot.status)+'</div>';
  var stMap={
    pravnosnazno:[{l:'⚙ Pusti na izvršenje',fn:'potPushIzv',cls:'btn-bl'},{l:'💰 Naplaćeno — arhivirati',fn:'potPaid',cls:'btn-gr'},{l:'⚠ Prebaci u žalbeni postupak',fn:'potPushZalba',cls:'btn-or'}],
    zalbeno:[{l:'✅ Pravnosnažno rešenje',fn:'potPushPrav',cls:'btn-gr'},{l:'💰 Naplaćeno — arhivirati',fn:'potPaid',cls:'btn-gr'}],
    izvrsno:[{l:'💰 Naplaćeno — arhivirati',fn:'potPaid',cls:'btn-gr'},{l:'◑ Delimično naplaćeno',fn:'potPushDelim',cls:'btn-pu'}],
    delimicno:[{l:'💰 Potpuno naplaćeno — arhivirati',fn:'potPaid',cls:'btn-gr'},{l:'⚙ Pusti na izvršenje (ostatak)',fn:'potPushIzv',cls:'btn-bl'}],
  };
  var actions=stMap[pot.status]||[];actions.push({l:'🗑 Obriši',fn:'potDel',cls:'btn-rd'});
  document.getElementById('potact-btns').innerHTML=actions.map(function(a){return '<button class="btn '+a.cls+'" style="width:100%;justify-content:center;padding:12px;font-size:14px" onclick="'+a.fn+'(\''+id+'\')">'+a.l+'</button>';}).join('');
  document.getElementById('mo-potact').classList.add('open');
}
function potPushIzv(id){potChange(id,'izvrsno');}
function potPushZalba(id){potChange(id,'zalbeno');}
function potPushPrav(id){potChange(id,'pravnosnazno');}
function potPushDelim(id){potChange(id,'delimicno');}
async function potChange(id,st){var pot=D.pot.find(function(x){return x.id===id;});if(!pot)return;try{await dbMutate({entity:'claim',action:'update',id:id,fields:{status:st}});}catch(e){dbError(e);return;}pot.status=st;closeM('potact');renderPot();}
async function potPaid(id){
  var pot=D.pot.find(function(x){return x.id===id;});if(!pot)return;
  if(!confirm('Označiti kao naplaćeno i premestiti u arhivu plaćanja?'))return;
  var datPlacanja=todayIso();
  try{await dbMutate({entity:'claim',action:'update',id:id,fields:{status:'placeno',datPlacanja:datPlacanja}});}catch(e){dbError(e);return;}
  pot.status='placeno';pot.datPlacanja=datPlacanja;D.arh.unshift(pot);D.pot=D.pot.filter(function(x){return x.id!==id;});closeM('potact');renderPot();
}
async function potDel(id){
  if(!confirm('Obrisati potraživanje? Zapis će ostati sačuvan kao obrisan.'))return;
  try{await dbMutate({entity:'claim',action:'delete',id:id});}catch(e){dbError(e);return;}
  D.pot=D.pot.filter(function(x){return x.id!==id;});closeM('potact');renderPot();
}
function potBdg(st){var cls={pravnosnazno:'ps-prav',zalbeno:'ps-zalb',izvrsno:'ps-izv',delimicno:'bp2',placeno:'ps-plac'};return '<span class="pot-status '+(cls[st]||'bg')+'">'+esc(PST[st]||st)+'</span>';}
function renderPot(){
  var act=D.pot.filter(function(x){return x.status!=='placeno';});var el=document.getElementById('lpot');document.getElementById('sn-pot').textContent=act.length;
  if(!act.length){el.innerHTML='<div class="empty"><div class="ei">💰</div><div class="et">Nema aktivnih potraživanja.<br>Dodajte novo potraživanje.</div></div>';}
  else el.innerHTML=act.map(function(pot){return '<div class="card co" onclick="openPotAct(\''+pot.id+'\')"><div class="ch"><div class="cn">'+esc(pot.br)+'</div>'+potBdg(pot.status)+'</div><div class="cm">'+(pot.klijent?'<b>'+esc(pot.klijent)+'</b><br>':'')+(pot.dat?'Odluka: '+esc(fmtDs(pot.dat))+'<br>':'')+(pot.nap?esc(pot.nap):'')+'</div><div class="pot-iznos">'+fmt(pot.iznos)+'</div></div>';}).join('');
  var arh=D.arh,arhDs=document.getElementById('arh-ds'),lArh=document.getElementById('larh');
  if(!arh.length){arhDs.style.display='none';lArh.innerHTML='';return;}
  arhDs.style.display='flex';
  lArh.innerHTML=arh.slice(0,10).map(function(pot){return '<div class="arh-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px"><div style="font-family:\'Cormorant Garamond\',serif;font-size:15px;font-weight:700;color:var(--gr)">'+esc(pot.br)+'</div><div style="font-size:10px;color:var(--t3)">'+(pot.datPlacanja?esc(fmtDs(pot.datPlacanja)):'')+'</div></div><div style="font-size:12px;color:var(--t2)">'+esc(pot.klijent||'')+'</div><div class="pot-iznos plac" style="font-size:16px;margin-top:3px">'+fmt(pot.iznos)+'</div></div>';}).join('');
}
