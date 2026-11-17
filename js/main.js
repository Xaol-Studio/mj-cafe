/**
 * Controlador principal de la tienda y programa de lealtad
 * Proyecto: MJ Café - FES Cuautitlán Campo 4
 * Autores: Ian Miguel Delgado Huitron & Jorge Alberto Barrios Rosas
 */

import { API } from './api.js';

const AppState = {
  categorias: [],
  productos: [],
  categoriaActiva: 'all',
  busqueda: '',
  carrito: [],
  telefonoLealtadActivo: ''
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarMenu();
});

function inicializarEventos() {
  // Carrito
  document.getElementById('btn-open-cart').addEventListener('click', abrirCarrito);
  document.getElementById('btn-close-cart').addEventListener('click', cerrarCarrito);
  document.getElementById('cart-backdrop').addEventListener('click', cerrarCarrito);

  // Buscador de menú
  const searchInput = document.getElementById('input-search-menu');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.busqueda = e.target.value.trim().toLowerCase();
      filtrarYRenderizarProductos();
    });
  }

  // Modal de Rastreo de Pedido
  const btnOpenTrack = document.getElementById('btn-open-track');
  const btnCloseTrack = document.getElementById('btn-close-track');
  const trackModal = document.getElementById('track-modal');
  const inputTrackFolio = document.getElementById('input-track-folio');
  const trackDemoChips = document.getElementById('track-demo-chips');

  if (btnOpenTrack && trackModal) {
    btnOpenTrack.addEventListener('click', () => trackModal.classList.add('active'));
    btnCloseTrack.addEventListener('click', () => trackModal.classList.remove('active'));
    trackModal.addEventListener('click', (e) => {
      if (e.target.id === 'track-modal') trackModal.classList.remove('active');
    });
    document.getElementById('btn-search-folio').addEventListener('click', buscarPedidoPorFolio);
  }

  if (inputTrackFolio) {
    inputTrackFolio.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarPedidoPorFolio();
      }
    });
  }

  if (trackDemoChips && inputTrackFolio) {
    trackDemoChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.btn-demo-folio');
      if (!chip) return;
      inputTrackFolio.value = chip.dataset.folio || '';
      buscarPedidoPorFolio();
    });
  }

  // Modal de Lealtad Club MJ
  const inputLoyaltyPhone = document.getElementById('input-search-loyalty-phone');
  const loyaltyDemoChips = document.getElementById('loyalty-demo-chips');

  document.getElementById('btn-open-loyalty').addEventListener('click', abrirModalLealtad);
  document.getElementById('btn-close-loyalty').addEventListener('click', cerrarModalLealtad);
  document.getElementById('loyalty-modal').addEventListener('click', (e) => {
    if (e.target.id === 'loyalty-modal') cerrarModalLealtad();
  });
  document.getElementById('btn-search-loyalty').addEventListener('click', consultarSellosCliente);
  document.getElementById('btn-redeem-reward').addEventListener('click', canjearPremioLealtad);

  if (inputLoyaltyPhone) {
    inputLoyaltyPhone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        consultarSellosCliente();
      }
    });
  }

  if (loyaltyDemoChips && inputLoyaltyPhone) {
    loyaltyDemoChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.btn-demo-phone');
      if (!chip) return;
      inputLoyaltyPhone.value = chip.dataset.phone || '';
      consultarSellosCliente();
    });
  }

  // Modal de Confirmación
  document.getElementById('btn-close-confirmation').addEventListener('click', () => {
    document.getElementById('confirmation-modal').classList.remove('active');
  });

  // Botón para explorar menú desde carrito vacío
  const btnExplore = document.getElementById('btn-explore-menu-cart');
  if (btnExplore) {
    btnExplore.addEventListener('click', () => {
      cerrarCarrito();
      const menuEl = document.getElementById('menu');
      if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Interceptar envío del formulario de pedido
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      procesarEnvioPedido();
    });
  }

  // Envío del pedido con botón
  document.getElementById('btn-submit-order').addEventListener('click', procesarEnvioPedido);

  // Móvil: Barra de navegación inferior (Dock)
  const mobNavMenu = document.getElementById('mob-nav-menu');
  const mobNavTrack = document.getElementById('mob-nav-track');
  const mobNavLoyalty = document.getElementById('mob-nav-loyalty');
  const mobNavCart = document.getElementById('mob-nav-cart');
  const btnFloatingCart = document.getElementById('btn-floating-cart-action');

  if (mobNavMenu) {
    mobNavMenu.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (mobNavTrack && trackModal) {
    mobNavTrack.addEventListener('click', () => trackModal.classList.add('active'));
  }
  if (mobNavLoyalty) {
    mobNavLoyalty.addEventListener('click', abrirModalLealtad);
  }
  if (mobNavCart) {
    mobNavCart.addEventListener('click', abrirCarrito);
  }
  if (btnFloatingCart) {
    btnFloatingCart.addEventListener('click', abrirCarrito);
  }
}

async function cargarMenu(categoriaId = null) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--color-text-muted);">Cargando catálogo de MJ Café...</div>';

  const res = await API.obtenerProductos(categoriaId);

  if (res.origen === 'backend_sql') {
    console.info('%c[MJ Café]%c Conectado al backend SQLite/PDO', 'color: #B89758; font-weight: bold;', 'color: #FAF8F5;');
  } else {
    console.info('%c[MJ Café]%c Modo catálogo local activo', 'color: #B89758; font-weight: bold;', 'color: #FAF8F5;');
  }

  AppState.categorias = res.data.categorias || [];
  AppState.productos = res.data.productos || [];

  renderizarCategorias(AppState.categorias);
  filtrarYRenderizarProductos();
}

function renderizarCategorias(categorias) {
  const container = document.getElementById('categories-container');
  const primerBoton = container.firstElementChild;
  container.innerHTML = '';
  container.appendChild(primerBoton);

  primerBoton.onclick = () => {
    activarTab(primerBoton);
    AppState.categoriaActiva = 'all';
    document.getElementById('current-category-title').textContent = 'Todos los Productos';
    filtrarYRenderizarProductos();
  };

  categorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tab';
    btn.dataset.category = cat.id;
    btn.innerHTML = `<span>${cat.nombre}</span>`;

    btn.onclick = () => {
      activarTab(btn);
      AppState.categoriaActiva = Number(cat.id);
      document.getElementById('current-category-title').textContent = cat.nombre;
      filtrarYRenderizarProductos();
    };

    container.appendChild(btn);
  });
}

function activarTab(elemento) {
  document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
  elemento.classList.add('active');
}

function filtrarYRenderizarProductos() {
  let lista = AppState.productos;

  if (AppState.categoriaActiva !== 'all') {
    lista = lista.filter(p => {
      const catId = p.categoria ? Number(p.categoria.id) : Number(p.categoria_id);
      return catId === Number(AppState.categoriaActiva);
    });
  }

  if (AppState.busqueda) {
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(AppState.busqueda) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(AppState.busqueda))
    );
  }

  document.getElementById('products-count-label').textContent = `${lista.length} productos disponibles`;
  renderizarProductos(lista);
}

function renderizarProductos(productos) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  if (productos.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--color-text-muted);">No se encontraron productos con ese criterio.</div>';
    return;
  }

  productos.forEach(prod => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const precioFormateado = prod.precio_formateado || `$${Number(prod.precio).toFixed(2)} MXN`;
    const categoriaNombre = prod.categoria?.nombre || 'Especialidad';

    card.innerHTML = `
      <div class="product-image-container">
        <img class="product-image" src="${prod.imagen_url}" alt="${prod.nombre}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80';">
        ${prod.es_popular ? '<span class="popular-badge">Favorito</span>' : ''}
        <span class="prep-time-badge">${prod.tiempo_prep_min || 4} min</span>
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

  // Elementos móviles
  const mobBadge = document.getElementById('mob-cart-badge');
  const floatingCount = document.getElementById('floating-cart-count');
  const floatingTotal = document.getElementById('floating-cart-total');
  const floatingBar = document.getElementById('mobile-floating-cart');

  container.innerHTML = '';

  const totalItems = AppState.carrito.reduce((sum, item) => sum + item.cantidad, 0);
  counterEl.textContent = totalItems;
  if (mobBadge) mobBadge.textContent = totalItems;
  if (floatingCount) floatingCount.textContent = totalItems;

  const warningEl = document.getElementById('cart-empty-warning');

  if (AppState.carrito.length === 0) {
    emptyMsg.style.display = 'block';
    totalAmountEl.textContent = '$0.00 MXN';
    if (floatingTotal) floatingTotal.textContent = '$0.00 MXN';
    btnSubmit.disabled = false;
    btnSubmit.classList.add('btn-cart-empty');
    if (floatingBar) floatingBar.classList.remove('active');
    return;
  }

  emptyMsg.style.display = 'none';
  btnSubmit.disabled = false;
  btnSubmit.classList.remove('btn-cart-empty');
  if (warningEl) warningEl.style.display = 'none';
  if (floatingBar) floatingBar.classList.add('active');

  let granTotal = 0;

  AppState.carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    granTotal += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80';">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.nombre}</div>
        <div class="cart-item-price">$${item.precio.toFixed(2)} MXN c/u</div>
        
        <div style="margin-top: 6px;">
          <input type="text" class="form-control item-custom-input" placeholder="Personalizar (ej: deslactosada)" value="${item.personalizaciones || ''}" style="padding: 4px 8px; font-size: 0.75rem;" data-id="${item.id}">
        </div>

        <div class="cart-item-qty">
          <button type="button" class="btn-qty btn-minus" data-id="${item.id}">-</button>
          <span style="font-weight: 700; font-size: 0.88rem; min-width: 20px; text-align: center; color: var(--color-text);">${item.cantidad}</span>
          <button type="button" class="btn-qty btn-plus" data-id="${item.id}">+</button>
          <span style="margin-left: auto; font-family: var(--font-mono); font-weight: 700; font-size: 0.88rem; color: var(--color-accent);">$${subtotal.toFixed(2)}</span>
        </div>
      </div>
    `;

    row.querySelector('.btn-minus').onclick = () => modificarCantidad(item.id, -1);
    row.querySelector('.btn-plus').onclick = () => modificarCantidad(item.id, 1);
    row.querySelector('.item-custom-input').onchange = (e) => {
      item.personalizaciones = e.target.value.trim();
    };

    container.appendChild(row);
  });

  totalAmountEl.textContent = `$${granTotal.toFixed(2)} MXN`;
  if (floatingTotal) floatingTotal.textContent = `$${granTotal.toFixed(2)} MXN`;
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

async function procesarEnvioPedido() {
  const warningEl = document.getElementById('cart-empty-warning');

  // Si no hay productos en el carrito, mostrar la leyenda solicitando agregar uno
  if (!AppState.carrito || AppState.carrito.length === 0) {
    if (warningEl) {
      warningEl.style.display = 'flex';
      warningEl.classList.remove('shake');
      void warningEl.offsetWidth; // Forzar reinicio de animación
      warningEl.classList.add('shake');
      warningEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const emptyMsg = document.getElementById('cart-empty-message');
    if (emptyMsg) {
      emptyMsg.classList.remove('pulse-highlight');
      void emptyMsg.offsetWidth;
      emptyMsg.classList.add('pulse-highlight');
    }
    return;
  }

  // Ocultar advertencia si ya hay productos
  if (warningEl) warningEl.style.display = 'none';

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
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      personalizaciones: item.personalizaciones
    }))
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Enviando comanda a barra...';

  const res = await API.crearPedido(payload);

  btnSubmit.disabled = false;
  btnSubmit.textContent = 'Confirmar Pedido Express';

  if (res.ok && res.data) {
    cerrarCarrito();

    const folio = res.data.folio || 'MJ-2026';
    const total = Number(res.data.total || 0).toFixed(2);
    const sellos = res.data.sellos_acumulados || 1;

    document.getElementById('confirmed-folio').textContent = folio;
    document.getElementById('confirmed-pickup-time').textContent = `Recolección: ${payload.hora_recoleccion}`;
    document.getElementById('confirmed-total').textContent = `Total: $${total} MXN`;
    const elStamps = document.getElementById('confirmed-stamps');
    if (elStamps) {
      elStamps.textContent = `Club MJ: ${sellos} de 6 sellos acumulados`;
    }

    // Armar mensaje de WhatsApp
    const resumenItems = payload.items.map(i => `• ${i.cantidad}x ${i.nombre}${i.personalizaciones ? ` (${i.personalizaciones})` : ''}`).join('\n');
    const textoWa = `Hola MJ Café, confirmo mi pedido express:\n\nFolio: ${folio}\nCliente: ${payload.cliente_nombre}\nRecolección: ${payload.hora_recoleccion}\n\nPedido:\n${resumenItems}\n\nTotal: $${total} MXN`;
    document.getElementById('btn-whatsapp-order').href = `https://wa.me/525512345678?text=${encodeURIComponent(textoWa)}`;

    document.getElementById('confirmation-modal').classList.add('active');
    agregarFolioDemo(folio);

    AppState.carrito = [];
    actualizarCarritoUI();
    form.reset();
  } else {
    alert('Error al registrar pedido: ' + (res.error || 'Intenta nuevamente'));
  }
}

function agregarFolioDemo(folio) {
  const chipsContainer = document.getElementById('track-demo-chips');
  if (!chipsContainer || !folio) return;
  const existe = Array.from(chipsContainer.querySelectorAll('.btn-demo-folio')).some(
    btn => (btn.dataset.folio || '').toUpperCase() === folio.toUpperCase()
  );
  if (existe) return;

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'btn-demo-chip btn-demo-folio';
  chip.dataset.folio = folio;
  chip.textContent = folio;
  chipsContainer.appendChild(chip);
}

async function buscarPedidoPorFolio() {
  const input = document.getElementById('input-track-folio');
  const box = document.getElementById('track-result-box');
  const folio = input.value.trim();

  if (!folio) {
    alert('Ingresa un folio (por ejemplo: MJ-2026-101).');
    return;
  }

  const res = await API.consultarPedidoPorFolio(folio);
  if (!res.ok || !res.pedido) {
    box.style.display = 'block';
    box.innerHTML = `<div style="color: var(--color-danger-text); font-size: 0.88rem; font-weight: 600;">No se encontró ningún pedido con el folio "${folio}".</div>`;
    return;
  }

  const p = res.pedido;
  const etiquetasEstado = {
    pendiente: 'En cola',
    preparando: 'En preparación',
    listo_para_recoger: 'Listo para recoger',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
  };

  const detalles = p.detalles || p.items || [];
  const itemsHtml = detalles.map(d => `<li>${d.cantidad}x ${d.producto_nombre}${d.personalizaciones ? ` <em>(${d.personalizaciones})</em>` : ''}</li>`).join('');

  box.style.display = 'block';
  box.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <strong style="font-size: 1.05rem; font-family: var(--font-mono); color: var(--color-accent);">${p.folio}</strong>
      <span class="badge-fes">${etiquetasEstado[p.estado] || p.estado}</span>
    </div>
    <div style="font-size: 0.88rem; font-weight: 600; margin-bottom: 4px; color: var(--color-text);">Cliente: ${p.cliente_nombre}</div>
    <div style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 10px;">Recolección: ${p.hora_recoleccion_estimada}</div>
    <ul style="font-size: 0.85rem; padding-left: 18px; margin-bottom: 10px; color: var(--color-text-body);">${itemsHtml}</ul>
    <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem; border-top: 1px solid var(--color-border); padding-top: 8px; color: var(--color-accent);">
      Total: $${Number(p.total).toFixed(2)} MXN
    </div>
  `;
}

function abrirModalLealtad() {
  document.getElementById('loyalty-modal').classList.add('active');
}

function cerrarModalLealtad() {
  document.getElementById('loyalty-modal').classList.remove('active');
}

function renderizarTarjetaSellos(cliente) {
  document.getElementById('loyalty-client-name').textContent = `${cliente.nombre} (${cliente.telefono || AppState.telefonoLealtadActivo})`;

  const grid = document.getElementById('stamp-grid-icons');
  grid.innerHTML = '';

  const sellosActuales = Number(cliente.sellos || 0);

  for (let i = 1; i <= 6; i++) {
    const stamp = document.createElement('div');
    stamp.className = 'stamp-circle';

    if (i <= sellosActuales) {
      stamp.classList.add('stamped');
    }

    if (i === 6) {
      stamp.classList.add('reward-stamp');
      stamp.textContent = '6★';
      stamp.title = '6to Café de Cortesía';
    } else {
      stamp.textContent = i;
      stamp.title = `Sello ${i}`;
    }

    grid.appendChild(stamp);
  }

  const msgEl = document.getElementById('loyalty-status-msg');
  const redeemContainer = document.getElementById('loyalty-redeem-container');

  if (sellosActuales >= 6) {
    msgEl.innerHTML = `<strong>Tienes ${sellosActuales} sellos acumulados. Ya puedes canjear tu bebida en barra.</strong>`;
    redeemContainer.style.display = 'block';
  } else {
    msgEl.textContent = `${sellosActuales} de 6 sellos acumulados. Te faltan ${6 - sellosActuales} para tu bebida de cortesía.`;
    redeemContainer.style.display = 'none';
  }
}

async function consultarSellosCliente() {
  const phoneInput = document.getElementById('input-search-loyalty-phone');
  const telefono = phoneInput.value.replace(/\D/g, '');

  if (telefono.length < 10) {
    alert('Ingresa un número de teléfono válido de 10 dígitos.');
    return;
  }

  AppState.telefonoLealtadActivo = telefono;
  const res = await API.consultarLealtad(telefono);

  if (res.ok && res.cliente) {
    renderizarTarjetaSellos(res.cliente);
  } else {
    alert(res.mensaje || 'Aún no hay sellos registrados con este número. Se activará en tu primer pedido.');
  }
}

async function canjearPremioLealtad() {
  if (!AppState.telefonoLealtadActivo) return;

  const res = await API.canjearRecompensa(AppState.telefonoLealtadActivo);
  if (res.ok) {
    alert(res.mensaje || 'Bebida de cortesía canjeada con éxito.');
    await consultarSellosCliente();
  } else {
    alert(res.error || 'No se pudo canjear la recompensa.');
  }
}
