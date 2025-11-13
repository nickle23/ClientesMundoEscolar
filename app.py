from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from database import db, User, Cliente
import re
import unicodedata
import sqlite3
import os
from datetime import datetime

# Configuración de la aplicación
app = Flask(__name__)
app.config['SECRET_KEY'] = 'tu_clave_secreta_muy_segura_aqui_123'

# ✅ CORRECCIÓN: Ruta ABSOLUTA para la base de datos
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'data', 'clientes.db')

# Crear carpeta data si no existe
os.makedirs(os.path.dirname(db_path), exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
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

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

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

# Crear tablas y usuario admin al inicio
with app.app_context():
    try:
        db.create_all()
        # 🔥 COMENTADO: Creación automática de usuario admin
        # Descomenta estas líneas si necesitas crear el usuario admin por primera vez
        '''
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', role='admin')
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Base de datos y usuario admin creados exitosamente")
        '''
        print("✅ Base de datos verificada correctamente")
    except Exception as e:
        print(f"❌ Error creando base de datos: {e}")
    except Exception as e:
        print(f"❌ Error creando base de datos: {e}")

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
