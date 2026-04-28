# 📖 Manual de Usuario - Sistema de Gestión v8.5 (Edición Profesional)

## 🎯 El Sistema "Llave en Mano"
Bienvenido a la versión **v8.5 del Sistema de Gestión de Clientes**. Esta edición ha sido diseñada para ser **automática, táctil y extremadamente robusta**. Ya no tienes que preocuparte por configuraciones técnicas: el sistema lo hace todo por ti.

---

## 📋 Tabla de Contenidos
1. [🚀 Guía de Inicio Rápido](#-guía-de-inicio-rápido)
2. [🔄 El Ciclo de los Datos (Sincronización)](#-el-ciclo-de-los-datos-sincronización)
3. [💻 Panel de Control (Python)](#-panel-de-control-python)
4. [📱 Panel de Trabajadores (Web/Móvil)](#-panel-de-trabajadores-web-móvil)
5. [💾 Respaldos y Seguridad](#-respaldos-y-seguridad)

---

## 🚀 Guía de Inicio Rápido
1. Abre el archivo `gestor_sistema.py`. 
2. **¡Eso es todo!** Al abrirlo, el sistema:
   - Inicia el servidor web automáticamente.
   - Sincroniza la base de datos con el mapa.
   - Abre tu navegador en el panel de gestión.

---

## 🔄 El Ciclo de los Datos (Sincronización)
El sistema utiliza una arquitectura de **"Fuente Maestra"** para que tus datos nunca se pierdan y sean ultra-rápidos:

1. **SQLite (`data/clientes.db`)**: Es el cerebro. Aquí se guarda todo de forma permanente.
2. **JSON (`data/sistema.json`)**: Es el puente. Cada vez que agregas, editas o borras un cliente en el gestor Python, este archivo se actualiza solo. **Este es el único archivo que el navegador necesita para ver los cambios.**
3. **IndexedDB (Memoria del Navegador)**: El panel web lee el JSON y guarda los datos en su propia "cámara acorazada" (IndexedDB) para que el mapa cargue al instante incluso si la conexión es lenta.

---

## 💻 Panel de Control (Python)
Desde el escritorio puedes gestionar todo:
- **Gestión de Clientes**: Agrega coordenadas, nombres y estados.
- **Gestión de Usuarios**: Crea las cuentas para que tus trabajadores entren a la web.
- **Servidor Automático**: Verás un botón que indica si el servidor está "CORRIENDO". No lo toques a menos que quieras apagar el acceso web.

---

## 📱 Panel de Trabajadores (Web/Móvil)
Optimizado para los trabajadores en la calle:
- **Diseño Táctil**: Botones grandes de **50px** para que sea fácil tocar con el celular en movimiento.
- **Notificaciones Toast**: Los avisos aparecen arriba a la derecha, debajo del encabezado, para no tapar el buscador.
- **Zoom Inteligente**: El control de zoom está a la izquierda para que tu pulgar derecho quede libre para navegar el mapa.
- **Buscador Centrado**: Encuentra a cualquier cliente por nombre en milisegundos.

---

## 💾 Respaldos y Seguridad
Para respaldar tu sistema, solo necesitas hacer una copia de la carpeta:
📁 `data/`

Si quieres pasar el sistema a otra computadora, solo copia esa carpeta y tendrás todos tus clientes y usuarios intactos.

---

**¡Felicidades! Tienes el sistema de gestión más potente, táctil y automatizado del 2026.**

*Manual para Mundo Escolar - v8.5 "Edición Profesional & Táctil" - Febrero 2026*
