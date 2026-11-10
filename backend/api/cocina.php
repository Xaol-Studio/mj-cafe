<?php
/**
 * Endpoint para la pantalla de barista / cocina (KDS) y corte de caja básico
 * Rutas:
 *   GET  /backend/api/cocina.php
 *   POST /backend/api/cocina.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $pdo = Database::getConnection();

        $sql = "
            SELECT 
                p.id,
                p.folio,
                p.cliente_nombre,
                p.cliente_telefono,
                p.hora_recoleccion_estimada,
                p.estado,
                p.total,
                p.metodo_pago,
                p.notas,
                p.created_at
            FROM pedidos p
            WHERE p.estado IN ('pendiente', 'preparando', 'listo_para_recoger')
            ORDER BY 
                CASE p.estado
                    WHEN 'pendiente' THEN 1
                    WHEN 'preparando' THEN 2
                    WHEN 'listo_para_recoger' THEN 3
                    ELSE 4
                END,
                p.created_at ASC
        ";

        $stmt = $pdo->query($sql);
        $pedidos = $stmt->fetchAll();

        $stmtDetalles = $pdo->prepare("
            SELECT 
                d.id,
                d.cantidad,
                d.precio_unitario,
                d.subtotal,
                d.personalizaciones,
                pr.nombre AS producto_nombre
            FROM pedido_detalles d
            INNER JOIN productos pr ON d.producto_id = pr.id
            WHERE d.pedido_id = :pedido_id
        ");

        foreach ($pedidos as &$pedido) {
            $stmtDetalles->execute([':pedido_id' => $pedido['id']]);
            $pedido['items'] = $stmtDetalles->fetchAll();
        }

        // Resumen rápido del día (ventas y total de pedidos)
        $stmtResumen = $pdo->query("
            SELECT 
                COUNT(*) AS total_pedidos,
                COALESCE(SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END), 0) AS ingresos_totales,
                COALESCE(SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END), 0) AS entregados
            FROM pedidos
        ");
        $resumen = $stmtResumen->fetch() ?: [
            'total_pedidos' => 0,
            'ingresos_totales' => 0,
            'entregados' => 0
        ];

        sendJsonResponse(200, [
            'ok' => true,
            'pedidos' => $pedidos,
            'resumen' => [
                'total_pedidos' => (int)$resumen['total_pedidos'],
                'ingresos_totales' => (float)$resumen['ingresos_totales'],
                'entregados' => (int)$resumen['entregados']
            ],
            'timestamp' => date('c')
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} elseif ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);

    $pedidoId = (int)($data['pedido_id'] ?? 0);
    $nuevoEstado = trim((string)($data['nuevo_estado'] ?? ''));

    $estadosValidos = ['pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado'];

    if ($pedidoId <= 0 || !in_array($nuevoEstado, $estadosValidos, true)) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'Datos inválidos para actualizar el pedido.'
        ]);
    }

    try {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE pedidos 
            SET estado = :estado, updated_at = CURRENT_TIMESTAMP 
            WHERE id = :id
        ");
        $stmt->execute([
            ':estado' => $nuevoEstado,
            ':id' => $pedidoId
        ]);

        sendJsonResponse(200, [
            'ok' => true,
            'mensaje' => "Pedido #{$pedidoId} actualizado a {$nuevoEstado}."
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}
