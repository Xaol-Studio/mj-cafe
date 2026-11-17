-- ============================================================================
-- ESQUEMA Y SEMILLAS DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Proyecto: MJ Café - FES Cuautitlán Campo 4
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (supabase.com)
-- ============================================================================

-- 1. TABLA: CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icono TEXT,
    orden INT DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES public.categorias(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    tiempo_prep_min INT DEFAULT 4,
    disponible BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    es_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: CLIENTES LEALTAD (CLUB MJ)
CREATE TABLE IF NOT EXISTS public.clientes_lealtad (
    id SERIAL PRIMARY KEY,
    telefono TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    carrera TEXT DEFAULT 'FES Cuautitlán Campo 4',
    sellos_acumulados INT DEFAULT 0,
    recompensas_canjeadas INT DEFAULT 0,
    total_visitas INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_visit_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id SERIAL PRIMARY KEY,
    folio TEXT NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_lealtad_id INT REFERENCES public.clientes_lealtad(id) ON DELETE SET NULL,
    hora_recoleccion_estimada TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente', -- pendiente, preparando, listo_para_recoger, entregado, cancelado
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago TEXT DEFAULT 'efectivo_en_barra',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: DETALLES DE PEDIDO
CREATE TABLE IF NOT EXISTS public.pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES public.productos(id) ON DELETE SET NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    personalizaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS DE ACCESO PÚBLICO (RLS) PARA VERCEL
-- Permite que los clientes puedan consultar catálogo y registrar pedidos anónimos
-- ----------------------------------------------------------------------------
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_lealtad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública
CREATE POLICY "Permitir lectura publica de categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de detalles" ON public.pedido_detalles FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de lealtad" ON public.clientes_lealtad FOR SELECT USING (true);

-- Políticas para inserción y actualización pública (Pedidos y Lealtad)
CREATE POLICY "Permitir insercion de pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de pedidos" ON public.pedidos FOR UPDATE USING (true);

CREATE POLICY "Permitir insercion de detalles" ON public.pedido_detalles FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir insercion de lealtad" ON public.clientes_lealtad FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de lealtad" ON public.clientes_lealtad FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- INSERCIÓN DE DATOS SEMILLA (CATÁLOGO INICIAL MJ CAFÉ)
-- ----------------------------------------------------------------------------
INSERT INTO public.categorias (id, nombre, slug, icono, orden) VALUES
(1, 'Café de Especialidad', 'cafe-especialidad', '☕', 1),
(2, 'Frappés & Frías', 'frappes-frias', '🥤', 2),
(3, 'Alimentos & Bagels', 'alimentos-bagels', '🥪', 3),
(4, 'Panadería & Postres', 'panaderia-postres', '🥐', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.productos (id, categoria_id, nombre, descripcion, precio, tiempo_prep_min, disponible, imagen_url, es_popular) VALUES
(1, 1, 'Americano de Especialidad (12 oz)', 'Granos selectos con notas a chocolate y avellana, tostado medio artesanal.', 38.00, 3, true, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', true),
(2, 1, 'Caramel Macchiato Latte (16 oz)', 'Espresso doble, leche vaporizada aterciopelada y jarabe de caramelo casero.', 58.00, 4, true, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80', true),
(3, 1, 'Cappuccino Italiano Clásico (12 oz)', 'Equilibrio perfecto 1:1:1 de espresso, leche cremada y abundante microespuma.', 48.00, 4, true, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80', false),
(4, 1, 'Dirty Chai Latte (16 oz)', 'Té chai especiado con cardamomo y canela, coronado con un shot de espresso.', 62.00, 5, true, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', true),
(5, 2, 'Frappé Matcha Imperial (16 oz)', 'Matcha de grado ceremonial japonés batido con crema y leche entera o vegetal.', 65.00, 5, true, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80', true),
(6, 2, 'Frappé Moka Brownie (16 oz)', 'Base de espresso doble, salsa de chocolate amargo, crema batida y trozos de brownie.', 65.00, 5, true, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80', true),
(7, 2, 'Frappé Taro Suave (16 oz)', 'Cremoso extracto de raíz de taro con leche y toque avainillado.', 60.00, 5, true, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', false),
(8, 2, 'Cold Brew Clásico con Naranja (16 oz)', 'Maceración en frío de 18 horas, refrescante con rodaja de naranja deshidratada.', 52.00, 2, true, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80', false),
(9, 3, 'Bagel de Pavo y Manchego', 'Bagel de ajonjolí tostado, pechuga de pavo ahumada, queso manchego gratinado y aderezo chipotle.', 68.00, 7, true, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', true),
(10, 3, 'Molletes Rústicos con Tocino', 'Bolillo artesanal con frijoles refritos de la casa, queso gouda gratinado y tocino crujiente.', 55.00, 8, true, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80', true),
(11, 3, 'Ciabatta de Pollo al Pesto', 'Pan ciabatta a la plancha con pechuga asada, pesto genovés de albahaca fresca y jitomate deshidratado.', 75.00, 8, true, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80', false),
(12, 4, 'Croissant Artesanal de Almendras', 'Hojaldre crujiente relleno de crema frangipane y cubierto de almendras fileteadas tostadas.', 42.00, 2, true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80', true),
(13, 4, 'Brownie de Chocolate Fudge', 'Bizcocho húmedo de cacao al 70% con nuez pecana troceada.', 38.00, 1, true, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', false),
(14, 4, 'Muffin de Moras Silvestres', 'Muffin esponjoso relleno de moras azules frescas con toque de ralladura de limón.', 35.00, 1, true, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80', false)
ON CONFLICT (id) DO NOTHING;

-- Clientes semilla
INSERT INTO public.clientes_lealtad (id, telefono, nombre, carrera, sellos_acumulados, recompensas_canjeadas, total_visitas) VALUES
(1, '5512345678', 'Miguel Delgado', 'Informática - FES C4', 5, 2, 17),
(2, '5587654321', 'Jorge Barrios', 'Informática - FES C4', 3, 0, 3),
(3, '5599887766', 'Fernanda Morales', 'Química Industrial - FES C4', 6, 1, 12)
ON CONFLICT (id) DO NOTHING;

-- Pedidos iniciales de demostración
INSERT INTO public.pedidos (id, folio, cliente_nombre, cliente_telefono, cliente_lealtad_id, hora_recoleccion_estimada, estado, total, metodo_pago, notas) VALUES
(1, 'MJ-2026-101', 'Miguel Delgado', '5512345678', 1, 'En 10 min (cambio de clase)', 'listo_para_recoger', 106.00, 'efectivo_en_barra', 'Leche de avena para el macchiato por favor.'),
(2, 'MJ-2026-102', 'Jorge Barrios', '5587654321', 2, 'En 20 minutos', 'preparando', 65.00, 'transferencia_spei', 'Poco dulce el matcha.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pedido_detalles (id, pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones) VALUES
(1, 1, 2, 1, 58.00, 58.00, 'Leche de avena'),
(2, 1, 9, 1, 48.00, 48.00, 'Bien doradito el bagel'),
(3, 2, 5, 1, 65.00, 65.00, 'Mitad de azúcar')
ON CONFLICT (id) DO NOTHING;

SELECT setval('categorias_id_seq', (SELECT MAX(id) FROM categorias));
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
SELECT setval('clientes_lealtad_id_seq', (SELECT MAX(id) FROM clientes_lealtad));
SELECT setval('pedidos_id_seq', (SELECT MAX(id) FROM pedidos));
SELECT setval('pedido_detalles_id_seq', (SELECT MAX(id) FROM pedido_detalles));
