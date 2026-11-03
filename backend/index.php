<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/index.php
 * ==============================================================================
 * Router / Portal de bienvenida de la API REST de MJ Café.
 * ==============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';

sendJsonResponse(200, [
    'ok' => true,
    'servicio' => 'API REST - MJ Café SaaS (FES Cuautitlán Campo 4)',
    'version' => '1.0.0-skeleton',
    'desarrolladores' => ['iamhuitron', 'GorchRosas'],
    'estatus' => 'online',
    'endpoints' => [
        'GET  /backend/api/productos.php' => 'Catálogo de café, frappés y alimentos con filtros de categoría',
        'POST /backend/api/pedidos.php'   => 'Creación de nuevos pedidos para recolección express',
        'GET  /backend/api/pedidos.php?folio=MJ-2026-101' => 'Consulta de estatus de pedido por folio',
        'GET  /backend/api/lealtad.php?telefono=55...' => 'Consulta de sellos acumulados en el Club MJ',
        'POST /backend/api/lealtad.php'   => 'Canje de recompensa de café de cortesía',
        'GET  /backend/api/cocina.php'    => 'Pedidos en cola para la pantalla del barista',
        'POST /backend/api/cocina.php'    => 'Actualización de estatus de pedido en cocina',
    ],
    'documentacion' => 'Consulta BACKEND_ROADMAP.md en la raíz del repositorio.'
]);
