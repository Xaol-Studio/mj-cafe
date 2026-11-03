-- ==============================================================================
-- PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
-- ARCHIVO: database/seeds.sql (Datos iniciales del menú real de MJ Café)
-- Compatible con SQLite y MySQL
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- Categorías del menú
-- -----------------------------------------------------------------------------
INSERT INTO categorias (id, nombre, slug, icono, orden, activo) VALUES
(1, 'Café de Especialidad', 'cafe-especialidad', '☕', 1, 1),
(2, 'Frappés & Frías', 'frappes-frias', '🥤', 2, 1),
(3, 'Alimentos & Bagels', 'alimentos-bagels', '🥪', 3, 1),
(4, 'Panadería & Postres', 'panaderia-postres', '🥐', 4, 1);

-- -----------------------------------------------------------------------------
-- Productos del menú de MJ Café
-- -----------------------------------------------------------------------------
INSERT INTO productos (id, categoria_id, nombre, descripcion, precio, tiempo_prep_min, disponible, imagen_url, es_popular) VALUES
-- Bebidas Calientes
(1, 1, 'Americano de Especialidad (12 oz)', 'Granos selectos con notas a chocolate y avellana, tostado medio artesanal.', 38.00, 3, 1, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1),
(2, 1, 'Caramel Macchiato Latte (16 oz)', 'Espresso doble, leche vaporizada aterciopelada y jarabe de caramelo casero.', 58.00, 4, 1, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80', 1),
(3, 1, 'Cappuccino Italiano Clásico (12 oz)', 'Equilibrio perfecto 1:1:1 de espresso, leche cremada y abundante microespuma.', 48.00, 4, 1, 'https://images.unsplash.com/photo-1572442388796-11668ba67e53?w=600&auto=format&fit=crop&q=80', 0),
(4, 1, 'Dirty Chai Latte (16 oz)', 'Té chai especiado con cardamomo y canela, coronado con un shot de espresso.', 62.00, 5, 1, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', 1),

-- Frappés & Bebidas Frías
(5, 2, 'Frappé Matcha Imperial (16 oz)', 'Matcha de grado ceremonial japonés batido con crema y leche entera o vegetal.', 65.00, 5, 1, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80', 1),
(6, 2, 'Frappé Moka Brownie (16 oz)', 'Base de espresso doble, salsa de chocolate amargo, crema batida y trozos de brownie.', 65.00, 5, 1, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80', 1),
(7, 2, 'Frappé Taro Suave (16 oz)', 'Cremoso extracto de raíz de taro con leche y toque avainillado.', 60.00, 5, 1, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', 0),
(8, 2, 'Cold Brew Clásico con Naranja (16 oz)', 'Maceración en frío de 18 horas, refrescante con rodaja de naranja deshidratada.', 52.00, 2, 1, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80', 0),

-- Alimentos & Bagels (Para recolección rápida entre clases)
(9, 3, 'Bagel de Pavo y Manchego', 'Bagel de ajonjolí tostado, pechuga de pavo ahumada, queso manchego gratinado y aderezo chipotle.', 68.00, 7, 1, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', 1),
(10, 3, 'Molletes Rústicos con Tocino', 'Bolillo artesanal con frijoles refritos de la casa, queso gouda gratinado y tocino crujiente.', 55.00, 8, 1, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80', 1),
(11, 3, 'Ciabatta de Pollo al Pesto', 'Pan ciabatta a la plancha con pechuga asada, pesto genovés de albahaca fresca y jitomate deshidratado.', 75.00, 8, 1, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80', 0),

-- Panadería & Postres
(12, 4, 'Croissant Artesanal de Almendras', 'Hojaldre crujiente relleno de crema frangipane y cubierto de almendras fileteadas tostadas.', 42.00, 2, 1, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80', 1),
(13, 4, 'Brownie de Chocolate Fudge', 'Bizcocho húmedo de cacao al 70% con nuez pecana troceada.', 38.00, 1, 1, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', 0),
(14, 4, 'Muffin de Moras Silvestres', 'Muffin esponjoso relleno de moras azules frescas con toque de ralladura de limón.', 35.00, 1, 1, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80', 0);

-- -----------------------------------------------------------------------------
-- Clientes de muestra para pruebas del Programa de Lealtad (FES C4)
-- -----------------------------------------------------------------------------
INSERT INTO clientes_lealtad (id, telefono, nombre, carrera, sellos_acumulados, recompensas_canjeadas, total_visitas) VALUES
(1, '5512345678', 'Miguel Delgado', 'Ingeniería en Computación', 5, 2, 17),
(2, '5587654321', 'Jorge Barrios', 'Ingeniería en Telecomunicaciones', 3, 0, 3),
(3, '5599887766', 'Fernanda Morales', 'Química Industrial', 6, 1, 12);

-- -----------------------------------------------------------------------------
-- Pedidos de muestra para pantalla de cocina y visualización inicial
-- -----------------------------------------------------------------------------
INSERT INTO pedidos (id, folio, cliente_nombre, cliente_telefono, cliente_lealtad_id, hora_recoleccion_estimada, estado, total, metodo_pago, notas) VALUES
(1, 'MJ-2026-101', 'Miguel Delgado', '5512345678', 1, 'En 10 min (cambio de clase)', 'listo_para_recoger', 106.00, 'efectivo_en_barra', 'Leche de avena para el macchiato por favor.'),
(2, 'MJ-2026-102', 'Valeria Sánchez', '5544332211', NULL, 'En 20 minutos', 'preparando', 65.00, 'transferencia_spei', 'Poco dulce el matcha.');

INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones) VALUES
(1, 2, 1, 58.00, 58.00, 'Leche de avena'),
(1, 9, 1, 48.00, 48.00, 'Bien doradito el bagel'),
(2, 5, 1, 65.00, 65.00, 'Mitad de azúcar');
