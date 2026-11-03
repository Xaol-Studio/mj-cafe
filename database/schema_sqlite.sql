-- ==============================================================================
-- PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
-- ARCHIVO: database/schema_sqlite.sql (SQLite 3)
-- Compatible con pruebas locales sin servidor MySQL (php -S localhost:8000)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. TABLA: categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icono TEXT NOT NULL DEFAULT 'coffee',
    orden INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio REAL NOT NULL,
    tiempo_prep_min INTEGER NOT NULL DEFAULT 5,
    disponible INTEGER NOT NULL DEFAULT 1,
    imagen_url TEXT,
    es_popular INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_disponible ON productos(disponible);

-- 3. TABLA: clientes_lealtad
CREATE TABLE IF NOT EXISTS clientes_lealtad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    carrera TEXT DEFAULT 'FES Cuautitlán Campo 4',
    sellos_acumulados INTEGER NOT NULL DEFAULT 0,
    recompensas_canjeadas INTEGER NOT NULL DEFAULT 0,
    total_visitas INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes_lealtad(telefono);

-- 4. TABLA: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_lealtad_id INTEGER NULL,
    hora_recoleccion_estimada TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado')),
    total REAL NOT NULL DEFAULT 0.00,
    metodo_pago TEXT NOT NULL DEFAULT 'efectivo_en_barra',
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_lealtad_id) REFERENCES clientes_lealtad(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_folio ON pedidos(folio);

-- 5. TABLA: pedido_detalles
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    personalizaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_detalles_pedido ON pedido_detalles(pedido_id);
