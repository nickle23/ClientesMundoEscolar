# -*- coding: utf-8 -*-
"""
=============================================================================
GESTOR MAESTRO DEL SISTEMA DE CLIENTES - MUNDO ESCOLAR v3.9
# =============================================================================
Script UNIFICADO v3.9 - GUI + CLI PROFESIONAL
- Interfaz gráfica (GUI) profesional (Perfección Milimétrica)
- Menú de consola (CLI) de respaldo (Modo automático si no hay GUI)
- Gestión completa de usuarios y clientes
- Sincronización automática a sistema.json
- Sistema de respaldo y restauración
=============================================================================
"""

import os
import sys
import json
import hashlib
import sqlite3
import mimetypes
import base64
import shutil
import threading
import webbrowser
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import logging

# Intentar importar tkinter y componentes profesionales
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext, filedialog
    import tkintermapview
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False

# =============================================================================
# CONFIGURACIÓN GLOBAL
# =============================================================================

# Detectar si estamos ejecutando como EXE compilado o como script
if getattr(sys, 'frozen', False):
    # Estamos ejecutando como EXE compilado
    # sys.executable apunta al EXE, obtener su directorio
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Estamos ejecutando como script Python normal
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Construir rutas absolutas basadas en el directorio base
DB_PATH = os.path.join(BASE_DIR, 'data', 'clientes.db')
SISTEMA_JSON = os.path.join(BASE_DIR, 'data', 'sistema.json')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')

PORT = 8000

# Configurar logging para depuración profunda (después de definir BASE_DIR)
logging.basicConfig(
    filename=os.path.join(BASE_DIR, 'debug_sistema.log'),
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)
logging.info("Iniciando aplicación Gestor Maestro v3.9")

# =============================================================================
# UTILIDADES CORE (COMPARTIDAS)
# =============================================================================

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def inicializar_db():
    """Asegura que la base de datos y tablas existan"""
    # Crear directorio data si no existe (usando BASE_DIR para EXE o script)
    data_dir = os.path.join(BASE_DIR, 'data')
    os.makedirs(data_dir, exist_ok=True)
    # Asegurar que también existe el directorio de backups
    os.makedirs(BACKUP_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT,
            direccion TEXT,
            latitud REAL,
            longitud REAL,
            categoria TEXT,
            activo INTEGER DEFAULT 1,
            fecha_creacion TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            activo INTEGER DEFAULT 1,
            fecha_creacion TEXT,
            ultimo_acceso TEXT
        )
    ''')
    
    cursor.execute("SELECT count(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO usuarios (username, password, role, activo, fecha_creacion)
            VALUES (?, ?, ?, 1, ?)
        ''', ('admin', 'admin123', 'admin', datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    
    conn.commit()
    conn.close()

def generar_json_desde_db():
    """Genera archivo JSON unificado desde SQLite"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM clientes WHERE activo = 1")
        clientes = [dict(c) for c in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM usuarios")  # Exportar TODOS los usuarios (activos e inactivos)
        usuarios_raw = cursor.fetchall()
        conn.close()
        
        usuarios_json = []
        for u in usuarios_raw:
            u_json = dict(u)
            # Asegurar que el passwordHash esté sincronizado (si es necesario)
            if 'password' in u_json and u_json['password']:
                u_json['passwordHash'] = hash_password(str(u_json['password']))
            usuarios_json.append(u_json)
        
        sistema_data = {
            "version": "3.9.0",
            "ultima_actualizacion": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "timestamp": int(datetime.now().timestamp()), # Cache-busting real
            "usuarios": usuarios_json,
            "clientes": clientes
        }
        
        with open(SISTEMA_JSON, 'w', encoding='utf-8') as f:
            json.dump(sistema_data, f, ensure_ascii=False, indent=2)
            
        return True, len(clientes), len(usuarios_json)
    except Exception as e:
        return False, str(e), 0

def crear_backup_sistema():
    """Crea una copia física íntegra de la base de datos (Todo Incluido)"""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        # Contar contenido para reportar al usuario (Seguridad Súper Inteligente)
        conn = sqlite3.connect(DB_PATH)
        c_count = conn.execute("SELECT count(*) FROM clientes WHERE activo=1").fetchone()[0]
        u_count = conn.execute("SELECT count(*) FROM usuarios WHERE activo=1").fetchone()[0]
        conn.close()

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"respaldo_total_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        shutil.copy2(DB_PATH, backup_path)
        
        reporte = f"Respaldo Íntegro Creado: {c_count} Clientes, {u_count} Usuarios y Configuración."
        return True, backup_name, reporte
    except Exception as e:
        return False, str(e), ""

def listar_backups():
    """Retorna lista de archivos .db en la carpeta de backups"""
    if not os.path.exists(BACKUP_DIR): return []
    return [f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')]

def restaurar_backup_logic(filename):
    """Reemplaza la DB actual con un backup"""
    try:
        source = os.path.join(BACKUP_DIR, filename)
        if not os.path.exists(source): return False, "Archivo no encontrado"
        
        # Primero hacemos un backup de seguridad de lo actual
        crear_backup_sistema() 
        
        # Sobrescribir
        shutil.copy2(source, DB_PATH)
        generar_json_desde_db() # Sincronizar JSON tras restauración
        return True, "Sistema restaurado con éxito"
    except Exception as e:
        return False, str(e)

def validar_coordenadas(lat, lon):
    """Verifica que las coordenadas sean números válidos"""
    try:
        l, lo = float(lat), float(lon)
        if -90 <= l <= 90 and -180 <= lo <= 180:
            return True, l, lo
        return False, "Coordenadas fuera de rango", 0, 0
    except:
        return False, "Latitud y Longitud deben ser números", 0, 0

def limpiar_archivos_temporales_logic():
    """Lógica unificada de limpieza"""
    eliminados = 0
    mensajes = []
    if os.path.exists('__pycache__'):
        try:
            shutil.rmtree('__pycache__')
            mensajes.append("✅ Carpeta __pycache__ eliminada")
            eliminados += 1
        except Exception as e:
            mensajes.append(f"❌ Error eliminando __pycache__: {e}")
    
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.pyc'):
                try:
                    os.remove(os.path.join(root, file))
                    eliminados += 1
                except: pass
    
    if eliminados > 0:
        mensajes.append(f"✅ Se eliminaron {eliminados} archivos temporales")
    else:
        mensajes.append("✅ El sistema ya está limpio")
    return eliminados, mensajes

# =============================================================================
# MÓDULO GUI (INTERFAZ GRÁFICA)
# =============================================================================

if GUI_AVAILABLE:
    class GestorGUI:
        def __init__(self, root):
            self.root = root
            self.root.title("GESTOR MAESTRO - SISTEMA DE CLIENTES v4.4")
            self.centrar_ventana(self.root, 750, 550)
            self.servidor_activo = False
            self.servidor_thread = None
            self.iniciar_servidor_automatico()
            self.crear_interfaz()

        def iniciar_servidor_automatico(self):
            """Inicia el servidor web en segundo plano al arrancar la app"""
            try:
                self.servidor_thread = threading.Thread(target=self.run_server, daemon=True)
                self.servidor_thread.start()
                self.servidor_activo = True
                logging.info(f"🌐 Servidor automático iniciado en http://localhost:{PORT}")
            except Exception as e:
                logging.error(f"❌ Fallo al iniciar servidor automático: {e}")

        def centrar_ventana(self, ventana, ancho, alto):
            """Centra cualquier ventana en la pantalla"""
            ventana.update_idletasks()
            sw = ventana.winfo_screenwidth()
            sh = ventana.winfo_screenheight()
            x = (sw // 2) - (ancho // 2)
            y = (sh // 2) - (alto // 2)
            ventana.geometry(f"{ancho}x{alto}+{x}+{y}")

        def chequear_salud_sistema(self):
            """Verifica la integridad de los datos y sincronización"""
            try:
                conn = sqlite3.connect(DB_PATH)
                c_db = conn.execute("SELECT count(*) FROM clientes WHERE activo=1").fetchone()[0]
                u_db = conn.execute("SELECT count(*) FROM usuarios WHERE activo=1").fetchone()[0]
                conn.close()
                
                with open(SISTEMA_JSON, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    c_js = len(data.get('clientes', []))
                    u_js = len(data.get('usuarios', []))
                
                if c_db == c_js and u_db == u_js:
                    messagebox.showinfo("Salud del Sistema", f"✅ SISTEMA PERFECTO\n\nClientes: {c_db}\nUsuarios: {u_db}\nSincronización JSON: OK")
                else:
                    if messagebox.askyesno("Discrepancia detectada", 
                        f"⚠️ El archivo JSON no coincide con la base de datos.\n\nDB: {c_db} cli / {u_db} usr\nJSON: {c_js} cli / {u_js} usr\n\n¿Deseas reparar la sincronización ahora?"):
                        generar_json_desde_db()
                        messagebox.showinfo("Reparado", "Sincronización restaurada milimétricamente.")
            except Exception as e:
                messagebox.showerror("Error de Diagnóstico", str(e))

        def crear_interfaz(self):
            """Panel principal profesional y moderno - TEMA OFFICE"""
            # Colores office
            BG = "#f5f6fa"
            HEADER = "#2c3e50"
            WHITE = "#ffffff"
            
            # Frame principal con fondo office
            main_frame = tk.Frame(self.root, bg=BG)
            main_frame.pack(expand=True, fill="both")
            
            # Título con estilo office
            title_frame = tk.Frame(main_frame, bg=BG)
            title_frame.pack(pady=30)
            
            tk.Label(title_frame, text="SISTEMA DE GESTIÓN MAESTRA", 
                    font=("Segoe UI", 20, "bold"), bg=BG, fg=HEADER).pack()
            tk.Label(title_frame, text="MUNDO ESCOLAR v5.0", 
                    font=("Segoe UI", 11, "italic"), bg=BG, fg="#7f8c8d").pack(pady=5)
            
            # Frame de botones con grid
            btn_frame = tk.Frame(main_frame, bg=BG)
            btn_frame.pack(pady=20)
            
            # Configurar grid de botones (2 columnas)
            btn_frame.columnconfigure(0, weight=1)
            btn_frame.columnconfigure(1, weight=1)
            
            buttons = [
                ("👥", "GESTIÓN DE USUARIOS", self.ventana_usuarios, "#3498db"),
                ("📋", "GESTIÓN DE CLIENTES", self.ventana_clientes, "#2ecc71"),
                ("📦", "REPORTE Y SYNC", self.generar_json_gui, "#9b59b6"),
                ("💾", "BACKUPS Y RESTAURAR", self.ventana_backups, "#e67e22"),
                ("🩺", "DIAGNÓSTICO", self.chequear_salud_sistema, "#1abc9c"),
                ("🌐", "SERVIDOR WEB", self.toggle_servidor, "#34495e"),
                ("🧹", "LIMPIEZA", self.limpiar_gui, "#95a5a6"),
                ("❌", "SALIR", self.root.quit, "#e74c3c")
            ]
            
            for i, (icon, text, cmd, color) in enumerate(buttons):
                row = i // 2
                col = i % 2
                
                btn = tk.Button(btn_frame, 
                              text=f"  {icon}  {text}",
                              bg=color, fg="white", 
                              font=("Segoe UI", 9, "bold"),
                              width=22, height=1,
                              cursor="hand2", command=cmd,
                              relief=tk.FLAT, bd=0, padx=10, pady=8)
                btn.grid(row=row, column=col, padx=6, pady=6, sticky="ew")
                
                # Efecto hover
                btn.bind("<Enter>", lambda e, b=btn: b.config(bg=self.hover_color(color)))
                btn.bind("<Leave>", lambda e, b=btn, c=color: b.config(bg=c))
                
                if "SERVIDOR" in text: self.btn_servidor = btn
            
            # Pie de página
            tk.Label(main_frame, text="© 2024 Mundo Escolar - Sistema de Gestión de Clientes",
                    font=("Segoe UI", 8), bg=BG, fg="#7f8c8d").pack(side=tk.BOTTOM, pady=15)
            
            self.btn_frame = btn_frame
        
        def hover_color(self, color):
            """Retorna un color más claro para hover"""
            colors = {
                "#3498db": "#5dade2",
                "#2ecc71": "#58d68d",
                "#9b59b6": "#af7ac5",
                "#e67e22": "#eb984e",
                "#1abc9c": "#48c9b0",
                "#34495e": "#5d6d7e",
                "#95a5a6": "#abb2b9",
                "#e74c3c": "#ec7063"
            }
            return colors.get(color, color)

        def generar_json_gui(self):
            success, c, u = generar_json_desde_db()
            if success:
                messagebox.showinfo("Éxito", f"Exportados {c} clientes y {u} usuarios a sistema.json")
            else:
                messagebox.showerror("Error", c)

        def limpiar_gui(self):
            _, msgs = limpiar_archivos_temporales_logic()
            messagebox.showinfo("Limpieza", "\n".join(msgs))

        def toggle_servidor(self):
            if self.servidor_activo:
                messagebox.showinfo("Servidor", f"El servidor ya está activo en: http://localhost:{PORT}\n\nSe inició automáticamente para mantener la web sincronizada.")
                webbrowser.open(f"http://localhost:{PORT}")
            else:
                self.iniciar_servidor_automatico()
                if self.servidor_activo:
                    messagebox.showinfo("Servidor", f"Servidor activado manualmente en: http://localhost:{PORT}")
                    webbrowser.open(f"http://localhost:{PORT}")

        def run_server(self):
            httpd = HTTPServer(('', PORT), UnifiedHandler)
            httpd.serve_forever()

        def ventana_usuarios(self):
            """Ventana de gestión de usuarios - TEMA OFICINA PROFESIONAL"""
            # Colores profesionales oficina
            BG = "#f5f6fa"           # Fondo gris muy claro
            SURFACE = "#ffffff"      # Blanco superficie
            TEXT = "#2c3e50"         # Texto azul gris oscuro
            TEXT_DIM = "#7f8c8d"    # Gris texto secundario
            BLUE = "#2c3e50"        # Azul gris header
            BLUE_LIGHT = "#34495e"  # Azul gris más claro
            GREEN = "#27ae60"       # Verde office
            YELLOW = "#f39c12"      # Amarillo warning
            RED = "#c0392b"         # Rojo office
            WHITE = "#ffffff"
            
            ventana = tk.Toplevel(self.root)
            ventana.title("Gestión de Usuarios")
            self.centrar_ventana(ventana, 700, 500)
            ventana.configure(bg=BG)
            self.OfficeTheme.aplicar(ventana)
            
            # Header compacto
            header = tk.Frame(ventana, bg=BLUE, height=45)
            header.pack(fill=tk.X)
            header.pack_propagate(False)
            tk.Label(header, text="👥 Gestión de Usuarios", font=("Segoe UI", 13, "bold"), 
                    bg=BLUE, fg=WHITE).pack(pady=10)
            
            # Main frame
            main = tk.Frame(ventana, bg=BG)
            main.pack(fill=tk.BOTH, expand=True, padx=15, pady=12)
            
            # Style
            style = ttk.Style()
            style.theme_use("clam")
            style.configure("Treeview", 
                          background=SURFACE, 
                          foreground=TEXT, 
                          fieldbackground=SURFACE, 
                          font=("Segoe UI", 9), 
                          rowheight=26)
            style.configure("Treeview.Heading", 
                          bg=BLUE_LIGHT, 
                          fg=WHITE, 
                          font=("Segoe UI", 11, "bold"))
            style.map("Treeview", 
                     background=[("selected", BLUE_LIGHT)], 
                     foreground=[("selected", WHITE)])
            
            # Tree
            tree = ttk.Treeview(main, columns=("ID", "Usuario", "Contraseña", "Estado"), 
                               show="headings", style="Treeview",
                               selectmode="browse")
            for col in ("ID", "Usuario", "Contraseña", "Estado"):
                tree.heading(col, text=col)
                tree.column(col, width=200 if col not in ["ID"] else 80, anchor=tk.CENTER)
            
            scroll = ttk.Scrollbar(main, orient=tk.VERTICAL, command=tree.yview)
            tree.configure(yscroll=scroll.set)
            tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            scroll.pack(side=tk.RIGHT, fill=tk.Y)
            
            def cargar():
                for i in tree.get_children(): tree.delete(i)
                conn = sqlite3.connect(DB_PATH)
                for u in conn.execute("SELECT id, username, password, activo FROM usuarios"):
                    tree.insert("", tk.END, values=(u[0], u[1], "••••••••", "✅ Activo" if u[3] else "❌ Inactivo"))
                conn.close()
            
            # Botones compactos
            btn_frame = tk.Frame(ventana, bg=BG)
            btn_frame.pack(fill=tk.X, padx=8, pady=5)
            
            def btn(icon, txt, cmd, color):
                b = tk.Button(btn_frame, 
                             text=f"{icon} {txt}", 
                             bg=color, 
                             fg=WHITE,
                             font=("Segoe UI", 8, "bold"), 
                             bd=0,
                             cursor="hand2",
                             relief=tk.FLAT,
                             padx=8,
                             pady=4,
                             command=cmd)
                b.pack(side=tk.LEFT, padx=3)
                
                def on_enter(e): b.config(bg="#2980b9", fg=WHITE)
                def on_leave(e): b.config(bg=color, fg=WHITE)
                b.bind("<Enter>", on_enter)
                b.bind("<Leave>", on_leave)
                return b
            
            def recargar():
                cargar()
            
            btn("➕", "NUEVO USUARIO", lambda: self.crear_usuario_gui(ventana, recargar), GREEN)
            btn("✏️", "EDITAR", lambda: self.editar_usuario_gui(tree, ventana, recargar), YELLOW)
            btn("🗑️", "ELIMINAR", lambda: self.eliminar_usuario_gui(tree, ventana, recargar), RED)
            btn("✖️", "CERRAR", ventana.destroy, "#5a6c7d")
            
            cargar()

        def ventana_clientes(self):
            """Ventana de clientes - TEMA OFICINA PROFESIONAL"""
            # Colores profesionales oficina
            BG = "#f5f6fa"
            SURFACE = "#ffffff"
            TEXT = "#2c3e50"
            TEXT_DIM = "#7f8c8d"
            BLUE = "#2c3e50"
            BLUE_LIGHT = "#34495e"
            GREEN = "#27ae60"
            YELLOW = "#f39c12"
            RED = "#c0392b"
            CYAN = "#16a085"
            WHITE = "#ffffff"
            
            ventana = tk.Toplevel(self.root)
            ventana.title("Panel de Clientes")
            self.centrar_ventana(ventana, 900, 600)
            ventana.configure(bg=BG)
            self.OfficeTheme.aplicar(ventana)
            
            # Header compacto
            header = tk.Frame(ventana, bg=BLUE, height=45)
            header.pack(fill=tk.X)
            header.pack_propagate(False)
            tk.Label(header, text="🏢 Clientes", font=("Segoe UI", 13, "bold"), 
                    bg=BLUE, fg=WHITE).pack(side=tk.LEFT, padx=15, pady=10)
            
            # Buscador
            search_frame = tk.Frame(header, bg=BLUE)
            search_frame.pack(side=tk.RIGHT, padx=15, pady=10)
            tk.Label(search_frame, text="🔍", bg=BLUE, fg=WHITE, font=("Segoe UI", 11)).pack(side=tk.LEFT)
            e_buscar = tk.Entry(search_frame, width=25, font=("Segoe UI", 9), bg=SURFACE, fg=TEXT, relief=tk.FLAT)
            e_buscar.pack(side=tk.LEFT, padx=8)
            
            # Paneles
            content = tk.PanedWindow(ventana, orient=tk.HORIZONTAL, bg=BG, sashrelief=tk.FLAT, sashwidth=4)
            content.pack(fill=tk.BOTH, expand=True, padx=15, pady=12)
            
            # Panel tabla
            left = tk.Frame(content, bg=BG)
            content.add(left, width=450)
            
            # Estilo tabla
            style = ttk.Style()
            style.theme_use("clam")
            style.configure("Treeview", background=SURFACE, foreground=TEXT, 
                          fieldbackground=SURFACE, font=("Segoe UI", 9), rowheight=26)
            style.configure("Treeview.Heading", bg=BLUE_LIGHT, fg=WHITE, 
                          font=("Segoe UI", 9, "bold"))
            style.map("Treeview", background=[("selected", BLUE_LIGHT)], foreground=[("selected", WHITE)])
            
            cols = ("ID", "Nombre", "Categoría", "Teléfono", "Dirección")
            tree = ttk.Treeview(left, columns=cols, show="headings", style="Treeview", selectmode="browse")
            for c in cols:
                tree.heading(c, text=c)
                tree.column(c, width=130 if c not in ["Nombre", "Dirección"] else 180)
            
            # Scrollbars siempre visibles
            scroll = ttk.Scrollbar(left, orient=tk.VERTICAL, command=tree.yview)
            tree.configure(yscroll=scroll.set)
            scroll.pack(side=tk.RIGHT, fill=tk.Y)
            
            # Scroll horizontal siempre visible
            scrollh = ttk.Scrollbar(left, orient=tk.HORIZONTAL, command=tree.xview)
            tree.configure(xscroll=scrollh.set)
            scrollh.pack(side=tk.BOTTOM, fill=tk.X)
            
            # Treeview.pack al final sin expand para que scrollbars siempre visibles
            tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=False)
            
            # Panel mapa
            right = tk.LabelFrame(content, text="🗺️ VISOR GEOGRÁFICO", bg=SURFACE, fg=BLUE, 
                               font=("Segoe UI", 12, "bold"))
            content.add(right, width=850)
            right.columnconfigure(0, weight=1)
            right.rowconfigure(0, weight=1)
            
            map_cont = tk.Frame(right, bg="white", bd=3, relief=tk.SUNKEN)
            map_cont.grid(row=0, column=0, sticky="nsew", padx=12, pady=12)
            map_cont.columnconfigure(0, weight=1)
            map_cont.rowconfigure(0, weight=1)
            
            self.map_widget = tkintermapview.TkinterMapView(map_cont, corner_radius=5)
            self.map_widget.grid(row=0, column=0, sticky="nsew")
            
            try:
                self.map_widget.set_tile_server("https://mt0.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}", max_zoom=22)
            except:
                self.map_widget.set_tile_server("https://a.tile.openstreetmap.org/{z}/{x}/{y}.png")
            
            self.marcadores_clientes = {}
            self.resaltado_actual = None
            self.mapa_inicializado = False
            
            def actualizar_mapa():
                try:
                    if self.mapa_inicializado:
                        return
                    self.map_widget.update_idletasks()
                    if self.map_widget.winfo_width() < 100:
                        ventana.after(500, actualizar_mapa)
                        return
                    
                    conn = sqlite3.connect(DB_PATH)
                    pts = conn.execute("SELECT id, nombre, latitud, longitud FROM clientes WHERE activo=1 AND latitud != 0").fetchall()
                    conn.close()
                    
                    if pts:
                        self.map_widget.delete_all_marker()
                        self.marcadores_clientes = {}
                        for id_c, nombre, lat, lon in pts:
                            try:
                                fl, flo = float(lat), float(lon)
                                if abs(fl) > 0.01:
                                    m = self.map_widget.set_marker(fl, flo, text=nombre, marker_color_circle="#3498db", marker_color_outside="#2980b9")
                                    self.marcadores_clientes[id_c] = {"m": m, "nombre": nombre, "lat": fl, "lon": flo}
                            except:
                                continue
                        lats = [float(p[2]) for p in pts if abs(float(p[2])) > 0.01]
                        lons = [float(p[3]) for p in pts if abs(float(p[3])) > 0.01]
                        if lats:
                            self.map_widget.set_position(sum(lats)/len(lats), sum(lons)/len(lons))
                            self.map_widget.set_zoom(14)
                        self.mapa_inicializado = True
                except Exception as e:
                    print(f"Error mapa: {e}")
            
            # Seleccionar cliente en mapa
            def al_seleccionar(event):
                sel = tree.selection()
                if not sel:
                    return
                try:
                    valores = tree.item(sel[0])["values"]
                    cliente_id = valores[0]
                    
                    if cliente_id in self.marcadores_clientes:
                        data = self.marcadores_clientes[cliente_id]
                        
                        if self.resaltado_actual:
                            try:
                                self.resaltado_actual.delete()
                            except:
                                pass
                        
                        self.map_widget.set_position(data["lat"], data["lon"])
                        self.map_widget.set_zoom(17)
                        
                        self.resaltado_actual = self.map_widget.set_marker(
                            data["lat"], data["lon"], text="",
                            marker_color_circle=YELLOW,
                            marker_color_outside="#f39c12"
                        )
                except Exception as e:
                    print(f"Error al seleccionar: {e}")
            
            tree.bind("<<TreeviewSelect>>", al_seleccionar)
            
            def cargar(filtro=""):
                for i in tree.get_children(): tree.delete(i)
                try:
                    conn = sqlite3.connect(DB_PATH)
                    if filtro:
                        data = conn.execute("SELECT id, nombre, categoria, telefono, direccion, latitud, longitud FROM clientes WHERE activo=1 AND (nombre LIKE ? OR categoria LIKE ?) ORDER BY nombre", (f"%{filtro}%", f"%{filtro}%")).fetchall()
                    else:
                        data = conn.execute("SELECT id, nombre, categoria, telefono, direccion, latitud, longitud FROM clientes WHERE activo=1 ORDER BY nombre").fetchall()
                    for c in data: tree.insert("", tk.END, values=c)
                    conn.close()
                except Exception as e:
                    print(f"Error cargar: {e}")
            
            e_buscar.bind("<KeyRelease>", lambda e: cargar(e_buscar.get()))
            
            def ver_mapa():
                sel = tree.selection()
                if not sel: 
                    messagebox.showwarning("Aviso", "Selecciona un cliente")
                    return
                c = tree.item(sel[0])["values"]
                if c[5] and c[6]:
                    webbrowser.open(f"https://www.google.com/maps/search/?api=1&query={c[5]},{c[6]}")
                else:
                    messagebox.showerror("Error", "Coordenadas no válidas")
            
            # Botones compactos
            btns = tk.Frame(ventana, bg=BG)
            btns.pack(fill=tk.X, padx=8, pady=5)
            
            def btn(icon, txt, cmd, color):
                b = tk.Button(btns, text=f"{icon} {txt}", bg=color, fg=WHITE,
                             font=("Segoe UI", 8, "bold"), bd=0, cursor="hand2", 
                             relief=tk.FLAT, padx=8, pady=4, command=cmd)
                b.pack(side=tk.LEFT, padx=3)
                
                def on_enter(e): b.config(bg="#2980b9", fg=WHITE)
                def on_leave(e): b.config(bg=color, fg=WHITE)
                b.bind("<Enter>", on_enter)
                b.bind("<Leave>", on_leave)
                return b
            
            btn("➕", "NUEVO CLIENTE", lambda: self.crear_cliente_gui(ventana, lambda: (cargar(), actualizar_mapa())), GREEN)
            btn("✏️", "EDITAR", lambda: self.editar_cliente_gui(tree, ventana, lambda: (cargar(), actualizar_mapa())), YELLOW)
            btn("🗑️", "ELIMINAR", lambda: self.eliminar_cliente_gui(tree, ventana, lambda: (cargar(), actualizar_mapa())), RED)
            btn("🌍", "GOOGLE MAPS", ver_mapa, CYAN)
            btn("✖️", "CERRAR", ventana.destroy, "#5a6c7d")
            
            ventana.after(300, lambda: (cargar(), actualizar_mapa()))

        def recargar_mapa_en_panel(self):
            """Recarga los marcadores del mapa en el panel de clientes ya abierto"""
            try:
                if hasattr(self, 'map_widget') and self.map_widget is not None:
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, nombre, latitud, longitud FROM clientes WHERE activo=1 AND latitud != 0")
                    puntos = cursor.fetchall()
                    conn.close()
                    
                    if puntos:
                        self.map_widget.delete_all_marker()
                        self.marcadores_clientes = {}
                        
                        for id_c, nombre, lat, lon in puntos:
                            try:
                                f_lat, f_lon = float(lat), float(lon)
                                if abs(f_lat) > 0.01:
                                    m = self.map_widget.set_marker(
                                        f_lat, f_lon, text=nombre,
                                        marker_color_circle="#3498db",
                                        marker_color_outside="#2980b9"
                                    )
                                    self.marcadores_clientes[id_c] = {
                                        "m": m, "nombre": nombre,
                                        "lat": f_lat, "lon": f_lon
                                    }
                            except:
                                continue
                        
                        logging.info(f"✅ Mapa actualizado: {len(self.marcadores_clientes)} clientes")
            except Exception as e:
                logging.error(f"Error al recargar mapa: {e}")

        # ==================== TEMA OFFICE PROFESIONAL ====================
        class OfficeTheme:
            COLOR_BG = "#f5f6fa"
            COLOR_SURFACE = "#ffffff"
            COLOR_HEADER = "#2c3e50"
            COLOR_HEADER_LIGHT = "#34495e"
            COLOR_TEXT = "#2c3e50"
            COLOR_TEXT_DIM = "#7f8c8d"
            COLOR_WHITE = "#ffffff"
            COLOR_GREEN = "#27ae60"
            COLOR_YELLOW = "#f39c12"
            COLOR_RED = "#c0392b"
            COLOR_CYAN = "#16a085"

            @staticmethod
            def aplicar(widget):
                try:
                    if isinstance(widget, ttk.Treeview):
                        s = ttk.Style()
                        s.theme_use("clam")
                        s.configure("Treeview", background=OfficeTheme.COLOR_SURFACE,
                                   foreground=OfficeTheme.COLOR_TEXT,
                                   fieldbackground=OfficeTheme.COLOR_SURFACE,
                                   font=("Segoe UI", 9), rowheight=26)
                        s.configure("Treeview.Heading", background=OfficeTheme.COLOR_HEADER_LIGHT,
                                   foreground=OfficeTheme.COLOR_WHITE, font=("Segoe UI", 9, "bold"))
                        s.map("Treeview", background=[("selected", OfficeTheme.COLOR_HEADER_LIGHT)],
                             foreground=[("selected", OfficeTheme.COLOR_WHITE)])
                    else:
                        cls = widget.winfo_class()
                        if cls in ("Frame", "TFrame"):
                            widget.configure(bg=OfficeTheme.COLOR_BG)
                        elif cls == "Label":
                            widget.configure(bg=OfficeTheme.COLOR_BG, fg=OfficeTheme.COLOR_TEXT)
                        elif cls in ("Button", "TButton"):
                            widget.configure(bg=OfficeTheme.COLOR_HEADER, fg=OfficeTheme.COLOR_WHITE,
                                           activebackground=OfficeTheme.COLOR_HEADER_LIGHT)
                        elif cls == "Entry":
                            widget.configure(bg=OfficeTheme.COLOR_SURFACE, fg=OfficeTheme.COLOR_TEXT)
                        elif cls == "Checkbutton":
                            widget.configure(bg=OfficeTheme.COLOR_BG, fg=OfficeTheme.COLOR_TEXT,
                                           selectcolor=OfficeTheme.COLOR_SURFACE)
                    for child in getattr(widget, "winfo_children", lambda: [])():
                        OfficeTheme.aplicar(child)
                except:
                    pass

        # ==================== MÉTODOS CRUD UNIFORMES ====================
        
        # Colores profesionales oficina - tonos claros y serios
        COLOR_BG = "#f5f6fa"
        COLOR_SURFACE = "#ffffff"
        COLOR_HEADER = "#2c3e50"
        COLOR_HEADER_LIGHT = "#34495e"
        COLOR_TEXT = "#2c3e50"
        COLOR_TEXT_DIM = "#7f8c8d"
        COLOR_GREEN = "#27ae60"
        COLOR_YELLOW = "#f39c12"
        COLOR_RED = "#c0392b"
        COLOR_CYAN = "#16a085"
        COLOR_WHITE = "#ffffff"
        
        def crear_usuario_gui(self, parent, callback):
            """Crear usuario - Tema oficina"""
            ventana = tk.Toplevel(parent)
            ventana.title("Nuevo Usuario")
            self.centrar_ventana(ventana, 400, 380)
            ventana.configure(bg=self.COLOR_BG)
            self.OfficeTheme.aplicar(ventana)
            
            # Header
            tk.Label(ventana, text="➕ NUEVO USUARIO", font=("Segoe UI", 14, "bold"),
                    bg=self.COLOR_HEADER, fg=self.COLOR_WHITE).pack(fill=tk.X, pady=0)
            
            # Frame
            frame = tk.Frame(ventana, bg=self.COLOR_BG)
            frame.pack(expand=True, fill=tk.BOTH, padx=30, pady=20)
            
            tk.Label(frame, text="Usuario:", font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=0, column=0, sticky=tk.W, pady=12)
            e_user = tk.Entry(frame, width=22, font=("Segoe UI", 11), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, relief=tk.FLAT)
            e_user.grid(row=0, column=1, pady=12, padx=10)
            
            # Contraseña con ojito
            tk.Label(frame, text="Contraseña:", font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=1, column=0, sticky=tk.W, pady=12)
            e_pass = tk.Entry(frame, width=22, font=("Segoe UI", 11), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, show="•", relief=tk.FLAT)
            e_pass.grid(row=1, column=1, pady=12, padx=10)
            
            # Botón ojito para mostrar/ocultar contraseña
            def toggle_password():
                if e_pass.cget("show") == "•":
                    e_pass.config(show="")
                    btn_ojo.config(text="👁️")
                else:
                    e_pass.config(show="•")
                    btn_ojo.config(text="👁️")
            
            btn_ojo = tk.Button(frame, text="👁️", font=("Segoe UI", 10), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, 
                               relief=tk.FLAT, bd=0, cursor="hand2", command=toggle_password, padx=5, pady=3)
            btn_ojo.grid(row=1, column=2, pady=8, padx=3)
            
            # Checkbox activo
            var_activo = tk.IntVar(value=1)
            chk_activo = tk.Checkbutton(frame, text="Usuario activo", font=("Segoe UI", 9), bg=self.COLOR_BG, fg=self.COLOR_TEXT,
                                       variable=var_activo, activebackground=self.COLOR_BG, selectcolor=self.COLOR_SURFACE)
            chk_activo.grid(row=2, column=1, sticky=tk.W, pady=8)
            
            def guardar():
                u, p = e_user.get().strip(), e_pass.get().strip()
                if not u or not p:
                    messagebox.showwarning("Error", "Todos los campos son obligatorios")
                    return
                activo = 1 if var_activo.get() else 0
                conn = sqlite3.connect(DB_PATH)
                curr = conn.cursor()
                try:
                    curr.execute("INSERT INTO usuarios (username, password, role, activo, fecha_creacion) VALUES (?,?,'trabajador',?,?)",
                                (u, p, activo, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
                    conn.commit()
                    conn.close()
                    generar_json_desde_db()
                    callback()
                    messagebox.showinfo("Éxito", f"Usuario '{u}' creado correctamente")
                    ventana.destroy()
                    parent.lift()
                    parent.focus_force()
                except:
                    messagebox.showerror("Error", "El usuario ya existe")
                    conn.close()
            
            tk.Button(frame, text="💾 GUARDAR", bg=self.COLOR_GREEN, fg=self.COLOR_WHITE,
                     font=("Segoe UI", 9, "bold"), command=guardar,
                     width=15, padx=10, pady=6, relief=tk.FLAT, bd=0, cursor="hand2").grid(row=3, column=0, columnspan=3, pady=15)

        def editar_usuario_gui(self, tree, parent, callback):
            """Editar usuario - Tema uniforme"""
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Aviso", "Selecciona un usuario")
                return
            
            uid = tree.item(sel[0])['values'][0]
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            u = conn.cursor().execute("SELECT * FROM usuarios WHERE id=?", (uid,)).fetchone()
            conn.close()
            
            ventana = tk.Toplevel(parent)
            ventana.title("Editar Usuario")
            self.centrar_ventana(ventana, 400, 400)
            ventana.configure(bg=self.COLOR_BG)
            self.OfficeTheme.aplicar(ventana)
            
            tk.Label(ventana, text="✏️ EDITAR USUARIO", font=("Segoe UI", 14, "bold"),
                    bg=self.COLOR_YELLOW, fg=self.COLOR_BG).pack(fill=tk.X, pady=0)
            
            frame = tk.Frame(ventana, bg=self.COLOR_BG)
            frame.pack(expand=True, fill=tk.BOTH, padx=30, pady=20)
            
            tk.Label(frame, text="Usuario:", font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=0, column=0, sticky=tk.W, pady=12)
            e_u = tk.Entry(frame, width=22, font=("Segoe UI", 11), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, relief=tk.FLAT)
            e_u.insert(0, u['username'])
            e_u.grid(row=0, column=1, pady=12, padx=10)
            
            # Contraseña con ojito
            tk.Label(frame, text="Contraseña:", font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=1, column=0, sticky=tk.W, pady=12)
            e_p = tk.Entry(frame, width=22, font=("Segoe UI", 11), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, show="•", relief=tk.FLAT)
            e_p.insert(0, u['password'])
            e_p.grid(row=1, column=1, pady=12, padx=10)
            
            # Botón ojito para mostrar/ocultar contraseña
            def toggle_password():
                if e_p.cget("show") == "•":
                    e_p.config(show="")
                    btn_ojo.config(text="👁️")
                else:
                    e_p.config(show="•")
                    btn_ojo.config(text="👁️")
            
            btn_ojo = tk.Button(frame, text="👁️", font=("Segoe UI", 10), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, 
                               relief=tk.FLAT, bd=0, cursor="hand2", command=toggle_password, padx=5, pady=3)
            btn_ojo.grid(row=1, column=2, pady=8, padx=3)
            
            # Checkbox activo
            var_activo = tk.IntVar(value=u['activo'])
            chk_activo = tk.Checkbutton(frame, text="Usuario activo", font=("Segoe UI", 9), bg=self.COLOR_BG, fg=self.COLOR_TEXT,
                                       variable=var_activo, activebackground=self.COLOR_BG, selectcolor=self.COLOR_SURFACE)
            chk_activo.grid(row=2, column=1, sticky=tk.W, pady=8)
            
            def guardar():
                nu, np = e_u.get().strip(), e_p.get().strip()
                if not nu:
                    messagebox.showwarning("Error", "El usuario no puede estar vacío")
                    return
                activo = 1 if var_activo.get() else 0
                conn = sqlite3.connect(DB_PATH)
                curr = conn.cursor()
                if np:
                    curr.execute("UPDATE usuarios SET username=?, password=?, activo=? WHERE id=?", (nu, np, activo, uid))
                else:
                    curr.execute("UPDATE usuarios SET username=?, activo=? WHERE id=?", (nu, activo, uid))
                conn.commit()
                conn.close()
                generar_json_desde_db()
                callback()
                messagebox.showinfo("Éxito", f"Usuario '{nu}' actualizado correctamente")
                ventana.destroy()
                parent.lift()
                parent.focus_force()
            
            tk.Button(frame, text="💾 ACTUALIZAR", bg=self.COLOR_YELLOW, fg=self.COLOR_BG,
                     font=("Segoe UI", 9, "bold"), command=guardar,
                     width=15, padx=10, pady=6, relief=tk.FLAT, bd=0, cursor="hand2").grid(row=3, column=0, columnspan=3, pady=15)

        def eliminar_usuario_gui(self, tree, parent, callback):
            """Eliminar usuario - Tema uniforme"""
            sel = tree.selection()
            if not sel:
                return
            uid, name = tree.item(sel[0])['values'][0], tree.item(sel[0])['values'][1]
            
            if messagebox.askyesno("Confirmar", f"¿Eliminar al usuario '{name}'?"):
                conn = sqlite3.connect(DB_PATH)
                conn.cursor().execute("DELETE FROM usuarios WHERE id=?", (uid,))
                conn.commit()
                conn.close()
                generar_json_desde_db()
                callback()
                messagebox.showinfo("Eliminado", f"Usuario '{name}' eliminado correctamente")

        def crear_cliente_gui(self, parent, callback):
            """Crear cliente - Tema uniforme"""
            ventana = tk.Toplevel(parent)
            ventana.title("Nuevo Cliente")
            self.centrar_ventana(ventana, 450, 500)
            ventana.configure(bg=self.COLOR_BG)
            self.OfficeTheme.aplicar(ventana)
            
            tk.Label(ventana, text="➕ NUEVO CLIENTE", font=("Segoe UI", 14, "bold"),
                    bg=self.COLOR_HEADER, fg=self.COLOR_WHITE).pack(fill=tk.X, pady=0)
            
            frame = tk.Frame(ventana, bg=self.COLOR_BG)
            frame.pack(expand=True, fill=tk.BOTH, padx=30, pady=20)
            
            entries = {}
            campos = [("Nombre:", "n", 30), ("Teléfono:", "t", 30), ("Dirección:", "d", 30), ("Latitud:", "lat", 30), ("Longitud:", "lon", 30)]
            
            for i, (l, k, w) in enumerate(campos):
                tk.Label(frame, text=l, font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=i, column=0, sticky=tk.W, pady=10)
                entries[k] = tk.Entry(frame, width=w, font=("Segoe UI", 11), bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, relief=tk.FLAT)
                entries[k].grid(row=i, column=1, pady=10, padx=10)
            
            tk.Label(frame, text="Categoría:", font=("Segoe UI", 11), bg=self.COLOR_BG, fg=self.COLOR_TEXT).grid(row=5, column=0, sticky=tk.W, pady=10)
            c_cat = ttk.Combobox(frame, values=["Librería", "Papelería", "Colegio", "Distribuidor", "Bodega", "Otro"], width=28, font=("Segoe UI", 11))
            c_cat.set("Librería")
            c_cat.grid(row=5, column=1, pady=10, padx=10)
            
            popup = tk.Toplevel(ventana)
            popup.withdraw()
            popup.overrideredirect(True)
            popup.configure(bg=self.COLOR_SURFACE)
            
            popup_listbox = tk.Listbox(popup, width=45, height=0, font=("Segoe UI", 10),
                                       bg=self.COLOR_SURFACE, fg=self.COLOR_TEXT, relief=tk.FLAT, bd=0,
                                       highlightthickness=1, highlightbackground=self.COLOR_YELLOW)
            popup_listbox.pack()
            
            def mostrar_coincidencias():
                nombre = entries['n'].get().strip()
                if len(nombre) < 2:
                    popup.withdraw()
                    return
                
                conn = sqlite3.connect(DB_PATH)
                res = conn.execute("SELECT nombre, telefono FROM clientes WHERE nombre LIKE ? AND activo=1 LIMIT 5", (f"%{nombre}%",)).fetchall()
                conn.close()
                
                popup_listbox.delete(0, tk.END)
                if res:
                    popup_listbox.configure(height=min(len(resultados := res), 4))
                    for r in resultados:
                        popup_listbox.insert(tk.END, f"{r[0]}  |  {r[1] or 'Sin teléfono'}")
                    
                    x = entries['n'].winfo_rootx()
                    y = entries['n'].winfo_rooty() + entries['n'].winfo_height()
                    popup.geometry(f"+{x}+{y}")
                    popup.deiconify()
                else:
                    popup.withdraw()
            
            entries['n'].bind("<KeyRelease>", lambda e: mostrar_coincidencias())
            
            def ocultar_popup(event):
                if not popup.winfo_viewable():
                    return
                x, y = event.x_root, event.y_root
                px, py = popup.winfo_rootx(), popup.winfo_rooty()
                pw, ph = popup.winfo_width(), popup.winfo_height()
                if not (px <= x <= px + pw and py <= y <= py + ph):
                    popup.withdraw()
            
            ventana.bind("<Button-1>", ocultar_popup)
            
            def guardar():
                popup.withdraw()
                d = {k: v.get().strip() for k, v in entries.items()}
                if not d['n']:
                    messagebox.showerror("Error", "El nombre es obligatorio")
                    return
                
                v_ok, lat_v, lon_v = validar_coordenadas(d['lat'], d['lon'])
                if not v_ok:
                    messagebox.showerror("Error de Coordenadas", lat_v)
                    return
                
                conn = sqlite3.connect(DB_PATH)
                curr = conn.cursor()
                try:
                    exacto = curr.execute("SELECT id FROM clientes WHERE nombre=? AND activo=1", (d['n'],)).fetchone()
                    if exacto and not messagebox.askyesno("Confirmar", f"Ya existe '{d['n']}'. ¿Guardar de todas formas?"):
                        conn.close()
                        return
                    
                    curr.execute("INSERT INTO clientes (nombre, telefono, direccion, latitud, longitud, categoria, activo, fecha_creacion) VALUES (?,?,?,?,?,?,1,?)",
                                (d['n'], d['t'], d['d'], lat_v, lon_v, c_cat.get(), datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
                    conn.commit()
                    conn.close()
                    generar_json_desde_db()
                    callback()
                    self.recargar_mapa_en_panel()
                    messagebox.showinfo("Éxito", f"Cliente '{d['n']}' guardado correctamente")
                    ventana.destroy()
                    parent.lift()
                    parent.focus_force()
                except Exception as e:
                    messagebox.showerror("Error", str(e))
                    conn.close()
            
            tk.Button(frame, text="💾 GUARDAR", bg=self.COLOR_GREEN, fg=self.COLOR_WHITE,
                     font=("Segoe UI", 9, "bold"), command=guardar,
                     width=15, padx=10, pady=6, relief=tk.FLAT, bd=0, cursor="hand2").grid(row=7, column=0, columnspan=2, pady=15)

        def editar_cliente_gui(self, tree, parent, callback):
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Aviso", "Selecciona un cliente")
                return
            
            cid = tree.item(sel[0])['values'][0]
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            c = conn.cursor().execute("SELECT * FROM clientes WHERE id=?", (cid,)).fetchone()
            conn.close()
            
            # Colores directos
            BG = "#f5f6fa"
            SUR = "#ffffff"
            TXT = "#2c3e50"
            HEAD = "#2c3e50"
            YEL = "#f39c12"
            
            win = tk.Toplevel(parent)
            win.title("Editar Cliente")
            self.centrar_ventana(win, 420, 480)
            win.configure(bg=BG)
            self.OfficeTheme.aplicar(win)
            
            # Header
            tk.Label(win, text="✏️ Editar Cliente", bg=HEAD, fg="white", font=("Segoe UI", 12, "bold")).pack(fill=tk.X, pady=10)
            
            # Frame
            f = tk.Frame(win, bg=BG)
            f.pack(padx=20, pady=15)
            
            # Campos
            tk.Label(f, text="Nombre:", bg=BG, fg=TXT).grid(row=0, column=0, sticky="w", pady=5)
            e_nom = tk.Entry(f, width=25, bg=SUR, fg=TXT)
            e_nom.insert(0, c['nombre'])
            e_nom.grid(row=0, column=1, pady=5)
            
            tk.Label(f, text="Teléfono:", bg=BG, fg=TXT).grid(row=1, column=0, sticky="w", pady=5)
            e_tel = tk.Entry(f, width=25, bg=SUR, fg=TXT)
            e_tel.insert(0, c['telefono'] or "")
            e_tel.grid(row=1, column=1, pady=5)
            
            tk.Label(f, text="Dirección:", bg=BG, fg=TXT).grid(row=2, column=0, sticky="w", pady=5)
            e_dir = tk.Entry(f, width=25, bg=SUR, fg=TXT)
            e_dir.insert(0, c['direccion'] or "")
            e_dir.grid(row=2, column=1, pady=5)
            
            tk.Label(f, text="Latitud:", bg=BG, fg=TXT).grid(row=3, column=0, sticky="w", pady=5)
            e_lat = tk.Entry(f, width=25, bg=SUR, fg=TXT)
            e_lat.insert(0, c['latitud'] or "")
            e_lat.grid(row=3, column=1, pady=5)
            
            tk.Label(f, text="Longitud:", bg=BG, fg=TXT).grid(row=4, column=0, sticky="w", pady=5)
            e_lon = tk.Entry(f, width=25, bg=SUR, fg=TXT)
            e_lon.insert(0, c['longitud'] or "")
            e_lon.grid(row=4, column=1, pady=5)
            
            tk.Label(f, text="Categoría:", bg=BG, fg=TXT).grid(row=5, column=0, sticky="w", pady=5)
            cat = ttk.Combobox(f, values=["Librería", "Papelería", "Colegio", "Distribuidor", "Bodega", "Otro"], width=23)
            cat.set(c['categoria'])
            cat.grid(row=5, column=1, pady=5)
            
            def guardar():
                nom = e_nom.get().strip()
                if not nom:
                    messagebox.showerror("Error", "El nombre es obligatorio")
                    return
                
                lat_v, lon_v = e_lat.get().strip(), e_lon.get().strip()
                v_ok, lat_v, lon_v = validar_coordenadas(lat_v, lon_v)
                if not v_ok:
                    messagebox.showerror("Error", lat_v)
                    return
                
                conn = sqlite3.connect(DB_PATH)
                conn.execute("UPDATE clientes SET nombre=?, telefono=?, direccion=?, latitud=?, longitud=?, categoria=? WHERE id=?",
                           (nom, e_tel.get().strip(), e_dir.get().strip(), lat_v, lon_v, cat.get(), cid))
                conn.commit()
                conn.close()
                generar_json_desde_db()
                callback()
                self.recargar_mapa_en_panel()
                win.destroy()
                parent.lift()
                parent.focus_force()
            
            tk.Button(f, text="💾 Actualizar", bg=YEL, fg=BG, font=("Segoe UI", 9, "bold"), 
                     command=guardar, width=15, padx=10, pady=6, relief=tk.FLAT, bd=0, cursor="hand2").grid(row=6, column=0, columnspan=2, pady=15)

        def eliminar_cliente_gui(self, tree, parent, callback):
            """Eliminar cliente - Tema uniforme"""
            sel = tree.selection()
            if not sel:
                return
            cid, name = tree.item(sel[0])['values'][0], tree.item(sel[0])['values'][1]
            
            if messagebox.askyesno("Confirmar", f"¿Eliminar al cliente '{name}'?"):
                conn = sqlite3.connect(DB_PATH)
                conn.cursor().execute("UPDATE clientes SET activo=0 WHERE id=?", (cid,))
                conn.commit()
                conn.close()
                generar_json_desde_db()
                callback()
                self.recargar_mapa_en_panel()
                messagebox.showinfo("Eliminado", f"Cliente '{name}' eliminado correctamente")

        def ventana_backups(self):
            """Backups - Diseño elegante y profesional"""
            ventana = tk.Toplevel(self.root)
            ventana.title("Backups")
            self.centrar_ventana(ventana, 600, 450)
            ventana.configure(bg=self.COLOR_BG)
            self.OfficeTheme.aplicar(ventana)
            
            # Header compacto
            header = tk.Frame(ventana, bg=self.COLOR_HEADER, height=50)
            header.pack(fill=tk.X)
            header.pack_propagate(False)
            tk.Label(header, text="💾  Backups y Restauración", font=("Segoe UI", 14, "bold"), 
                    bg=self.COLOR_HEADER, fg=self.COLOR_WHITE).pack(side=tk.LEFT, padx=20, pady=12)
            
            # Contenedor
            cont = tk.Frame(ventana, bg=self.COLOR_BG)
            cont.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
            
            # Style
            s = ttk.Style()
            s.theme_use("clam")
            s.configure("TFrame", background=self.COLOR_BG)
            s.configure("Treeview", background="#243654", foreground="#eaeaea", 
                       fieldbackground="#243654", font=("Segoe UI", 9), rowheight=28)
            s.configure("Treeview.Heading", bg="#1e5f74", foreground="#ffffff", font=("Segoe UI", 9, "bold"))
            s.map("Treeview", background=[("selected", "#1e5f74")])
            
            # Treeview con scroll
            tree = ttk.Treeview(cont, columns=("archivo", "fecha"), show="headings", style="Treeview")
            tree.heading("archivo", text="📦 Archivo")
            tree.heading("fecha", text="📅 Fecha")
            tree.column("archivo", width=420)
            tree.column("fecha", width=130)
            tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            
            scroll = ttk.Scrollbar(cont, command=tree.yview)
            tree.configure(yscrollcommand=scroll.set)
            scroll.pack(side=tk.RIGHT, fill=tk.Y)
            
            # Frame botones
            bf = tk.Frame(ventana, bg=self.COLOR_BG)
            bf.pack(fill=tk.X, padx=15, pady=(0, 15))
            
            def cargar():
                for i in tree.get_children(): tree.delete(i)
                for b in sorted(listar_backups(), reverse=True):
                    f = b.replace("punto_restauracion_", "").replace("respaldo_total_", "").replace("import_", "").replace(".db", "")
                    try:
                        if "_" in f: f = datetime.strptime(f"{f.split('_')[0]}_{f.split('_')[1]}", "%Y%m%d_%H%M%S").strftime("%d/%m/%Y %H:%M")
                    except: f = "Importado"
                    tree.insert("", tk.END, values=(b, f))
            
            # Botones elegantes
            def btn(txt, cmd, c):
                b = tk.Button(bf, text=txt, command=cmd, bg=c, fg="white", font=("Segoe UI", 8, "bold"),
                               relief=tk.FLAT, bd=0, padx=10, pady=5, cursor="hand2")
                b.pack(side=tk.LEFT, padx=3)
                
                def on_enter(e): b.config(bg="#34495e")
                def on_leave(e): b.config(bg=c)
                b.bind("<Enter>", on_enter)
                b.bind("<Leave>", on_leave)
                return b
            
            btn("➕ Backup", lambda: (crear_backup_sistema()[0] and cargar()), self.COLOR_GREEN).pack(side=tk.LEFT, padx=5)
            btn("📂 Importar", lambda: (importar_backup_externo() and cargar()), self.COLOR_CYAN).pack(side=tk.LEFT, padx=5)
            btn("⏪ Restaurar", lambda: ejecutar_restauracion(), self.COLOR_RED).pack(side=tk.LEFT, padx=5)
            btn("✖ Cerrar", ventana.destroy, "#5a6c7d").pack(side=tk.RIGHT, padx=5)
            
            def ejecutar_restauracion():
                if not tree.selection(): return messagebox.showwarning("⚠", "Selecciona un backup")
                arch = tree.item(tree.selection()[0])["values"][0]
                if messagebox.askyesno("⚠️ Restaurar", f"¿Restaurar {arch}?\nSe perderán cambios posteriores."):
                    ok, msg = restaurar_backup_logic(arch)
                    messagebox.showinfo("✅" if ok else "❌", "Restaurado" if ok else msg)
                    if ok: ventana.destroy()
            
            def importar_backup_externo():
                f = filedialog.askopenfilename(title="Importar", filetypes=[("DB","*.db")])
                if not f: return False
                try:
                    sqlite3.connect(f).execute("SELECT 1").close()
                    shutil.copy2(f, os.path.join(BACKUP_DIR, f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(f)}"))
                    messagebox.showinfo("✅", "Importado")
                    return True
                except Exception as e: messagebox.showerror("❌", str(e)); return False
            
            cargar()

# =============================================================================
# MÓDULO CLI (CONSOLA)
# =============================================================================

def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def pausar():
    input("\nPresiona Enter para continuar...")

def menu_cli():
    inicializar_db()
    while True:
        limpiar_pantalla()
        print(f"\n{'='*70}\n GESTOR DE CONSOLA - MUNDO ESCOLAR v2.5\n{'='*70}")
        print(" [1] Iniciar Servidor Web\n [2] Gestión de Usuarios\n [3] Gestión de Clientes\n [4] Generar JSON para GitHub\n [5] Backups\n [6] Limpieza de Temporales\n [7] Salir")
        opc = input("\nSelección: ").strip()
        
        if opc == "1":
            print(f"\n🌍 Servidor en http://localhost:{PORT}. Ctrl+C para parar.")
            try:
                httpd = HTTPServer(('', PORT), UnifiedHandler)
                httpd.serve_forever()
            except KeyboardInterrupt: pass
        elif opc == "2":
            while True:
                limpiar_pantalla(); print("\n--- GESTIÓN DE USUARIOS (CLI) ---")
                print(" 1. Listar | 2. Crear | 3. Editar | 4. Eliminar | 5. Volver")
                sub = input("Opcion: ").strip()
                if sub == "1":
                    conn = sqlite3.connect(DB_PATH); cursor = conn.cursor()
                    for u in cursor.execute("SELECT id, username, role FROM usuarios").fetchall(): print(u)
                    conn.close(); pausar()
                elif sub == "2":
                    u = input("User: "); p = input("Pass: "); r = input("Rol (admin/trabajador): ")
                    conn = sqlite3.connect(DB_PATH); conn.cursor().execute("INSERT INTO usuarios (username, password, role, activo, fecha_creacion) VALUES (?,?,?,1,?)", (u, p, r, datetime.now())); conn.commit(); conn.close(); generar_json_desde_db(); pausar()
                elif sub == "5": break
        elif opc == "3":
            while True:
                limpiar_pantalla(); print("\n--- GESTIÓN DE CLIENTES (CLI) ---")
                print(" 1. Listar | 2. Crear | 3. Editar | 4. Eliminar | 5. Volver")
                sub = input("Opcion: ").strip()
                if sub == "1":
                    conn = sqlite3.connect(DB_PATH); cursor = conn.cursor()
                    for c in cursor.execute("SELECT id, nombre, categoria FROM clientes WHERE activo=1").fetchall(): print(c)
                    conn.close(); pausar()
                elif sub == "2":
                    n = input("Nombre: "); t = input("Tel: "); d = input("Dir: "); lat = input("Lat: "); lon = input("Lon: "); cat = input("Cat: ")
                    try:
                        conn = sqlite3.connect(DB_PATH); conn.cursor().execute("INSERT INTO clientes (nombre, telefono, direccion, latitud, longitud, categoria, activo, fecha_creacion) VALUES (?,?,?,?,?,?,1,?)", (n, t, d, float(lat), float(lon), cat, datetime.now())); conn.commit(); conn.close(); generar_json_desde_db(); print("Exito"); pausar()
                    except Exception as e: print(e); pausar()
                elif sub == "5": break
        elif opc == "4":
            s, c, u = generar_json_desde_db()
            print(f"\n[*] Exportado: {c} clientes, {u} usuarios." if s else f"\n[!] Error: {c}")
            pausar()
        elif opc == "6":
            _, msgs = limpiar_archivos_temporales_logic()
            print("\n".join(msgs)); pausar()
        elif opc == "7": break

# =============================================================================
# SERVIDOR WEB (COMPARTIDO)
# =============================================================================

class UnifiedHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass 
    def serve_file(self, filepath):
        if not os.path.isfile(filepath): self.send_error(404); return
        mime, _ = mimetypes.guess_type(filepath)
        with open(filepath, 'rb') as f: content = f.read()
        self.send_response(200)
        self.send_header('Content-type', mime or 'application/octet-stream')
        self.send_header('Access-Control-Allow-Origin', '*')
        # Anti-caché estricto para asegurar frescura de datos
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()
        self.wfile.write(content)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/sync/status':
            self.send_response(200); self.end_headers()
        elif path in ['', '/', '/index.html']: self.serve_file('index.html')
        elif path.startswith('/static/') or path.startswith('/data/'): self.serve_file(path[1:])
        elif path == '/admin.html': 
            # Redirigir admin al panel de trabajadores por petición del usuario
            self.send_response(301)
            self.send_header('Location', '/trabajadores.html')
            self.end_headers()
        else: self.serve_file(path[1:])

    def do_POST(self):
        path = self.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else ""
        data = {}
        try:
            if body: data = json.loads(body)
        except: pass

        if path == '/sync/generate-json':
            success, msg, _ = generar_json_desde_db()
            self.send_json({"success": success, "message": msg})
        elif path == '/sync/cliente':
            self.handle_cliente_sync(data)
        elif path == '/sync/usuario':
            self.handle_usuario_sync(data)
        elif path == '/sync/full-sync':
            success, c_count, u_count = generar_json_desde_db()
            self.send_json({"success": success, "clientes": c_count, "usuarios": u_count})
        else:
            self.send_error(404)

    def handle_cliente_sync(self, req):
        action = req.get('action')
        data = req.get('data', {})
        cid = req.get('id')
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            if action == 'agregar' or action == 'agregar_existente':
                cursor.execute('''
                    INSERT INTO clientes (nombre, telefono, direccion, latitud, longitud, categoria, activo)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                ''', (data.get('nombre'), data.get('telefono'), data.get('direccion'), 
                      data.get('latitud'), data.get('longitud'), data.get('categoria')))
            elif action == 'actualizar':
                cursor.execute('''
                    UPDATE clientes SET nombre=?, telefono=?, direccion=?, latitud=?, longitud=?, categoria=?
                    WHERE id=?
                ''', (data.get('nombre'), data.get('telefono'), data.get('direccion'), 
                      data.get('latitud'), data.get('longitud'), data.get('categoria'), cid))
            elif action == 'eliminar':
                cursor.execute("UPDATE clientes SET activo = 0 WHERE id = ?", (cid,))
            conn.commit()
            conn.close()
            generar_json_desde_db()
            self.send_json({"success": True})
        except Exception as e: self.send_json({"success": False, "error": str(e)}, 500)

    def handle_usuario_sync(self, req):
        action = req.get('action')
        data = req.get('data', {})
        uid = req.get('id')
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            if action == 'crear':
                cursor.execute('''
                    INSERT INTO usuarios (username, password, role, activo, fecha_creacion)
                    VALUES (?, ?, ?, 1, ?)
                ''', (data.get('username'), data.get('password'), data.get('role'), 
                      datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            elif action == 'actualizar':
                if data.get('password'):
                    cursor.execute('''
                        UPDATE usuarios SET username=?, password=?, role=?, activo=? WHERE id=?
                    ''', (data.get('username'), data.get('password'), data.get('role'), 1 if data.get('activo') else 0, uid))
                else:
                    cursor.execute('''
                        UPDATE usuarios SET username=?, role=?, activo=? WHERE id=?
                    ''', (data.get('username'), data.get('role'), 1 if data.get('activo') else 0, uid))
            conn.commit()
            conn.close()
            # ✅ REFUERZO V8.0: Sincronización inmediata de eliminación real
            generar_json_desde_db()
            self.send_json({"success": True, "message": "Operación sincronizada al 100%"})
        except Exception as e: self.send_json({"success": False, "error": str(e)}, 500)

    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

# =============================================================================
# PUNTO DE ENTRADA
# =============================================================================

if __name__ == "__main__":
    inicializar_db()
    if GUI_AVAILABLE and len(sys.argv) == 1:
        root = tk.Tk()
        app = GestorGUI(root)
        root.mainloop()
    else:
        menu_cli()
