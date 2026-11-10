<?php
/**
 * Endpoint de catálogo de productos y categorías
 * Ruta: GET /backend/api/productos.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'ok' => false,
        'error' => 'Método no permitido. Usa GET.'
    ]);
}

try {
    $pdo = Database::getConnection();

    $categoriaId = isset($_GET['categoria']) ? (int)$_GET['categoria'] : null;
    $soloPopulares = isset($_GET['populares']) && $_GET['populares'] === '1';

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

    if ($categoriaId !== null && $categoriaId > 0) {
        $sql .= " AND p.categoria_id = :categoria_id";
        $params[':categoria_id'] = $categoriaId;
    }

    if ($soloPopulares) {
        $sql .= " AND p.es_popular = 1";
    }

    $sql .= " ORDER BY c.orden ASC, p.es_popular DESC, p.id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $productosRaw = $stmt->fetchAll();

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
        'error' => 'Error al consultar productos: ' . $e->getMessage()
    ]);
}
