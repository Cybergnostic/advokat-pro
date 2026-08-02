// STRANKE PO VRSTI
var SCFG = {
  parnicni:   {s1:'Tužilac',    s2:'Tuženi',               uloge:[{v:'tuzilac',l:'Tužilac'},{v:'tuzeni',l:'Tuženi'}],              def:'tuzilac'},
  krivicni:   {s1:'Okrivljeni', s2:'Oštećeni',             uloge:[{v:'okrivljeni',l:'Okrivljeni'},{v:'osteceni',l:'Oštećeni'}],    def:'okrivljeni'},
  prekrsajni: {s1:'Okrivljeni', s2:'Oštećeni',             uloge:[{v:'okrivljeni',l:'Okrivljeni'},{v:'osteceni',l:'Oštećeni'}],    def:'okrivljeni'},
  upravni:    {s1:'Podnosilac', s2:'Organ / Protivna str.',uloge:[{v:'podnosilac',l:'Podnosilac'},{v:'protivnik',l:'Protivnik'}],  def:'podnosilac'},
  izvrsni:    {s1:'Poverilac',  s2:'Izvršni dužnik',       uloge:[{v:'poverilac',l:'Poverilac'},{v:'duznik',l:'Dužnik'}],         def:'poverilac'},
  vanparnicni:{s1:'Predlagač',  s2:'Protivnik predlagača', uloge:[{v:'predlagac',l:'Predlagač'},{v:'protivnik',l:'Protivnik'}],    def:'predlagac'},
  tuzilastvo: {s1:'Klijent', s2:'', uloge:[{v:'osumnjiceni',l:'Osumnjičeni'},{v:'okrivljeni',l:'Okrivljeni'},{v:'osteceni',l:'Oštećeni'}], def:'osumnjiceni'},
};
var UBOJE=['ab','ap','agr','ao'];
var _pKU='tuzilac';
function pKlUloga(u){
  _pKU=u;
  var v=document.getElementById('p-vrsta').value;
  var cfg=SCFG[v]||SCFG.parnicni;
  document.getElementById('tog-uloga').querySelectorAll('.tg').forEach(function(b,i){
    b.className='tg'+(cfg.uloge[i]&&cfg.uloge[i].v===u?' '+UBOJE[i]:'');
  });
}
function updateStranke(){
  var v=document.getElementById('p-vrsta').value;
  var cfg=SCFG[v]||SCFG.parnicni;
  document.getElementById('lbl-s1').textContent=cfg.s1;
  document.getElementById('lbl-s2').textContent=cfg.s2||'Protivna stranka';
  document.getElementById('fg-s2').style.display=(!cfg.s2&&v==='tuzilastvo')?'none':'block';
  var tog=document.getElementById('tog-uloga');
  tog.innerHTML=cfg.uloge.map(function(u,i){
    return '<button class="tg'+(u.v===cfg.def?' '+UBOJE[i]:'')+'" onclick="pKlUloga(\''+u.v+'\')">'+u.l+'</button>';
  }).join('');
  _pKU=cfg.def;
}

// TARIFE 2025
var TAR_P=[
  {max:50000,pod:10000,roc:15000,neo:10000,zal:20000},
  {max:850000,pod:15000,roc:20000,neo:12500,zal:30000},
  {max:1675000,pod:18750,roc:23750,neo:14375,zal:37500},
  {max:3350000,pod:27500,roc:32500,neo:18750,zal:55000},
  {max:6700000,pod:37500,roc:42500,neo:23750,zal:75000},
  {max:13350000,pod:50000,roc:55000,neo:30000,zal:100000},
  {max:26700000,pod:62500,roc:67500,neo:36250,zal:125000},
  {max:33350000,pod:75000,roc:80000,neo:42500,zal:150000},
];
function getTarP(v){
  if(!v||v<=0) return null;
  for(var i=0;i<TAR_P.length;i++) if(v<=TAR_P[i].max) return Object.assign({},TAR_P[i]);
  if(v<=135000000){var e=Math.ceil((v-33350000)/500000)*50;var pod=75000+e;return{pod:pod,roc:pod+5000,neo:Math.round(pod/2)+5000,zal:pod*2};}
  if(v<=335000000){var e2=Math.ceil((v-135000000)/1500000)*50;var p2=85200+e2;return{pod:p2,roc:p2+5000,neo:Math.round(p2/2)+5000,zal:p2*2};}
  var e3=Math.ceil((v-335000000)/7500000)*50;var p3=Math.min(91900+e3,141900);return{pod:p3,roc:p3+5000,neo:Math.round(p3/2)+5000,zal:p3*2};
}
function getTarI(v){var t=getTarP(v);if(!t)return null;return{pod:Math.round(t.pod*.75),roc:Math.round(t.roc*.75),neo:Math.round(t.neo*.75),zal:Math.round(t.zal*.75)};}
var TAR_N=[
  {l:'Smetanje poseda, razvod, roditeljsko pravo, radni sporovi...',pod:27500,roc:32500,neo:18750,zal:55000},
  {l:'Prekršaji pred policijom, nasilje u porodici',pod:30000,roc:35000,neo:20000,zal:60000},
  {l:'Službenosti, stambeni, neprocenjivi OS',pod:37500,roc:42500,neo:23750,zal:75000},
  {l:'Prekršajni sud — ostali',pod:35000,roc:40000,neo:22500,zal:70000},
  {l:'Utvrđ. očinstva, stečaj, neprocenjivi PS...',pod:42500,roc:47500,neo:26250,zal:85000},
  {l:'Ostali postupci pred državnim organom',pod:32500,roc:37500,neo:21250,zal:65000},
  {l:'Zakonsko izdržavanje',pod:15000,roc:20000,neo:12500,zal:30000},
  {l:'Privredni prestupi, poreski/carinski, neprocenjivi VS',pod:50000,roc:55000,neo:30000,zal:100000},
  {l:'Ostali sporovi pred Upravnim sudom',pod:60000,roc:65000,neo:35000,zal:120000},
  {l:'Autorski sporovi, Ustavni sud, arbitraža',pod:75000,roc:80000,neo:42500,zal:150000},
];
var TAR_K=[
  {l:'do 3 god.',od:35000,zo:20000,zal:60000,ini:30000,ost:15000},
  {l:'3 do 5 god.',od:42500,zo:23750,zal:75000,ini:37500,ost:18750},
  {l:'5 do 10 god.',od:55000,zo:30000,zal:100000,ini:50000,ost:25000},
  {l:'10 do 15 god.',od:80000,zo:42500,zal:150000,ini:75000,ost:37500},
  {l:'preko 15 god.',od:105000,zo:55000,zal:200000,ini:100000,ost:50000},
  {l:'30–40 god./doživotni',od:130000,zo:67500,zal:250000,ini:125000,ost:62500},
];
function getTKO(i){return{od:TAR_K[i].zo,zo:TAR_K[i].zo,zal:TAR_K[i].zal,ini:TAR_K[i].ost,ost:TAR_K[i].ost};}
function getST(v,tip){
  if(!v||v<=0) return null;
  var t;
  if(tip==='privredni'){
    if(v<=100000)t=4700;
    else if(v<=500000)t=Math.round(4700+(v-100000)*0.03);
    else if(v<=1000000)t=Math.round(16700+(v-500000)*0.025);
    else if(v<=5000000)t=Math.round(29200+(v-1000000)*0.015);
    else t=Math.min(Math.round(89200+(v-5000000)*0.005),195000);
  } else {
    if(v<=10000)t=1900;
    else if(v<=100000)t=Math.round(1900+(v-10000)*0.04);
    else if(v<=500000)t=Math.round(9800+(v-100000)*0.02);
    else if(v<=1000000)t=Math.round(29300+(v-500000)*0.01);
    else t=Math.min(Math.round(48800+(v-1000000)*0.005),97500);
    if(tip==='visi') t=Math.round(t*1.3);
  }
  return{tuzba:t,presuda:t,zalba:Math.round(t*0.5)};
}

// RADNJE PO VRSTI
var RAD_K={
  podnesak:[
    {n:'Privatna tužba / krivična prijava',col:'ini'},{n:'Optužni akt',col:'ini'},
    {n:'Predlog za preduzimanje dokaznih radnji',col:'ini'},{n:'Predlog za sporazum o priznavanju',col:'ini'},
    {n:'Odgovor na optužnicu',col:'ini'},{n:'Predlog za ukidanje / zamenu pritvora',col:'ini'},
    {n:'Pismena odbrana',col:'ini'},{n:'Obrazloženi podnesak',col:'ini'},
    {n:'Predlog za odlaganje izvršenja kazne',col:'ini'},{n:'Predlog za kućni pritvor',col:'ini'},
    {n:'Molba za uslovni otpust',col:'ini'},{n:'Zahtev za rehabilitaciju',col:'ini'},
    {n:'Žalba na rešenje o pritvoru',col:'ini'},{n:'Žalba na produženje zabrane napuštanja',col:'ini'},
    {n:'Odgovor na žalbu',col:'ini'},{n:'Molba za pomilovanje',col:'ini'},
    {n:'Predlog za ponavljanje postupka',col:'zal'},{n:'Žalba na presudu',col:'zal'},
    {n:'Zahtev za zaštitu zakonitosti',col:'zal'},{n:'Ustavna žalba',col:'zal'},
    {n:'Ostali podnesak',col:'ost'},
  ],
  rociste:[
    {n:'Odbrana na pretresu / javnoj sednici',col:'od',nc:'zo'},
    {n:'Razgovor sa okrivljenim u pritvoru',col:'od',nc:'zo'},
    {n:'Sednica veća / žalbeno ročište',col:'od',nc:'zo'},
    {n:'Predkrivični / istražni postupak',col:'od',nc:'zo'},
    {n:'Suočavanje i saslušanje svedoka',col:'od',nc:'zo'},
    {n:'Neodržan pretres (odloženo)',col:'zo',nc:'zo'},
    {n:'Prijem rešenja o zadržavanju',col:'zo',nc:'zo'},
  ]
};
var RAD_KOST={
  podnesak:RAD_K.podnesak,
  rociste:[
    {n:'Zastupanje oštećenog na pretresu',col:'zo',nc:'zo'},
    {n:'Sednica veća — oštećeni',col:'zo',nc:'zo'},
    {n:'Neodržan pretres (odloženo)',col:'zo',nc:'zo'},
  ]
};
var RADNJE={
  parnicni:{podnesak:[{n:'Tužba / Podnesak',tf:'pod'},{n:'Odgovor na tužbu',tf:'pod'},{n:'Prigovor / Replika',tf:'pod'},{n:'Žalba na presudu',tf:'zal'}],rociste:[{n:'Ročište',tf:'roc'},{n:'Neodržano ročište',tneo:true}]},
  krivicni:{podnesak:RAD_K.podnesak,rociste:RAD_K.rociste},
  prekrsajni:{podnesak:[{n:'Pisana odbrana',fx:35000},{n:'Žalba na presudu',fx:70000},{n:'Zahtev za obnovu postupka',fx:35000}],rociste:[{n:'Ročište (pretres)',fx:40000},{n:'Neodržano ročište',fxn:22500}]},
  upravni:{podnesak:[{n:'Podnesak / Zahtev',fx:27500},{n:'Žalba na rešenje organa',fx:55000},{n:'Tužba u upravnom sporu',fx:50000}],rociste:[{n:'Ročište / Rasprava',fx:32500},{n:'Ročište u upr. sporu',fx:55000},{n:'Neodržano ročište',fxn:18750}]},
  izvrsni:{podnesak:[{n:'Predlog za izvršenje',tf:'pod'},{n:'Prigovor na rešenje',tf:'pod'},{n:'Žalba',tf:'zal'}],rociste:[{n:'Ročište',tf:'roc'},{n:'Neodržano ročište',tneo:true}]},
  vanparnicni:{podnesak:[{n:'Podnesak',tf:'pod'},{n:'Žalba',tf:'zal'}],rociste:[{n:'Ročište',tf:'roc'},{n:'Neodržano ročište',tneo:true}]},
  tuzilastvo:{podnesak:RAD_K.podnesak,rociste:RAD_K.rociste},
};
function getRL(vrsta,tip,uloga){
  if(vrsta==='krivicni'||vrsta==='tuzilastvo') return (uloga==='osteceni'?RAD_KOST:RAD_K)[tip]||[];
  return (RADNJE[vrsta]||RADNJE.parnicni)[tip]||[];
}
function calcIz(ra,p){
  if(!ra||!p) return 0;
  if(ra.tip==='rociste'&&ra.status==='buduci') return 0;
  var vrsta=p.vrsta||'parnicni';
  if(vrsta==='krivicni'||vrsta==='tuzilastvo'){
    var ki=parseInt(p.kazna||0);
    var tar=p.uloga==='osteceni'?getTKO(ki):TAR_K[ki];
    var lista=getRL(vrsta,ra.tip,p.uloga);
    var def=lista.find(function(x){return x.n===ra.naziv;});
    if(!def) return 0;
    var col=(ra.tip==='rociste'&&ra.status==='odlozeno')?(def.nc||'zo'):def.col;
    var iz=tar[col]||0;
    return p.sld?Math.round(iz*0.5):iz;
  }
  var v=p.vred||0;
  var t=(vrsta==='parnicni'||vrsta==='vanparnicni')?(p.neprocenjiv?TAR_N[parseInt(p.nproIdx||0)]:getTarP(v)):vrsta==='izvrsni'?getTarI(v):null;
  var lista2=(RADNJE[vrsta]||RADNJE.parnicni)[ra.tip]||[];
  var def2=lista2.find(function(x){return x.n===ra.naziv;});
  if(!def2) return 0;
  if(ra.tip==='rociste'&&ra.status==='odlozeno'){if(def2.fxn) return def2.fxn;if(t&&def2.tneo) return t.neo||0;return 0;}
  if(def2.fx) return def2.fx;if(def2.fxn) return def2.fxn;
  if(t&&def2.tf) return t[def2.tf]||0;if(t&&def2.tneo) return t.neo||0;
  return 0;
}

// KRIVIČNA DELA
var KD=[
  {n:'Ubistvo',cl:'čl.113',k:3,mn:5,mx:15},{n:'Teško ubistvo',cl:'čl.114',k:5,dz:true,mn:40,mx:40},
  {n:'Ubistvo na mah',cl:'čl.115',k:1,mn:1,mx:5},{n:'Čedomorstvo',cl:'čl.116',k:0,mn:0,mx:3},
  {n:'Ubojstvo iz nehata',cl:'čl.118',k:0,mn:0,mx:3},{n:'Navođenje na samoubistvo',cl:'čl.119',k:1,mn:1,mx:5},
  {n:'Teška telesna povreda',cl:'čl.121',k:1,mn:1,mx:5},{n:'Laka telesna povreda',cl:'čl.122',k:0,mn:0,mx:1},
  {n:'Učestvovanje u tuči',cl:'čl.123',k:0,mn:0,mx:3},{n:'Ugrožavanje sigurnosti',cl:'čl.138',k:0,mn:0,mx:1},
  {n:'Silovanje',cl:'čl.178',k:2,mn:3,mx:12},{n:'Obljuba nad nemoćnim licem',cl:'čl.179',k:2,mn:2,mx:10},
  {n:'Obljuba zloupotrebom položaja',cl:'čl.180',k:1,mn:1,mx:5},{n:'Obljuba sa maloletnikom',cl:'čl.181',k:2,mn:3,mx:15},
  {n:'Polno uznemiravanje',cl:'čl.182a',k:0,mn:0,mx:1},{n:'Iskorišćavanje dece za pornografiju',cl:'čl.185a',k:2,mn:2,mx:10},
  {n:'Krađa',cl:'čl.203',k:0,mn:0,mx:3},{n:'Teška krađa',cl:'čl.204',k:1,mn:1,mx:8},
  {n:'Razbojnička krađa',cl:'čl.205',k:1,mn:1,mx:8},{n:'Razbojništvo',cl:'čl.206',k:2,mn:2,mx:12},
  {n:'Utaja',cl:'čl.207',k:0,mn:0,mx:3},{n:'Prevara',cl:'čl.208',k:0,mn:0,mx:5},
  {n:'Teška prevara',cl:'čl.208a',k:1,mn:1,mx:8},{n:'Iznuda',cl:'čl.214',k:1,mn:1,mx:8},
  {n:'Zelenaštvo',cl:'čl.215',k:0,mn:0,mx:5},{n:'Oštećenje tuđe stvari',cl:'čl.212',k:0,mn:0,mx:3},
  {n:'Falsifikovanje novca',cl:'čl.223',k:2,mn:2,mx:12},{n:'Pranje novca',cl:'čl.231',k:2,mn:2,mx:10},
  {n:'Utaja poreza i doprinosa',cl:'čl.229',k:1,mn:1,mx:5},{n:'Poreska utaja — teži oblik',cl:'čl.229 st.3',k:2,mn:3,mx:12},
  {n:'Neovlašćena proizvodnja opojnih droga',cl:'čl.246',k:2,mn:3,mx:12},{n:'Neovlašćeno držanje droge',cl:'čl.246a',k:0,mn:0,mx:3},
  {n:'Falsifikovanje isprave',cl:'čl.355',k:0,mn:0,mx:3},{n:'Lažno svedočenje',cl:'čl.335',k:1,mn:0,mx:5},
  {n:'Lažno prijavljivanje',cl:'čl.334',k:0,mn:0,mx:3},{n:'Iznuđivanje iskaza',cl:'čl.137',k:1,mn:1,mx:8},
  {n:'Nedozvoljeno oružje',cl:'čl.348',k:0,mn:0,mx:3},{n:'Nedozvol. proiz./promet oružja',cl:'čl.348 st.3',k:1,mn:1,mx:8},
  {n:'Ugrožavanje javnog saobraćaja',cl:'čl.289',k:0,mn:0,mx:3},{n:'Saobraćajna nesreća sa smrtnim ishodom',cl:'čl.289 st.4',k:1,mn:1,mx:8},
  {n:'Računarska prevara',cl:'čl.301',k:1,mn:0,mx:5},{n:'Neovlašćen pristup računaru',cl:'čl.302',k:0,mn:0,mx:2},
  {n:'Nasilje u porodici',cl:'čl.194',k:0,mn:0,mx:3},{n:'Teško nasilje u porodici',cl:'čl.194 st.3',k:1,mn:1,mx:5},
  {n:'Nasilje u porodici sa smrtnom posledicom',cl:'čl.194 st.4',k:2,mn:2,mx:10},
  {n:'Zanemarivanje i zlostavljanje maloletnog lica',cl:'čl.193',k:0,mn:0,mx:3},
  {n:'Protivpravno lišenje slobode',cl:'čl.132',k:0,mn:0,mx:3},{n:'Otmica',cl:'čl.134',k:2,mn:2,mx:12},
  {n:'Uvređivanje',cl:'čl.170',k:0,mn:0,mx:0.5},{n:'Kleveta',cl:'čl.171',k:0,mn:0,mx:0.5},
  {n:'Povreda autorskog prava',cl:'čl.198',k:0,mn:0,mx:3},
  {n:'Zloupotreba službenog položaja',cl:'čl.359',k:1,mn:1,mx:8},{n:'Pronevera',cl:'čl.364',k:1,mn:1,mx:8},
  {n:'Primanje mita',cl:'čl.367',k:2,mn:2,mx:12},{n:'Primanje mita — teški oblik',cl:'čl.367 st.3',k:3,mn:5,mx:15},
  {n:'Davanje mita',cl:'čl.368',k:1,mn:0,mx:8},{n:'Organizovani kriminal',cl:'čl.346 st.3',k:4,mn:10,mx:20},
  {n:'Terorizam',cl:'čl.391',k:4,mn:5,mx:20},{n:'Finansiranje terorizma',cl:'čl.393',k:2,mn:2,mx:12},
  {n:'Trgovina ljudima',cl:'čl.388',k:3,mn:3,mx:15},{n:'Trgovina decom',cl:'čl.388 st.3',k:4,mn:5,mx:20},
  {n:'Ratni zločin',cl:'čl.372',k:5,dz:true,mn:10,mx:40},
];
function getZast(kd){var m=kd.mx;if(kd.dz||m>=40)return{r:20,a:40};if(m>15)return{r:20,a:25};if(m>10)return{r:15,a:20};if(m>5)return{r:10,a:15};if(m>3)return{r:5,a:10};return{r:3,a:6};}
function kdSearch(pfx){
  var q=document.getElementById(pfx+'-kd').value.toLowerCase().trim();
  var res=document.getElementById(pfx+'-kdr');
  if(q.length<1){res.classList.remove('open');return;}
  var m=KD.filter(function(k){return k.n.toLowerCase().indexOf(q)>=0||k.cl.toLowerCase().indexOf(q)>=0;}).slice(0,10);
  if(!m.length){res.classList.remove('open');return;}
  res.innerHTML=m.map(function(k){return '<div class="kdi" onclick="kdSel(\''+pfx+'\',\''+k.n.replace(/'/g,"\\'")+'\')">'+'<div class="kdin">'+k.n+'</div>'+'<div class="kdim">'+k.cl+' · '+(k.mn>0?k.mn+' – ':'')+''+(k.dz?'40 god./doživotni':k.mx+' god.')+'</div></div>';}).join('');
  res.classList.add('open');
}
function kdSel(pfx,naziv){
  var kd=KD.find(function(k){return k.n===naziv;}); if(!kd) return;
  document.getElementById(pfx+'-kd').value=naziv;
  document.getElementById(pfx+'-kdr').classList.remove('open');
  document.getElementById(pfx+'-kazna').value=kd.k;
  var z=getZast(kd);
  var kt=kd.dz?'40 god./doživotni':(kd.mn>0?kd.mn+' – ':'')+kd.mx+' god.';
  var box=document.getElementById(pfx+'-kdi');
  box.innerHTML='<div class="kd-it">⚖ '+kd.n+'</div>'
    +'<div class="kd-ir"><span>Član KZ:</span><span>'+kd.cl+'</span></div>'
    +'<div class="kd-ir"><span>Zaprećena kazna:</span><span>'+kt+'</span></div>'
    +'<div class="kd-ir"><span>Tarifni razred:</span><span>'+TAR_K[kd.k].l+'</span></div>'
    +'<div class="kd-ir"><span>Redovna zastarelost:</span><span>'+z.r+' god.</span></div>'
    +'<div class="kd-ir warn"><span>Apsolutna zastarelost (čl.103):</span><span>'+z.a+' god.</span></div>';
  box.classList.add('open');
  if(pfx==='p'){
    document.getElementById('p-zw').style.display='block';
    document.getElementById('p-zb').innerHTML='<div class="tt-h">Zastarelost — '+kd.n+'</div>'
      +'<div class="tt-r"><span class="tt-l">Zaprećena kazna</span><span class="tt-v">'+kt+'</span></div>'
      +'<div class="tt-r"><span class="tt-l">Redovna zastarelost</span><span class="tt-v">'+z.r+' god.</span></div>'
      +'<div class="tt-r"><span class="tt-l">Apsolutna zastarelost (čl.103 KZ)</span><span class="tt-v hi">'+z.a+' god.</span></div>';
  }
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.kd-wrap')) document.querySelectorAll('.kd-res').forEach(function(r){r.classList.remove('open');});
  if(!e.target.closest('.ac-wrap')) document.querySelectorAll('.ac-res').forEach(function(r){r.classList.remove('open');});
});
