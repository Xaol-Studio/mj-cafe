/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: js/main.js
 * ==============================================================================
 * CONTROLADOR PRINCIPAL DEL FRONTEND
 * Maneja el catálogo, filtrado, carrito de recolección y tarjeta de lealtad.
 * ==============================================================================
 */

import { API } from './api.js';

// Estado global de la aplicación
const AppState = {
  categorias: [],
  productos: [],
  categoriaActiva: 'all',
  carrito: [], // [{ id, nombre, precio, cantidad, personalizacion, imagen_url }]
  modoBackend: 'detectando'
};

// ==============================================================================
// INICIALIZACIÓN
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarMenu();
});

function inicializarEventos() {
  // Carrito Drawer
  document.getElementById('btn-open-cart').addEventListener('click', abrirCarrito);
  document.getElementById('btn-close-cart').addEventListener('click', cerrarCarrito);
  document.getElementById('cart-backdrop').addEventListener('click', cerrarCarrito);

  // Tarjeta de Lealtad
  document.getElementById('btn-open-loyalty').addEventListener('click', abrirModalLealtad);
  document.getElementById('btn-close-loyalty').addEventListener('click', cerrarModalLealtad);
  document.getElementById('loyalty-modal').addEventListener('click', (e) => {
    if (e.target.id === 'loyalty-modal') cerrarModalLealtad();
  });
  document.getElementById('btn-search-loyalty').addEventListener('click', consultarSellosCliente);

  // Confirmación
  document.getElementById('btn-close-confirmation').addEventListener('click', () => {
    document.getElementById('confirmation-modal').classList.remove('active');
  });

  // Envío del pedido
  document.getElementById('btn-submit-order').addEventListener('click', procesarEnvioPedido);
}

// ==============================================================================
// CARGA Y RENDERIZADO DEL MENÚ
// ==============================================================================
async function cargarMenu(categoriaId = null) {
  const grid = document.getElementById('products-grid');
  const countLabel = document.getElementById('products-count-label');
  const badgeStatus = document.getElementById('backend-status-text');
  const badgeContainer = document.getElementById('backend-status-badge');

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #746c65;">Preparando el espresso y molienda... ☕</div>';

  const res = await API.obtenerProductos(categoriaId);

  if (res.origen === 'backend_sql') {
    badgeStatus.textContent = 'Conectado a Base de Datos SQL';
    badgeContainer.style.background = '#e8f5e9';
    badgeContainer.style.color = '#2e7d32';
  } else {
    badgeStatus.textContent = 'Modo Demo (Prende PHP para SQL)';
    badgeContainer.style.background = '#fff4e5';
    badgeContainer.style.color = '#b76e00';
  }

  AppState.categorias = res.data.categorias || [];
  AppState.productos = res.data.productos || [];

  renderizarCategorias(AppState.categorias);
  renderizarProductos(AppState.productos);

  countLabel.textContent = `${AppState.productos.length} especialidades disponibles`;
}

function renderizarCategorias(categorias) {
  const container = document.getElementById('categories-container');
  // Mantenemos el primer botón "Todo el Menú"
  const primerBoton = container.firstElementChild;
  container.innerHTML = '';
  container.appendChild(primerBoton);

  primerBoton.onclick = () => {
    activarTab(primerBoton);
    AppState.categoriaActiva = 'all';
    document.getElementById('current-category-title').textContent = 'Todos los Favoritos';
    renderizarProductos(AppState.productos);
  };

  categorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tab';
    btn.dataset.category = cat.id;
    btn.innerHTML = `<span>${cat.icono || '☕'} ${cat.nombre}</span>`;
    
    btn.onclick = () => {
      activarTab(btn);
      AppState.categoriaActiva = cat.id;
      document.getElementById('current-category-title').textContent = cat.nombre;
      
      const filtrados = AppState.productos.filter(p => p.categoria && (p.categoria.id === cat.id || p.categoria_id === cat.id));
      renderizarProductos(filtrados);
    };

    container.appendChild(btn);
  });
}

function activarTab(elemento) {
  document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
  elemento.classList.add('active');
}

function renderizarProductos(productos) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  if (productos.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #746c65;">No hay productos en esta categoría por el momento.</div>';
    return;
  }

  productos.forEach(prod => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const precioFormateado = prod.precio_formateado || `$${Number(prod.precio).toFixed(2)} MXN`;
    const categoriaNombre = prod.categoria?.nombre || 'Especialidad';

    card.innerHTML = `
      <div class="product-image-container">
        <img class="product-image" src="${prod.imagen_url}" alt="${prod.nombre}" loading="lazy">
        ${prod.es_popular ? '<span class="popular-badge">⭐ Favorito C4</span>' : ''}
        <span class="prep-time-badge">⏱️ ~${prod.tiempo_prep_min || 4} min</span>
      </div>

      <div class="product-body">
        <div class="product-cat-name">${categoriaNombre}</div>
        <h4 class="product-title">${prod.nombre}</h4>
        <p class="product-desc">${prod.descripcion || ''}</p>
        
        <div class="product-footer">
          <div class="product-price">${precioFormateado}</div>
          <button class="btn btn-add-cart" data-id="${prod.id}">
            + Agregar
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-add-cart').addEventListener('click', () => {
      agregarAlCarrito(prod);
    });

    grid.appendChild(card);
  });
}

// ==============================================================================
// GESTIÓN DEL CARRITO
// ==============================================================================
function agregarAlCarrito(producto) {
  const itemExistente = AppState.carrito.find(item => item.id === producto.id);

  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    AppState.carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      imagen_url: producto.imagen_url,
      cantidad: 1,
      personalizaciones: ''
    });
  }

  actualizarCarritoUI();
  abrirCarrito();
}

function actualizarCarritoUI() {
  const container = document.getElementById('cart-items-container');
  const emptyMsg = document.getElementById('cart-empty-message');
  const totalAmountEl = document.getElementById('cart-total-amount');
  const counterEl = document.getElementById('cart-counter');
  const btnSubmit = document.getElementById('btn-submit-order');

  container.innerHTML = '';

  const totalItems = AppState.carrito.reduce((sum, item) => sum + item.cantidad, 0);
  counterEl.textContent = totalItems;

  if (AppState.carrito.length === 0) {
    emptyMsg.style.display = 'block';
    totalAmountEl.textContent = '$0.00 MXN';
    btnSubmit.disabled = true;
    return;
  }

  emptyMsg.style.display = 'none';
  btnSubmit.disabled = false;

  let granTotal = 0;

  AppState.carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    granTotal += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.nombre}</div>
        <div class="cart-item-price">$${item.precio.toFixed(2)} MXN c/u</div>
        
        <div style="margin-top: 4px;">
          <input type="text" class="form-control item-custom-input" placeholder="Personalizar (ej: deslactosada)" value="${item.personalizaciones || ''}" style="padding: 4px 8px; font-size: 0.75rem;" data-id="${item.id}">
        </div>

        <div class="cart-item-qty">
          <button class="btn-qty btn-minus" data-id="${item.id}">-</button>
          <span style="font-weight: 700; font-size: 0.88rem; min-width: 20px; text-align: center;">${item.cantidad}</span>
          <button class="btn-qty btn-plus" data-id="${item.id}">+</button>
          <span style="margin-left: auto; font-weight: 800; font-size: 0.9rem; color: var(--color-primary);">$${subtotal.toFixed(2)}</span>
        </div>
      </div>
    `;

    // Listeners de cantidad
    row.querySelector('.btn-minus').onclick = () => modificarCantidad(item.id, -1);
    row.querySelector('.btn-plus').onclick = () => modificarCantidad(item.id, 1);
    row.querySelector('.item-custom-input').onchange = (e) => {
      item.personalizaciones = e.target.value.trim();
    };

    container.appendChild(row);
  });

  totalAmountEl.textContent = `$${granTotal.toFixed(2)} MXN`;
}

function modificarCantidad(productoId, delta) {
  const item = AppState.carrito.find(i => i.id === productoId);
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    AppState.carrito = AppState.carrito.filter(i => i.id !== productoId);
  }

  actualizarCarritoUI();
}

function abrirCarrito() {
  document.getElementById('cart-backdrop').classList.add('active');
  document.getElementById('cart-drawer').classList.add('active');
}

function cerrarCarrito() {
  document.getElementById('cart-backdrop').classList.remove('active');
  document.getElementById('cart-drawer').classList.remove('active');
}

// ==============================================================================
// PROCESAR ENVÍO DEL PEDIDO
// ==============================================================================
async function procesarEnvioPedido() {
  const form = document.getElementById('checkout-form');
  const nameInput = document.getElementById('input-client-name');
  const phoneInput = document.getElementById('input-client-phone');
  const pickupTimeSelect = document.getElementById('select-pickup-time');
  const paymentMethodSelect = document.getElementById('select-payment-method');
  const notesInput = document.getElementById('input-order-notes');
  const btnSubmit = document.getElementById('btn-submit-order');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    cliente_nombre: nameInput.value.trim(),
    cliente_telefono: phoneInput.value.trim(),
    hora_recoleccion: pickupTimeSelect.value,
    metodo_pago: paymentMethodSelect.value,
    notas: notesInput.value.trim(),
    items: AppState.carrito.map(item => ({
      producto_id: item.id,
      cantidad: item.cantidad,
      precio: item.precio,
      personalizaciones: item.personalizaciones
    }))
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Enviando comanda a barra... ☕';

  const res = await API.crearPedido(payload);

  btnSubmit.disabled = false;
  btnSubmit.textContent = 'Confirmar Pedido Express';

  if (res.ok && res.data) {
    cerrarCarrito();

    // Mostrar modal de confirmación
    document.getElementById('confirmed-folio').textContent = res.data.folio || 'MJ-2026';
    document.getElementById('confirmed-pickup-time').textContent = `Recolección: ${payload.hora_recoleccion}`;
    document.getElementById('confirmed-total').textContent = `Total: $${Number(res.data.total || 0).toFixed(2)} MXN`;
    document.getElementById('confirmation-modal').classList.add('active');

    // Limpiar carrito
    AppState.carrito = [];
    actualizarCarritoUI();
    form.reset();
  } else {
    alert('Error al registrar pedido: ' + (res.error || 'Revisa tu conexión'));
  }
}

// ==============================================================================
// TARJETA DE LEALTAD "CLUB MJ"
// ==============================================================================
function abrirModalLealtad() {
  document.getElementById('loyalty-modal').classList.add('active');
}

function cerrarModalLealtad() {
  document.getElementById('loyalty-modal').classList.remove('active');
}

async function consultarSellosCliente() {
  const phoneInput = document.getElementById('input-search-loyalty-phone');
  const telefono = phoneInput.value.trim();

  if (!telefono || telefono.length < 10) {
    alert('Ingresa un teléfono válido de 10 dígitos.');
    return;
  }

  const res = await API.consultarLealtad(telefono);
  const cliente = res.cliente;

  if (cliente) {
    document.getElementById('loyalty-client-name').textContent = cliente.nombre || 'Estudiante FES C4';
    
    // Renderizamos los sellos visuales (1 al 6)
    const grid = document.getElementById('stamp-grid-icons');
    grid.innerHTML = '';

    const sellosActuales = cliente.sellos || 0;

    for (let i = 1; i <= 6; i++) {
      const stamp = document.createElement('div');
      stamp.className = 'stamp-circle';

      if (i <= sellosActuales) {
        stamp.classList.add('stamped');
      }

      if (i === 6) {
        stamp.classList.add('reward-stamp');
        stamp.textContent = '🎁';
        stamp.title = '¡6to Café Gratis!';
      } else {
        stamp.textContent = '☕';
        stamp.title = `Sello ${i}`;
      }

      grid.appendChild(stamp);
    }

    const msgEl = document.getElementById('loyalty-status-msg');
    if (sellosActuales >= 6) {
      msgEl.innerHTML = '🎉 <strong>¡Tienes 1 café de cortesía disponible para canjear en barra!</strong>';
    } else {
      msgEl.textContent = `¡Llevas ${sellosActuales} de 6 sellos! Te faltan ${6 - sellosActuales} para tu café gratis.`;
    }
  } else {
    alert(res.mensaje || 'No encontramos registros con este número.');
  }
}
