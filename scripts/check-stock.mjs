import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
db.exec("INSERT INTO products(id,name,category,description,price,stock,minimum,image) VALUES('p','Teste','Cuidados','',100,0,5,'kit')");
const insert=db.prepare('INSERT OR IGNORE INTO movements(id,product_id,delta,reason,actor,created,event_key) VALUES(?,?,?,?,?,?,?)');
function move(key,q){insert.run(key,'p',q,'Teste','tester','2026-10-14',key)}
const stock=()=>db.prepare("SELECT stock FROM products WHERE id='p'").get().stock;
move('initial',20);assert.equal(stock(),20);move('sale',-3);assert.equal(stock(),17);move('cancel',3);assert.equal(stock(),20);move('cancel',3);assert.equal(stock(),20);
assert.throws(()=>move('oversell',-21),/insufficient_stock/);assert.equal(stock(),20);
assert.throws(()=>db.exec("UPDATE movements SET delta=9"),/immutable_movement/);
assert.throws(()=>db.exec("DELETE FROM movements"),/immutable_movement/);
assert.throws(()=>insert.run('bad-product','missing',-1,'Teste','tester','2026-10-14','bad-product'),/insufficient_stock/);
db.exec('BEGIN');try{move('transaction',-5);move('transaction-fail',-999);db.exec('COMMIT');}catch{db.exec('ROLLBACK')}assert.equal(stock(),20);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM movements').get().n,3);
console.log('PASS: 20 → 17 → 20, duplicate reversal, insufficient stock, immutable ledger and transaction rollback.');
