<?php
/**
 * Endpoint del programa de lealtad Club MJ Café
 * Regla: 6 sellos acumulados = 1 bebida de cortesía
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $telefono = preg_replace('/\D/', '', (string)($_GET['telefono'] ?? ''));

    if (strlen($telefono) < 10) {
        sendJsonResponse(400, [
            'ok' => false,
            'error' => 'Ingresa un número de teléfono de 10 dígitos.'
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
                'mensaje' => 'Aún no hay sellos registrados con este número. Se activará en tu primer pedido.'
            ]);
        }

        $sellos = (int)$cliente['sellos_acumulados'];
        $faltantes = max(0, 6 - ($sellos % 6 === 0 && $sellos > 0 ? 6 : $sellos));

        sendJsonResponse(200, [
            'ok' => true,
            'encontrado' => true,
            'cliente' => [
                'id' => (int)$cliente['id'],
                'nombre' => $cliente['nombre'],
                'telefono' => $cliente['telefono'],
                'carrera' => $cliente['carrera'],
                'sellos' => $sellos,
                'sellos_meta' => 6,
                'sellos_faltantes' => max(0, 6 - $sellos),
                'tiene_recompensa_disponible' => ($sellos >= 6),
                'recompensas_canjeadas' => (int)$cliente['recompensas_canjeadas'],
                'total_visitas' => (int)$cliente['total_visitas']
            ]
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} elseif ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);
    $telefono = preg_replace('/\D/', '', (string)($data['telefono'] ?? ''));

    if (strlen($telefono) < 10) {
        sendJsonResponse(400, ['ok' => false, 'error' => 'Teléfono válido requerido para canjear.']);
    }

    try {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT id, nombre, sellos_acumulados, recompensas_canjeadas FROM clientes_lealtad WHERE telefono = :tel LIMIT 1");
        $stmt->execute([':tel' => $telefono]);
        $cliente = $stmt->fetch();

        if (!$cliente) {
            sendJsonResponse(404, ['ok' => false, 'error' => 'Cliente no encontrado.']);
        }

        $sellosActuales = (int)$cliente['sellos_acumulados'];
        if ($sellosActuales < 6) {
            sendJsonResponse(400, [
                'ok' => false,
                'error' => "Aún no alcanzas los 6 sellos (tienes {$sellosActuales})."
            ]);
        }

        $nuevosSellos = $sellosActuales - 6;
        $nuevasRecompensas = (int)$cliente['recompensas_canjeadas'] + 1;

        $stmtUpd = $pdo->prepare("
            UPDATE clientes_lealtad 
            SET sellos_acumulados = :sellos,
                recompensas_canjeadas = :recompensas,
                last_visit_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':sellos' => $nuevosSellos,
            ':recompensas' => $nuevasRecompensas,
            ':id' => $cliente['id']
        ]);

        sendJsonResponse(200, [
            'ok' => true,
            'mensaje' => '¡Café de cortesía canjeado! Presenta esta pantalla en barra.',
            'sellos_restantes' => $nuevosSellos,
            'recompensas_canjeadas' => $nuevasRecompensas
        ]);

    } catch (PDOException $e) {
        sendJsonResponse(500, ['ok' => false, 'error' => $e->getMessage()]);
    }

} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}
