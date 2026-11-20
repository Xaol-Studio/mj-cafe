/**
 * Vercel Serverless Function: Base de Datos Cloud para MJ Café
 * Gestiona categorías, productos, pedidos, detalles y Club MJ en la nube
 * con persistencia en memoria del runtime y /tmp/mj_cafe_cloud_db.json.
 */

const fs = require('fs');
const crypto = require('crypto');

const TMP_DB_PATH = '/tmp/mj_cafe_cloud_db.json';
const STAFF_PIN = process.env.MJ_STAFF_PIN || '2026';
const STAFF_TOKEN = crypto.createHash('sha256').update('mj_cafe_staff_' + STAFF_PIN).digest('hex');

function isStaffAuthorized(req) {
  const headerToken = req.headers && (req.headers['x-staff-token'] || req.headers['X-Staff-Token']);
  const queryToken = req.query && req.query.token;
  const candidate = String(headerToken || queryToken || '').trim();
  return Boolean(candidate && candidate === STAFF_TOKEN);
}

const SEED_CATEGORIAS = [
  { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad', icono: '☕' },
  { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias', icono: '🥤' },
  { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels', icono: '🥪' },
  { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres', icono: '🥐' }
];

const SEED_PRODUCTOS = [
  {
    id: 1,
    categoria_id: 1,
    nombre: 'Americano de Especialidad (12 oz)',
    descripcion: 'Granos selectos con notas a chocolate y avellana, tostado medio artesanal.',
    precio: 38.00,
    precio_formateado: '$38.00 MXN',
    tiempo_prep_min: 3,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' },
    categoria_nombre: 'Café de Especialidad'
  },
  {
    id: 2,
    categoria_id: 1,
    nombre: 'Caramel Macchiato Latte (16 oz)',
    descripcion: 'Espresso doble, leche vaporizada aterciopelada y jarabe de caramelo casero.',
    precio: 58.00,
    precio_formateado: '$58.00 MXN',
    tiempo_prep_min: 4,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' },
    categoria_nombre: 'Café de Especialidad'
  },
  {
    id: 3,
    categoria_id: 1,
    nombre: 'Cappuccino Italiano Clásico (12 oz)',
    descripcion: 'Equilibrio 1:1:1 de espresso, leche cremada y microespuma.',
    precio: 48.00,
    precio_formateado: '$48.00 MXN',
    tiempo_prep_min: 4,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' },
    categoria_nombre: 'Café de Especialidad'
  },
  {
    id: 4,
    categoria_id: 1,
    nombre: 'Dirty Chai Latte (16 oz)',
    descripcion: 'Té chai especiado con cardamomo y canela, coronado con un shot de espresso.',
    precio: 62.00,
    precio_formateado: '$62.00 MXN',
    tiempo_prep_min: 5,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' },
    categoria_nombre: 'Café de Especialidad'
  },
  {
    id: 5,
    categoria_id: 2,
    nombre: 'Frappé Matcha Imperial (16 oz)',
    descripcion: 'Matcha de grado ceremonial japonés batido con crema y leche entera o vegetal.',
    precio: 65.00,
    precio_formateado: '$65.00 MXN',
    tiempo_prep_min: 5,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' },
    categoria_nombre: 'Frappés & Frías'
  },
  {
    id: 6,
    categoria_id: 2,
    nombre: 'Frappé Moka Brownie (16 oz)',
    descripcion: 'Base de espresso doble, salsa de chocolate amargo, crema batida y trozos de brownie.',
    precio: 65.00,
    precio_formateado: '$65.00 MXN',
    tiempo_prep_min: 5,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' },
    categoria_nombre: 'Frappés & Frías'
  },
  {
    id: 7,
    categoria_id: 2,
    nombre: 'Frappé Taro Suave (16 oz)',
    descripcion: 'Cremoso extracto de raíz de taro con leche y toque avainillado.',
    precio: 60.00,
    precio_formateado: '$60.00 MXN',
    tiempo_prep_min: 5,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' },
    categoria_nombre: 'Frappés & Frías'
  },
  {
    id: 8,
    categoria_id: 2,
    nombre: 'Cold Brew con Naranja (16 oz)',
    descripcion: 'Maceración en frío de 18 horas, refrescante con rodaja de naranja deshidratada.',
    precio: 52.00,
    precio_formateado: '$52.00 MXN',
    tiempo_prep_min: 2,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' },
    categoria_nombre: 'Frappés & Frías'
  },
  {
    id: 9,
    categoria_id: 3,
    nombre: 'Bagel de Pavo y Manchego',
    descripcion: 'Bagel de ajonjolí tostado, pechuga de pavo ahumada, queso manchego gratinado y aderezo chipotle.',
    precio: 68.00,
    precio_formateado: '$68.00 MXN',
    tiempo_prep_min: 7,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' },
    categoria_nombre: 'Alimentos & Bagels'
  },
  {
    id: 10,
    categoria_id: 3,
    nombre: 'Molletes Rústicos con Tocino',
    descripcion: 'Bolillo artesanal con frijoles refritos de la casa, queso gouda gratinado y tocino crujiente.',
    precio: 55.00,
    precio_formateado: '$55.00 MXN',
    tiempo_prep_min: 8,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' },
    categoria_nombre: 'Alimentos & Bagels'
  },
  {
    id: 11,
    categoria_id: 3,
    nombre: 'Ciabatta de Pollo al Pesto',
    descripcion: 'Pan ciabatta a la plancha con pechuga asada, pesto de albahaca fresca y jitomate.',
    precio: 75.00,
    precio_formateado: '$75.00 MXN',
    tiempo_prep_min: 8,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' },
    categoria_nombre: 'Alimentos & Bagels'
  },
  {
    id: 12,
    categoria_id: 4,
    nombre: 'Croissant Artesanal de Almendras',
    descripcion: 'Hojaldre crujiente relleno de crema de almendra y cubierto de almendras tostadas.',
    precio: 42.00,
    precio_formateado: '$42.00 MXN',
    tiempo_prep_min: 2,
    disponible: true,
    es_popular: true,
    imagen_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' },
    categoria_nombre: 'Panadería & Postres'
  },
  {
    id: 13,
    categoria_id: 4,
    nombre: 'Brownie de Chocolate Fudge',
    descripcion: 'Bizcocho húmedo de cacao al 70% con nuez pecana troceada.',
    precio: 38.00,
    precio_formateado: '$38.00 MXN',
    tiempo_prep_min: 1,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' },
    categoria_nombre: 'Panadería & Postres'
  },
  {
    id: 14,
    categoria_id: 4,
    nombre: 'Muffin de Moras Silvestres',
    descripcion: 'Muffin esponjoso relleno de moras azules frescas con toque de limón.',
    precio: 35.00,
    precio_formateado: '$35.00 MXN',
    tiempo_prep_min: 1,
    disponible: true,
    es_popular: false,
    imagen_url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80',
    categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' },
    categoria_nombre: 'Panadería & Postres'
  }
];

function createInitialDbState() {
  const now = new Date().toISOString();
  const pedidos = [
    {
      id: 1,
      folio: 'MJ-2026-101',
      cliente_nombre: 'Miguel Delgado',
      cliente_telefono: '5512345678',
      cliente_lealtad_id: 1,
      hora_recoleccion_estimada: 'En 10 minutos (cambio de clase)',
      estado: 'listo_para_recoger',
      total: 106.00,
      metodo_pago: 'efectivo_en_barra',
      notas: 'Leche de avena para el macchiato por favor.',
      created_at: now,
      updated_at: now,
      items: [
        { producto_id: 2, producto_nombre: 'Caramel Macchiato Latte (16 oz)', cantidad: 1, precio_unitario: 58.00, subtotal: 58.00, personalizaciones: 'Leche de avena' },
        { producto_id: 9, producto_nombre: 'Bagel de Pavo y Manchego', cantidad: 1, precio_unitario: 48.00, subtotal: 48.00, personalizaciones: 'Bien doradito el bagel' }
      ]
    },
    {
      id: 2,
      folio: 'MJ-2026-102',
      cliente_nombre: 'Jorge Barrios',
      cliente_telefono: '5587654321',
      cliente_lealtad_id: 2,
      hora_recoleccion_estimada: 'En 20 minutos',
      estado: 'preparando',
      total: 65.00,
      metodo_pago: 'transferencia_spei',
      notas: 'Poco dulce el matcha.',
      created_at: now,
      updated_at: now,
      items: [
        { producto_id: 5, producto_nombre: 'Frappé Matcha Imperial (16 oz)', cantidad: 1, precio_unitario: 65.00, subtotal: 65.00, personalizaciones: 'Mitad de azúcar' }
      ]
    }
  ];

  const pedido_detalles = [
    { id: 1, pedido_id: 1, pedido_folio: 'MJ-2026-101', producto_id: 2, producto_nombre: 'Caramel Macchiato Latte (16 oz)', cantidad: 1, precio_unitario: 58.00, subtotal: 58.00, personalizaciones: 'Leche de avena', created_at: now },
    { id: 2, pedido_id: 1, pedido_folio: 'MJ-2026-101', producto_id: 9, producto_nombre: 'Bagel de Pavo y Manchego', cantidad: 1, precio_unitario: 48.00, subtotal: 48.00, personalizaciones: 'Bien doradito el bagel', created_at: now },
    { id: 3, pedido_id: 2, pedido_folio: 'MJ-2026-102', producto_id: 5, producto_nombre: 'Frappé Matcha Imperial (16 oz)', cantidad: 1, precio_unitario: 65.00, subtotal: 65.00, personalizaciones: 'Mitad de azúcar', created_at: now }
  ];

  const clientes_lealtad = [
    { id: 1, telefono: '5512345678', nombre: 'Miguel Delgado', carrera: 'Informática - FES C4', sellos_acumulados: 5, sellos: 5, recompensas_canjeadas: 2, total_visitas: 17, created_at: now, last_visit_at: now },
    { id: 2, telefono: '5587654321', nombre: 'Jorge Barrios', carrera: 'Informática - FES C4', sellos_acumulados: 3, sellos: 3, recompensas_canjeadas: 0, total_visitas: 3, created_at: now, last_visit_at: now },
    { id: 3, telefono: '5599887766', nombre: 'Fernanda Morales', carrera: 'Química Industrial - FES C4', sellos_acumulados: 6, sellos: 6, recompensas_canjeadas: 1, total_visitas: 12, created_at: now, last_visit_at: now }
  ];

  return {
    categorias: [...SEED_CATEGORIAS],
    productos: [...SEED_PRODUCTOS],
    clientes_lealtad,
    pedidos,
    pedido_detalles
  };
}

function loadDb() {
  if (global.__MJ_CAFE_DB__) {
    return global.__MJ_CAFE_DB__;
  }
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const raw = fs.readFileSync(TMP_DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.pedidos) && Array.isArray(parsed.productos)) {
        global.__MJ_CAFE_DB__ = parsed;
        return global.__MJ_CAFE_DB__;
      }
    }
  } catch (err) {
    console.warn('No se pudo leer /tmp DB, usando semillas iniciales:', err.message);
  }
  global.__MJ_CAFE_DB__ = createInitialDbState();
  saveDb(global.__MJ_CAFE_DB__);
  return global.__MJ_CAFE_DB__;
}

function saveDb(db) {
  global.__MJ_CAFE_DB__ = db;
  try {
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(db), 'utf8');
  } catch (err) {
    console.warn('No se pudo persistir en /tmp:', err.message);
  }
}

function nextId(arr) {
  if (!arr || arr.length === 0) return 1;
  return arr.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function normalizePhone(tel) {
  return String(tel || '').replace(/\D/g, '');
}

function upsertClienteLealtad(db, nombre, telefono, incrementStamps = false) {
  const tel = normalizePhone(telefono);
  const now = new Date().toISOString();
  let cliente = db.clientes_lealtad.find(c => normalizePhone(c.telefono) === tel);
  if (cliente) {
    if (nombre) cliente.nombre = nombre;
    if (incrementStamps) {
      cliente.sellos_acumulados = (Number(cliente.sellos_acumulados ?? cliente.sellos) || 0) + 1;
      cliente.sellos = cliente.sellos_acumulados;
      cliente.total_visitas = (Number(cliente.total_visitas) || 0) + 1;
      cliente.last_visit_at = now;
    }
  } else {
    const sellosInit = incrementStamps ? 1 : 0;
    cliente = {
      id: nextId(db.clientes_lealtad),
      telefono: tel,
      nombre: nombre || 'Cliente MJ',
      carrera: 'FES Cuautitlán Campo 4',
      sellos_acumulados: sellosInit,
      sellos: sellosInit,
      recompensas_canjeadas: 0,
      total_visitas: 1,
      created_at: now,
      last_visit_at: now
    };
    db.clientes_lealtad.push(cliente);
  }
  return cliente;
}

function buildDetallesForOrder(db, pedido) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  items.forEach(it => {
    const prod = db.productos.find(p => Number(p.id) === Number(it.producto_id));
    const cantidad = Math.max(1, Number(it.cantidad) || 1);
    const precioUnitario = Number(it.precio_unitario ?? it.precio ?? (prod ? prod.precio : 0));
    const subtotal = Number(it.subtotal ?? (precioUnitario * cantidad));
    const detalle = {
      id: nextId(db.pedido_detalles),
      pedido_id: pedido.id,
      pedido_folio: pedido.folio,
      producto_id: Number(it.producto_id) || (prod ? prod.id : 0),
      producto_nombre: it.producto_nombre || it.nombre || (prod ? prod.nombre : `Producto #${it.producto_id}`),
      cantidad,
      precio_unitario: precioUnitario,
      subtotal,
      personalizaciones: (it.personalizaciones || '').trim(),
      created_at: pedido.created_at
    };
    db.pedido_detalles.push(detalle);
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch {
        return resolve({});
      }
    }
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Token');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const db = loadDb();
  const action = String((req.query && req.query.action) || 'db_data');

  try {
    if (req.method === 'GET') {
      if (action === 'db_data') {
        if (!isStaffAuthorized(req)) {
          return res.status(401).json({
            ok: false,
            auth_required: true,
            error: 'Acceso restringido a personal autorizado.'
          });
        }

        const pedidosDesc = [...db.pedidos].sort((a, b) => Number(b.id) - Number(a.id));
        const detallesDesc = [...db.pedido_detalles].sort((a, b) => Number(b.id) - Number(a.id));
        const clientesDesc = [...db.clientes_lealtad].sort(
          (a, b) => Number(b.sellos_acumulados ?? b.sellos ?? 0) - Number(a.sellos_acumulados ?? a.sellos ?? 0)
        );
        const ingresos = db.pedidos.reduce(
          (acc, p) => (p.estado !== 'cancelado' ? acc + Number(p.total || 0) : acc),
          0
        );
        const pendientes = db.pedidos.filter(p => ['pendiente', 'preparando'].includes(p.estado)).length;

        return res.status(200).json({
          ok: true,
          timestamp: new Date().toISOString(),
          origen: 'vercel_cloud_db',
          stats: {
            total_pedidos: db.pedidos.length,
            ingresos_totales: ingresos,
            pendientes,
            clientes_lealtad: db.clientes_lealtad.length
          },
          pedidos: pedidosDesc,
          pedido_detalles: detallesDesc,
          clientes_lealtad: clientesDesc,
          productos: db.productos
        });
      }

      if (action === 'productos') {
        const catId = req.query && (req.query.categoria || req.query.categoria_id);
        const productosFiltrados = catId
          ? db.productos.filter(p => Number(p.categoria_id) === Number(catId))
          : db.productos;
        return res.status(200).json({
          ok: true,
          categorias: db.categorias,
          productos: productosFiltrados
        });
      }

      if (action === 'pedido_folio') {
        const folio = String((req.query && req.query.folio) || '').trim().toUpperCase();
        if (!folio) {
          return res.status(400).json({ ok: false, error: 'Ingresa un folio válido.' });
        }
        const encontrado = db.pedidos.find(p => String(p.folio || '').toUpperCase() === folio);
        if (!encontrado) {
          return res.status(404).json({ ok: false, error: `No se encontró ningún pedido con el folio ${folio}.` });
        }
        const detalles = encontrado.items && encontrado.items.length
          ? encontrado.items
          : db.pedido_detalles.filter(d => Number(d.pedido_id) === Number(encontrado.id));
        return res.status(200).json({
          ok: true,
          pedido: { ...encontrado, items: detalles, detalles }
        });
      }

      if (action === 'cocina') {
        if (!isStaffAuthorized(req)) {
          return res.status(401).json({
            ok: false,
            auth_required: true,
            error: 'Acceso restringido a personal autorizado.'
          });
        }

        const activos = db.pedidos
          .filter(p => ['pendiente', 'preparando', 'listo_para_recoger'].includes(p.estado))
          .sort((a, b) => Number(a.id) - Number(b.id));
        const ingresos = db.pedidos.reduce(
          (acc, p) => (p.estado !== 'cancelado' ? acc + Number(p.total || 0) : acc),
          0
        );
        const entregados = db.pedidos.filter(p => p.estado === 'entregado').length;

        return res.status(200).json({
          ok: true,
          pedidos: activos,
          resumen: {
            total_pedidos: db.pedidos.length,
            ingresos_totales: ingresos,
            entregados
          }
        });
      }

      if (action === 'lealtad') {
        const tel = normalizePhone(req.query && req.query.telefono);
        if (tel.length < 10) {
          return res.status(422).json({ ok: false, error: 'Ingresa un número de teléfono válido de 10 dígitos.' });
        }
        const cliente = db.clientes_lealtad.find(c => normalizePhone(c.telefono) === tel);
        if (!cliente) {
          return res.status(404).json({
            ok: false,
            encontrado: false,
            mensaje: 'Aún no hay sellos registrados con este número. Haz tu primer pedido para activar tu tarjeta.'
          });
        }
        const sellos = Number(cliente.sellos_acumulados ?? cliente.sellos ?? 0);
        return res.status(200).json({
          ok: true,
          encontrado: true,
          cliente: {
            ...cliente,
            sellos,
            sellos_acumulados: sellos,
            sellos_meta: 6,
            sellos_faltantes: Math.max(0, 6 - sellos),
            tiene_recompensa_disponible: sellos >= 6
          }
        });
      }

      return res.status(400).json({ ok: false, error: `Acción GET no reconocida: ${action}` });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);

      if (action === 'auth_staff') {
        const pin = String(body.pin || '').trim();
        if (pin && pin === STAFF_PIN) {
          return res.status(200).json({ ok: true, token: STAFF_TOKEN });
        }
        return res.status(401).json({ ok: false, error: 'PIN de personal incorrecto.' });
      }

      if (action === 'crear_pedido') {
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length === 0) {
          return res.status(422).json({ ok: false, error: 'El carrito está vacío. Agrega al menos un producto al pedido.' });
        }

        const nombre = String(body.cliente_nombre || '').trim();
        const tel = normalizePhone(body.cliente_telefono);
        if (!nombre || tel.length < 10) {
          return res.status(422).json({ ok: false, error: 'Ingresa tu nombre y un teléfono válido de 10 dígitos.' });
        }

        const hora = body.hora_recoleccion || 'En 15 minutos';
        const metodo = body.metodo_pago || 'efectivo_en_barra';
        const notas = String(body.notas || '').trim();
        const now = new Date().toISOString();

        const cliente = upsertClienteLealtad(db, nombre, tel, true);

        let totalCalculado = 0;
        const itemsVerificados = items.map(item => {
          const prod = db.productos.find(p => Number(p.id) === Number(item.producto_id));
          const cantidad = Math.max(1, Number(item.cantidad) || 1);
          const precioUnitario = prod ? Number(prod.precio) : Number(item.precio || 0);
          const subtotal = precioUnitario * cantidad;
          totalCalculado += subtotal;
          return {
            producto_id: Number(item.producto_id) || (prod ? prod.id : 0),
            producto_nombre: prod ? prod.nombre : (item.nombre || 'Producto'),
            cantidad,
            precio_unitario: precioUnitario,
            subtotal,
            personalizaciones: String(item.personalizaciones || '').trim()
          };
        });

        const folio = `MJ-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const pedidoId = nextId(db.pedidos);
        const nuevoPedido = {
          id: pedidoId,
          folio,
          cliente_nombre: nombre,
          cliente_telefono: tel,
          cliente_lealtad_id: cliente.id,
          hora_recoleccion_estimada: hora,
          estado: 'pendiente',
          total: totalCalculado,
          metodo_pago: metodo,
          notas,
          created_at: now,
          updated_at: now,
          items: itemsVerificados
        };

        db.pedidos.push(nuevoPedido);
        buildDetallesForOrder(db, nuevoPedido);
        saveDb(db);

        return res.status(201).json({
          ok: true,
          origen: 'vercel_cloud_db',
          mensaje: 'Pedido registrado correctamente en Vercel Cloud DB.',
          folio,
          pedido_id: pedidoId,
          id: pedidoId,
          total: totalCalculado,
          hora_recoleccion: hora,
          estado: 'pendiente',
          sellos_acumulados: cliente.sellos_acumulados,
          items: itemsVerificados
        });
      }

      if (action === 'actualizar_cocina') {
        if (!isStaffAuthorized(req)) {
          return res.status(401).json({
            ok: false,
            auth_required: true,
            error: 'Acceso restringido a personal autorizado.'
          });
        }

        const pedidoId = Number(body.pedido_id || 0);
        const nuevoEstado = String(body.nuevo_estado || '').trim();
        const estadosValidos = ['pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(nuevoEstado)) {
          return res.status(422).json({ ok: false, error: `Estado inválido: ${nuevoEstado}` });
        }
        const pedido = db.pedidos.find(p => Number(p.id) === pedidoId);
        if (!pedido) {
          return res.status(404).json({ ok: false, error: `Pedido #${pedidoId} no encontrado.` });
        }
        pedido.estado = nuevoEstado;
        pedido.updated_at = new Date().toISOString();
        saveDb(db);
        return res.status(200).json({ ok: true, mensaje: `Estado actualizado a ${nuevoEstado}`, pedido });
      }

      if (action === 'canjear_lealtad') {
        const tel = normalizePhone(body.telefono);
        const cliente = db.clientes_lealtad.find(c => normalizePhone(c.telefono) === tel);
        const sellos = cliente ? Number(cliente.sellos_acumulados ?? cliente.sellos ?? 0) : 0;
        if (!cliente || sellos < 6) {
          return res.status(422).json({ ok: false, error: 'Necesitas al menos 6 sellos para canjear tu bebida.' });
        }
        cliente.sellos_acumulados = sellos - 6;
        cliente.sellos = cliente.sellos_acumulados;
        cliente.recompensas_canjeadas = (Number(cliente.recompensas_canjeadas) || 0) + 1;
        cliente.last_visit_at = new Date().toISOString();
        saveDb(db);
        return res.status(200).json({
          ok: true,
          mensaje: '¡Café de cortesía canjeado! Muestra esta confirmación en barra.',
          sellos_restantes: cliente.sellos_acumulados,
          recompensas_canjeadas: cliente.recompensas_canjeadas
        });
      }

      if (action === 'sync') {
        const incomingPedidos = Array.isArray(body.pedidos) ? body.pedidos : [];
        const incomingClientes = Array.isArray(body.clientes_lealtad)
          ? body.clientes_lealtad
          : (body.clientes_lealtad && typeof body.clientes_lealtad === 'object' ? Object.values(body.clientes_lealtad) : []);

        let mergedPedidos = 0;
        let mergedClientes = 0;

        incomingClientes.forEach(ic => {
          const tel = normalizePhone(ic.telefono);
          if (!tel) return;
          const existing = db.clientes_lealtad.find(c => normalizePhone(c.telefono) === tel);
          const inSellos = Number(ic.sellos_acumulados ?? ic.sellos ?? 0);
          const inVisitas = Number(ic.total_visitas ?? 1);
          const inCanjes = Number(ic.recompensas_canjeadas ?? 0);

          if (!existing) {
            db.clientes_lealtad.push({
              id: nextId(db.clientes_lealtad),
              telefono: tel,
              nombre: ic.nombre || 'Cliente MJ',
              carrera: ic.carrera || 'FES Cuautitlán Campo 4',
              sellos_acumulados: inSellos,
              sellos: inSellos,
              recompensas_canjeadas: inCanjes,
              total_visitas: inVisitas,
              created_at: ic.created_at || new Date().toISOString(),
              last_visit_at: ic.last_visit_at || new Date().toISOString()
            });
            mergedClientes++;
          } else {
            // Conservar el mayor contador de visitas/sellos si viene de otra fuente sincronizada
            if (inVisitas > Number(existing.total_visitas || 0)) {
              existing.sellos_acumulados = Math.max(Number(existing.sellos_acumulados || 0), inSellos);
              existing.sellos = existing.sellos_acumulados;
              existing.total_visitas = inVisitas;
              existing.recompensas_canjeadas = Math.max(Number(existing.recompensas_canjeadas || 0), inCanjes);
            }
          }
        });

        incomingPedidos.forEach(ip => {
          const folio = String(ip.folio || '').trim().toUpperCase();
          if (!folio) return;
          const existing = db.pedidos.find(p => String(p.folio || '').toUpperCase() === folio);
          if (!existing) {
            const newId = nextId(db.pedidos);
            const now = new Date().toISOString();
            const items = Array.isArray(ip.items) ? ip.items : (Array.isArray(ip.detalles) ? ip.detalles : []);
            const pedidoObj = {
              id: newId,
              folio,
              cliente_nombre: ip.cliente_nombre || 'Cliente MJ',
              cliente_telefono: normalizePhone(ip.cliente_telefono),
              cliente_lealtad_id: ip.cliente_lealtad_id || null,
              hora_recoleccion_estimada: ip.hora_recoleccion_estimada || 'En 15 minutos',
              estado: ip.estado || 'pendiente',
              total: Number(ip.total || 0),
              metodo_pago: ip.metodo_pago || 'efectivo_en_barra',
              notas: ip.notas || '',
              created_at: ip.created_at || now,
              updated_at: ip.updated_at || now,
              items
            };
            db.pedidos.push(pedidoObj);
            buildDetallesForOrder(db, pedidoObj);
            mergedPedidos++;
          }
        });

        if (mergedPedidos > 0 || mergedClientes > 0) {
          saveDb(db);
        }

        const responsePayload = {
          ok: true,
          merged_pedidos: mergedPedidos,
          merged_clientes: mergedClientes
        };
        if (isStaffAuthorized(req)) {
          responsePayload.pedidos = [...db.pedidos].sort((a, b) => Number(b.id) - Number(a.id));
          responsePayload.clientes_lealtad = db.clientes_lealtad;
        }
        return res.status(200).json(responsePayload);
      }

      return res.status(400).json({ ok: false, error: `Acción POST no reconocida: ${action}` });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Error interno del servidor' });
  }
};
