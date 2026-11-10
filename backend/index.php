<?php
/**
 * Punto de entrada informativo de la API de MJ Café
 */

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';

sendJsonResponse(200, [
    'ok' => true,
    'servicio' => 'API REST - MJ Café (FES Cuautitlán Campo 4)',
    'version' => '1.0.0',
    'autores' => ['Ian Miguel Delgado Huitron (@iamhuitron)', 'Jorge Alberto Barrios Rosas (@GorchRosas)'],
    'estatus' => 'online',
    'endpoints' => [
        'GET  /backend/api/productos.php' => 'Catálogo completo de bebidas y alimentos',
        'POST /backend/api/pedidos.php'   => 'Registrar nuevo pedido para recoger en barra',
        'GET  /backend/api/pedidos.php?folio=MJ-2026-101' => 'Consultar estado de pedido por folio',
        'GET  /backend/api/lealtad.php?telefono=5512345678' => 'Consultar sellos en Club MJ',
        'POST /backend/api/lealtad.php'   => 'Canjear 6 sellos por bebida gratis',
        'GET  /backend/api/cocina.php'    => 'Pedidos activos y corte del día para el barista',
        'POST /backend/api/cocina.php'    => 'Cambiar estado de comanda en cocina',
    ]
]);
