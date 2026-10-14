import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {movementSql} from '../lib/stock.mjs';
const db=new DatabaseSync(':memory:');
const migrationDir=process.argv[2]||'drizzle';
for(const f of readdirSync(migrationDir).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(migrationDir+'/'+f,'utf8'));
db.exec("INSERT INTO products(id,name,category,description,price,stock,minimum,image) VALUES('p','Teste','Cuidados','',100,0,5,'kit')");
const insert=db.prepare(movementSql);
function move(key,q,product='p',order=null,status=null){insert.run(crypto.randomUUID(),product,key,product,q,q,'Teste','tester','2026-10-14',order,key,status,order,status)}
const stock=()=>db.prepare("SELECT stock FROM catalog_stock WHERE id='p'").get().stock;
move('initial',20);assert.equal(stock(),20);move('sale',-3);assert.equal(stock(),17);move('cancel',3);assert.equal(stock(),20);move('cancel',3);assert.equal(stock(),20);
assert.throws(()=>move('oversell',-21),/movements.delta/);assert.equal(stock(),20);
assert.throws(()=>move('bad-product',-1,'missing'),/movements.delta/);
db.exec("INSERT INTO orders(id,user_id,customer,address,total,status,created,request_key) VALUES('o','test','Test','Test',100,'Confirmado','2026-10-14','conditional-test')");
move('stale-restore',3,'p','o','Cancelado');assert.equal(stock(),20);
db.exec('BEGIN');try{move('transaction',-5);move('transaction-fail',-999);db.exec('COMMIT');}catch{db.exec('ROLLBACK')}assert.equal(stock(),20);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM movements').get().n,3);
console.log('PASS: 20 → 17 → 20, duplicate reversal, insufficient stock, conditional restoration and transaction rollback.');
