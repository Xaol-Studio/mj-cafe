<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/api/cocina.php
 * ==============================================================================
 * API DE PANTALLA DE COCINA / BARISTA (KITCHEN DISPLAY SYSTEM - KDS)
 * 
 * Permite al barista de MJ Café:
 * - Ver en tiempo real los pedidos entrantes para recolectar entre clases.
 * - Cambiar el estado del pedido: pendiente -> preparando -> listo_para_recoger -> entregado.
 * ==============================================================================
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

        // Obtenemos los pedidos activos (que no han sido entregados ni cancelados)
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

        // Por cada pedido, consultamos sus productos
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

        sendJsonResponse(200, [
            'ok' => true,
            'pedidos' => $pedidos,
            'timestamp' => date('c')
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} elseif ($method === 'POST') {
    // -------------------------------------------------------------------------
    // ACTUALIZACIÓN DE ESTADO DEL PEDIDO
    // Espera JSON: {"pedido_id": 1, "nuevo_estado": "preparando"}
    // -------------------------------------------------------------------------
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    $pedidoId = (int)($data['pedido_id'] ?? 0);
    $nuevoEstado = trim((string)($data['nuevo_estado'] ?? ''));

    $estadosValidos = ['pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado'];

    if ($pedidoId <= 0 || !in_array($nuevoEstado, $estadosValidos, true)) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'Datos inválidos. Debes especificar un pedido_id válido y un estado permitido.'
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
            'mensaje' => "Estado del pedido #{$pedidoId} actualizado a: {$nuevoEstado}."
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}
