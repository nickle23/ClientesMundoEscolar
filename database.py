from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='trabajador')  # 'admin' o 'trabajador'
    activo = db.Column(db.Boolean, default=True)  # 🔥 NUEVO: para bloquear/activar
    fecha_creacion = db.Column(db.DateTime, default=db.func.current_timestamp())  # 🔥 NUEVO
    ultimo_acceso = db.Column(db.DateTime)  # 🔥 NUEVO
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    nombre_normalizado = db.Column(db.String(100), nullable=False)  # Para búsqueda
    direccion = db.Column(db.String(200))
    latitud = db.Column(db.Float, nullable=False)
    longitud = db.Column(db.Float, nullable=False)
    telefono = db.Column(db.String(20))
    categoria = db.Column(db.String(50))
    activo = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<Cliente {self.nombre}>'