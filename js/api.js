/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: js/api.js
 * ==============================================================================
 * CLIENTE API REST CON FALLBACK INTELIGENTE
 * 
 * Permite que la interfaz funcione al 100% tanto en modo desarrollo estático
 * como conectado al backend PHP + SQLite/MySQL de iamhuitron & GorchRosas.
 * ==============================================================================
 */

const API_BASE_URL = '../backend/api';

// Catálogo de respaldo local por si el backend PHP aún no está encendido
const MOCK_DATA = {
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
      id: 12,
      nombre: 'Croissant Artesanal de Almendras',
      descripcion: 'Hojaldre crujiente relleno de crema frangipane y cubierto de almendras fileteadas tostadas.',
      precio: 42.00,
      precio_formateado: '$42.00 MXN',
      tiempo_prep_min: 2,
      disponible: true,
      es_popular: true,
      imagen_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
      categoria: { id: 4, nombre: 'Panadería & Postres', slug: 'panaderia-postres' }
    }
  ]
};

export const API = {
  /**
   * Obtiene la lista de productos y categorías desde PHP o Fallback
   */
  async obtenerProductos(categoriaId = null) {
    try {
      const url = categoriaId 
        ? `${API_BASE_URL}/productos.php?categoria=${categoriaId}`
        : `${API_BASE_URL}/productos.php`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Servidor no disponible');
      const data = await response.json();
      return { ok: true, origen: 'backend_sql', data };
    } catch (err) {
      console.warn('⚡ Modo desarrollo estático: usando datos de respaldo locales.', err.message);
      let productosFiltrados = MOCK_DATA.productos;
      if (categoriaId) {
        productosFiltrados = productosFiltrados.filter(p => p.categoria.id === Number(categoriaId));
      }
      return {
        ok: true,
        origen: 'mock_local',
        data: {
          categorias: MOCK_DATA.categorias,
          productos: productosFiltrados
        }
      };
    }
  },

  /**
   * Envía un pedido al backend
   */
  async crearPedido(pedidoPayload) {
    try {
      const response = await fetch(`${API_BASE_URL}/pedidos.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoPayload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Error al guardar el pedido');
      }
      return { ok: true, origen: 'backend_sql', data };
    } catch (err) {
      console.warn('⚡ Fallback de simulación de pedido:', err.message);
      // Generamos un folio simulado para que la experiencia fluya
      const folioSimulado = 'MJ-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      return {
        ok: true,
        origen: 'mock_local',
        data: {
          ok: true,
          mensaje: 'Pedido simulado con éxito (Inicia PHP para guardado en SQL)',
          folio: folioSimulado,
          total: pedidoPayload.items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0),
          hora_recoleccion: pedidoPayload.hora_recoleccion
        }
      };
    }
  },

  /**
   * Consulta el estatus de la tarjeta de sellos
   */
  async consultarLealtad(telefono) {
    try {
      const response = await fetch(`${API_BASE_URL}/lealtad.php?telefono=${encodeURIComponent(telefono)}`);
      const data = await response.json();
      return data;
    } catch (err) {
      // Mock simulado
      return {
        ok: true,
        encontrado: true,
        cliente: {
          nombre: 'Estudiante FES C4',
          carrera: 'FES Cuautitlán Campo 4',
          sellos: 4,
          sellos_meta: 6,
          sellos_faltantes: 2,
          tiene_recompensa_disponible: false
        }
      };
    }
  },

  /**
   * Consulta pedidos para la pantalla de cocina
   */
  async obtenerPedidosCocina() {
    try {
      const response = await fetch(`${API_BASE_URL}/cocina.php`);
      const data = await response.json();
      return data;
    } catch (err) {
      return {
        ok: true,
        pedidos: [
          {
            id: 1,
            folio: 'MJ-2026-101',
            cliente_nombre: 'Miguel Delgado',
            cliente_telefono: '5512345678',
            hora_recoleccion_estimada: 'En 10 min (cambio de clase)',
            estado: 'listo_para_recoger',
            total: 106.00,
            metodo_pago: 'efectivo_en_barra',
            notas: 'Leche de avena para el macchiato por favor.',
            items: [
              { producto_nombre: 'Caramel Macchiato Latte (16 oz)', cantidad: 1, personalizaciones: 'Leche de avena' },
              { producto_nombre: 'Bagel de Pavo y Manchego', cantidad: 1, personalizaciones: 'Bien tostado' }
            ]
          },
          {
            id: 2,
            folio: 'MJ-2026-102',
            cliente_nombre: 'Valeria Sánchez',
            cliente_telefono: '5544332211',
            hora_recoleccion_estimada: 'En 20 minutos',
            estado: 'preparando',
            total: 65.00,
            metodo_pago: 'transferencia_spei',
            notas: 'Poco dulce el matcha.',
            items: [
              { producto_nombre: 'Frappé Matcha Imperial (16 oz)', cantidad: 1, personalizaciones: 'Mitad de azúcar' }
            ]
          }
        ]
      };
    }
  },

  /**
   * Actualiza el estado de un pedido en cocina
   */
  async actualizarEstadoCocina(pedidoId, nuevoEstado) {
    try {
      const response = await fetch(`${API_BASE_URL}/cocina.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: pedidoId, nuevo_estado: nuevoEstado })
      });
      return await response.json();
    } catch (err) {
      return { ok: true, mensaje: `Estado simulado actualizado a ${nuevoEstado}` };
    }
  }
};
