-- ==============================================================================
-- PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
-- ARCHIVO: database/schema.sql (MySQL / MariaDB)
-- AUTOR: XAOL Studio (Arquitectura) | Desarrollador Backend: iamhuitron & GorchRosas
-- ==============================================================================
--
-- GUÍA DIDÁCTICA DE DISEÑO RELACIONAL (3FN - Tercera Forma Normal):
-- 1. Claves Primarias (PRIMARY KEY): Identificador único inmutable por fila.
-- 2. Claves Foráneas (FOREIGN KEY): Garantizan integridad referencial (no puedes
--    crear un pedido con un producto que no existe).
-- 3. Tipos Monetarios: Usamos DECIMAL(10,2) para evitar errores de redondeo
--    propios de FLOAT/DOUBLE en transacciones financieras.
-- 4. Índices (INDEX): Aceleran búsquedas frecuentes (categorías, estado del pedido).
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS mj_cafe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mj_cafe_db;

-- -----------------------------------------------------------------------------
-- 1. TABLA: categorias
-- Organiza el menú (Bebidas Calientes, Frappés, Alimentos, Panadería de la Casa)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL COMMENT 'Nombre visible ej: Bebidas Calientes',
    slug VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador URL ej: bebidas-calientes',
    icono VARCHAR(30) NOT NULL DEFAULT 'coffee' COMMENT 'Nombre del icono o emoji',
    orden INT NOT NULL DEFAULT 0 COMMENT 'Orden de visualización en la app',
    activo TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = visible, 0 = oculta temporalmente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. TABLA: productos
-- Catálogo de productos ofrecidos en MJ Café frente a Campo 4.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL COMMENT 'Precio en MXN',
    tiempo_prep_min INT NOT NULL DEFAULT 5 COMMENT 'Tiempo estimado de preparación en minutos',
    disponible TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = en existencia, 0 = agotado',
    imagen_url VARCHAR(255) DEFAULT NULL,
    es_popular TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = destacar en el carrusel de populares',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clave Foránea: si se intenta borrar una categoría con productos, MySQL lo impedirá (RESTRICT)
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) 
        REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_productos_categoria (categoria_id),
    INDEX idx_productos_disponible (disponible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. TABLA: clientes_lealtad
-- Programa "MJ Club": 6 sellos = 1 café americano o latte de cortesía.
-- Registrado con número de WhatsApp del estudiante/docente de FES C4.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_lealtad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefono VARCHAR(20) NOT NULL UNIQUE COMMENT 'Número a 10 dígitos (identificador del alumno)',
    nombre VARCHAR(100) NOT NULL,
    carrera VARCHAR(100) DEFAULT 'FES Cuautitlán Campo 4' COMMENT 'Ingeniería, Informática, Química, etc.',
    sellos_acumulados INT NOT NULL DEFAULT 0 COMMENT 'Ciclo de 0 a 6 sellos',
    recompensas_canjeadas INT NOT NULL DEFAULT 0,
    total_visitas INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_clientes_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 4. TABLA: pedidos
-- Encabezado del pedido (Cabecera en relación Maestro-Detalle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) NOT NULL UNIQUE COMMENT 'Código único amigable ej: MJ-2026-001',
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    cliente_lealtad_id INT NULL,
    hora_recoleccion_estimada VARCHAR(50) NOT NULL COMMENT 'Ej: "En 10 min (cambio de clase)" o "12:30 PM"',
    estado ENUM('pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo_en_barra' COMMENT 'efectivo_en_barra, transferencia_spei',
    notas TEXT COMMENT 'Instrucciones especiales para el barista',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pedidos_cliente_lealtad FOREIGN KEY (cliente_lealtad_id)
        REFERENCES clientes_lealtad(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_pedidos_estado (estado),
    INDEX idx_pedidos_created_at (created_at),
    INDEX idx_pedidos_folio (folio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 5. TABLA: pedido_detalles
-- Desglose de cada producto incluido en un pedido (Líneas de detalle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL COMMENT 'Snapshot del precio al momento de ordenar',
    subtotal DECIMAL(10,2) NOT NULL COMMENT 'cantidad * precio_unitario',
    personalizaciones VARCHAR(255) DEFAULT NULL COMMENT 'Ej: "Deslactosada light", "Doble shot espresso"',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Si se borra el pedido padre, se borran automáticamente sus detalles (CASCADE)
    CONSTRAINT fk_detalles_pedido FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalles_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id) ON DELETE RESTRICT,
    INDEX idx_detalles_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
