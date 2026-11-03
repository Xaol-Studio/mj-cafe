<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/api/productos.php
 * ==============================================================================
 * EJEMPLO DE REFERENCIA RESUELTO (GOLDEN PATTERN PARA EL EQUIPO)
 * 
 * Este archivo está 100% implementado para que sirva como plantilla de estudio:
 * - Demuestra cómo recibir peticiones HTTP GET.
 * - Muestra cómo usar sentencias preparadas con PDO (`prepare` y `execute`).
 * - Realiza un `INNER JOIN` entre la tabla `productos` y `categorias`.
 * - Devuelve una respuesta JSON tipada y formateada para el Frontend.
 * ==============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

// Si el navegador hace una petición pre-flight OPTIONS de CORS:
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

// Únicamente permitimos el método GET en este endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'ok' => false,
        'error' => 'Método no permitido. Este endpoint solo acepta solicitudes GET.'
    ]);
}

try {
    $pdo = Database::getConnection();

    // Filtros opcionales enviados por la URL (query strings)
    // Ejemplos:
    //   /backend/api/productos.php
    //   /backend/api/productos.php?categoria=1
    //   /backend/api/productos.php?populares=1
    $categoriaId = isset($_GET['categoria']) ? (int)$_GET['categoria'] : null;
    $soloPopulares = isset($_GET['populares']) && $_GET['populares'] === '1';

    // 1. Construcción dinámica de la consulta SQL con JOIN
    // Explicación didáctica: Usamos alias (p para productos, c para categorias)
    // para evitar colisiones de nombres de columna como id o nombre.
    $sql = "
        SELECT 
            p.id,
            p.nombre,
            p.descripcion,
            p.precio,
            p.tiempo_prep_min,
            p.disponible,
            p.imagen_url,
            p.es_popular,
            c.id AS categoria_id,
            c.nombre AS categoria_nombre,
            c.slug AS categoria_slug,
            c.icono AS categoria_icono
        FROM productos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        WHERE p.disponible = 1
    ";

    $params = [];

    // Filtro por categoría específica
    if ($categoriaId !== null && $categoriaId > 0) {
        $sql .= " AND p.categoria_id = :categoria_id";
        $params[':categoria_id'] = $categoriaId;
    }

    // Filtro por productos populares
    if ($soloPopulares) {
        $sql .= " AND p.es_popular = 1";
    }

    // Ordenamos por categoría y luego por popularidad
    $sql .= " ORDER BY c.orden ASC, p.es_popular DESC, p.id ASC";

    // 2. Preparación y ejecución de la consulta segura
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $productosRaw = $stmt->fetchAll();

    // 3. Formateo y tipado de los datos antes de enviarlos al Frontend
    $productos = array_map(function (array $item): array {
        return [
            'id' => (int)$item['id'],
            'nombre' => $item['nombre'],
            'descripcion' => $item['descripcion'],
            'precio' => (float)$item['precio'],
            'precio_formateado' => '$' . number_format((float)$item['precio'], 2) . ' MXN',
            'tiempo_prep_min' => (int)$item['tiempo_prep_min'],
            'disponible' => (bool)$item['disponible'],
            'imagen_url' => $item['imagen_url'],
            'es_popular' => (bool)$item['es_popular'],
            'categoria' => [
                'id' => (int)$item['categoria_id'],
                'nombre' => $item['categoria_nombre'],
                'slug' => $item['categoria_slug'],
                'icono' => $item['categoria_icono'],
            ],
        ];
    }, $productosRaw);

    // 4. También consultamos las categorías activas para que el frontend arme los botones/tabs
    $stmtCat = $pdo->query("SELECT id, nombre, slug, icono FROM categorias WHERE activo = 1 ORDER BY orden ASC");
    $categorias = $stmtCat->fetchAll();

    sendJsonResponse(200, [
        'ok' => true,
        'total' => count($productos),
        'categorias' => $categorias,
        'productos' => $productos,
    ]);

} catch (PDOException $e) {
    sendJsonResponse(500, [
        'ok' => false,
        'error' => 'Error al consultar el catálogo de productos: ' . $e->getMessage()
    ]);
}
