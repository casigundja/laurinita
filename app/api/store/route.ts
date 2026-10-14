import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { catalog } from '../../../lib/catalog';
import { movementSql } from '../../../lib/stock.mjs';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status});
function prepareMovement(db:NonNullable<typeof env.DB>,productId:string,delta:number,reason:string,actor:string,created:string,eventKey:string,orderId:string|null=null,requiredStatus:string|null=null){
 if(!Number.isInteger(delta)||!delta)throw Error('invalid_quantity');
 return db.prepare(movementSql).bind(crypto.randomUUID(),productId,eventKey,productId,delta,delta,reason,actor,created,orderId,eventKey,requiredStatus,orderId,requiredStatus);
}
async function context(){const db=env.DB!;if(!db)throw Error('Banco indisponível');const identity=await getChatGPTUser();if(identity)await db.prepare("INSERT OR IGNORE INTO users(id,email,name,role,created) VALUES(?,?,?,CASE WHEN NOT EXISTS(SELECT 1 FROM users) THEN 'admin' ELSE 'customer' END,?)").bind(identity.userId,identity.email,identity.displayName,new Date().toISOString()).run();const user=identity?await db.prepare('SELECT * FROM users WHERE id=?').bind(identity.userId).first() as any:null;return {db,user};}
export async function GET(){try{const {db,user}=await context();const admin=user?.role==='admin';return json({products:(await db.prepare('SELECT * FROM catalog_stock ORDER BY sort_order').all()).results,user,orders:user?(await db.prepare(admin?'SELECT * FROM orders ORDER BY created DESC':'SELECT * FROM orders WHERE user_id=? ORDER BY created DESC').bind(...(admin?[]:[user.id])).all()).results:[],movements:admin?(await db.prepare('SELECT m.*,p.name FROM movements m JOIN products p ON p.id=m.product_id ORDER BY m.created DESC LIMIT 200').all()).results:[],users:admin?(await db.prepare('SELECT * FROM users ORDER BY created DESC').all()).results:[]});}catch{return json({error:'Não foi possível carregar os dados.'},500)}}
export async function POST(req:Request){try{if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem inválida'},403);const {db,user}=await context();if(!user)return json({error:'Entre na sua conta.'},401);const b=await req.json() as any;const now=new Date().toISOString(),actor=user.email;
if(b.action==='checkout'){
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(b.key||''))return json({error:'Pedido inválido'},400);
 const old=await db.prepare('SELECT * FROM orders WHERE request_key=? AND user_id=?').bind(b.key,user.id).first();if(old)return json({ok:true,order:old});
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>50||!String(b.address||'').trim()||!String(b.customer||'').trim())return json({error:'Preencha nome, endereço e carrinho.'},400);
 const ids=new Set(),lines=[];let total=0;
 for(const i of b.items){if(ids.has(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>1000)return json({error:'Quantidade inválida'},400);ids.add(i.id);const p=await db.prepare('SELECT * FROM catalog_stock WHERE id=? AND active=1').bind(i.id).first() as any;if(!p||p.stock<i.quantity)return json({error:'Estoque insuficiente.'},409);lines.push({p,q:i.quantity});total+=p.price*i.quantity;}
 const id=crypto.randomUUID(),s=[db.prepare('INSERT INTO orders(id,user_id,customer,address,total,status,created,request_key) VALUES(?,?,?,?,?,?,?,?)').bind(id,user.id,String(b.customer).slice(0,160),String(b.address).slice(0,600),total,'Pendente',now,b.key)];
 for(const {p,q} of lines){s.push(db.prepare('INSERT INTO items(id,order_id,product_id,name,quantity,price) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,p.id,p.name,q,p.price));s.push(prepareMovement(db,p.id,-q,'Reserva da encomenda',actor,now,'sale:'+id+':'+p.id,id));}
 await db.batch(s);return json({ok:true,order:{id,total}});
}
if(user.role!=='admin')return json({error:'Acesso reservado à administração.'},403);
if(b.action==='seed'){
 const s=[];for(const p of catalog){s.push(db.prepare('INSERT OR IGNORE INTO products(id,name,category,description,price,stock,minimum,image,active) VALUES(?,?,?,?,?,0,?,?,1)').bind(p.id,p.name,p.category,p.description,p.price,p.minimum,p.image));s.push(prepareMovement(db,p.id,p.stock,'Carga inicial de demonstração',actor,now,'seed:'+p.id));}await db.batch(s);return json({ok:true});
}
if(b.action==='product'){const p=b.product;if(!p||!String(p.name||'').trim()||!['Mobilidade','Diagnóstico','Descartáveis','Cuidados'].includes(p.category)||!Number.isInteger(p.price)||p.price<1||!Number.isInteger(p.minimum)||p.minimum<0)return json({error:'Verifique nome, categoria, preço e mínimo.'},400);await db.prepare('INSERT INTO products(id,name,category,description,price,stock,minimum,image,active) VALUES(?,?,?,?,?,0,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,minimum=excluded.minimum,image=excluded.image,active=excluded.active').bind(p.id||crypto.randomUUID(),String(p.name).slice(0,180),p.category,String(p.description||'').slice(0,2000),p.price,p.minimum,p.image||'kit',p.active?1:0).run();return json({ok:true});}
if(b.action==='movement'){
 if(!Number.isInteger(b.delta)||!b.delta||Math.abs(b.delta)>100000||!String(b.reason||'').trim()||!b.key)return json({error:'Indique quantidade e motivo.'},400);
 await prepareMovement(db,b.productId,b.delta,String(b.reason).slice(0,300),actor,now,'manual:'+b.key).run();return json({ok:true});
}
if(b.action==='status'){
 const o=await db.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first() as any;if(!o)return json({error:'Encomenda inexistente'},404);if(o.status===b.status)return json({ok:true});
 const next:Record<string,string[]>={Pendente:['Confirmado','Cancelado'],Confirmado:['Enviado','Cancelado'],Enviado:['Concluído','Devolvido'],Concluído:['Devolvido'],Cancelado:[],Devolvido:[]};
 if(!next[o.status]?.includes(b.status))return json({error:'Transição de estado inválida'},409);
 const s=[db.prepare('UPDATE orders SET status=? WHERE id=? AND status=?').bind(b.status,b.id,o.status)];
 if(['Cancelado','Devolvido'].includes(b.status)){const lines=(await db.prepare('SELECT * FROM items WHERE order_id=?').bind(b.id).all()).results;for(const l of lines)s.push(prepareMovement(db,String(l.product_id),Number(l.quantity),'Reposição: '+b.status,actor,now,'restore:'+b.id+':'+l.product_id,String(b.id),b.status));}
 await db.batch(s);return json({ok:true});
}
if(b.action==='role'){if(!['admin','customer'].includes(b.role)||b.id===user.id)return json({error:'Não pode alterar o próprio perfil.'},400);await db.prepare('UPDATE users SET role=? WHERE id=?').bind(b.role,b.id).run();return json({ok:true});}return json({error:'Ação inválida'},400);
}catch(e){return json({error:/insufficient_stock|movements\.delta/.test(String(e))?'Estoque insuficiente. Atualize o carrinho.':'Não foi possível concluir. Atualize os dados e tente novamente.'},409)}}
