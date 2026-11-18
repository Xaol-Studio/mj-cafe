/**
 * Cliente de comunicación con el backend PHP y almacenamiento local de respaldo
 * Proyecto: MJ Café - FES Cuautitlán Campo 4
 */

export const API_BASE_URL = '../backend/api';
export const CLOUD_API_URL = '/api/db';
export const STORAGE_KEY_PEDIDOS = 'mj_cafe_pedidos_v1';
export const STORAGE_KEY_LEALTAD = 'mj_cafe_lealtad_v1';

export const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || localStorage.getItem('mj_supabase_url') || '',
  anonKey: window.SUPABASE_ANON_KEY || localStorage.getItem('mj_supabase_anon_key') || '',

  isConfigured() {
    return Boolean(this.url && this.anonKey && this.url.startsWith('https://'));
  },

  guardar(url, key) {
    this.url = (url || '').trim().replace(/\/$/, '');
    this.anonKey = (key || '').trim();
    localStorage.setItem('mj_supabase_url', this.url);
    localStorage.setItem('mj_supabase_anon_key', this.anonKey);
  },

  limpiar() {
    this.url = '';
    this.anonKey = '';
    localStorage.removeItem('mj_supabase_url');
    localStorage.removeItem('mj_supabase_anon_key');
  }
};

export async function supabaseFetch(endpoint, options = {}) {
  if (!SUPABASE_CONFIG.isConfigured()) return null;
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${cleanEndpoint}`;
  const headers = {
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

// Catálogo completo de MJ Café (sincronizado con database/seeds.sql)
export const CATALOGO_INICIAL = {
  categorias: [
    { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad', icono: '☕' },
    { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias', icono: '🥤' },
    { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels', icono: '🥪' },
    { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres', icono: '🥐' }
  ],
  productos: [
    {
      id: 1,
      nombre: 'Americano de Especialidad (12 oz)',
      descripcion: 'Granos selectos con notas a chocolate y avellana, tostado medio artesanal.',
      precio: 38.00,
      precio_formateado: '$38.00 MXN',
      tiempo_prep_min: 3,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' }
    },
    {
      id: 2,
      nombre: 'Caramel Macchiato Latte (16 oz)',
      descripcion: 'Espresso doble, leche vaporizada aterciopelada y jarabe de caramelo casero.',
      precio: 58.00,
      precio_formateado: '$58.00 MXN',
      tiempo_prep_min: 4,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' }
    },
    {
      id: 3,
      nombre: 'Cappuccino Italiano Clásico (12 oz)',
      descripcion: 'Equilibrio 1:1:1 de espresso, leche cremada y microespuma.',
      precio: 48.00,
      precio_formateado: '$48.00 MXN',
      tiempo_prep_min: 4,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' }
    },
    {
      id: 4,
      nombre: 'Dirty Chai Latte (16 oz)',
      descripcion: 'Té chai especiado con cardamomo y canela, coronado con un shot de espresso.',
      precio: 62.00,
      precio_formateado: '$62.00 MXN',
      tiempo_prep_min: 5,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 1, nombre: 'Café de Especialidad', slug: 'cafe-especialidad' }
    },
    {
      id: 5,
      nombre: 'Frappé Matcha Imperial (16 oz)',
      descripcion: 'Matcha de grado ceremonial japonés batido con crema y leche entera o vegetal.',
      precio: 65.00,
      precio_formateado: '$65.00 MXN',
      tiempo_prep_min: 5,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' }
    },
    {
      id: 6,
      nombre: 'Frappé Moka Brownie (16 oz)',
      descripcion: 'Base de espresso doble, salsa de chocolate amargo, crema batida y trozos de brownie.',
      precio: 65.00,
      precio_formateado: '$65.00 MXN',
      tiempo_prep_min: 5,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' }
    },
    {
      id: 7,
      nombre: 'Frappé Taro Suave (16 oz)',
      descripcion: 'Cremoso extracto de raíz de taro con leche y toque avainillado.',
      precio: 60.00,
      precio_formateado: '$60.00 MXN',
      tiempo_prep_min: 5,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' }
    },
    {
      id: 8,
      nombre: 'Cold Brew con Naranja (16 oz)',
      descripcion: 'Maceración en frío de 18 horas, refrescante con rodaja de naranja deshidratada.',
      precio: 52.00,
      precio_formateado: '$52.00 MXN',
      tiempo_prep_min: 2,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 2, nombre: 'Frappés & Frías', slug: 'frappes-frias' }
    },
    {
      id: 9,
      nombre: 'Bagel de Pavo y Manchego',
      descripcion: 'Bagel de ajonjolí tostado, pechuga de pavo ahumada, queso manchego gratinado y aderezo chipotle.',
      precio: 68.00,
      precio_formateado: '$68.00 MXN',
      tiempo_prep_min: 7,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' }
    },
    {
      id: 10,
      nombre: 'Molletes Rústicos con Tocino',
      descripcion: 'Bolillo artesanal con frijoles refritos de la casa, queso gouda gratinado y tocino crujiente.',
      precio: 55.00,
      precio_formateado: '$55.00 MXN',
      tiempo_prep_min: 8,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' }
    },
    {
      id: 11,
      nombre: 'Ciabatta de Pollo al Pesto',
      descripcion: 'Pan ciabatta a la plancha con pechuga asada, pesto de albahaca fresca y jitomate.',
      precio: 75.00,
      precio_formateado: '$75.00 MXN',
      tiempo_prep_min: 8,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 3, nombre: 'Alimentos & Bagels', slug: 'alimentos-bagels' }
    },
    {
      id: 12,
      nombre: 'Croissant Artesanal de Almendras',
      descripcion: 'Hojaldre crujiente relleno de crema de almendra y cubierto de almendras tostadas.',
      precio: 42.00,
      precio_formateado: '$42.00 MXN',
      tiempo_prep_min: 2,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' }
    },
    {
      id: 13,
      nombre: 'Brownie de Chocolate Fudge',
      descripcion: 'Bizcocho húmedo de cacao al 70% con nuez pecana troceada.',
      precio: 38.00,
      precio_formateado: '$38.00 MXN',
      tiempo_prep_min: 1,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' }
    },
    {
      id: 14,
      nombre: 'Muffin de Moras Silvestres',
      descripcion: 'Muffin esponjoso relleno de moras azules frescas con toque de limón.',
      precio: 35.00,
      precio_formateado: '$35.00 MXN',
      tiempo_prep_min: 1,
      disponible: true,
      es_popular: false,
      imagen_url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' }
    }
  ]
};

const PEDIDOS_SEMILLA = [
  {
    id: 1,
    folio: 'MJ-2026-101',
    cliente_nombre: 'Miguel Delgado',
    cliente_telefono: '5512345678',
    hora_recoleccion_estimada: 'En 10 minutos (cambio de clase)',
    estado: 'listo_para_recoger',
    total: 126.00,
    metodo_pago: 'efectivo_en_barra',
    notas: 'Leche de avena para el macchiato por favor.',
    created_at: new Date().toISOString(),
    items: [
      { producto_id: 2, producto_nombre: 'Caramel Macchiato Latte (16 oz)', cantidad: 1, precio_unitario: 58.00, subtotal: 58.00, personalizaciones: 'Leche de avena' },
      { producto_id: 9, producto_nombre: 'Bagel de Pavo y Manchego', cantidad: 1, precio_unitario: 68.00, subtotal: 68.00, personalizaciones: 'Bien tostado' }
    ]
  },
  {
    id: 2,
    folio: 'MJ-2026-102',
    cliente_nombre: 'Jorge Barrios',
    cliente_telefono: '5587654321',
    hora_recoleccion_estimada: 'En 20 minutos',
    estado: 'preparando',
    total: 65.00,
    metodo_pago: 'transferencia_spei',
    notas: 'Poco dulce el matcha.',
    created_at: new Date().toISOString(),
    items: [
      { producto_id: 5, producto_nombre: 'Frappé Matcha Imperial (16 oz)', cantidad: 1, precio_unitario: 65.00, subtotal: 65.00, personalizaciones: 'Mitad de azúcar' }
    ]
  }
];

const LEALTAD_SEMILLA = {
  '5512345678': { id: 1, nombre: 'Miguel Delgado', telefono: '5512345678', carrera: 'Informática - FES C4', sellos: 5, recompensas_canjeadas: 2, total_visitas: 17 },
  '5587654321': { id: 2, nombre: 'Jorge Barrios', telefono: '5587654321', carrera: 'Informática - FES C4', sellos: 3, recompensas_canjeadas: 0, total_visitas: 3 },
  '5599887766': { id: 3, nombre: 'Fernanda Morales', telefono: '5599887766', carrera: 'Química Industrial - FES C4', sellos: 6, recompensas_canjeadas: 1, total_visitas: 12 }
};

export function leerPedidosLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEDIDOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(PEDIDOS_SEMILLA));
      return [...PEDIDOS_SEMILLA];
    }
    return JSON.parse(raw);
  } catch {
    return [...PEDIDOS_SEMILLA];
  }
}

export function guardarPedidosLocal(pedidos) {
  try {
    localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(pedidos));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

export function leerLealtadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEALTAD);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LEALTAD, JSON.stringify(LEALTAD_SEMILLA));
      return { ...LEALTAD_SEMILLA };
    }
    return JSON.parse(raw);
  } catch {
    return { ...LEALTAD_SEMILLA };
  }
}

export function guardarLealtadLocal(mapa) {
  try {
    localStorage.setItem(STORAGE_KEY_LEALTAD, JSON.stringify(mapa));
  } catch (e) {
    console.warn('No se pudo guardar lealtad en localStorage:', e);
  }
}

async function fetchJsonSeguro(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error('Backend PHP no activo en este entorno');
  }
  return await response.json();
}

export async function fetchCloudApi(action, queryParams = '', options = {}) {
  const qs = queryParams ? `&${queryParams.replace(/^&/, '')}` : '';
  const url = `${CLOUD_API_URL}?action=${encodeURIComponent(action)}${qs}`;
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Cloud API no disponible en este entorno');
  }
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error || `Error HTTP ${response.status}`);
    err.status = response.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function sincronizarLocalConNube() {
  try {
    const localPedidos = leerPedidosLocal();
    const localLealtad = leerLealtadLocal();
    const clientesArr = Object.values(localLealtad || {});

    const data = await fetchCloudApi('sync', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedidos: localPedidos,
        clientes_lealtad: clientesArr
      })
    });

    if (data && data.ok && Array.isArray(data.pedidos)) {
      guardarPedidosLocal(data.pedidos);
      if (Array.isArray(data.clientes_lealtad)) {
        const mapa = {};
        data.clientes_lealtad.forEach(c => {
          if (c.telefono) {
            mapa[c.telefono] = {
              id: c.id,
              nombre: c.nombre,
              telefono: c.telefono,
              carrera: c.carrera || 'FES Cuautitlán Campo 4',
              sellos: Number(c.sellos_acumulados ?? c.sellos ?? 0),
              recompensas_canjeadas: Number(c.recompensas_canjeadas || 0),
              total_visitas: Number(c.total_visitas || 1)
            };
          }
        });
        guardarLealtadLocal(mapa);
      }
    }
    return data;
  } catch (err) {
    console.warn('No se pudo sincronizar con la nube:', err.message);
    return null;
  }
}

export const API = {
  async obtenerProductos(categoriaId = null) {
    // 1. Intentar Cloud API (/api/db)
    try {
      const qs = categoriaId ? `categoria=${encodeURIComponent(categoriaId)}` : '';
      const data = await fetchCloudApi('productos', qs);
      if (data && data.ok) {
        return { ok: true, origen: 'vercel_cloud_db', data };
      }
    } catch {
      // Continuar con backend PHP o catálogo inicial
    }

    // 2. Intentar backend PHP local
    try {
      const url = categoriaId
        ? `${API_BASE_URL}/productos.php?categoria=${categoriaId}`
        : `${API_BASE_URL}/productos.php`;

      const data = await fetchJsonSeguro(url);
      return { ok: true, origen: 'backend_sql', data };
    } catch {
      let productosFiltrados = CATALOGO_INICIAL.productos;
      if (categoriaId) {
        productosFiltrados = productosFiltrados.filter(p => p.categoria.id === Number(categoriaId));
      }
      return {
        ok: true,
        origen: 'local_storage',
        data: {
          categorias: CATALOGO_INICIAL.categorias,
          productos: productosFiltrados
        }
      };
    }
  },

  async crearPedido(pedidoPayload) {
    if (!pedidoPayload.items || pedidoPayload.items.length === 0) {
      return { ok: false, error: 'El carrito está vacío. Agrega al menos un producto al pedido.' };
    }

    // 1. Si Supabase está configurado, guardar directamente en Supabase Cloud SQL
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const tel = String(pedidoPayload.cliente_telefono || '').replace(/\D/g, '');
        const items = pedidoPayload.items || [];

        let totalCalculado = 0;
        const itemsVerificados = items.map(item => {
          const prod = CATALOGO_INICIAL.productos.find(p => p.id === Number(item.producto_id));
          const pu = prod ? prod.precio : Number(item.precio || 0);
          const sub = pu * Number(item.cantidad || 1);
          totalCalculado += sub;
          return {
            producto_id: Number(item.producto_id),
            nombre: prod ? prod.nombre : (item.nombre || 'Producto'),
            cantidad: Number(item.cantidad || 1),
            precio_unitario: pu,
            subtotal: sub,
            personalizaciones: item.personalizaciones || ''
          };
        });

        // Actualizar o crear cliente de lealtad en Supabase
        let sellosActuales = 1;
        try {
          const clientes = await supabaseFetch(`clientes_lealtad?telefono=eq.${tel}&select=*`);
          if (clientes && clientes.length > 0) {
            const c = clientes[0];
            sellosActuales = (c.sellos_acumulados || 0) + 1;
            await supabaseFetch(`clientes_lealtad?id=eq.${c.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                sellos_acumulados: sellosActuales,
                total_visitas: (c.total_visitas || 0) + 1,
                nombre: pedidoPayload.cliente_nombre || c.nombre,
                last_visit_at: new Date().toISOString()
              })
            });
          } else {
            await supabaseFetch('clientes_lealtad', {
              method: 'POST',
              body: JSON.stringify({
                telefono: tel,
                nombre: pedidoPayload.cliente_nombre,
                carrera: 'FES Cuautitlán Campo 4',
                sellos_acumulados: 1,
                total_visitas: 1,
                created_at: new Date().toISOString(),
                last_visit_at: new Date().toISOString()
              })
            });
          }
        } catch (e) {
          console.warn('Lealtad Supabase:', e);
        }

        const folio = 'MJ-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        const [nuevoPedido] = await supabaseFetch('pedidos', {
          method: 'POST',
          body: JSON.stringify({
            folio,
            cliente_nombre: pedidoPayload.cliente_nombre,
            cliente_telefono: tel,
            hora_recoleccion_estimada: pedidoPayload.hora_recoleccion || 'En 15 minutos',
            estado: 'pendiente',
            total: totalCalculado,
            metodo_pago: pedidoPayload.metodo_pago || 'efectivo_en_barra',
            notas: pedidoPayload.notas || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });

        const detallesAInsertar = itemsVerificados.map(iv => ({
          pedido_id: nuevoPedido.id,
          producto_id: iv.producto_id,
          cantidad: iv.cantidad,
          precio_unitario: iv.precio_unitario,
          subtotal: iv.subtotal,
          personalizaciones: iv.personalizaciones,
          created_at: new Date().toISOString()
        }));

        await supabaseFetch('pedido_detalles', {
          method: 'POST',
          body: JSON.stringify(detallesAInsertar)
        });

        // Guardar copia local de contingencia
        try {
          const local = leerPedidosLocal();
          local.unshift({ ...nuevoPedido, items: itemsVerificados });
          guardarPedidosLocal(local);
        } catch (_) {}

        return {
          ok: true,
          origen: 'supabase_cloud',
          data: {
            folio,
            id: nuevoPedido.id,
            total: totalCalculado,
            hora_recoleccion: pedidoPayload.hora_recoleccion,
            sellos_acumulados: sellosActuales
          }
        };
      } catch (err) {
        console.warn('Supabase no disponible, usando fallback:', err);
      }
    }

    // 2. Priorizar Cloud API (/api/db) en Vercel o dev_server
    try {
      const data = await fetchCloudApi('crear_pedido', '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoPayload)
      });
      if (data && data.ok) {
        // Mantener copia sincronizada en localStorage
        try {
          const pedidos = leerPedidosLocal();
          const tel = String(pedidoPayload.cliente_telefono || '').replace(/\D/g, '');
          const nuevoLocal = {
            id: data.id || data.pedido_id || (pedidos.length ? Math.max(...pedidos.map(p => Number(p.id))) + 1 : 1),
            folio: data.folio,
            cliente_nombre: pedidoPayload.cliente_nombre,
            cliente_telefono: tel,
            hora_recoleccion_estimada: data.hora_recoleccion || pedidoPayload.hora_recoleccion,
            estado: data.estado || 'pendiente',
            total: data.total,
            metodo_pago: pedidoPayload.metodo_pago,
            notas: pedidoPayload.notas || '',
            created_at: new Date().toISOString(),
            items: data.items || []
          };
          if (!pedidos.some(p => String(p.folio).toUpperCase() === String(data.folio).toUpperCase())) {
            pedidos.unshift(nuevoLocal);
            guardarPedidosLocal(pedidos);
          }

          const lealtad = leerLealtadLocal();
          if (!lealtad[tel]) {
            lealtad[tel] = {
              id: Object.keys(lealtad).length + 1,
              nombre: pedidoPayload.cliente_nombre,
              telefono: tel,
              carrera: 'FES Cuautitlán Campo 4',
              sellos: data.sellos_acumulados || 1,
              recompensas_canjeadas: 0,
              total_visitas: 1
            };
          } else {
            lealtad[tel].nombre = pedidoPayload.cliente_nombre || lealtad[tel].nombre;
            lealtad[tel].sellos = data.sellos_acumulados || ((lealtad[tel].sellos || 0) + 1);
            lealtad[tel].total_visitas = (lealtad[tel].total_visitas || 0) + 1;
          }
          guardarLealtadLocal(lealtad);
        } catch (_) {}

        return { ok: true, origen: data.origen || 'vercel_cloud_db', data };
      }
    } catch (err) {
      if (err.status === 422) {
        return { ok: false, error: err.message };
      }
      console.warn('Cloud API crear_pedido no disponible, usando fallback:', err.message);
    }

    // 3. Intentar backend PHP local
    try {
      const data = await fetchJsonSeguro(`${API_BASE_URL}/pedidos.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoPayload)
      });
      if (!data.ok) throw new Error(data.error || 'Error al guardar pedido');
      return { ok: true, origen: 'backend_sql', data };
    } catch {
      const pedidos = leerPedidosLocal();
      const lealtad = leerLealtadLocal();
      const tel = String(pedidoPayload.cliente_telefono || '').replace(/\D/g, '');

      // Actualizar sellos del cliente
      if (!lealtad[tel]) {
        lealtad[tel] = {
          id: Object.keys(lealtad).length + 1,
          nombre: pedidoPayload.cliente_nombre,
          telefono: tel,
          carrera: 'FES Cuautitlán Campo 4',
          sellos: 1,
          recompensas_canjeadas: 0,
          total_visitas: 1
        };
      } else {
        lealtad[tel].nombre = pedidoPayload.cliente_nombre || lealtad[tel].nombre;
        lealtad[tel].sellos = (lealtad[tel].sellos || 0) + 1;
        lealtad[tel].total_visitas = (lealtad[tel].total_visitas || 0) + 1;
      }
      guardarLealtadLocal(lealtad);

      const folio = 'MJ-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const itemsDetalle = (pedidoPayload.items || []).map(item => {
        const prod = CATALOGO_INICIAL.productos.find(p => p.id === Number(item.producto_id));
        const precioUnitario = prod ? prod.precio : Number(item.precio || 0);
        return {
          producto_id: item.producto_id,
          producto_nombre: prod ? prod.nombre : (item.nombre || 'Producto'),
          cantidad: Number(item.cantidad || 1),
          precio_unitario: precioUnitario,
          subtotal: precioUnitario * Number(item.cantidad || 1),
          personalizaciones: item.personalizaciones || ''
        };
      });

      const total = itemsDetalle.reduce((acc, i) => acc + i.subtotal, 0);
      const nuevoPedido = {
        id: pedidos.length ? Math.max(...pedidos.map(p => Number(p.id))) + 1 : 1,
        folio,
        cliente_nombre: pedidoPayload.cliente_nombre,
        cliente_telefono: tel,
        hora_recoleccion_estimada: pedidoPayload.hora_recoleccion,
        estado: 'pendiente',
        total,
        metodo_pago: pedidoPayload.metodo_pago,
        notas: pedidoPayload.notas || '',
        created_at: new Date().toISOString(),
        items: itemsDetalle
      };

      pedidos.unshift(nuevoPedido);
      guardarPedidosLocal(pedidos);

      return {
        ok: true,
        origen: 'local_storage',
        data: {
          ok: true,
          mensaje: 'Pedido registrado con éxito.',
          folio,
          pedido_id: nuevoPedido.id,
          total,
          hora_recoleccion: pedidoPayload.hora_recoleccion,
          estado: 'pendiente',
          sellos_acumulados: lealtad[tel].sellos,
          items: itemsDetalle
        }
      };
    }
  },

  async consultarPedidoPorFolio(folio) {
    const folioLimpio = String(folio || '').trim().toUpperCase();
    if (!folioLimpio) {
      return { ok: false, error: 'Ingresa un folio válido.' };
    }

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const res = await supabaseFetch(`pedidos?folio=ilike.${encodeURIComponent(folioLimpio)}&select=*,items:pedido_detalles(*,producto:productos(nombre,imagen_url))&limit=1`);
        if (res && res.length > 0) {
          const p = res[0];
          return {
            ok: true,
            origen: 'supabase_cloud',
            pedido: {
              ...p,
              detalles: (p.items || []).map(it => ({
                ...it,
                producto_nombre: it.producto?.nombre || `Producto #${it.producto_id}`
              }))
            }
          };
        }
      } catch (err) {
        console.warn('Rastreo Supabase error:', err);
      }
    }

    try {
      const data = await fetchCloudApi('pedido_folio', `folio=${encodeURIComponent(folioLimpio)}`);
      if (data && data.ok) return data;
    } catch (err) {
      if (err.status === 404) {
        // Revisar también respaldo local antes de declarar no encontrado
        const pedidos = leerPedidosLocal();
        const localHit = pedidos.find(p => String(p.folio).toUpperCase() === folioLimpio);
        if (localHit) {
          return { ok: true, pedido: { ...localHit, detalles: localHit.items || [] } };
        }
        return { ok: false, error: err.message };
      }
    }

    try {
      return await fetchJsonSeguro(`${API_BASE_URL}/pedidos.php?folio=${encodeURIComponent(folioLimpio)}`);
    } catch {
      const pedidos = leerPedidosLocal();
      const encontrado = pedidos.find(p => String(p.folio).toUpperCase() === folioLimpio);
      if (!encontrado) {
        return { ok: false, error: 'No se encontró ningún pedido con ese folio.' };
      }
      return {
        ok: true,
        pedido: {
          ...encontrado,
          detalles: encontrado.items || []
        }
      };
    }
  },

  async consultarLealtad(telefono) {
    const tel = String(telefono || '').replace(/\D/g, '');

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const res = await supabaseFetch(`clientes_lealtad?telefono=eq.${tel}&select=*&limit=1`);
        if (res && res.length > 0) {
          const c = res[0];
          return {
            ok: true,
            origen: 'supabase_cloud',
            encontrado: true,
            cliente: {
              ...c,
              sellos: c.sellos_acumulados || 0,
              sellos_meta: 6,
              sellos_faltantes: Math.max(0, 6 - (c.sellos_acumulados || 0)),
              tiene_recompensa_disponible: (c.sellos_acumulados || 0) >= 6
            }
          };
        }
      } catch (err) {
        console.warn('Lealtad Supabase error:', err);
      }
    }

    try {
      const data = await fetchCloudApi('lealtad', `telefono=${encodeURIComponent(tel)}`);
      if (data && data.ok) return data;
    } catch (err) {
      if (err.status === 404 || err.status === 422) {
        const lealtad = leerLealtadLocal();
        const cliente = lealtad[tel];
        if (cliente) {
          return {
            ok: true,
            encontrado: true,
            cliente: {
              ...cliente,
              sellos_meta: 6,
              sellos_faltantes: Math.max(0, 6 - cliente.sellos),
              tiene_recompensa_disponible: cliente.sellos >= 6
            }
          };
        }
        return {
          ok: false,
          encontrado: false,
          mensaje: err.payload?.mensaje || err.message || 'Aún no hay sellos registrados con este número.'
        };
      }
    }

    try {
      return await fetchJsonSeguro(`${API_BASE_URL}/lealtad.php?telefono=${encodeURIComponent(tel)}`);
    } catch {
      const lealtad = leerLealtadLocal();
      const cliente = lealtad[tel];
      if (!cliente) {
        return {
          ok: false,
          encontrado: false,
          mensaje: 'Aún no hay sellos registrados con este número. Haz tu primer pedido para activar tu tarjeta.'
        };
      }
      return {
        ok: true,
        encontrado: true,
        cliente: {
          ...cliente,
          sellos_meta: 6,
          sellos_faltantes: Math.max(0, 6 - cliente.sellos),
          tiene_recompensa_disponible: cliente.sellos >= 6
        }
      };
    }
  },

  async canjearRecompensa(telefono) {
    const tel = String(telefono || '').replace(/\D/g, '');

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const res = await supabaseFetch(`clientes_lealtad?telefono=eq.${tel}&select=*&limit=1`);
        if (res && res.length > 0) {
          const c = res[0];
          if ((c.sellos_acumulados || 0) < 6) {
            return { ok: false, error: 'Necesitas al menos 6 sellos para canjear tu bebida.' };
          }
          await supabaseFetch(`clientes_lealtad?id=eq.${c.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              sellos_acumulados: (c.sellos_acumulados || 0) - 6,
              recompensas_canjeadas: (c.recompensas_canjeadas || 0) + 1,
              last_visit_at: new Date().toISOString()
            })
          });
          return {
            ok: true,
            origen: 'supabase_cloud',
            mensaje: '¡Café de cortesía canjeado! Muestra esta confirmación en barra.',
            sellos_restantes: (c.sellos_acumulados || 0) - 6,
            recompensas_canjeadas: (c.recompensas_canjeadas || 0) + 1
          };
        }
      } catch (err) {
        console.warn('Canje Supabase error:', err);
      }
    }

    try {
      const data = await fetchCloudApi('canjear_lealtad', '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: tel })
      });
      if (data && data.ok) return data;
    } catch (err) {
      if (err.status === 422) {
        return { ok: false, error: err.message };
      }
    }

    try {
      return await fetchJsonSeguro(`${API_BASE_URL}/lealtad.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: tel })
      });
    } catch {
      const lealtad = leerLealtadLocal();
      const cliente = lealtad[tel];
      if (!cliente || cliente.sellos < 6) {
        return { ok: false, error: 'Necesitas al menos 6 sellos para canjear tu bebida.' };
      }
      cliente.sellos -= 6;
      cliente.recompensas_canjeadas = (cliente.recompensas_canjeadas || 0) + 1;
      guardarLealtadLocal(lealtad);
      return {
        ok: true,
        mensaje: '¡Café de cortesía canjeado! Muestra esta confirmación en barra.',
        sellos_restantes: cliente.sellos,
        recompensas_canjeadas: cliente.recompensas_canjeadas
      };
    }
  },

  async obtenerPedidosCocina() {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const pedidos = await supabaseFetch('pedidos?estado=in.(pendiente,preparando,listo_para_recoger)&select=*,items:pedido_detalles(*,producto:productos(nombre))&order=id.asc');
        const todos = await supabaseFetch('pedidos?select=total,estado');
        const ingresos = (todos || []).reduce((acc, p) => p.estado !== 'cancelado' ? acc + Number(p.total || 0) : acc, 0);
        const entregados = (todos || []).filter(p => p.estado === 'entregado').length;

        const formateados = (pedidos || []).map(p => ({
          ...p,
          items: (p.items || []).map(it => ({
            ...it,
            producto_nombre: it.producto?.nombre || `Producto #${it.producto_id}`
          }))
        }));

        return {
          ok: true,
          origen: 'supabase_cloud',
          pedidos: formateados,
          resumen: {
            total_pedidos: (todos || []).length,
            ingresos_totales: ingresos,
            entregados
          }
        };
      } catch (err) {
        console.warn('Cocina Supabase error:', err);
      }
    }

    try {
      const data = await fetchCloudApi('cocina');
      if (data && data.ok) return data;
    } catch {
      // Continuar con PHP o respaldo local
    }

    try {
      return await fetchJsonSeguro(`${API_BASE_URL}/cocina.php`);
    } catch {
      const todos = leerPedidosLocal();
      const activos = todos.filter(p => ['pendiente', 'preparando', 'listo_para_recoger'].includes(p.estado));
      const ingresos = todos.reduce((acc, p) => p.estado !== 'cancelado' ? acc + Number(p.total || 0) : acc, 0);
      const entregados = todos.filter(p => p.estado === 'entregado').length;
      return {
        ok: true,
        pedidos: activos,
        resumen: {
          total_pedidos: todos.length,
          ingresos_totales: ingresos,
          entregados
        }
      };
    }
  },

  async actualizarEstadoCocina(pedidoId, nuevoEstado) {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        await supabaseFetch(`pedidos?id=eq.${pedidoId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            estado: nuevoEstado,
            updated_at: new Date().toISOString()
          })
        });
        return { ok: true, origen: 'supabase_cloud', mensaje: `Estado actualizado a ${nuevoEstado}` };
      } catch (err) {
        console.warn('Actualizar cocina Supabase error:', err);
      }
    }

    try {
      const data = await fetchCloudApi('actualizar_cocina', '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: Number(pedidoId), nuevo_estado: nuevoEstado })
      });
      if (data && data.ok) {
        const pedidos = leerPedidosLocal();
        const idx = pedidos.findIndex(p => Number(p.id) === Number(pedidoId));
        if (idx !== -1) {
          pedidos[idx].estado = nuevoEstado;
          guardarPedidosLocal(pedidos);
        }
        return data;
      }
    } catch {
      // Continuar con PHP o respaldo local
    }

    try {
      return await fetchJsonSeguro(`${API_BASE_URL}/cocina.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: Number(pedidoId), nuevo_estado: nuevoEstado })
      });
    } catch {
      const pedidos = leerPedidosLocal();
      const idx = pedidos.findIndex(p => Number(p.id) === Number(pedidoId));
      if (idx !== -1) {
        pedidos[idx].estado = nuevoEstado;
        guardarPedidosLocal(pedidos);
      }
      return { ok: true, mensaje: `Estado actualizado a ${nuevoEstado}` };
    }
  }
};
};
