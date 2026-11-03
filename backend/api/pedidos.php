<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/api/pedidos.php
 * ==============================================================================
 * ESQUELETO DIDÁCTICO PARA APRENDIZAJE DE BACKEND Y BASES DE DATOS
 * Asignado a: iamhuitron & GorchRosas
 * 
 * RETO DE APRENDIZAJE:
 * Aquí aprenderás a:
 * 1. Recibir datos JSON enviados por el navegador (`fetch` con `POST`).
 * 2. Manejar TRANSACCIONES ACID (`beginTransaction`, `commit`, `rollBack`):
 *    ¿Por qué? Porque un pedido involucra dos tablas (`pedidos` y `pedido_detalles`).
 *    Si falla el guardado de un producto, la transacción revierte todo para
 *    evitar que queden pedidos fantasmas o dinero descuadrado.
 * 3. Prevenir inyección SQL usando parámetros vinculados con `prepare()`.
 * 4. Recuperar la clave primaria autogenerada usando `$pdo->lastInsertId()`.
 * ==============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

// Cabeceras CORS pre-flight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(200, ['status' => 'ok']);
}

$method = $_SERVER['REQUEST_METHOD'];

// ==============================================================================
// RUTAS SEGÚN EL MÉTODO HTTP
// ==============================================================================
if ($method === 'GET') {
    manejarConsultaPedidos();
} elseif ($method === 'POST') {
    manejarCreacionPedido();
} else {
    sendJsonResponse(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

/**
 * -----------------------------------------------------------------------------
 * 1. CONSULTA DE PEDIDOS (GET)
 * Permite buscar un pedido por su folio (?folio=MJ-2026-101) o listar los activos
 * -----------------------------------------------------------------------------
 */
function manejarConsultaPedidos(): void
{
    $pdo = Database::getConnection();
    $folio = $_GET['folio'] ?? null;

    if ($folio !== null) {
        // Buscar un pedido específico y sus detalles
        $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE folio = :folio LIMIT 1");
        $stmt->execute([':folio' => $folio]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            sendJsonResponse(404, ['ok' => false, 'error' => 'Pedido no encontrado.']);
        }

        // Consultar los renglones (detalles) del pedido haciendo JOIN con productos
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
        // Listar los últimos 20 pedidos ordenados por fecha
        $stmt = $pdo->query("SELECT * FROM pedidos ORDER BY created_at DESC LIMIT 20");
        sendJsonResponse(200, [
            'ok' => true,
            'pedidos' => $stmt->fetchAll()
        ]);
    }
}

/**
 * -----------------------------------------------------------------------------
 * 2. CREACIÓN DE UN NUEVO PEDIDO (POST) -> ¡TU RETO PRINCIPAL AQUÍ!
 * -----------------------------------------------------------------------------
 */
function manejarCreacionPedido(): void
{
    $pdo = Database::getConnection();

    // -------------------------------------------------------------------------
    // PASO 1: Leer el cuerpo de la petición (JSON)
    // En peticiones POST enviadas con fetch(..., { headers: {'Content-Type': 'application/json'} })
    // los datos NO llegan en $_POST, sino en el flujo de entrada php://input.
    // -------------------------------------------------------------------------
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!is_array($data)) {
        sendJsonResponse(400, [
            'ok' => false,
            'error' => 'Cuerpo JSON inválido o mal formado.'
        ]);
    }

    // -------------------------------------------------------------------------
    // PASO 2: Validación de datos obligatorios
    // -------------------------------------------------------------------------
    $nombreCliente = trim((string)($data['cliente_nombre'] ?? ''));
    $telefono = trim((string)($data['cliente_telefono'] ?? ''));
    $horaRecoleccion = trim((string)($data['hora_recoleccion'] ?? 'En 10 minutos (cambio de clase)'));
    $metodoPago = trim((string)($data['metodo_pago'] ?? 'efectivo_en_barra'));
    $notas = trim((string)($data['notas'] ?? ''));
    $items = $data['items'] ?? []; // Array con [{producto_id: 1, cantidad: 2, personalizaciones: 'Sin azúcar'}]

    if (empty($nombreCliente) || empty($telefono)) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'El nombre y teléfono del cliente son requeridos para recoger el pedido en MJ Café.'
        ]);
    }

    if (!is_array($items) || count($items) === 0) {
        sendJsonResponse(422, [
            'ok' => false,
            'error' => 'El carrito no contiene productos.'
        ]);
    }

    // =========================================================================
    // 🎯 TU TURNO (iamhuitron & GorchRosas): IMPLEMENTACIÓN CON TRANSACCIÓN PDO
    // =========================================================================
    // A continuación tienes la estructura guiada. Sigue los números de TODO:

    try {
        // [TODO #1] INICIAR LA TRANSACCIÓN
        // Esto le dice al motor de base de datos: "Todo lo que ejecute a partir
        // de aquí es provisional hasta que yo llame a $pdo->commit()".
        $pdo->beginTransaction();

        // [TODO #2] CALCULAR TOTALES Y VERIFICAR PRECIOS EN LA BASE DE DATOS
        // NUNCA confíes en los precios que envía el cliente desde JavaScript;
        // un usuario malicioso podría alterar el precio en la consola del navegador.
        // Consulta el precio real de cada producto en la tabla `productos`.
        $totalCalculado = 0.0;
        $itemsVerificados = [];

        $stmtPrecio = $pdo->prepare("SELECT id, nombre, precio, disponible FROM productos WHERE id = :id LIMIT 1");

        foreach ($items as $item) {
            $prodId = (int)($item['producto_id'] ?? 0);
            $cantidad = max(1, (int)($item['cantidad'] ?? 1));
            $personalizacion = trim((string)($item['personalizaciones'] ?? ''));

            $stmtPrecio->execute([':id' => $prodId]);
            $productoDb = $stmtPrecio->fetch();

            if (!$productoDb) {
                throw new RuntimeException("El producto con ID {$prodId} no existe en el catálogo.");
            }

            if (!(bool)$productoDb['disponible']) {
                throw new RuntimeException("El producto '{$productoDb['nombre']}' está temporalmente agotado.");
            }

            $precioUnitario = (float)$productoDb['precio'];
            $subtotal = $precioUnitario * $cantidad;
            $totalCalculado += $subtotal;

            $itemsVerificados[] = [
                'producto_id' => $prodId,
                'cantidad' => $cantidad,
                'precio_unitario' => $precioUnitario,
                'subtotal' => $subtotal,
                'personalizaciones' => $personalizacion
            ];
        }

        // [TODO #3] GESTIÓN DE CLIENTE DE LEALTAD (OPCIONAL / RETO)
        // Busca si el teléfono ya existe en `clientes_lealtad`.
        // Si existe, suma 1 a `sellos_acumulados`. Si no existe, puedes crearlo.
        $clienteLealtadId = null;
        $stmtCliente = $pdo->prepare("SELECT id, sellos_acumulados FROM clientes_lealtad WHERE telefono = :tel LIMIT 1");
        $stmtCliente->execute([':tel' => $telefono]);
        $cliente = $stmtCliente->fetch();

        if ($cliente) {
            $clienteLealtadId = (int)$cliente['id'];
            $nuevosSellos = (int)$cliente['sellos_acumulados'] + 1;
            $stmtUpd = $pdo->prepare("
                UPDATE clientes_lealtad 
                SET sellos_acumulados = :sellos, total_visitas = total_visitas + 1 
                WHERE id = :id
            ");
            $stmtUpd->execute([':sellos' => $nuevosSellos, ':id' => $clienteLealtadId]);
        } else {
            // Si es un cliente nuevo, lo registramos automáticamente al club MJ
            $stmtNewCliente = $pdo->prepare("
                INSERT INTO clientes_lealtad (telefono, nombre, sellos_acumulados, total_visitas) 
                VALUES (:tel, :nombre, 1, 1)
            ");
            $stmtNewCliente->execute([':tel' => $telefono, ':nombre' => $nombreCliente]);
            $clienteLealtadId = (int)$pdo->lastInsertId();
        }

        // [TODO #4] GENERAR FOLIO ÚNICO E INSERTAR EL PEDIDO PRINCIPAL (TABLA `pedidos`)
        // Formato: MJ-AAAA-XXXX (ej: MJ-2026-A8F2)
        $folio = 'MJ-' . date('Y') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

        $sqlPedido = "
            INSERT INTO pedidos (
                folio, cliente_nombre, cliente_telefono, cliente_lealtad_id,
                hora_recoleccion_estimada, estado, total, metodo_pago, notas
            ) VALUES (
                :folio, :cliente_nombre, :cliente_telefono, :cliente_lealtad_id,
                :hora_recoleccion, 'pendiente', :total, :metodo_pago, :notas
            )
        ";
        $stmtPedido = $pdo->prepare($sqlPedido);
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

        // [TODO #5] INSERTAR CADA ARTÍCULO EN LA TABLA `pedido_detalles`
        $sqlDetalle = "
            INSERT INTO pedido_detalles (
                pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones
            ) VALUES (
                :pedido_id, :producto_id, :cantidad, :precio_unitario, :subtotal, :personalizaciones
            )
        ";
        $stmtDetalle = $pdo->prepare($sqlDetalle);

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

        // [TODO #6] CONFIRMAR Y GUARDAR DEFINITIVAMENTE LA TRANSACCIÓN
        $pdo->commit();

        // Responder con éxito al cliente
        sendJsonResponse(201, [
            'ok' => true,
            'mensaje' => '¡Pedido registrado con éxito en MJ Café!',
            'folio' => $folio,
            'pedido_id' => $pedidoId,
            'total' => $totalCalculado,
            'hora_recoleccion' => $horaRecoleccion,
            'estado' => 'pendiente',
        ]);

    } catch (Throwable $e) {
        // Si CUALQUIER cosa falló durante la inserción, revertimos todos los cambios
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        sendJsonResponse(500, [
            'ok' => false,
            'error' => 'Ocurrió un error al procesar el pedido: ' . $e->getMessage()
        ]);
    }
}
