// DATA — authoritative state is loaded from Cloudflare D1
var D = {p:[],ra:[],k:[],pot:[],arh:[]};
function save(){}

async function apiRequest(url, options) {
  var res = await fetch(url, Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  }, options || {}));
  var data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
  return data;
}

async function loadSharedState() {
  var state = await apiRequest('/api/state', { method: 'GET', headers: {} });
  D = state;
  if(!D.p) D.p=[];
  if(!D.ra) D.ra=[];
  if(!D.k) D.k=[];
  if(!D.pot) D.pot=[];
  if(!D.arh) D.arh=[];
  D.ra.forEach(function(r){ if(!r.files) r.files=[]; });
  return D;
}

async function dbMutate(payload) {
  return apiRequest('/api/mutate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function dbError(err) {
  console.error(err);
  alert('Promena nije sačuvana u zajedničkoj bazi. Proverite internet vezu i pokušajte ponovo.');
}
