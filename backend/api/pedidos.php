<?php
/**
 * Endpoint de creación y consulta de pedidos
 * Rutas:
 *   GET  /backend/api/pedidos.php?folio=MJ-2026-XXXX
 *   POST /backend/api/pedidos.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    consultarPedidos();
} elseif ($method === 'POST') {
    crearPedido();
} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

function consultarPedidos(): void
{
    $pdo = Database::getConnection();
    $folio = isset($_GET['folio']) ? trim((string)$_GET['folio']) : null;

    if ($folio !== null && $folio !== '') {
        $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE folio = :folio LIMIT 1");
        $stmt->execute([':folio' => strtoupper($folio)]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            sendJsonResponse(404, ['ok' => false, 'error' => 'No se encontró ningún pedido con ese folio.']);
        }

        $stmtDetalles = $pdo->prepare("
            SELECT d.*, p.nombre AS producto_nombre, p.imagen_url
            FROM pedido_detalles d
            INNER JOIN productos p ON d.producto_id = p.id
            WHERE d.pedido_id = :pedido_id
        ");
        $stmtDetalles->execute([':pedido_id' => $pedido['id']]);
        $pedido['detalles'] = $stmtDetalles->fetchAll();

        sendJsonResponse(200, ['ok' => true, 'pedido' => $pedido]);
    } else {
        $stmt = $pdo->query("SELECT * FROM pedidos ORDER BY created_at DESC LIMIT 20");
        sendJsonResponse(200, [
            'ok' => true,
            'pedidos' => $stmt->fetchAll()
        ]);
    }
}

function crearPedido(): void
{
    $pdo = Database::getConnection();

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);

    if (!is_array($data)) {
        sendJsonResponse(400, [
            'ok' => false,
            'error' => 'Formato JSON inválido.'
        ]);
    }

    $nombreCliente = trim((string)($data['cliente_nombre'] ?? ''));
    $telefono = preg_replace('/\D/', '', (string)($data['cliente_telefono'] ?? ''));
    $horaRecoleccion = trim((string)($data['hora_recoleccion'] ?? 'En 10 minutos (cambio de clase)'));
    $metodoPago = trim((string)($data['metodo_pago'] ?? 'efectivo_en_barra'));
    $notas = mb_substr(trim((string)($data['notas'] ?? '')), 0, 200);
    $items = $data['items'] ?? [];

    if ($nombreCliente === '' || strlen($telefono) < 10) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'Ingresa tu nombre y un teléfono válido de 10 dígitos.'
        ]);
    }

    if (!is_array($items) || count($items) === 0) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'El carrito está vacío.'
        ]);
    }

    try {
        $pdo->beginTransaction();

        // 1. Verificar precios reales en la base de datos y calcular el total
        $totalCalculado = 0.0;
        $itemsVerificados = [];

        $stmtPrecio = $pdo->prepare("SELECT id, nombre, precio, disponible FROM productos WHERE id = :id LIMIT 1");

        foreach ($items as $item) {
            $prodId = (int)($item['producto_id'] ?? 0);
            $cantidad = max(1, (int)($item['cantidad'] ?? 1));
            $personalizacion = mb_substr(trim((string)($item['personalizaciones'] ?? '')), 0, 120);

            $stmtPrecio->execute([':id' => $prodId]);
            $productoDb = $stmtPrecio->fetch();

            if (!$productoDb) {
                throw new RuntimeException("El producto con ID {$prodId} no existe.");
            }

            if (!(bool)$productoDb['disponible']) {
                throw new RuntimeException("El producto '{$productoDb['nombre']}' no está disponible.");
            }

            $precioUnitario = (float)$productoDb['precio'];
            $subtotal = $precioUnitario * $cantidad;
            $totalCalculado += $subtotal;

            $itemsVerificados[] = [
                'producto_id' => $prodId,
                'producto_nombre' => $productoDb['nombre'],
                'cantidad' => $cantidad,
                'precio_unitario' => $precioUnitario,
                'subtotal' => $subtotal,
                'personalizaciones' => $personalizacion
            ];
        }

        // 2. Actualizar o registrar tarjeta de lealtad del cliente (+1 sello por pedido)
        $clienteLealtadId = null;
        $sellosActuales = 1;

        $stmtCliente = $pdo->prepare("SELECT id, sellos_acumulados FROM clientes_lealtad WHERE telefono = :tel LIMIT 1");
        $stmtCliente->execute([':tel' => $telefono]);
        $cliente = $stmtCliente->fetch();

        if ($cliente) {
            $clienteLealtadId = (int)$cliente['id'];
            $sellosActuales = (int)$cliente['sellos_acumulados'] + 1;
            $stmtUpd = $pdo->prepare("
                UPDATE clientes_lealtad 
                SET nombre = :nombre,
                    sellos_acumulados = :sellos,
                    total_visitas = total_visitas + 1,
                    last_visit_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $stmtUpd->execute([
                ':nombre' => $nombreCliente,
                ':sellos' => $sellosActuales,
                ':id' => $clienteLealtadId
            ]);
        } else {
            $stmtNewCliente = $pdo->prepare("
                INSERT INTO clientes_lealtad (telefono, nombre, sellos_acumulados, total_visitas) 
                VALUES (:tel, :nombre, 1, 1)
            ");
            $stmtNewCliente->execute([
                ':tel' => $telefono,
                ':nombre' => $nombreCliente
            ]);
            $clienteLealtadId = (int)$pdo->lastInsertId();
        }

        // 3. Insertar cabecera del pedido
        $folio = 'MJ-' . date('Y') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

        $stmtPedido = $pdo->prepare("
            INSERT INTO pedidos (
                folio, cliente_nombre, cliente_telefono, cliente_lealtad_id,
                hora_recoleccion_estimada, estado, total, metodo_pago, notas
            ) VALUES (
                :folio, :cliente_nombre, :cliente_telefono, :cliente_lealtad_id,
                :hora_recoleccion, 'pendiente', :total, :metodo_pago, :notas
            )
        ");
        $stmtPedido->execute([
            ':folio' => $folio,
            ':cliente_nombre' => $nombreCliente,
            ':cliente_telefono' => $telefono,
            ':cliente_lealtad_id' => $clienteLealtadId,
            ':hora_recoleccion' => $horaRecoleccion,
            ':total' => $totalCalculado,
            ':metodo_pago' => $metodoPago,
            ':notas' => $notas
        ]);

        $pedidoId = (int)$pdo->lastInsertId();

        // 4. Insertar detalles del pedido
        $stmtDetalle = $pdo->prepare("
            INSERT INTO pedido_detalles (
                pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones
            ) VALUES (
                :pedido_id, :producto_id, :cantidad, :precio_unitario, :subtotal, :personalizaciones
            )
        ");

        foreach ($itemsVerificados as $linea) {
            $stmtDetalle->execute([
                ':pedido_id' => $pedidoId,
                ':producto_id' => $linea['producto_id'],
                ':cantidad' => $linea['cantidad'],
                ':precio_unitario' => $linea['precio_unitario'],
                ':subtotal' => $linea['subtotal'],
                ':personalizaciones' => $linea['personalizaciones']
            ]);
        }

        $pdo->commit();

        sendJsonResponse(201, [
            'ok' => true,
            'mensaje' => 'Pedido registrado correctamente.',
            'folio' => $folio,
            'pedido_id' => $pedidoId,
            'total' => $totalCalculado,
            'hora_recoleccion' => $horaRecoleccion,
            'estado' => 'pendiente',
            'sellos_acumulados' => $sellosActuales,
            'items' => $itemsVerificados
        ]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        sendJsonResponse(500, [
            'ok' => false,
            'error' => 'No se pudo procesar el pedido: ' . $e->getMessage()
        ]);
    }
}
