// TARIFF CALC
var _tcU='okrivljeni',_tcS=false,_tcSud='osnovni';
function tcUloga(u){_tcU=u;document.getElementById('tc-okr').className='tg'+(u==='okrivljeni'?' ab':'');document.getElementById('tc-ost').className='tg'+(u==='osteceni'?' agr':'');calcTC();}
function tcSld(v){_tcS=v;document.getElementById('tc-sne').className='tg'+(v?'':' ab');document.getElementById('tc-sda').className='tg'+(v?' ap':'');calcTC();}
function tcSud(s){_tcSud=s;['os','vs','ps'].forEach(function(x,i){var k=['osnovni','visi','privredni'][i];document.getElementById('ts-'+x).className='tg'+(s===k?' ag':'');});calcTC();}
function bRows(title,rows){
  var h='<div class="tt"><div class="tt-h">'+title+'</div>';
  rows.forEach(function(r,i){h+='<div class="tt-r"><span class="tt-l">'+r[0]+'</span><span class="tt-v'+(i===rows.length-1?' hi':'')+'">'+fmt(r[1])+'</span></div>';});
  return h+'</div>';
}
function calcTC(){
  var v=parseFloat(document.getElementById('tc-val').value);
  var vrsta=document.getElementById('tc-vrsta').value;
  var isK=vrsta==='krivicni',isN=vrsta==='nepro';
  document.getElementById('tc-k-opts').style.display=isK?'block':'none';
  document.getElementById('tc-npro-opts').style.display=isN?'block':'none';
  document.getElementById('tc-sud-wrap').style.display=(isK||isN)?'none':'block';
  var tw=document.getElementById('tc-taksa');
  var html='';
  if(isK){
    html='<div class="tt"><div class="tt-h">T.br.1 · Krivični · '+(_tcU==='osteceni'?'Punomoćnik oštećenog':'Branilac okrivljenog')+(_tcS?' · Po sl. dužnosti (−50%)':'')+'</div>';
    TAR_K.forEach(function(row,i){
      var base=_tcU==='osteceni'?getTKO(i):row;var mul=_tcS?0.5:1;
      html+='<div class="tt-r" style="flex-direction:column;align-items:flex-start;gap:3px;padding:10px 14px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--gd2)">'+row.l+'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 9px;width:100%;font-size:11px">'
        +'<span style="color:var(--t2)">Odbrana na pretresu:</span><span style="font-weight:600">'+fmt(Math.round(base.od*mul))+'</span>'
        +'<span style="color:var(--t2)">Zastupl. oštećenog/neodržan:</span><span style="font-weight:600">'+fmt(Math.round(base.zo*mul))+'</span>'
        +'<span style="color:var(--t2)">Inicijalni akti:</span><span style="font-weight:600">'+fmt(Math.round(base.ini*mul))+'</span>'
        +'<span style="color:var(--t2)">Ostali podnesci:</span><span style="font-weight:600">'+fmt(Math.round(base.ost*mul))+'</span>'
        +'<span style="color:var(--t2)">Žalba:</span><span style="font-weight:600;color:var(--gd2)">'+fmt(Math.round(base.zal*mul))+'</span>'
        +'</div></div>';
    });
    html+='</div>';tw.style.display='none';
  } else if(isN){
    var idx=parseInt(document.getElementById('tc-npv').value||0);var t=TAR_N[idx];
    html=bRows('T.br.14 — Neprocenjivi',[['Podnesak',t.pod],['Ročište',t.roc],['Neodržano',t.neo],['Žalba',t.zal]]);tw.style.display='none';
  } else if(v&&v>0){
    if(vrsta==='parnicni'){var t2=getTarP(v);if(t2)html=bRows('T.br.13 — Parnični',[['Podnesak',t2.pod],['Ročište',t2.roc],['Neodržano',t2.neo],['Žalba',t2.zal]]);}
    else if(vrsta==='izvrsni'){var t3=getTarI(v);if(t3)html=bRows('Izvršni (75% parničnog)',[['Predlog za izvršenje',t3.pod],['Ročište',t3.roc],['Neodržano',t3.neo],['Žalba',t3.zal]]);}
    if(vrsta==='parnicni'||vrsta==='izvrsni'){
      var st=getST(v,_tcSud);
      if(st){tw.style.display='block';document.getElementById('tc-sud-lbl').textContent=SUDL[_tcSud]+' · Vrednost: '+v.toLocaleString('sr-RS')+' din';document.getElementById('tc-tuzba').textContent=fmt(st.tuzba);document.getElementById('tc-presuda').textContent=fmt(st.presuda);document.getElementById('tc-zalba').textContent=fmt(st.zalba);}
    }else tw.style.display='none';
  }else tw.style.display='none';
  document.getElementById('tc-result').innerHTML=html;
}
