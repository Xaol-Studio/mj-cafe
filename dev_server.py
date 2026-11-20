#!/usr/bin/env python3
"""
Servidor de desarrollo local para MJ Café con backend SQLite nativo
y sincronización bidireccional automática con Vercel Cloud DB (/api/db).
Proyecto: MJ Café - FES Cuautitlán Campo 4
"""

import os
import sys
import json
import time
import sqlite3
import hashlib
import mimetypes
import secrets
import threading
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database', 'mj_cafe.sqlite')
VERCEL_CLOUD_API = 'https://mj-cafe.vercel.app/api/db'
PORT = 8000
ESTADOS_VALIDOS = ('pendiente', 'preparando', 'listo_para_recoger', 'entregado', 'cancelado')
STAFF_PIN = os.environ.get('MJ_STAFF_PIN', '2026')
STAFF_TOKEN = hashlib.sha256(('mj_cafe_staff_' + STAFF_PIN).encode()).hexdigest()

db_lock = threading.Lock()


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def normalize_phone(tel):
    return ''.join(filter(str.isdigit, str(tel or '')))


def normalize_ts(val):
    if not val:
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    s = str(val).replace('T', ' ').split('.')[0].rstrip('Z')
    return s[:19]


def fetch_db_data_payload():
    with db_lock:
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

        detalles_por_pedido = {}
        for d in detalles:
            detalles_por_pedido.setdefault(d['pedido_id'], []).append(d)
        for p in pedidos:
            p['items'] = list(reversed(detalles_por_pedido.get(p['id'], [])))

        c.execute("SELECT * FROM clientes_lealtad ORDER BY sellos_acumulados DESC, id DESC")
        clientes = [dict(row) for row in c.fetchall()]
        for cl in clientes:
            cl['sellos'] = cl.get('sellos_acumulados', 0)

        c.execute("""
            SELECT prod.*, cat.nombre as categoria_nombre
            FROM productos prod
            LEFT JOIN categorias cat ON cat.id = prod.categoria_id
            ORDER BY prod.categoria_id, prod.id
        """)
        productos = [dict(row) for row in c.fetchall()]

        conn.close()

    return {
        'ok': True,
        'origen': 'sqlite_local',
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
    }


def fetch_productos_payload(cat_id=None):
    with db_lock:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM categorias WHERE activo = 1 ORDER BY orden ASC")
        categorias = [dict(r) for r in c.fetchall()]

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
            item['categoria_nombre'] = item['cat_nombre']
            item['precio_formateado'] = f"${float(item['precio']):.2f} MXN"
            item['es_popular'] = bool(item['es_popular'])
            prods.append(item)

        conn.close()
    return {'ok': True, 'categorias': categorias, 'productos': prods}


def fetch_pedidos_payload(folio=None):
    with db_lock:
        conn = get_db()
        c = conn.cursor()
        if folio:
            c.execute("SELECT * FROM pedidos WHERE UPPER(folio) = UPPER(?) LIMIT 1", (folio.strip(),))
            row = c.fetchone()
            if not row:
                conn.close()
                return 404, {'ok': False, 'error': f'No se encontró pedido con folio {folio}'}
            pedido = dict(row)
            c.execute("""
                SELECT d.*, prod.nombre as producto_nombre, prod.imagen_url
                FROM pedido_detalles d
                LEFT JOIN productos prod ON prod.id = d.producto_id
                WHERE d.pedido_id = ?
            """, (pedido['id'],))
            items = [dict(d) for d in c.fetchall()]
            pedido['items'] = items
            pedido['detalles'] = items
            conn.close()
            return 200, {'ok': True, 'pedido': pedido}
        else:
            c.execute("SELECT * FROM pedidos ORDER BY id DESC LIMIT 50")
            pedidos = [dict(r) for r in c.fetchall()]
            conn.close()
            return 200, {'ok': True, 'pedidos': pedidos}


def fetch_cocina_payload():
    with db_lock:
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

    return {
        'ok': True,
        'pedidos': pedidos,
        'resumen': {
            'total_pedidos': resumen_row['total'] or 0,
            'ingresos_totales': resumen_row['ingresos'] or 0.0,
            'entregados': entregados
        }
    }


def fetch_lealtad_payload(tel):
    tel = normalize_phone(tel)
    if len(tel) < 10:
        return 422, {'ok': False, 'error': 'Teléfono inválido'}
    with db_lock:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM clientes_lealtad WHERE telefono = ? LIMIT 1", (tel,))
        row = c.fetchone()
        conn.close()
    if row:
        cliente = dict(row)
        sellos = int(cliente.get('sellos_acumulados') or 0)
        cliente['sellos'] = sellos
        cliente['sellos_meta'] = 6
        cliente['sellos_faltantes'] = max(0, 6 - sellos)
        cliente['tiene_recompensa_disponible'] = sellos >= 6
        return 200, {'ok': True, 'encontrado': True, 'cliente': cliente}
    return 404, {'ok': False, 'encontrado': False, 'mensaje': 'Sin sellos previos. Se registrará en tu primer pedido.'}


def crear_pedido_sql(data):
    items = data.get('items', [])
    if not items:
        return 422, {'ok': False, 'error': 'El carrito está vacío. Agrega al menos un producto.'}

    nombre = (data.get('cliente_nombre') or '').strip()
    telefono = normalize_phone(data.get('cliente_telefono'))
    hora = data.get('hora_recoleccion') or 'En 15 minutos'
    metodo = data.get('metodo_pago') or 'efectivo_en_barra'
    notas = (data.get('notas') or '').strip()

    if not nombre or len(telefono) < 10:
        return 422, {'ok': False, 'error': 'Nombre y teléfono de 10 dígitos requeridos.'}

    with db_lock:
        conn = get_db()
        c = conn.cursor()

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
                    'producto_nombre': prow['nombre'],
                    'nombre': prow['nombre'],
                    'cantidad': cant,
                    'precio_unitario': pu,
                    'subtotal': sub,
                    'personalizaciones': (it.get('personalizaciones') or '').strip()
                })

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

    print(f"[NUEVO PEDIDO SQLite] Folio: {folio} | Cliente: {nombre} | Total: ${total:.2f} | Items: {len(items_verificados)}")
    sys.stdout.flush()

    return 201, {
        'ok': True,
        'mensaje': 'Pedido registrado correctamente en SQLite',
        'folio': folio,
        'pedido_id': pedido_id,
        'id': pedido_id,
        'total': total,
        'hora_recoleccion': hora,
        'estado': 'pendiente',
        'sellos_acumulados': nuevos_sellos,
        'items': items_verificados
    }


def actualizar_cocina_sql(data):
    pedido_id = int(data.get('pedido_id', 0))
    nuevo_estado = str(data.get('nuevo_estado') or '').strip()
    if nuevo_estado not in ESTADOS_VALIDOS:
        return 422, {'ok': False, 'error': f'Estado inválido: {nuevo_estado}'}

    with db_lock:
        conn = get_db()
        c = conn.cursor()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        c.execute("UPDATE pedidos SET estado = ?, updated_at = ? WHERE id = ?", (nuevo_estado, now_str, pedido_id))
        conn.commit()
        conn.close()
    return 200, {'ok': True, 'mensaje': f'Estado actualizado a {nuevo_estado}'}


def canjear_lealtad_sql(data):
    tel = normalize_phone(data.get('telefono'))
    with db_lock:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM clientes_lealtad WHERE telefono = ?", (tel,))
        row = c.fetchone()
        if not row or row['sellos_acumulados'] < 6:
            conn.close()
            return 422, {'ok': False, 'error': 'No cuenta con sellos suficientes para canjear.'}
        nuevos = row['sellos_acumulados'] - 6
        canjes = row['recompensas_canjeadas'] + 1
        c.execute("""
            UPDATE clientes_lealtad
            SET sellos_acumulados = ?, recompensas_canjeadas = ?
            WHERE id = ?
        """, (nuevos, canjes, row['id']))
        conn.commit()
        conn.close()
    return 200, {
        'ok': True,
        'mensaje': 'Bebida de cortesía canjeada con éxito.',
        'sellos_restantes': nuevos,
        'recompensas_canjeadas': canjes
    }


def sync_into_sqlite(incoming_pedidos, incoming_clientes):
    """Inserta de forma idempotente en SQLite pedidos y clientes provenientes de Vercel/cliente."""
    merged_pedidos = 0
    merged_clientes = 0

    with db_lock:
        conn = get_db()
        c = conn.cursor()

        # Catálogo de productos válidos para mantener FK
        c.execute("SELECT id, nombre, precio FROM productos")
        prods = c.fetchall()
        valid_prod_ids = {int(r['id']) for r in prods}
        prod_by_name = {str(r['nombre']).strip().lower(): int(r['id']) for r in prods}
        default_prod_id = next(iter(valid_prod_ids), 1)

        # 1. Sincronizar clientes lealtad por teléfono
        for ic in incoming_clientes or []:
            tel = normalize_phone(ic.get('telefono'))
            if not tel:
                continue
            c.execute("SELECT id, sellos_acumulados, total_visitas, recompensas_canjeadas FROM clientes_lealtad WHERE telefono = ?", (tel,))
            existing = c.fetchone()
            in_sellos = int(ic.get('sellos_acumulados') if ic.get('sellos_acumulados') is not None else (ic.get('sellos') or 0))
            in_visitas = int(ic.get('total_visitas') or 1)
            in_canjes = int(ic.get('recompensas_canjeadas') or 0)
            now_str = normalize_ts(ic.get('last_visit_at') or ic.get('created_at'))

            if not existing:
                c.execute("""
                    INSERT INTO clientes_lealtad (telefono, nombre, carrera, sellos_acumulados, recompensas_canjeadas, total_visitas, created_at, last_visit_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tel,
                    (ic.get('nombre') or 'Cliente MJ').strip(),
                    ic.get('carrera') or 'FES Cuautitlán Campo 4',
                    in_sellos,
                    in_canjes,
                    in_visitas,
                    normalize_ts(ic.get('created_at')),
                    now_str
                ))
                merged_clientes += 1
            elif in_visitas > int(existing['total_visitas'] or 0):
                c.execute("""
                    UPDATE clientes_lealtad
                    SET sellos_acumulados = ?, total_visitas = ?, recompensas_canjeadas = ?, last_visit_at = ?
                    WHERE id = ?
                """, (
                    max(int(existing['sellos_acumulados'] or 0), in_sellos),
                    in_visitas,
                    max(int(existing['recompensas_canjeadas'] or 0), in_canjes),
                    now_str,
                    existing['id']
                ))

        # 2. Sincronizar pedidos por folio
        for ip in incoming_pedidos or []:
            folio = str(ip.get('folio') or '').strip().upper()
            if not folio:
                continue
            c.execute("SELECT id FROM pedidos WHERE UPPER(folio) = UPPER(?)", (folio,))
            if c.fetchone():
                continue

            tel = normalize_phone(ip.get('cliente_telefono')) or '5500000000'
            nombre = (ip.get('cliente_nombre') or 'Cliente MJ').strip()
            estado = str(ip.get('estado') or 'pendiente').strip()
            if estado not in ESTADOS_VALIDOS:
                estado = 'pendiente'
            hora = ip.get('hora_recoleccion_estimada') or ip.get('hora_recoleccion') or 'En 15 minutos'
            total = float(ip.get('total') or 0.0)
            metodo = ip.get('metodo_pago') or 'efectivo_en_barra'
            notas = str(ip.get('notas') or '').strip()
            created_str = normalize_ts(ip.get('created_at'))
            updated_str = normalize_ts(ip.get('updated_at') or ip.get('created_at'))

            c.execute("SELECT id FROM clientes_lealtad WHERE telefono = ?", (tel,))
            crow = c.fetchone()
            cliente_lealtad_id = crow['id'] if crow else None

            c.execute("""
                INSERT INTO pedidos (
                    folio, cliente_nombre, cliente_telefono, cliente_lealtad_id,
                    hora_recoleccion_estimada, estado, total, metodo_pago, notas,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (folio, nombre, tel, cliente_lealtad_id, hora, estado, total, metodo, notas, created_str, updated_str))
            new_pedido_id = c.lastrowid

            items = ip.get('items') or ip.get('detalles') or []
            for it in items:
                raw_pid = int(it.get('producto_id') or 0)
                if raw_pid not in valid_prod_ids:
                    pname = str(it.get('producto_nombre') or it.get('nombre') or '').strip().lower()
                    raw_pid = prod_by_name.get(pname, default_prod_id)
                cant = max(1, int(it.get('cantidad') or 1))
                pu = float(it.get('precio_unitario') if it.get('precio_unitario') is not None else (it.get('precio') or 0.0))
                sub = float(it.get('subtotal') if it.get('subtotal') is not None else (pu * cant))
                pers = str(it.get('personalizaciones') or '').strip()

                c.execute("""
                    INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, subtotal, personalizaciones, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (new_pedido_id, raw_pid, cant, pu, sub, pers, created_str))

            merged_pedidos += 1
            print(f"[SYNC DESDE VERCEL -> SQLite] Nuevo pedido guardado: {folio} | Cliente: {nombre} | Total: ${total:.2f}")
            sys.stdout.flush()

        conn.commit()
        conn.close()

    return merged_pedidos, merged_clientes


def vercel_cloud_sync_loop():
    """Hilo en segundo plano que sincroniza bidireccionalmente Vercel Cloud DB <-> SQLite local cada 3s."""
    time.sleep(1.5)
    while True:
        try:
            # 1. Descargar estado actual de Vercel Cloud DB
            req = urllib.request.Request(
                f"{VERCEL_CLOUD_API}?action=db_data",
                headers={
                    'User-Agent': 'MJCafe-LocalSync/1.0',
                    'Accept': 'application/json',
                    'X-Staff-Token': STAFF_TOKEN
                }
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    cloud_data = json.loads(resp.read().decode('utf-8'))
                    if cloud_data.get('ok'):
                        sync_into_sqlite(
                            cloud_data.get('pedidos', []),
                            cloud_data.get('clientes_lealtad', [])
                        )

            # 2. Subir snapshot local hacia Vercel /api/db?action=sync para preservar tras cold-starts
            local_snapshot = fetch_db_data_payload()
            sync_body = json.dumps({
                'pedidos': local_snapshot.get('pedidos', []),
                'clientes_lealtad': local_snapshot.get('clientes_lealtad', [])
            }, ensure_ascii=False).encode('utf-8')

            post_req = urllib.request.Request(
                f"{VERCEL_CLOUD_API}?action=sync",
                data=sync_body,
                method='POST',
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'MJCafe-LocalSync/1.0',
                    'X-Staff-Token': STAFF_TOKEN
                }
            )
            with urllib.request.urlopen(post_req, timeout=5) as post_resp:
                post_resp.read()
        except Exception:
            # Silencioso ante cortes momentáneos de red o cold-start en progreso
            pass

        time.sleep(3)


class MJCafeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Evitar saturar consola con polling cada 1.5s
        pass

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Token')

    def is_staff_authorized(self, query):
        header_token = (self.headers.get('X-Staff-Token') or '').strip()
        query_token = (query.get('token', [''])[0] or '').strip()
        candidate = header_token or query_token
        return bool(candidate and candidate == STAFF_TOKEN)

    def send_unauthorized(self):
        self.send_json(401, {
            'ok': False,
            'auth_required': True,
            'error': 'Acceso restringido a personal autorizado.'
        })

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

        # 0. API unificada (/api/db?action=...) compatible con Vercel Cloud API
        if path == '/api/db':
            action = query.get('action', ['db_data'])[0]
            try:
                if action == 'db_data':
                    if not self.is_staff_authorized(query):
                        self.send_unauthorized()
                        return
                    self.send_json(200, fetch_db_data_payload())
                elif action == 'productos':
                    cat_id = (query.get('categoria') or query.get('categoria_id') or [None])[0]
                    self.send_json(200, fetch_productos_payload(cat_id))
                elif action == 'pedido_folio':
                    folio = query.get('folio', [''])[0]
                    status, payload = fetch_pedidos_payload(folio)
                    self.send_json(status, payload)
                elif action == 'cocina':
                    if not self.is_staff_authorized(query):
                        self.send_unauthorized()
                        return
                    self.send_json(200, fetch_cocina_payload())
                elif action == 'lealtad':
                    tel = query.get('telefono', [''])[0]
                    status, payload = fetch_lealtad_payload(tel)
                    self.send_json(status, payload)
                else:
                    self.send_json(400, {'ok': False, 'error': f'Acción GET no reconocida: {action}'})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 1. API: Datos completos para el Visor de Base de Datos
        if path == '/api/db_data':
            if not self.is_staff_authorized(query):
                self.send_unauthorized()
                return
            try:
                self.send_json(200, fetch_db_data_payload())
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 2. API: Productos
        if path in ('/backend/api/productos.php', '/api/productos'):
            try:
                cat_id = (query.get('categoria') or query.get('categoria_id') or [None])[0]
                self.send_json(200, fetch_productos_payload(cat_id))
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 3. API: Consultar pedidos
        if path in ('/backend/api/pedidos.php', '/api/pedidos'):
            folio = query.get('folio', [None])[0]
            try:
                status, payload = fetch_pedidos_payload(folio)
                self.send_json(status, payload)
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 4. API: Cocina KDS
        if path in ('/backend/api/cocina.php', '/api/cocina'):
            if not self.is_staff_authorized(query):
                self.send_unauthorized()
                return
            try:
                self.send_json(200, fetch_cocina_payload())
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 5. API: Lealtad
        if path in ('/backend/api/lealtad.php', '/api/lealtad'):
            tel = query.get('telefono', [''])[0].strip()
            try:
                status, payload = fetch_lealtad_payload(tel)
                self.send_json(status, payload)
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
        query = parse_qs(parsed.query)

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        # 0. API unificada (/api/db?action=...)
        if path == '/api/db':
            action = query.get('action', [''])[0]
            try:
                if action == 'auth_staff':
                    pin = str(data.get('pin') or '').strip()
                    if pin and pin == STAFF_PIN:
                        self.send_json(200, {'ok': True, 'token': STAFF_TOKEN})
                    else:
                        self.send_json(401, {'ok': False, 'error': 'PIN de personal incorrecto.'})
                elif action == 'crear_pedido':
                    status, payload = crear_pedido_sql(data)
                    self.send_json(status, payload)
                elif action == 'actualizar_cocina':
                    if not self.is_staff_authorized(query):
                        self.send_unauthorized()
                        return
                    status, payload = actualizar_cocina_sql(data)
                    self.send_json(status, payload)
                elif action == 'canjear_lealtad':
                    status, payload = canjear_lealtad_sql(data)
                    self.send_json(status, payload)
                elif action == 'sync':
                    mp, mc = sync_into_sqlite(
                        data.get('pedidos', []),
                        data.get('clientes_lealtad', [])
                    )
                    resp_payload = {
                        'ok': True,
                        'merged_pedidos': mp,
                        'merged_clientes': mc
                    }
                    if self.is_staff_authorized(query):
                        snapshot = fetch_db_data_payload()
                        resp_payload['pedidos'] = snapshot['pedidos']
                        resp_payload['clientes_lealtad'] = snapshot['clientes_lealtad']
                    self.send_json(200, resp_payload)
                else:
                    self.send_json(400, {'ok': False, 'error': f'Acción POST no reconocida: {action}'})
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 1. API: Crear Pedido en SQLite Real
        if path in ('/backend/api/pedidos.php', '/api/pedidos'):
            try:
                status, payload = crear_pedido_sql(data)
                self.send_json(status, payload)
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': f"Error en BD: {str(e)}"})
            return

        # 2. API: Actualizar estado desde Cocina
        if path in ('/backend/api/cocina.php', '/api/cocina'):
            if not self.is_staff_authorized(query):
                self.send_unauthorized()
                return
            try:
                status, payload = actualizar_cocina_sql(data)
                self.send_json(status, payload)
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        # 3. API: Canje de sellos
        if path in ('/backend/api/lealtad.php', '/api/lealtad'):
            try:
                status, payload = canjear_lealtad_sql(data)
                self.send_json(status, payload)
            except Exception as e:
                self.send_json(500, {'ok': False, 'error': str(e)})
            return

        self.send_json(404, {'error': f'Ruta POST no encontrada: {path}'})


def run():
    sync_thread = threading.Thread(target=vercel_cloud_sync_loop, daemon=True)
    sync_thread.start()

    server = ThreadingHTTPServer(('127.0.0.1', PORT), MJCafeHandler)
    print("===========================================================")
    print(" MJ CAFÉ - SERVIDOR LOCAL + SINCRONIZACIÓN VERCEL <-> SQLite")
    print("===========================================================")
    print(f" • Menú de Pedidos:    http://localhost:{PORT}/html/index.html")
    print(f" • Visor de BD en Vivo: http://localhost:{PORT}/html/db_viewer.html")
    print(f" • Pantalla de Cocina: http://localhost:{PORT}/html/cocina.html")
    print(f" • Cloud Sync Remoto:  {VERCEL_CLOUD_API}")
    print(f" • Archivo SQLite:     {DB_PATH}")
    print("===========================================================")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()


if __name__ == '__main__':
    run()
