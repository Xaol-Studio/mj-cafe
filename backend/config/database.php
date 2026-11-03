<?php
/**
 * ==============================================================================
 * PROYECTO: SaaS MJ CAFÉ - FES Cuautitlán Campo 4
 * ARCHIVO: backend/config/database.php
 * ==============================================================================
 * GESTOR DE CONEXIÓN A BASE DE DATOS MEDIANTE PDO (PHP Data Objects)
 * 
 * LECCIÓN PARA EL EQUIPO DE BACKEND (iamhuitron & GorchRosas):
 * 1. ¿Por qué PDO y no mysqli_query?
 *    - PDO es la abstracción estándar de PHP que soporta múltiples motores (SQLite,
 *      MySQL, PostgreSQL) cambiando solo una línea de configuración (el DSN).
 *    - Admite consultas preparadas reales (Evita inyección SQL al 100%).
 * 2. Emulación de Prepared Statements:
 *    - `PDO::ATTR_EMULATE_PREPARES => false` obliga a la base de datos a compilar
 *      la sentencia antes de recibir los parámetros, impidiendo inyecciones.
 * 3. Manejo de Errores:
 *    - `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION` convierte advertencias silenciosas
 *      en excepciones que podemos capturar en bloques `try / catch`.
 * ==============================================================================
 */

declare(strict_types=1);

class Database
{
    /**
     * CONFIGURACIÓN DEL MOTOR:
     * - 'sqlite' : Ideal para desarrollo local rápido sin prender XAMPP / MySQL.
     * - 'mysql'  : Para producción o si tienen MySQL/MariaDB encendido en XAMPP.
     */
    private const DB_DRIVER = 'sqlite';

    // Configuración para MySQL (Activa si cambias DB_DRIVER a 'mysql')
    private const MYSQL_HOST = '127.0.0.1';
    private const MYSQL_PORT = '3306';
    private const MYSQL_NAME = 'mj_cafe_db';
    private const MYSQL_USER = 'root';
    private const MYSQL_PASS = '';

    private static ?PDO $connection = null;

    /**
     * Obtiene una instancia única de conexión PDO (Patrón Singleton).
     */
    public static function getConnection(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        try {
            if (self::DB_DRIVER === 'sqlite') {
                $dbPath = dirname(__DIR__, 2) . '/database/mj_cafe.sqlite';

                // Si el archivo SQLite no existe aún, avisar cómo crearlo
                if (!file_exists($dbPath)) {
                    throw new RuntimeException(
                        "La base de datos SQLite no existe en: {$dbPath}. " .
                        "Ejecuta primero: php database/setup_sqlite.php"
                    );
                }

                $dsn = "sqlite:{$dbPath}";
                self::$connection = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);

                // En SQLite las claves foráneas deben habilitarse explícitamente en cada conexión
                self::$connection->exec('PRAGMA foreign_keys = ON;');

            } else {
                $dsn = sprintf(
                    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                    self::MYSQL_HOST,
                    self::MYSQL_PORT,
                    self::MYSQL_NAME
                );

                self::$connection = new PDO($dsn, self::MYSQL_USER, self::MYSQL_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            }

            return self::$connection;

        } catch (PDOException $e) {
            // En un entorno de producción nunca expongas la contraseña en el log
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit(1);
        }
    }
}

/**
 * Función auxiliar para enviar respuestas JSON limpias y con cabeceras CORS.
 */
function sendJsonResponse(int $statusCode, array $data): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
