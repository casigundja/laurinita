import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const signin=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signin.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
assert.ok(cookie,'local sign-in cookie');
async function get(){const r=await fetch(base+'/api/store',{headers:{Cookie:cookie}});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;}
async function post(b,expected=200){const r=await fetch(base+'/api/store',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(b)});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d;}
const anonymous=await fetch(base+'/api/store',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'seed'})});assert.equal(anonymous.status,401);
await get();await post({action:'seed'});const initial=await get();assert.equal(initial.user.role,'admin');const before=initial.products.find(p=>p.id==='p1').stock;
const payload={action:'checkout',key:crypto.randomUUID(),customer:'Cliente de teste',address:'Endereço de teste',items:[{id:'p1',quantity:3}]};
const order=await post(payload);assert.equal((await get()).products.find(p=>p.id==='p1').stock,before-3);
const duplicate=await post(payload);assert.equal(duplicate.order.id,order.order.id);assert.equal((await get()).products.find(p=>p.id==='p1').stock,before-3);
await post({action:'status',id:order.order.id,status:'Cancelado'});await post({action:'status',id:order.order.id,status:'Cancelado'});assert.equal((await get()).products.find(p=>p.id==='p1').stock,before);
await post({action:'status',id:order.order.id,status:'Confirmado'},409);
await post({...payload,key:crypto.randomUUID(),items:[{id:'p1',quantity:999}]},409);
await post({action:'movement',productId:'p1',delta:-999,reason:'Teste de proteção',key:crypto.randomUUID()},409);
assert.equal((await get()).products.find(p=>p.id==='p1').stock,before);
const badOrigin=await fetch(base+'/api/store',{method:'POST',headers:{Cookie:cookie,Origin:'https://invalid.example','Content-Type':'application/json'},body:JSON.stringify({action:'seed'})});assert.equal(badOrigin.status,403);
console.log('PASS API: authentication, origin, checkout, duplicate checkout, cancellation, duplicate cancellation, terminal state and insufficient stock.');
