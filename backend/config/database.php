<?php
/**
 * Conexión a la base de datos usando PDO (SQLite o MySQL)
 * Proyecto: MJ Café - FES Cuautitlán Campo 4
 * Autor: Ian Miguel Delgado Huitron (@iamhuitron)
 */

declare(strict_types=1);

class Database
{
    // Cambiar a 'mysql' si se usa XAMPP / servidor externo
    private const DB_DRIVER = 'sqlite';

    private const MYSQL_HOST = '127.0.0.1';
    private const MYSQL_PORT = '3306';
    private const MYSQL_NAME = 'mj_cafe_db';
    private const MYSQL_USER = 'root';
    private const MYSQL_PASS = '';

    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        try {
            if (self::DB_DRIVER === 'sqlite') {
                $dbPath = dirname(__DIR__, 2) . '/database/mj_cafe.sqlite';

                if (!file_exists($dbPath)) {
                    throw new RuntimeException(
                        "No se encontró el archivo SQLite en {$dbPath}. Ejecuta: php database/setup_sqlite.php"
                    );
                }

                $dsn = "sqlite:{$dbPath}";
                self::$connection = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);

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
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit(1);
        }
    }
}

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
