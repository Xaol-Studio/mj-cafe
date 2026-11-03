# 🎓 Masterclass & Roadmap de Backend y Bases de Datos
**Proyecto:** SaaS MJ CAFÉ (FES Cuautitlán Campo 4)  
**Equipo Backend:** Ian Miguel Delgado Huitron (`@iamhuitron`) & Jorge Barrios (`@GorchRosas`)  
**Firma:** XAOL Studio  

---

## 📌 1. ¿Por qué este proyecto es tu mejor trampolín?

Dominar el backend y las bases de datos relacionales no se logra memorizando sintaxis, sino entendiendo **cómo viajan los datos desde el navegador del cliente hasta el disco duro**, asegurando que **el dinero y los pedidos nunca se pierdan**.

En este proyecto aprenderás los 4 pilares de un Ingeniero de Software Backend:
1. **Modelado Relacional (3FN):** Diseñar tablas que no dupliquen datos y garanticen integridad referencial.
2. **Consultas SQL Profesionales:** Dominar `SELECT`, `INNER JOIN`, `GROUP BY`, y funciones de agregación (`SUM`, `COUNT`).
3. **Seguridad contra Inyección SQL:** Usar **PDO (PHP Data Objects)** con consultas preparadas (`prepare()` y `execute()`).
4. **Transacciones ACID:** Garantizar que si un pedido falla a la mitad, no queden datos corruptos (`beginTransaction`, `commit`, `rollBack`).

---

## 🗄️ 2. Arquitectura de la Base de Datos (`database/`)

El sistema cuenta con 5 tablas enlazadas estratégicamente:

```
[categorias] 1 ───────────< N [productos] 1 ───────────< N [pedido_detalles]
                                                                   │
                                                                   │ N
                                                                   │
[clientes_lealtad] 1 ─────< N [pedidos] 1 ─────────────────────────┘
```

### Explicación de cada tabla:
1. **`categorias`**: Agrupa los ítems (Café Caliente, Frappés, Bagels, Panadería). Permite que el dueño active o desactive secciones enteras.
2. **`productos`**: Catálogo con precio unitario, tiempo estimado de preparación (vital para los alumnos de FES C4 con descansos de 10 minutos) y bandera de disponibilidad.
3. **`clientes_lealtad`**: Almacena el número de WhatsApp de los alumnos y su contador de 0 a 6 sellos.
4. **`pedidos` (Cabecera / Maestro)**: Almacena el folio (`MJ-2026-A1B2`), quién ordenó, hora de recolección y total general.
5. **`pedido_detalles` (Líneas de Detalle)**: Guarda cada producto ordenado, su precio congelado en ese instante y personalizaciones (ej: *"leche de avena", "sin cebolla"*).

---

## 💻 3. Guía de SQL Práctico para MJ Café

### A) ¿Cómo consultar el menú con el nombre de su categoría? (`INNER JOIN`)
```sql
SELECT 
    p.nombre AS producto,
    p.precio,
    p.tiempo_prep_min,
    c.nombre AS categoria
FROM productos p
INNER JOIN categorias c ON p.categoria_id = c.id
WHERE p.disponible = 1
ORDER BY c.orden ASC, p.precio DESC;
```
> **¿Por qué `INNER JOIN`?** Conecta la clave foránea `p.categoria_id` con la clave primaria `c.id`. Si usaras dos tablas sin JOIN, tendrías que hacer dos consultas lentas.

### B) ¿Cuáles son los 3 productos más vendidos? (`GROUP BY` + `SUM`)
```sql
SELECT 
    p.nombre AS producto,
    SUM(d.cantidad) AS total_unidades_vendidas,
    SUM(d.subtotal) AS ingresos_totales_generados
FROM pedido_detalles d
INNER JOIN productos p ON d.producto_id = p.id
GROUP BY p.id, p.nombre
ORDER BY total_unidades_vendidas DESC
LIMIT 3;
```
> **Para qué sirve:** Con este query, puedes mostrarle al dueño de MJ Café en una gráfica qué bebida le genera más ganancias frente a la facultad.

---

## 🛡️ 4. PDO en PHP: Seguridad y Estándares

### ❌ El error de novato (Inyección SQL):
```php
// NUNCA HAGAS ESTO EN PRODUCCIÓN:
$telefono = $_GET['telefono'];
$query = "SELECT * FROM clientes_lealtad WHERE telefono = '$telefono'"; // VULNERABLE A ' OR '1'='1
```

### ✅ El estándar profesional (Sentencias Preparadas con PDO):
```php
$stmt = $pdo->prepare("SELECT * FROM clientes_lealtad WHERE telefono = :telefono LIMIT 1");
$stmt->execute([':telefono' => $telefono]);
$cliente = $stmt->fetch();
```
*El motor de base de datos compila la consulta antes de insertar el parámetro, neutralizando cualquier intento de inyección.*

---

## ⚡ 5. Transacciones ACID: La Joya de la Corona

Cuando un alumno en FES C4 presiona **"Confirmar Pedido Express"**, deben ocurrir 3 cosas:
1. Crear el registro en `pedidos`.
2. Crear $N$ registros en `pedido_detalles`.
3. Sumar un sello en `clientes_lealtad`.

Si la luz parpadea o la base de datos se satura en el paso 2, **NO PODEMOS** dejar el pedido a medias sin sus productos.

```php
try {
    // 1. Empezamos la transacción
    $pdo->beginTransaction();

    // 2. Insertamos la cabecera del pedido
    $stmt = $pdo->prepare("INSERT INTO pedidos (...) VALUES (...)");
    $stmt->execute([...]);
    $pedidoId = $pdo->lastInsertId();

    // 3. Insertamos cada detalle
    $stmtDetalle = $pdo->prepare("INSERT INTO pedido_detalles (...) VALUES (...)");
    foreach ($items as $item) {
        $stmtDetalle->execute([...]);
    }

    // 4. Si todo salió perfecto, confirmamos definitivamente
    $pdo->commit();

} catch (Throwable $e) {
    // 5. Si algo falló, revertimos TODO como si nada hubiera pasado
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}
```

---

## 🎯 6. Tus 4 Retos de Aprendizaje (Checklist para Miguel)

Revisa el código en `backend/api/` y completa estos retos progresivos:

- [ ] **Reto 1: Entender el Golden Example (`backend/api/productos.php`)**
  - Abre el archivo y fíjate cómo se capturan los parámetros `$_GET['categoria']`.
  - Prueba en tu navegador: `http://localhost:8000/backend/api/productos.php?categoria=1`.

- [ ] **Reto 2: Inspeccionar y personalizar `backend/api/pedidos.php`**
  - Revisa cómo funciona el cálculo de precios del lado del servidor.
  - Agrega una validación extra: si la nota del cliente excede 200 caracteres, recórtala con `mb_substr`.

- [ ] **Reto 3: Crear un endpoint de métricas para el dueño (`backend/api/metricas.php`)**
  - Crea un nuevo archivo que ejecute el query de los productos más vendidos y calcule el ticket promedio del día:
    `SELECT AVG(total) as ticket_promedio, SUM(total) as venta_diaria FROM pedidos WHERE DATE(created_at) = CURRENT_DATE`.

- [ ] **Reto 4: Conectar MySQL de XAMPP (Opcional)**
  - En `backend/config/database.php`, cambia `private const DB_DRIVER = 'sqlite';` por `'mysql';`.
  - Importa `database/schema.sql` y `database/seeds.sql` en phpMyAdmin.
  - ¡Tu backend ahora corre sobre un servidor MySQL completo!
