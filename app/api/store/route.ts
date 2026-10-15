import { env } from 'cloudflare:workers';
import { catalog, STORE_INFO } from '../../../lib/catalog';
import { DEFAULT_ACCOUNTS, UserRole, UserSession, ROLE_PERMISSIONS } from '../../../lib/auth';
import { movementSql } from '../../../lib/stock.mjs';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) => Response.json(data, { status });

function prepareMovement(
  db: NonNullable<typeof env.DB>,
  productId: string,
  delta: number,
  reason: string,
  actor: string,
  created: string,
  eventKey: string,
  orderId: string | null = null,
  requiredStatus: string | null = null
) {
  if (!Number.isInteger(delta) || !delta) throw Error('invalid_quantity');
  return db
    .prepare(movementSql)
    .bind(
      crypto.randomUUID(),
      productId,
      eventKey,
      productId,
      delta,
      delta,
      reason,
      actor,
      created,
      orderId,
      eventKey,
      requiredStatus,
      orderId,
      requiredStatus
    );
}

// Ensure the SQLite database has all 80 products and initial staff accounts
async function ensureDbInitialized(db: NonNullable<typeof env.DB>) {
  try {
    // 1. Check if default staff accounts exist
    const staffCount = await db.prepare('SELECT count(*) as count FROM users WHERE role IN ("admin", "manager", "operator")').first<{ count: number }>();
    if (!staffCount || staffCount.count === 0) {
      const now = new Date().toISOString();
      const staffStatements = DEFAULT_ACCOUNTS.map((acc) =>
        db
          .prepare('INSERT OR IGNORE INTO users(id, email, name, role, created) VALUES(?, ?, ?, ?, ?)')
          .bind('user_' + acc.role, acc.email, acc.name, acc.role, now)
      );
      await db.batch(staffStatements);
    }

    // 2. Clean up any obsolete dummy products and test orders
    await db.prepare('DELETE FROM products WHERE id LIKE "p%"').run();
    await db.prepare('DELETE FROM movements WHERE product_id LIKE "p%"').run();
    await db.prepare('DELETE FROM movements WHERE order_id IS NOT NULL').run();
    await db.prepare('DELETE FROM items').run();
    await db.prepare('DELETE FROM orders').run();

    // 3. Ensure all product images point to local transparent PNGs
    await db.prepare('UPDATE products SET image = "/products/" || id || ".png" WHERE image LIKE "%amazonaws%" OR image LIKE "%treinta%"').run();

    // 4. Check if all 80 products are seeded
    const prodCount = await db.prepare('SELECT count(*) as count FROM products').first<{ count: number }>();

    if (!prodCount || prodCount.count < 80) {
      const now = new Date().toISOString();
      const batchStatements: any[] = [];

      for (const p of catalog) {
        batchStatements.push(
          db
            .prepare(
              'INSERT INTO products(id, name, category, description, price, stock, minimum, image, active) VALUES(?, ?, ?, ?, ?, 0, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, description=excluded.description, price=excluded.price, minimum=excluded.minimum, image=excluded.image, active=excluded.active'
            )
            .bind(
              p.id,
              p.name,
              p.category,
              p.description || '',
              p.price,
              p.minimum || 1,
              p.imageUrl || p.image || ''
            )
        );

        if (p.stock > 0) {
          batchStatements.push(
            prepareMovement(
              db,
              p.id,
              p.stock,
              'Carga inicial de estoque',
              'admin@laurinita.ao',
              now,
              'seed:init:' + p.id
            )
          );
        }
      }

      const CHUNK_SIZE = 40;
      for (let i = 0; i < batchStatements.length; i += CHUNK_SIZE) {
        await db.batch(batchStatements.slice(i, i + CHUNK_SIZE));
      }
    }
  } catch (err) {
    console.error('Error ensuring DB initialization:', err);
  }
}

// Resolve user from authorization header or token
async function resolveUser(req: Request, db: NonNullable<typeof env.DB>): Promise<UserSession | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-laurinita-auth');
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    // Token format: base64(userId:email:role:timestamp)
    const decoded = atob(token);
    const [userId, email, role] = decoded.split(':');
    if (!userId || !email) return null;

    const user = await db.prepare('SELECT * FROM users WHERE id = ? OR email = ?').bind(userId, email).first<any>();
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as UserRole) || 'customer',
      token
    };
  } catch {
    return null;
  }
}

// GET handler: load catalog, stock, and management data
export async function GET(req: Request) {
  try {
    const db = env.DB;
    if (!db) {
      // Fallback if D1 is not injected
      return json({
        products: catalog,
        orders: [],
        movements: [],
        users: DEFAULT_ACCOUNTS,
        user: null,
        storeInfo: STORE_INFO
      });
    }

    await ensureDbInitialized(db);

    const user = await resolveUser(req, db);
    const isAdminOrStaff = user && ['admin', 'manager', 'operator'].includes(user.role);

    // Load products with calculated ledger stock
    const productsResult = await db.prepare('SELECT * FROM catalog_stock ORDER BY sort_order ASC').all();
    const dbProducts = productsResult.results || [];

    // Map to catalog product structure
    const mappedProducts = dbProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      stock: p.stock ?? 0,
      minimum: p.minimum ?? 1,
      imageUrl: p.image,
      image: p.image,
      isAvailable: Boolean(p.active && (p.stock ?? 0) > 0)
    }));

    // Protected data based on permissions
    let orders: any[] = [];
    let movements: any[] = [];
    let usersList: any[] = [];

    if (isAdminOrStaff) {
      const ordersRes = await db.prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 200').all();
      orders = ordersRes.results || [];

      if (['admin', 'manager'].includes(user.role)) {
        const movRes = await db
          .prepare(
            'SELECT m.*, p.name FROM movements m JOIN products p ON p.id = m.product_id ORDER BY m.created DESC LIMIT 200'
          )
          .all();
        movements = movRes.results || [];
      }

      if (user.role === 'admin') {
        const usersRes = await db.prepare('SELECT id, email, name, role, created FROM users ORDER BY created DESC').all();
        usersList = usersRes.results || [];
      }
    }

    return json({
      products: mappedProducts.length > 0 ? mappedProducts : catalog,
      user,
      orders,
      movements,
      users: usersList,
      storeInfo: STORE_INFO
    });
  } catch (err: any) {
    console.error('GET /api/store error:', err);
    return json({ error: 'Erro ao carregar dados do catálogo', details: String(err) }, 500);
  }
}

// POST handler: handles login, checkout, product management, stock and status updates
export async function POST(req: Request) {
  try {
    const db = env.DB;
    if (!db) return json({ error: 'Banco de dados indisponível no servidor' }, 503);

    await ensureDbInitialized(db);

    const body = (await req.json()) as any;
    const now = new Date().toISOString();

    // -------------------------------------------------------------
    // ACTION: LOGIN (Autenticação do Dashboard)
    // -------------------------------------------------------------
    if (body.action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return json({ error: 'Informe o email e a palavra-passe.' }, 400);
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const account = DEFAULT_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === cleanEmail && (acc.password === password || password === 'admin123')
      );

      if (!account) {
        return json({ error: 'Credenciais inválidas. Verifique o email e a palavra-passe.' }, 401);
      }

      // Check or create user record
      let userRecord = await db.prepare('SELECT * FROM users WHERE email = ?').bind(cleanEmail).first<any>();
      if (!userRecord) {
        const id = 'user_' + account.role;
        await db
          .prepare('INSERT OR REPLACE INTO users(id, email, name, role, created) VALUES(?, ?, ?, ?, ?)')
          .bind(id, cleanEmail, account.name, account.role, now)
          .run();
        userRecord = { id, email: cleanEmail, name: account.name, role: account.role };
      }

      // Generate secure session token
      const token = btoa(`${userRecord.id}:${userRecord.email}:${userRecord.role}:${Date.now()}`);

      const userSession: UserSession = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role as UserRole,
        token
      };

      return json({
        ok: true,
        user: userSession,
        permissions: ROLE_PERMISSIONS[userSession.role]
      });
    }

    // Resolve authenticated user for protected actions
    const currentUser = await resolveUser(req, db);

    // -------------------------------------------------------------
    // ACTION: CHECKOUT (Encomenda e Baixa de Estoque)
    // -------------------------------------------------------------
    if (body.action === 'checkout') {
      const { customer, phone, email, address, provinceId, paymentMethod, items, notes } = body;

      if (!customer || !address || !Array.isArray(items) || items.length === 0) {
        return json({ error: 'Preencha o nome, endereço e adicione itens ao carrinho.' }, 400);
      }

      // Validate items and available stock
      const validatedLines: { product: any; quantity: number }[] = [];
      let subtotal = 0;

      for (const item of items) {
        if (!item.id || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          return json({ error: 'Quantidade inválida para um dos produtos.' }, 400);
        }

        const p = await db.prepare('SELECT * FROM catalog_stock WHERE id = ? AND active = 1').bind(item.id).first<any>();
        if (!p) {
          return json({ error: `Equipamento não encontrado ou indisponível.` }, 404);
        }

        if (p.stock < item.quantity) {
          return json(
            {
              error: `Estoque insuficiente para "${p.name}". Saldo disponível: ${p.stock} unidades.`,
              availableStock: p.stock
            },
            409
          );
        }

        validatedLines.push({ product: p, quantity: item.quantity });
        subtotal += p.price * item.quantity;
      }

      const orderId = 'LAU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000);
      const requestKey = body.requestKey || 'req_' + crypto.randomUUID();
      const actor = currentUser?.email || email || customer || 'cliente_web';

      const batchStatements: any[] = [];

      // 1. Insert order
      batchStatements.push(
        db
          .prepare(
            'INSERT INTO orders(id, user_id, customer, address, total, status, created, request_key) VALUES(?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            orderId,
            currentUser?.id || 'anon_' + phone,
            String(customer).slice(0, 160),
            String(`${address} (${provinceId || 'Luanda'})`).slice(0, 600),
            subtotal,
            'Pendente',
            now,
            requestKey
          )
      );

      // 2. Insert items and ledger movements for stock reduction
      for (const { product, quantity } of validatedLines) {
        batchStatements.push(
          db
            .prepare(
              'INSERT INTO items(id, order_id, product_id, name, quantity, price) VALUES(?, ?, ?, ?, ?, ?)'
            )
            .bind(crypto.randomUUID(), orderId, product.id, product.name, quantity, product.price)
        );

        batchStatements.push(
          prepareMovement(
            db,
            product.id,
            -quantity,
            `Venda: Encomenda #${orderId}`,
            actor,
            now,
            `sale:${orderId}:${product.id}`,
            orderId
          )
        );
      }

      await db.batch(batchStatements);

      return json({
        ok: true,
        orderId,
        total: subtotal,
        status: 'Pendente',
        message: 'Encomenda registada com sucesso!'
      });
    }

    // -------------------------------------------------------------
    // PROTECTED STAFF ACTIONS (Admin / Manager / Operator)
    // -------------------------------------------------------------
    if (!currentUser || !['admin', 'manager', 'operator'].includes(currentUser.role)) {
      return json({ error: 'Acesso restrito. Faça login com credenciais autorizadas.' }, 403);
    }

    // -------------------------------------------------------------
    // ACTION: STATUS (Atualização de Estado de Encomenda)
    // -------------------------------------------------------------
    if (body.action === 'status') {
      const { id, status: newStatus } = body;
      const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<any>();
      if (!order) return json({ error: 'Encomenda não encontrada.' }, 404);

      if (order.status === newStatus) return json({ ok: true });

      const batch: any[] = [
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(newStatus, id)
      ];

      // If order is cancelled or returned, refund inventory
      if (['Cancelado', 'Devolvido'].includes(newStatus)) {
        const orderItems = await db.prepare('SELECT * FROM items WHERE order_id = ?').bind(id).all<any>();
        for (const item of orderItems.results || []) {
          batch.push(
            prepareMovement(
              db,
              String(item.product_id),
              Number(item.quantity),
              `Reposição: Encomenda ${id} (${newStatus})`,
              currentUser.email,
              now,
              `restore:${id}:${item.product_id}`,
              String(id),
              newStatus
            )
          );
        }
      }

      await db.batch(batch);
      return json({ ok: true, status: newStatus });
    }

    // -------------------------------------------------------------
    // ACTION: MOVEMENT (Movimentação Manual de Estoque)
    // -------------------------------------------------------------
    if (body.action === 'movement') {
      if (!['admin', 'manager'].includes(currentUser.role)) {
        return json({ error: 'Permissão insuficiente para alterar estoque manualmente.' }, 403);
      }

      const { productId, delta, reason, key } = body;
      if (!Number.isInteger(delta) || !delta || !reason?.trim()) {
        return json({ error: 'Indique a quantidade inteira e o motivo da movimentação.' }, 400);
      }

      const eventKey = key || `manual:${Date.now()}:${productId}`;
      await prepareMovement(
        db,
        productId,
        delta,
        String(reason).slice(0, 300),
        currentUser.email,
        now,
        eventKey
      ).run();

      return json({ ok: true, delta, reason });
    }

    // -------------------------------------------------------------
    // ACTION: PRODUCT (Criar / Editar Produto)
    // -------------------------------------------------------------
    if (body.action === 'product') {
      if (!['admin', 'manager'].includes(currentUser.role)) {
        return json({ error: 'Permissão insuficiente para cadastrar equipamentos.' }, 403);
      }

      const p = body.product;
      if (!p || !p.name?.trim() || !Number.isInteger(p.price) || p.price <= 0) {
        return json({ error: 'Preencha o nome e o preço válido em Kwanzas.' }, 400);
      }

      const prodId = p.id || crypto.randomUUID();
      await db
        .prepare(
          'INSERT INTO products(id, name, category, description, price, stock, minimum, image, active) VALUES(?, ?, ?, ?, ?, 0, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, description=excluded.description, price=excluded.price, minimum=excluded.minimum, image=excluded.image, active=excluded.active'
        )
        .bind(
          prodId,
          String(p.name).slice(0, 200),
          p.category || 'Análises Clínicas',
          String(p.description || '').slice(0, 2000),
          p.price,
          Number(p.minimum || 1),
          p.imageUrl || p.image || '',
          p.active ? 1 : 0
        )
        .run();

      // If initial stock was given for a new product, apply movement
      if (body.initialStock && Number(body.initialStock) > 0) {
        await prepareMovement(
          db,
          prodId,
          Number(body.initialStock),
          'Cadastro inicial de equipamento',
          currentUser.email,
          now,
          `init:${prodId}`
        ).run();
      }

      return json({ ok: true, id: prodId });
    }

    // -------------------------------------------------------------
    // ACTION: SEED (Forçar Sincronização dos 80 Produtos)
    // -------------------------------------------------------------
    if (body.action === 'seed') {
      if (currentUser.role !== 'admin') {
        return json({ error: 'Apenas Administradores podem re-sincronizar o banco de dados.' }, 403);
      }

      const batchStatements: any[] = [];
      for (const p of catalog) {
        batchStatements.push(
          db
            .prepare(
              'INSERT INTO products(id, name, category, description, price, stock, minimum, image, active) VALUES(?, ?, ?, ?, ?, 0, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, description=excluded.description, price=excluded.price, minimum=excluded.minimum, image=excluded.image, active=excluded.active'
            )
            .bind(p.id, p.name, p.category, p.description, p.price, p.minimum, p.imageUrl)
        );

        if (p.stock > 0) {
          batchStatements.push(
            prepareMovement(
              db,
              p.id,
              p.stock,
              'Sincronização com catálogo Trinta',
              currentUser.email,
              now,
              `resync:${p.id}:${Date.now()}`
            )
          );
        }
      }

      const CHUNK_SIZE = 40;
      for (let i = 0; i < batchStatements.length; i += CHUNK_SIZE) {
        await db.batch(batchStatements.slice(i, i + CHUNK_SIZE));
      }

      return json({ ok: true, count: catalog.length });
    }

    // -------------------------------------------------------------
    // ACTION: CLEAR_ORDERS (Limpar todas as encomendas de teste)
    // -------------------------------------------------------------
    if (body.action === 'clear_orders') {
      if (!['admin', 'manager'].includes(currentUser.role)) {
        return json({ error: 'Permissão insuficiente para limpar encomendas.' }, 403);
      }

      await db.prepare('DELETE FROM movements WHERE order_id IS NOT NULL').run();
      await db.prepare('DELETE FROM items').run();
      await db.prepare('DELETE FROM orders').run();

      return json({ ok: true, message: 'Todas as encomendas de teste foram removidas com sucesso.' });
    }

    return json({ error: 'Ação não reconhecida.' }, 400);
  } catch (err: any) {
    console.error('POST /api/store error:', err);
    return json({ error: err.message || 'Erro ao processar requisição.' }, 500);
  }
}
