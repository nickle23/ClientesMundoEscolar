from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from database import db, User, Cliente
import re
import unicodedata
import sqlite3
import os
from datetime import datetime
import json

# Configuración de la aplicación
app = Flask(__name__)
app.config['SECRET_KEY'] = 'tu_clave_secreta_muy_segura_aqui_123'

# 🔥 NUEVO: Configuración para Render con SQLite persistente
import os

# En Render, usamos /tmp para persistencia entre deploys
if 'RENDER' in os.environ:
    # 🔥 RENDER - SQLite en carpeta persistente
    db_path = '/tmp/clientes.db'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print("🚀 Render: Usando SQLite persistente en /tmp/")
else:
    # 🔥 DESARROLLO LOCAL - SQLite normal
    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, 'data', 'clientes.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print("💻 Desarrollo: Usando SQLite local")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar extensiones
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 🔥 SOLUCIÓN: Ruta raíz para evitar redirección infinita
@app.route('/')
def index():
    """Página de inicio que redirige correctamente"""
    if current_user.is_authenticated:
        # Usuario ya logueado - redirigir según rol
        if current_user.role == 'admin':
            return redirect(url_for('admin_panel'))
        else:
            return redirect(url_for('trabajadores_panel'))
    else:
        # Usuario no logueado - ir al login
        return redirect(url_for('login'))

# 🔥 NUEVO: Actualizar último acceso al hacer login
@login_manager.user_loader
def load_user(user_id):
    user = User.query.get(int(user_id))
    if user:
        user.ultimo_acceso = datetime.utcnow()  # 🔥 Actualizar último acceso
        db.session.commit()
    return user

# Función para normalizar texto (búsqueda inteligente)
def normalizar_texto(texto):
    if not texto:
        return ""
    # Convertir a minúsculas y quitar tildes
    texto = texto.lower()
    texto = unicodedata.normalize('NFD', texto).encode('ASCII', 'ignore').decode('ASCII')
    # Reemplazar common typos
    reemplazos = {
        'v': 'b', 'z': 's', 'c': 's', 'y': 'i', 'j': 'h',
        'll': 'y', 'rr': 'r', 'nn': 'n', 'mm': 'm'
    }
    for typo, correcto in reemplazos.items():
        texto = texto.replace(typo, correcto)
    return texto

# 🔥 NUEVO: Crear tablas y usuario admin al inicio - VERSIÓN MEJORADA
with app.app_context():
    try:
        db.create_all()
        
        # 🔥 CREAR USUARIO ADMIN SI NO EXISTE (funciona en PostgreSQL y SQLite)
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', role='admin')
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Usuario admin creado: admin / admin123")
        else:
            print("✅ Usuario admin ya existe")
            
        print("✅ Base de datos verificada correctamente")
        
    except Exception as e:
        print(f"❌ Error inicializando base de datos: {e}")
        # No hacemos rollback para permitir que la app inicie igual

# Ruta de login
@app.route('/', methods=['GET', 'POST'])
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        # 🔥 NUEVO: Verificar que el usuario esté activo
        if user and user.check_password(password):
            if not user.activo:
                return render_template('login.html', error='Usuario desactivado. Contacta al administrador.')
            login_user(user)
            if user.role == 'admin':
                return redirect(url_for('admin_panel'))
            else:
                return redirect(url_for('trabajadores_panel'))
        else:
            return render_template('login.html', error='Usuario o contraseña incorrectos')
    
    return render_template('login.html')

# Ruta del panel de administración
@app.route('/admin')
@login_required
def admin_panel():
    if current_user.role != 'admin':
        return redirect(url_for('login'))
    return render_template('admin.html')

# Ruta del panel de trabajadores
@app.route('/trabajadores')
@login_required
def trabajadores_panel():
    return render_template('trabajadores.html')

# Cerrar sesión
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# API Routes para clientes
@app.route('/api/clientes', methods=['GET', 'POST'])
@login_required
def api_clientes():
    if request.method == 'GET':
        # Obtener todos los clientes activos
        clientes = Cliente.query.filter_by(activo=True).all()
        return jsonify([{
            'id': cliente.id,
            'nombre': cliente.nombre,
            'direccion': cliente.direccion,
            'telefono': cliente.telefono,
            'latitud': cliente.latitud,
            'longitud': cliente.longitud,
            'categoria': cliente.categoria
        } for cliente in clientes])
    
    elif request.method == 'POST':
        if current_user.role != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.json
        
        # Validar datos requeridos
        if not data.get('nombre') or not data.get('latitud') or not data.get('longitud'):
            return jsonify({'error': 'Nombre, latitud y longitud son requeridos'}), 400
        
        # Crear nuevo cliente
        nuevo_cliente = Cliente(
            nombre=data['nombre'],
            nombre_normalizado=normalizar_texto(data['nombre']),
            direccion=data.get('direccion', ''),
            telefono=data.get('telefono', ''),
            latitud=float(data['latitud']),
            longitud=float(data['longitud']),
            categoria=data.get('categoria', 'Librería')
        )
        
        try:
            db.session.add(nuevo_cliente)
            db.session.commit()
            return jsonify({'message': 'Cliente agregado correctamente', 'id': nuevo_cliente.id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
        
# 🔥 NUEVO: API para actualizar cliente
@app.route('/api/clientes/<int:cliente_id>', methods=['PUT'])
@login_required
def api_actualizar_cliente(cliente_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.json
    
    # Validar datos requeridos
    if not data.get('nombre') or not data.get('latitud') or not data.get('longitud'):
        return jsonify({'error': 'Nombre, latitud y longitud son requeridos'}), 400
    
    try:
        # Actualizar datos del cliente
        cliente.nombre = data['nombre']
        cliente.nombre_normalizado = normalizar_texto(data['nombre'])
        cliente.direccion = data.get('direccion', '')
        cliente.telefono = data.get('telefono', '')
        cliente.latitud = float(data['latitud'])
        cliente.longitud = float(data['longitud'])
        cliente.categoria = data.get('categoria', 'Otro')
        
        db.session.commit()
        return jsonify({'message': 'Cliente actualizado correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/clientes/<int:cliente_id>', methods=['DELETE'])
@login_required
def api_eliminar_cliente(cliente_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    cliente = Cliente.query.get_or_404(cliente_id)
    
    try:
        # En lugar de eliminar, marcamos como inactivo
        cliente.activo = False
        db.session.commit()
        return jsonify({'message': 'Cliente eliminado correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# API para búsqueda inteligente
@app.route('/api/buscar-clientes')
@login_required
def api_buscar_clientes():
    termino = request.args.get('q', '')
    if not termino:
        return jsonify([])
    
    termino_normalizado = normalizar_texto(termino)
    
    # Búsqueda con coincidencia parcial en nombre normalizado
    clientes = Cliente.query.filter(
        Cliente.activo == True,
        Cliente.nombre_normalizado.contains(termino_normalizado)
    ).limit(20).all()
    
    return jsonify([{
        'id': cliente.id,
        'nombre': cliente.nombre,
        'direccion': cliente.direccion,
        'telefono': cliente.telefono,
        'latitud': cliente.latitud,
        'longitud': cliente.longitud,
        'categoria': cliente.categoria
    } for cliente in clientes])

# Ruta para agregar cliente desde link de Google Maps
@app.route('/api/parse-google-maps', methods=['POST'])
@login_required
def api_parse_google_maps():
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.json
    maps_link = data.get('link', '')
    
    # Extraer coordenadas del link de Google Maps
    # Ejemplo: https://maps.google.com/?q=-12.0464,-77.0428
    try:
        if 'q=' in maps_link:
            coordenadas = maps_link.split('q=')[1].split('&')[0]
            lat, lng = coordenadas.split(',')
            return jsonify({
                'latitud': float(lat),
                'longitud': float(lng)
            })
    except Exception as e:
        return jsonify({'error': 'No se pudieron extraer coordenadas del link'}), 400
    
    return jsonify({'error': 'Formato de link no reconocido'}), 400

# Ruta para mostrar gestión de usuarios
@app.route('/admin/usuarios')
@login_required
def admin_usuarios():
    if current_user.role != 'admin':
        return redirect(url_for('login'))
    
    usuarios = User.query.all()
    return render_template('admin_usuarios.html', usuarios=usuarios)

# API para crear usuarios trabajadores
@app.route('/api/usuarios', methods=['POST'])
@login_required
def api_crear_usuario():
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'trabajador')
    
    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400
    
    # Verificar si el usuario ya existe
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'El usuario ya existe'}), 400
    
    # Crear nuevo usuario
    nuevo_usuario = User(username=username, role=role)
    nuevo_usuario.set_password(password)
    
    try:
        db.session.add(nuevo_usuario)
        db.session.commit()
        return jsonify({
            'message': 'Usuario creado exitosamente', 
            'usuario': {
                'id': nuevo_usuario.id,
                'username': nuevo_usuario.username,
                'role': nuevo_usuario.role
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# API para eliminar usuarios
@app.route('/api/usuarios/<int:usuario_id>', methods=['DELETE'])
@login_required
def api_eliminar_usuario(usuario_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    # No permitir eliminar el propio usuario
    if usuario_id == current_user.id:
        return jsonify({'error': 'No puedes eliminar tu propio usuario'}), 400
    
    usuario = User.query.get_or_404(usuario_id)
    
    try:
        db.session.delete(usuario)
        db.session.commit()
        return jsonify({'message': 'Usuario eliminado correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Ruta de diagnóstico para ver clientes en la base de datos
@app.route('/debug/clientes')
@login_required
def debug_clientes():
    clientes = Cliente.query.filter_by(activo=True).all()
    resultado = []
    for cliente in clientes:
        resultado.append({
            'id': cliente.id,
            'nombre': cliente.nombre,
            'nombre_normalizado': cliente.nombre_normalizado,
            'latitud': cliente.latitud,
            'longitud': cliente.longitud
        })
    return jsonify(resultado)

# Ruta de diagnóstico para búsqueda
@app.route('/debug/buscar/<termino>')
@login_required
def debug_buscar(termino):
    termino_normalizado = normalizar_texto(termino)
    
    clientes = Cliente.query.filter(
        Cliente.activo == True,
        Cliente.nombre_normalizado.contains(termino_normalizado)
    ).all()
    
    resultados = []
    for cliente in clientes:
        resultados.append({
            'id': cliente.id,
            'nombre': cliente.nombre,
            'nombre_normalizado': cliente.nombre_normalizado,
            'coincide': termino_normalizado in cliente.nombre_normalizado
        })
    
    return jsonify({
        'termino_original': termino,
        'termino_normalizado': termino_normalizado,
        'resultados': resultados,
        'total': len(resultados)
    })

# 🔥 NUEVO CÓDIGO - REEMPLAZA DESDE AQUÍ 🔥
from flask import redirect, request

@app.before_request
def redirect_to_https():
    """Redirige automáticamente a HTTPS para móviles"""
    if not request.is_secure and not request.url.startswith('http://localhost'):
        url_https = request.url.replace('http://', 'https://', 1)
        return redirect(url_https, code=301)
    
# Ruta de diagnóstico para móvil
@app.route('/debug-gps')
def debug_gps():
    return render_template('debug.html')

# API para obtener lista de usuarios MEJORADA
@app.route('/api/usuarios-list')
@login_required
def api_usuarios_list():
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    usuarios = User.query.all()
    return jsonify([{
        'id': usuario.id,
        'username': usuario.username,
        'role': usuario.role,
        'activo': usuario.activo,  # 🔥 NUEVO
        'fecha_creacion': usuario.fecha_creacion.isoformat() if usuario.fecha_creacion else None,  # 🔥 NUEVO
        'ultimo_acceso': usuario.ultimo_acceso.isoformat() if usuario.ultimo_acceso else None  # 🔥 NUEVO
    } for usuario in usuarios])

# 🔥 NUEVO: API para editar usuario
@app.route('/api/usuarios/<int:usuario_id>', methods=['PUT'])
@login_required
def api_editar_usuario(usuario_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    usuario = User.query.get_or_404(usuario_id)
    data = request.json
    
    try:
        # 🔥 PERMITIR edición completa incluso del propio usuario
        if 'username' in data:
            # Verificar que el nuevo username no esté en uso
            usuario_existente = User.query.filter(User.username == data['username'], User.id != usuario_id).first()
            if usuario_existente:
                return jsonify({'error': 'El nombre de usuario ya está en uso'}), 400
            usuario.username = data['username']
        
        if 'role' in data:
            usuario.role = data['role']
        
        if 'activo' in data:
            # 🔥 PERMITIR desactivarse a sí mismo (pero con advertencia)
            usuario.activo = bool(data['activo'])
        
        if 'password' in data and data['password']:
            usuario.set_password(data['password'])
        
        db.session.commit()
        return jsonify({'message': 'Usuario actualizado correctamente'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 🔥 NUEVO: API para cambiar estado de usuario (activar/desactivar)
@app.route('/api/usuarios/<int:usuario_id>/toggle', methods=['POST'])
@login_required
def api_toggle_usuario(usuario_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    if usuario_id == current_user.id:
        return jsonify({'error': 'No puedes desactivar tu propio usuario'}), 400
    
    usuario = User.query.get_or_404(usuario_id)
    
    try:
        usuario.activo = not usuario.activo
        db.session.commit()
        
        estado = "activado" if usuario.activo else "desactivado"
        return jsonify({'message': f'Usuario {estado} correctamente', 'activo': usuario.activo})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 🔥 NUEVO: API para reiniciar contraseña
@app.route('/api/usuarios/<int:usuario_id>/reset-password', methods=['POST'])
@login_required
def api_reset_password(usuario_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    usuario = User.query.get_or_404(usuario_id)
    data = request.json
    
    try:
        nueva_password = data.get('password', '123456')  # Contraseña por defecto
        usuario.set_password(nueva_password)
        db.session.commit()
        
        return jsonify({'message': 'Contraseña reiniciada correctamente'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
# 🔥 NUEVO: Sistema de Backup Completo (Clientes + Usuarios)
@app.route('/admin/backup')
@login_required
def backup_clientes():
    """Generar backup completo del sistema (clientes + usuarios)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        # 🔥 OBTENER TODOS LOS CLIENTES ACTIVOS
        clientes = Cliente.query.filter_by(activo=True).all()
        
        # 🔥 NUEVO: OBTENER TODOS LOS USUARIOS
        usuarios = User.query.all()
        
        # 🔥 NUEVO: METADATOS DEL SISTEMA
        from datetime import timezone
        fecha_actual = datetime.now(timezone.utc)
        
        datos_backup = {
            'metadata': {
                'fecha_backup': fecha_actual.isoformat(),
                'tipo_backup': 'COMPLETO',
                'version_sistema': '2.0',
                'total_clientes': len(clientes),
                'total_usuarios': len(usuarios),
                'usuario_generador': current_user.username
            },
            'clientes': [{
                'id': cliente.id,
                'nombre': cliente.nombre,
                'direccion': cliente.direccion,
                'telefono': cliente.telefono,
                'latitud': cliente.latitud,
                'longitud': cliente.longitud,
                'categoria': cliente.categoria,
                'activo': cliente.activo
            } for cliente in clientes],
            # 🔥 NUEVO: SECCIÓN DE USUARIOS
            'usuarios': [{
                'id': usuario.id,
                'username': usuario.username,
                'role': usuario.role,
                'activo': usuario.activo,
                'fecha_creacion': usuario.fecha_creacion.isoformat() if usuario.fecha_creacion else None,
                'ultimo_acceso': usuario.ultimo_acceso.isoformat() if usuario.ultimo_acceso else None
                # 🔥 NOTA: No incluimos contraseñas por seguridad
            } for usuario in usuarios]
        }
        
        # Crear respuesta para descargar
        from flask import make_response
        fecha_formateada = fecha_actual.strftime('%Y%m%d_%H%M')
        response = make_response(jsonify(datos_backup))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = f'attachment; filename=backup_completo_{fecha_formateada}.json'
        
        return response
        
    except Exception as e:
        return jsonify({'error': f'Error generando backup completo: {str(e)}'}), 500

@app.route('/admin/estado-db')
@login_required
def estado_base_datos():
    """Mostrar información del estado de la base de datos"""
    if current_user.role != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        total_clientes = Cliente.query.filter_by(activo=True).count()
        total_usuarios = User.query.count()
        
        # Información del archivo de base de datos
        import os
        if os.path.exists(db_path):
            tamaño = os.path.getsize(db_path)
            tamaño_mb = tamaño / (1024 * 1024)
        else:
            tamaño_mb = 0
            
        return jsonify({
            'estado': 'ok',
            'ubicacion_db': db_path,
            'total_clientes': total_clientes,
            'total_usuarios': total_usuarios,
            'tamaño_db_mb': round(tamaño_mb, 2),
            'en_render': 'RENDER' in os.environ
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 🔥 NUEVO: Sistema de Restauración Completa
@app.route('/admin/restore', methods=['GET', 'POST'])
@login_required
def restaurar_clientes():
    """Restaurar sistema completo desde archivo JSON de backup - INTERFAZ PROFESIONAL"""
    if current_user.role != 'admin':
        return redirect(url_for('login'))
    
    if request.method == 'GET':
        # Renderizar template profesional para restauración
        return render_template('restore.html')
    
    elif request.method == 'POST':
        # Procesar archivo de backup COMPLETO
        try:
            if 'archivo_backup' not in request.files:
                return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo'}), 400
            
            archivo = request.files['archivo_backup']
            if archivo.filename == '':
                return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo'}), 400
            
            if archivo and archivo.filename.endswith('.json'):
                # Leer y procesar el archivo JSON COMPLETO
                datos_backup = json.load(archivo)
                
                # 🔥 NUEVO: VERIFICAR ESTRUCTURA DEL BACKUP COMPLETO
                if 'clientes' not in datos_backup or 'usuarios' not in datos_backup:
                    return jsonify({'success': False, 'error': 'El archivo no es un backup completo válido'}), 400
                
                resultados = {
                    'clientes_restaurados': 0,
                    'clientes_omitidos': 0,
                    'usuarios_restaurados': 0,
                    'usuarios_omitidos': 0,
                    'errores': []
                }
                
                # 🔥 1. PROCESAR CLIENTES (lógica existente mejorada)
                for i, cliente_data in enumerate(datos_backup['clientes']):
                    try:
                        # Verificar datos requeridos
                        if not cliente_data.get('nombre') or not cliente_data.get('latitud') or not cliente_data.get('longitud'):
                            resultados['errores'].append(f"Cliente {i+1}: Faltan datos requeridos")
                            continue
                        
                        # Verificar si el cliente ya existe (por nombre normalizado)
                        nombre_normalizado = normalizar_texto(cliente_data['nombre'])
                        cliente_existente = Cliente.query.filter_by(
                            nombre_normalizado=nombre_normalizado
                        ).first()
                        
                        if not cliente_existente:
                            # Crear nuevo cliente
                            nuevo_cliente = Cliente(
                                nombre=cliente_data['nombre'],
                                nombre_normalizado=nombre_normalizado,
                                direccion=cliente_data.get('direccion', ''),
                                telefono=cliente_data.get('telefono', ''),
                                latitud=float(cliente_data['latitud']),
                                longitud=float(cliente_data['longitud']),
                                categoria=cliente_data.get('categoria', 'Otro'),
                                activo=True
                            )
                            db.session.add(nuevo_cliente)
                            resultados['clientes_restaurados'] += 1
                        else:
                            resultados['clientes_omitidos'] += 1
                            
                    except Exception as e:
                        resultados['errores'].append(f"Cliente {i+1}: {str(e)}")
                        continue
                
                # 🔥 2. NUEVO: PROCESAR USUARIOS - VERSIÓN MEJORADA
                for i, usuario_data in enumerate(datos_backup['usuarios']):
                    try:
                        # Verificar datos requeridos
                        if not usuario_data.get('username') or not usuario_data.get('role'):
                            resultados['errores'].append(f"Usuario {i+1}: Faltan datos requeridos")
                            continue
                        
                        # Verificar si el usuario ya existe
                        usuario_existente = User.query.filter_by(
                            username=usuario_data['username']
                        ).first()
                        
                        if not usuario_existente:
                            # 🔥 CREAR NUEVO USUARIO CON CONTRASEña TEMPORAL
                            nuevo_usuario = User(
                                username=usuario_data['username'],
                                role=usuario_data['role'],
                                activo=usuario_data.get('activo', True),
                                fecha_creacion=datetime.fromisoformat(usuario_data['fecha_creacion']) if usuario_data.get('fecha_creacion') else None,
                                ultimo_acceso=datetime.fromisoformat(usuario_data['ultimo_acceso']) if usuario_data.get('ultimo_acceso') else None
                            )
                            nuevo_usuario.set_password('temp123456')  # Contraseña temporal
                            db.session.add(nuevo_usuario)
                            resultados['usuarios_restaurados'] += 1
                            print(f"✅ Usuario NUEVO creado: {usuario_data['username']} con contraseña temporal")
                        else:
                            # 🔥 USUARIO EXISTENTE - ACTUALIZAR DATOS PERO MANTENER CONTRASEÑA ACTUAL
                            usuario_existente.role = usuario_data['role']
                            usuario_existente.activo = usuario_data.get('activo', True)
                            usuario_existente.ultimo_acceso = datetime.fromisoformat(usuario_data['ultimo_acceso']) if usuario_data.get('ultimo_acceso') else usuario_existente.ultimo_acceso
                            # 🔥 IMPORTANTE: NO modificamos la contraseña del usuario existente
                            resultados['usuarios_omitidos'] += 1
                            print(f"⚠️ Usuario EXISTente actualizado: {usuario_data['username']} (contraseña preservada)")
                            
                    except Exception as e:
                        resultados['errores'].append(f"Usuario {i+1}: {str(e)}")
                        continue
                
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': '✅ Restauración completa exitosa',
                    'resultados': resultados,
                    'metadata': datos_backup.get('metadata', {})
                })
            else:
                return jsonify({'success': False, 'error': 'El archivo debe ser un JSON válido (.json)'}), 400
                
        except json.JSONDecodeError:
            return jsonify({'success': False, 'error': 'El archivo no es un JSON válido'}), 400
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': f'Error en la restauración: {str(e)}'}), 500
        

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 SISTEMA DE CLIENTES - SERVIDOR INICIADO")
    print("=" * 60)
    print("📊 Ruta de la base de datos:", db_path)
    # print("🔑 Usuario: admin | Contraseña: admin123")  # 🔥 COMENTADO
    print("")
    print("🌐 ACCESOS DISPONIBLES:")
    print("   • EN ESTE ORDENADOR: https://localhost:5000")
    print("   • EN TU MÓVIL: https://TU-IP-LOCAL:5000")
    print("")
    print("📱 INSTRUCCIONES MÓVIL:")
    print("   1. Usa la IP de arriba en tu móvil")
    print("   2. Si sale advertencia: 'Avanzado' → 'Continuar'")
    print("   3. La geolocalización funcionará perfectamente")
    print("=" * 60)
    
    # 🔥 SOLUCIÓN RENDER: SSL solo en local, no en Render
    import os
    port = int(os.environ.get('PORT', 5000))
    if 'RENDER' in os.environ:
        app.run(debug=False, host='0.0.0.0', port=port)
    else:
        app.run(debug=True, host='0.0.0.0', port=port, ssl_context='adhoc')
# 🔥 HASTA AQUÍ 🔥