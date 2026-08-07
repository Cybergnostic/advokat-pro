// AUTOCOMPLETE — PREDMET SEARCH
function acSearch(q,resId,hidId,selId,onSelect){
  var res=document.getElementById(resId);
  var q2=q.toLowerCase().trim();
  if(q2.length<1){res.classList.remove('open');return;}
  var m=D.p.filter(function(p){
    return p.br.toLowerCase().indexOf(q2)>=0||p.tuz.toLowerCase().indexOf(q2)>=0||(p.tuz2&&p.tuz2.toLowerCase().indexOf(q2)>=0);
  }).slice(0,8);
  if(!m.length){res.classList.remove('open');return;}
  res.innerHTML=m.map(function(p){
    return '<div class="ac-item" onclick="acSel(\''+p.id+'\',\''+hidId+'\',\''+selId+'\')">'
      +'<div class="ac-br">'+esc(p.br)+' <span style="font-size:10px;color:var(--t3)">'+esc(VL[p.vrsta]||p.vrsta)+'</span></div>'
      +'<div class="ac-sub">'+esc(p.tuz)+(p.tuz2?' v. '+esc(p.tuz2):'')+(p.sud?' · '+esc(p.sud):'')+'</div>'
      +'</div>';
  }).join('');
  res.classList.add('open');
}
function acSel(pid,hidId,selId){
  var p=D.p.find(function(x){return x.id===pid;}); if(!p) return;
  document.getElementById(hidId).value=pid;
  var inp=document.getElementById(hidId.replace('-pred','-search').replace('-pid','-search'));
  if(inp) inp.value=p.br;
  var sel=document.getElementById(selId);
  sel.innerHTML='<b>'+esc(p.br)+'</b> — '+esc(p.tuz)+(p.tuz2?' v. '+esc(p.tuz2):'')+(p.sud?'<br>🏛 '+esc(p.sud):'');
  sel.className='ac-sel show';
  document.getElementById(hidId.replace('-pred','-ac-res').replace('-pid','-ac-res')).classList.remove('open');
  if(hidId==='ra-pred') raLista();
}
function raAC(){ acSearch(document.getElementById('ra-search').value,'ra-ac-res','ra-pred','ra-ac-sel',null); }
function rkAC(){ acSearch(document.getElementById('rk-search').value,'rk-ac-res','rk-pred','rk-ac-sel',null); }
function potAC(){
  var q=document.getElementById('pot-search').value.toLowerCase().trim();
  var res=document.getElementById('pot-ac-res');
  if(q.length<1){res.classList.remove('open');return;}
  var m=D.p.filter(function(p){return p.br.toLowerCase().indexOf(q)>=0||p.tuz.toLowerCase().indexOf(q)>=0;}).slice(0,8);
  if(!m.length){res.classList.remove('open');return;}
  res.innerHTML=m.map(function(p){
    return '<div class="ac-item" onclick="potAcSel(\''+p.id+'\')">'
      +'<div class="ac-br">'+esc(p.br)+' <span style="font-size:10px;color:var(--t3)">'+esc(VL[p.vrsta]||p.vrsta)+'</span></div>'
      +'<div class="ac-sub">'+esc(p.tuz)+(p.tuz2?' v. '+esc(p.tuz2):'')+'</div>'
      +'</div>';
  }).join('');
  res.classList.add('open');
}
function potAcSel(pid){
  var p=D.p.find(function(x){return x.id===pid;}); if(!p) return;
  document.getElementById('pot-pid').value=pid;
  document.getElementById('pot-search').value=p.br;
  document.getElementById('pot-ac-res').classList.remove('open');
  document.getElementById('pot-ac-sel').innerHTML='<b>'+esc(p.br)+'</b> — '+esc(p.tuz)+(p.tuz2?' v. '+esc(p.tuz2):'');
  document.getElementById('pot-ac-sel').className='ac-sel show';
  document.getElementById('pot-br').value=p.br;
  document.getElementById('pot-klijent').value=p.tuz;
}
