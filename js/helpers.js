// HELPERS
var MONTHS=['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];
// Filled from /api/config during app startup.
var VL={};
var KL=[];
var SL={odrzano:'✅ Održano',odlozeno:'⏸ Odloženo',buduci:'📅 Buduće'};
var SUDL={osnovni:'Osnovni sud',visi:'Viši sud',privredni:'Privredni sud'};
var TUZL={osnovno:'Osnovno tužilaštvo',vise:'Više tužilaštvo',org_kriminal:'Za org. kriminal',korupcija:'Za suzbijanje korupcije'};
var PST={pravnosnazno:'✅ Pravnosnažno',zalbeno:'⚠ Žalbeni postupak',izvrsno:'⚙ Izvršni postupak',delimicno:'◑ Delimično naplaćeno',placeno:'💰 Naplaćeno'};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function safeTel(v){return String(v||'').replace(/[^0-9+*#,;]/g,'').slice(0,60);}
function fmt(n){return n?n.toLocaleString('sr-RS')+' din':'—';}
function fmtD(iso){if(!iso)return'';return new Date(iso+'T00:00').toLocaleDateString('sr-RS',{day:'numeric',month:'long',year:'numeric'});}
function fmtDs(iso){if(!iso)return'';return new Date(iso+'T00:00').toLocaleDateString('sr-RS',{day:'numeric',month:'short'});}
function fmtDT(d,t){var dt=new Date(d+'T'+(t||'00:00'));return dt.toLocaleDateString('sr-RS',{weekday:'short',day:'numeric',month:'short'})+(t?' u '+t:'');}
function dL(iso){var t=new Date();t.setHours(0,0,0,0);var d=new Date(iso+'T00:00');d.setHours(0,0,0,0);return Math.round((d-t)/86400000);}
function dpill(d){if(d<0)return'<span class="dp dp-d">Istekao</span>';if(d===0)return'<span class="dp dp-d">🔴 Danas!</span>';if(d===1)return'<span class="dp dp-d">Sutra</span>';if(d<=5)return'<span class="dp dp-w">'+d+' dana</span>';return'<span class="dp dp-o">'+d+' dana</span>';}
