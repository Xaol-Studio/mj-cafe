<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/api/lealtad.php
 * ==============================================================================
 * ENDPOINT DEL PROGRAMA DE LEALTAD "CLUB MJ CAFÉ"
 * Asignado a: iamhuitron & GorchRosas
 * 
 * REGLAS DE NEGOCIO:
 * - Cada compra o pedido anticipado suma 1 sello digital.
 * - Al juntar 6 sellos, el estudiante/cliente obtiene 1 bebida de cortesía
 *   (Americano o Latte chico) y el contador de sellos se reinicia a 0.
 * ==============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // -------------------------------------------------------------------------
    // CONSULTA DE SELLOS POR NÚMERO DE TELÉFONO
    // Ejemplo: /backend/api/lealtad.php?telefono=5512345678
    // -------------------------------------------------------------------------
    $telefono = trim($_GET['telefono'] ?? '');

    if (empty($telefono)) {
        sendJsonResponse(400, [
            'ok' => false,
            'error' => 'Debes ingresar un número de teléfono para consultar tu tarjeta de sellos.'
        ]);
    }

    try {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT id, nombre, telefono, carrera, sellos_acumulados, recompensas_canjeadas, total_visitas, last_visit_at
            FROM clientes_lealtad 
            WHERE telefono = :tel 
            LIMIT 1
        ");
        $stmt->execute([':tel' => $telefono]);
        $cliente = $stmt->fetch();

        if (!$cliente) {
            sendJsonResponse(404, [
                'ok' => false,
                'encontrado' => false,
                'mensaje' => 'Aún no tienes tarjeta registrada. Se creará automáticamente con tu primer pedido.'
            ]);
        }

        $sellos = (int)$cliente['sellos_acumulados'];
        $faltantes = max(0, 6 - $sellos);

        sendJsonResponse(200, [
            'ok' => true,
            'encontrado' => true,
            'cliente' => [
                'id' => (int)$cliente['id'],
                'nombre' => $cliente['nombre'],
                'carrera' => $cliente['carrera'],
                'sellos' => $sellos,
                'sellos_meta' => 6,
                'sellos_faltantes' => $faltantes,
                'tiene_recompensa_disponible' => ($sellos >= 6),
                'recompensas_canjeadas' => (int)$cliente['recompensas_canjeadas'],
                'total_visitas' => (int)$cliente['total_visitas']
            ]
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} elseif ($method === 'POST') {
    // -------------------------------------------------------------------------
    // CANJEAR RECOMPENSA (RETO TODO PARA iamhuitron & GorchRosas)
    // Cuando el barista escanea o verifica 6 sellos en barra:
    // -------------------------------------------------------------------------
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    $telefono = trim((string)($data['telefono'] ?? ''));

    if (empty($telefono)) {
        sendJsonResponse(400, ['ok' => false, 'error' => 'Teléfono requerido para canjear.']);
    }

    try {
        $pdo = Database::getConnection();

        // 1. Verificar si tiene los 6 sellos necesarios
        $stmt = $pdo->prepare("SELECT id, sellos_acumulados FROM clientes_lealtad WHERE telefono = :tel LIMIT 1");
        $stmt->execute([':tel' => $telefono]);
        $cliente = $stmt->fetch();

        if (!$cliente) {
            sendJsonResponse(404, ['ok' => false, 'error' => 'Cliente no encontrado.']);
        }

        if ((int)$cliente['sellos_acumulados'] < 6) {
            sendJsonResponse(400, [
                'ok' => false,
                'error' => 'Aún no cumples la meta de 6 sellos (Sellos actuales: ' . $cliente['sellos_acumulados'] . ').'
            ]);
        }

        // 2. Canjear: Restar 6 sellos y sumar 1 a recompensas_canjeadas
        $stmtUpd = $pdo->prepare("
            UPDATE clientes_lealtad 
            SET sellos_acumulados = sellos_acumulados - 6,
                recompensas_canjeadas = recompensas_canjeadas + 1
            WHERE id = :id
        ");
        $stmtUpd->execute([':id' => $cliente['id']]);

        sendJsonResponse(200, [
            'ok' => true,
            'mensaje' => '¡Felicidades! Recompensa canjeada con éxito. Disfruta tu café de cortesía en MJ Café.'
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}
