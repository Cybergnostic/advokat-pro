// TARIFF CALC
var _tcU='okrivljeni',_tcS=false,_tcSud='osnovni',_tcReq=0;
function tcUloga(u){_tcU=u;document.getElementById('tc-okr').className='tg'+(u==='okrivljeni'?' ab':'');document.getElementById('tc-ost').className='tg'+(u==='osteceni'?' agr':'');calcTC();}
function tcSld(v){_tcS=v;document.getElementById('tc-sne').className='tg'+(v?'':' ab');document.getElementById('tc-sda').className='tg'+(v?' ap':'');calcTC();}
function tcSud(s){_tcSud=s;['os','vs','ps'].forEach(function(x,i){var k=['osnovni','visi','privredni'][i];document.getElementById('ts-'+x).className='tg'+(s===k?' ag':'');});calcTC();}
function bRows(title,rows){var h='<div class="tt"><div class="tt-h">'+esc(title)+'</div>';rows.forEach(function(r,i){h+='<div class="tt-r"><span class="tt-l">'+esc(r[0])+'</span><span class="tt-v'+(i===rows.length-1?' hi':'')+'">'+fmt(r[1])+'</span></div>';});return h+'</div>';}

async function calcTC(){
  var v=parseFloat(document.getElementById('tc-val').value)||0;
  var vrsta=document.getElementById('tc-vrsta').value;
  var isK=vrsta==='krivicni',isN=vrsta==='nepro';
  document.getElementById('tc-k-opts').style.display=isK?'block':'none';
  document.getElementById('tc-npro-opts').style.display=isN?'block':'none';
  document.getElementById('tc-sud-wrap').style.display=(isK||isN)?'none':'block';
  var tw=document.getElementById('tc-taksa');
  var out=document.getElementById('tc-result');
  var req=++_tcReq;

  if(!isK&&!isN&&v<=0){out.innerHTML='';tw.style.display='none';return;}

  try{
    var data=await apiRequest('/api/tariff',{
      method:'POST',
      body:JSON.stringify({
        op:'calculator',mode:vrsta,value:v,courtType:_tcSud,
        clientRole:_tcU,courtAppointed:_tcS,
        nonAssessableIndex:parseInt(document.getElementById('tc-npv').value||0)
      })
    });
    if(req!==_tcReq)return;
    var r=data&&data.result||{};
    var html='';

    if(isK){
      html='<div class="tt"><div class="tt-h">T.br.1 · Krivični · '+(_tcU==='osteceni'?'Punomoćnik oštećenog':'Branilac okrivljenog')+(_tcS?' · Po sl. dužnosti (−50%)':'')+'</div>';
      (r.bands||[]).forEach(function(row){
        html+='<div class="tt-r" style="flex-direction:column;align-items:flex-start;gap:3px;padding:10px 14px">'
          +'<div style="font-size:11px;font-weight:700;color:var(--gd2)">'+esc(row.label)+'</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 9px;width:100%;font-size:11px">'
          +'<span style="color:var(--t2)">Odbrana na pretresu:</span><span style="font-weight:600">'+fmt(row.od)+'</span>'
          +'<span style="color:var(--t2)">Zastupl. oštećenog/neodržan:</span><span style="font-weight:600">'+fmt(row.zo)+'</span>'
          +'<span style="color:var(--t2)">Inicijalni akti:</span><span style="font-weight:600">'+fmt(row.ini)+'</span>'
          +'<span style="color:var(--t2)">Ostali podnesci:</span><span style="font-weight:600">'+fmt(row.ost)+'</span>'
          +'<span style="color:var(--t2)">Žalba:</span><span style="font-weight:600;color:var(--gd2)">'+fmt(row.zal)+'</span>'
          +'</div></div>';
      });
      html+='</div>';
    }else if(isN){
      var tn=r.tariff;if(tn)html=bRows('T.br.14 — Neprocenjivi',[['Podnesak',tn.pod],['Ročište',tn.roc],['Neodržano',tn.neo],['Žalba',tn.zal]]);
    }else{
      var t=r.tariff;
      if(t&&vrsta==='parnicni')html=bRows('T.br.13 — Parnični',[['Podnesak',t.pod],['Ročište',t.roc],['Neodržano',t.neo],['Žalba',t.zal]]);
      else if(t&&vrsta==='izvrsni')html=bRows('Izvršni (75% parničnog)',[['Predlog za izvršenje',t.pod],['Ročište',t.roc],['Neodržano',t.neo],['Žalba',t.zal]]);
    }
    out.innerHTML=html;

    var st=r.courtFee;
    if(st&&!isK&&!isN){
      tw.style.display='block';
      document.getElementById('tc-sud-lbl').textContent=(SUDL[_tcSud]||_tcSud)+' · Vrednost: '+v.toLocaleString('sr-RS')+' din';
      document.getElementById('tc-tuzba').textContent=fmt(st.tuzba);
      document.getElementById('tc-presuda').textContent=fmt(st.presuda);
      document.getElementById('tc-zalba').textContent=fmt(st.zalba);
    }else tw.style.display='none';
  }catch(e){
    if(req===_tcReq){console.warn('Tariff calculator failed',e);out.innerHTML='<div class="empty"><div class="et">Tarifni kalkulator trenutno nije dostupan.</div></div>';tw.style.display='none';}
  }
}
