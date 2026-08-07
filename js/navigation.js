// TABS
function sw(tab){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('active');});
  var tabs=['pregled','rocista','rokovi','kalendar','potrazivanja','tarifa'];
  document.querySelectorAll('.tab')[tabs.indexOf(tab)].classList.add('active');
  document.getElementById('pg-'+tab).classList.add('active');
  if(tab==='kalendar') renderCal();
  else if(tab==='potrazivanja') renderPot();
  else render();
}

// MODAL OPEN/CLOSE
function openM(type,pid,dat){
  var el=document.getElementById('mo-'+type);
  if(!el) return;
  if(type==='radnja'){
    document.getElementById('ra-search').value='';
    document.getElementById('ra-pred').value='';
    document.getElementById('ra-ac-sel').className='ac-sel';
    document.getElementById('ra-ac-res').classList.remove('open');
    document.getElementById('ra-dat').value=dat||'';
    document.getElementById('ra-vr').value='';
    document.getElementById('ra-sala').value='';
    document.getElementById('ra-nap').value='';
    document.getElementById('ra-files').value='';
    setTip('rociste');
    if(pid){
      var p=D.p.find(function(x){return x.id===pid;});
      if(p){
        document.getElementById('ra-search').value=p.br;
        document.getElementById('ra-pred').value=p.id;
        document.getElementById('ra-ac-sel').innerHTML='<b>'+esc(p.br)+'</b> — '+esc(p.tuz);
        document.getElementById('ra-ac-sel').className='ac-sel show';
        raLista();
      }
    }
  }
  if(type==='rok'){
    document.getElementById('rk-search').value='';
    document.getElementById('rk-pred').value='';
    document.getElementById('rk-ac-sel').className='ac-sel';
    document.getElementById('rk-ac-res').classList.remove('open');
    document.getElementById('rk-dat').value='';
    document.getElementById('rk-kraj').value='';
    delete document.getElementById('rk-kraj').dataset.iso;
    document.getElementById('rk-nap').value='';
    if(pid){
      var rp=D.p.find(function(x){return x.id===pid;});
      if(rp){
        document.getElementById('rk-search').value=rp.br;
        document.getElementById('rk-pred').value=rp.id;
        document.getElementById('rk-ac-sel').innerHTML='<b>'+esc(rp.br)+'</b> — '+esc(rp.tuz);
        document.getElementById('rk-ac-sel').className='ac-sel show';
      }
    }
  }
  if(type==='pot'){
    document.getElementById('pot-search').value='';
    document.getElementById('pot-pid').value='';
    document.getElementById('pot-ac-sel').className='ac-sel';
    document.getElementById('pot-br').value='';
    document.getElementById('pot-klijent').value='';
    document.getElementById('pot-iznos').value='';
    document.getElementById('pot-dat').value='';
    document.getElementById('pot-nap').value='';
    potSt('pravnosnazno');
  }
  el.classList.add('open');
}
function closeM(type){
  var el=document.getElementById('mo-'+type);
  if(el) el.classList.remove('open');
  setTimeout(function(){if(typeof flushPendingRefresh==='function')flushPendingRefresh();},0);
}
