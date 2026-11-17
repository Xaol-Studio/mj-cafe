#!/usr/bin/env python3
"""
Servidor de desarrollo local para MJ Café con backend SQLite nativo.
Proyecto: MJ Café - FES Cuautitlán Campo 4
Conecta directamente el frontend con database/mj_cafe.sqlite
"""

import os
import sys
import json
import sqlite3
import mimetypes
import secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database', 'mj_cafe.sqlite')
PORT = 8000

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

class MJCafeHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # 1. API: Datos completos para el Visor de Base de Datos
        if path == '/api/db_data':
            try:
                conn = get_db()
                c = conn.cursor()

                c.execute("""
                    SELECT p.*, 
                           (SELECT COUNT(*) FROM pedido_detalles d WHERE d.pedido_id = p.id) as total_items
                    FROM pedidos p 
                    ORDER BY p.id DESC
                """)
                pedidos = [dict(row) for row in c.fetchall()]

                c.execute("""
                    SELECT d.*, prod.nombre as producto_nombre, prod.imagen_url, p.folio as pedido_folio
                    FROM pedido_detalles d
                    JOIN pedidos p ON p.id = d.pedido_id
                    LEFT JOIN productos prod ON prod.id = d.producto_id
                    ORDER BY d.id DESC
                """)
                detalles = [dict(row) for row in c.fetchall()]

                c.execute("SELECT * FROM clientes_lealtad ORDER BY sellos_acumulados DESC, id DESC")
                clientes = [dict(row) for row in c.fetchall()]

                c.execute("""
                    SELECT prod.*, cat.nombre as categoria_nombre
                    FROM productos prod
                    LEFT JOIN categorias cat ON cat.id = prod.categoria_id
                    ORDER BY prod.categoria_id, prod.id
                """)
                productos = [dict(row) for row in c.fetchall()]

                conn.close()

                self.send_json(200, {
                    'ok': True,
                    'timestamp': datetime.now().isoformat(),
                    'db_path': DB_PATH,
                    'stats': {
                        'total_pedidos': len(pedidos),
                        'ingresos_totales': sum(float(p.get('total') or 0) for p in pedidos if p.get('estado') != 'cancelado'),
                        'pendientes': sum(1 for p in pedidos if p.get('estado') in ('pendiente', 'preparando')),
                        'clientes_lealtad': len(clientes)
                    },
                    'pedidos': pedidos,
                    'pedido_detalles': detalles,
                    'clientes_lealtad': clientes,
                    'productos': productos
                })
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 2. API: Productos
        if path in ('/backend/api/productos.php', '/api/productos'):
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM categorias WHERE activo = 1 ORDER BY orden ASC")
                categorias = [dict(r) for r in c.fetchall()]

                cat_id = query.get('categoria_id', [None])[0]
                if cat_id:
                    c.execute("""
                        SELECT p.*, c.nombre as cat_nombre, c.slug as cat_slug
                        FROM productos p
                        JOIN categorias c ON c.id = p.categoria_id
                        WHERE p.categoria_id = ? AND p.disponible = 1
                        ORDER BY p.id ASC
                    """, (cat_id,))
                else:
                    c.execute("""
                        SELECT p.*, c.nombre as cat_nombre, c.slug as cat_slug
                        FROM productos p
                        JOIN categorias c ON c.id = p.categoria_id
                        WHERE p.disponible = 1
                        ORDER BY p.categoria_id ASC, p.id ASC
                    """)

                prods = []
                for r in c.fetchall():
                    item = dict(r)
                    item['categoria'] = {'id': item['categoria_id'], 'nombre': item['cat_nombre'], 'slug': item['cat_slug']}
                    item['precio_formateado'] = f"${float(item['precio']):.2f} MXN"
                    item['es_popular'] = bool(item['es_popular'])
                    prods.append(item)

                conn.close()
                self.send_json(200, {'ok': True, 'categorias': categorias, 'productos': prods})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 3. API: Consultar pedidos
        if path in ('/backend/api/pedidos.php', '/api/pedidos'):
            folio = query.get('folio', [None])[0]
            try:
                conn = get_db()
                c = conn.cursor()
                if folio:
                    c.execute("SELECT * FROM pedidos WHERE UPPER(folio) = UPPER(?) LIMIT 1", (folio.strip(),))
                    row = c.fetchone()
                    if not row:
                        conn.close()
                        self.send_json(404, {'ok': False, 'error': f'No se encontró pedido con folio {folio}'})
                        return
                    pedido = dict(row)
                    c.execute("""
                        SELECT d.*, prod.nombre as producto_nombre, prod.imagen_url
                        FROM pedido_detalles d
                        LEFT JOIN productos prod ON prod.id = d.producto_id
                        WHERE d.pedido_id = ?
                    """, (pedido['id'],))
                    pedido['items'] = [dict(d) for d in c.fetchall()]
                    conn.close()
                    self.send_json(200, {'ok': True, 'pedido': pedido})
                    return
                else:
                    c.execute("SELECT * FROM pedidos ORDER BY id DESC LIMIT 50")
                    pedidos = [dict(r) for r in c.fetchall()]
                    conn.close()
                    self.send_json(200, {'ok': True, 'pedidos': pedidos})
                    return
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 4. API: Cocina KDS
        if path in ('/backend/api/cocina.php', '/api/cocina'):
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("""
                    SELECT * FROM pedidos 
                    WHERE estado IN ('pendiente', 'preparando', 'listo_para_recoger')
                    ORDER BY id ASC
                """)
                pedidos = [dict(r) for r in c.fetchall()]
                for p in pedidos:
                    c.execute("""
                        SELECT d.*, prod.nombre as producto_nombre
                        FROM pedido_detalles d
                        LEFT JOIN productos prod ON prod.id = d.producto_id
                        WHERE d.pedido_id = ?
                    """, (p['id'],))
                    p['items'] = [dict(d) for d in c.fetchall()]

                c.execute("SELECT COUNT(*) as total, SUM(total) as ingresos FROM pedidos WHERE estado != 'cancelado'")
                resumen_row = c.fetchone()
                c.execute("SELECT COUNT(*) FROM pedidos WHERE estado = 'entregado'")
                entregados = c.fetchone()[0]

                conn.close()
                self.send_json(200, {
                    'ok': True,
                    'pedidos': pedidos,
                    'resumen': {
                        'total_pedidos': resumen_row['total'] or 0,
                        'ingresos_totales': resumen_row['ingresos'] or 0.0,
                        'entregados': entregados
                    }
                })
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 5. API: Lealtad
        if path in ('/backend/api/lealtad.php', '/api/lealtad'):
            tel = query.get('telefono', [''])[0].strip()
            tel = ''.join(filter(str.isdigit, tel))
            if len(tel) < 10:
                self.send_json(422, {'ok': False, 'error': 'Teléfono inválido'})
                return
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM clientes_lealtad WHERE telefono = ? LIMIT 1", (tel,))
                row = c.fetchone()
                conn.close()
                if row:
                    self.send_json(200, {'ok': True, 'cliente': dict(row)})
                else:
                    self.send_json(404, {'ok': False, 'mensaje': 'Sin sellos previos. Se registrará en tu primer pedido.'})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 6. Rutas de vistas
        if path in ('/', '/menu'):
            path = '/html/index.html'
        elif path == '/cocina':
            path = '/html/cocina.html'
        elif path in ('/db', '/visor', '/database_viewer'):
            path = '/html/db_viewer.html'

        # Servir archivos estáticos
        rel_path = path.lstrip('/')
        file_path = os.path.join(BASE_DIR, rel_path)

        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'index.html')

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            mime_type = mime_type or 'application/octet-stream'
            if mime_type.startswith('text/') or mime_type in ('application/javascript', 'application/json'):
                mime_type += '; charset=utf-8'

            with open(file_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_json(404, {'error': f'Ruta no encontrada: {path}'})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        # 1. API: Crear Pedido en SQLite Real
        if path in ('/backend/api/pedidos.php', '/api/pedidos'):
            items = data.get('items', [])
            if not items:
                self.send_json(422, {'ok': False, 'error': 'El carrito está vacío. Agrega al menos un producto.'})
                return

            nombre = (data.get('cliente_nombre') or '').strip()
            telefono = ''.join(filter(str.isdigit, data.get('cliente_telefono') or ''))
            hora = data.get('hora_recoleccion') or 'En 15 minutos'
            metodo = data.get('metodo_pago') or 'efectivo_en_barra'
            notas = (data.get('notas') or '').strip()

            if not nombre or len(telefono) < 10:
                self.send_json(422, {'ok': False, 'error': 'Nombre y teléfono de 10 dígitos requeridos.'})
                return

            try:
                conn = get_db()
                c = conn.cursor()

                # Upsert de cliente lealtad
                c.execute("SELECT id, sellos_acumulados, total_visitas FROM clientes_lealtad WHERE telefono = ?", (telefono,))
                client_row = c.fetchone()
                now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                if client_row:
                    cliente_id = client_row['id']
                    nuevos_sellos = client_row['sellos_acumulados'] + 1
                    c.execute("""
                        UPDATE clientes_lealtad 
                        SET sellos_acumulados = ?, total_visitas = total_visitas + 1, last_visit_at = ?, nombre = ?
                        WHERE id = ?
                    """, (nuevos_sellos, now_str, nombre, cliente_id))
                else:
                    nuevos_sellos = 1
                    c.execute("""
                        INSERT INTO clientes_lealtad (telefono, nombre, carrera, sellos_acumulados, total_visitas, created_at, last_visit_at)
                        VALUES (?, ?, 'FES Cuautitlán Campo 4', 1, 1, ?, ?)
                    """, (telefono, nombre, now_str, now_str))
                    cliente_id = c.lastrowid

                # Calcular total con base de datos
                items_verificados = []
                total = 0.0

                for it in items:
                    prod_id = int(it.get('producto_id', 0))
                    cant = max(1, int(it.get('cantidad', 1)))
                    c.execute("SELECT nombre, precio FROM productos WHERE id = ?", (prod_id,))
                    prow = c.fetchone()
                    if prow:
                        pu = float(prow['precio'])
                        sub = pu * cant
                        total += sub
                        items_verificados.append({
                            'producto_id': prod_id,
                            'nombre': prow['nombre'],
                            'cantidad': cant,
                            'precio_unitario': pu,
                            'subtotal': sub,
                            'personalizaciones': (it.get('personalizaciones') or '').strip()
                        })

                # Generar folio
                folio = f"MJ-{datetime.now().year}-{secrets.token_hex(2).upper()}"

                c.execute("""
                    INSERT INTO pedidos (
                        folio, cliente_nombre, cliente_telefono, cliente_lealtad_id,
                        hora_recoleccion_estimada, estado, total, metodo_pago, notas,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?)
                """, (folio, nombre, telefono, cliente_id, hora, total, metodo, notas, now_str, now_str))
                pedido_id = c.lastrowid

                for iv in items_verificados:
                    c.execute("""
                        INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (pedido_id, iv['producto_id'], iv['cantidad'], iv['precio_unitario'], iv['subtotal'], iv['personalizaciones'], now_str))

                conn.commit()
                conn.close()

                print(f"[NUEVO PEDIDO] Folio: {folio} | Cliente: {nombre} | Total: ${total:.2f} | Items: {len(items_verificados)}")

                self.send_json(201, {
                    'ok': True,
                    'mensaje': 'Pedido registrado correctamente en SQLite',
                    'folio': folio,
                    'pedido_id': pedido_id,
                    'total': total,
                    'hora_recoleccion': hora,
                    'estado': 'pendiente',
                    'sellos_acumulados': nuevos_sellos,
                    'items': items_verificados
                })
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': f"Error en BD: {str(e)}"})
            return

        # 2. API: Actualizar estado desde Cocina
        if path in ('/backend/api/cocina.php', '/api/cocina'):
            pedido_id = int(data.get('pedido_id', 0))
            nuevo_estado = data.get('nuevo_estado', '')
            estados_validos = ('pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado')

            if nuevo_estado not in estados_validos:
                self.send_json(422, {'ok': False, 'error': f'Estado inválido: {nuevo_estado}'})
                return

            try:
                conn = get_db()
                c = conn.cursor()
                now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                c.execute("UPDATE pedidos SET estado = ?, updated_at = ? WHERE id = ?", (nuevo_estado, now_str, pedido_id))
                conn.commit()
                conn.close()
                self.send_json(200, {'ok': True, 'mensaje': f'Estado actualizado a {nuevo_estado}'})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 3. API: Canje de sellos
        if path in ('/backend/api/lealtad.php', '/api/lealtad'):
            tel = ''.join(filter(str.isdigit, data.get('telefono') or ''))
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM clientes_lealtad WHERE telefono = ?", (tel,))
                row = c.fetchone()
                if not row or row['sellos_acumulados'] < 6:
                    conn.close()
                    self.send_json(422, {'ok': False, 'error': 'No cuenta con sellos suficientes para canjear.'})
                    return
                c.execute("""
                    UPDATE clientes_lealtad 
                    SET sellos_acumulados = sellos_acumulados - 6,
                        recompensas_canjeadas = recompensas_canjeadas + 1
                    WHERE id = ?
                """, (row['id'],))
                conn.commit()
                conn.close()
                self.send_json(200, {'ok': True, 'mensaje': 'Bebida de cortesía canjeada con éxito.'})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        self.send_json(404, {'error': f'Ruta POST no encontrada: {path}'})

def run():
    server = HTTPServer(('127.0.0.1', PORT), MJCafeHandler)
    print(f"===========================================================")
    print(f" MJ CAFÉ - SERVIDOR LOCAL & BASE DE DATOS SQLITE ACTIVA")
    print(f"===========================================================")
    print(f" • Menú de Pedidos:    http://localhost:{PORT}/html/index.html")
    print(f" • Visor de BD en Vivo: http://localhost:{PORT}/html/db_viewer.html")
    print(f" • Pantalla de Cocina: http://localhost:{PORT}/html/cocina.html")
    print(f" • Archivo SQLite:     {DB_PATH}")
    print(f"===========================================================")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()

if __name__ == '__main__':
    run()
