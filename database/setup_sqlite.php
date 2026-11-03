<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: database/setup_sqlite.php
 * ==============================================================================
 * Script de inicialización de base de datos SQLite local para pruebas inmediatas
 * sin necesidad de instalar o configurar MySQL/MariaDB.
 *
 * USO:
 *   php database/setup_sqlite.php
 * ==============================================================================
 */

declare(strict_types=1);

$dbDir = __DIR__;
$dbFile = $dbDir . '/mj_cafe.sqlite';
$schemaFile = $dbDir . '/schema_sqlite.sql';
$seedsFile = $dbDir . '/seeds.sql';

echo "☕ [MJ CAFÉ] Inicializando base de datos SQLite...\n";

// Si ya existe la base previa, la renovamos limpiamente
if (file_exists($dbFile)) {
    echo "⚠️  Base de datos previa detectada. Reemplazando para pruebas limpias...\n";
    unlink($dbFile);
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON;');

    echo "📄 Aplicando esquema DDL ({$schemaFile})...\n";
    $schemaSql = file_get_contents($schemaFile);
    if ($schemaSql === false) {
        throw new RuntimeException("No se pudo leer el archivo de esquema: {$schemaFile}");
    }
    $pdo->exec($schemaSql);

    echo "🌱 Insertando catálogo de semillas ({$seedsFile})...\n";
    $seedsSql = file_get_contents($seedsFile);
    if ($seedsSql === false) {
        throw new RuntimeException("No se pudo leer el archivo de semillas: {$seedsFile}");
    }
    $pdo->exec($seedsSql);

    // Verificación rápida
    $stmt = $pdo->query('SELECT COUNT(*) as total FROM productos');
    $totalProductos = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    $stmt2 = $pdo->query('SELECT COUNT(*) as total FROM categorias');
    $totalCategorias = $stmt2->fetch(PDO::FETCH_ASSOC)['total'];

    echo "\n✅ ¡Base de datos SQLite generada con éxito!\n";
    echo "   📍 Archivo: {$dbFile}\n";
    echo "   🏷️  Categorías cargadas: {$totalCategorias}\n";
    echo "   📦 Productos cargados: {$totalProductos}\n";
    echo "\n💡 Ahora puedes correr el servidor local con:\n";
    echo "   php -S localhost:8000\n";
    echo "   Y abrir http://localhost:8000/html/index.html en tu navegador.\n";

} catch (Throwable $e) {
    echo "❌ Error al inicializar SQLite: " . $e->getMessage() . "\n";
    exit(1);
}
