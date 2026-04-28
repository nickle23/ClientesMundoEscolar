// Sistema de Mapas Profesional - VERSIÓN DEFINITIVA
class MapSystem {
    constructor() {
        this.mapAdmin = null;
        this.mapTrabajadores = null;
        this.marcadoresClientes = new Map();
        this.marcadorUsuario = null;
        this.capaClientes = null; // Se inicializa al arrancar
        this.watchId = null;
        this.ultimaUbicacion = null;
        this.gpsActivo = false;
        this.clientesData = [];
        this.inicializacionCompleta = false;
        
        // ✅ SISTEMA GPS EN SEGUNDO PLANO - Reactivar cuando vuelve la página
        this.gpsActivoPorUsuario = false;
        this.ultimoTimeGPS = 0;
        
        // Detectar cuando la página vuelve a estar visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.gpsActivoPorUsuario) {
                console.log('📱 Página visible - Reactivando GPS...');
                this.reactivarGPS();
            }
        });
        
        // Verificar cada 10 segundos si el GPS aún responde
        setInterval(() => {
            if (this.gpsActivoPorUsuario && this.watchId) {
                const ahora = Date.now();
                if (ahora - this.ultimoTimeGPS > 8000) {
                    console.log('⚠️ GPS sin respuesta - Reiniciando...');
                    this.reactivarGPS();
                }
            }
        }, 30000);
    }

    // ✅ FUNCIÓN PARA REACTIVAR GPS
    reactivarGPS() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.activarGPS();
    }

    // Inicialización de mapas - VERSIÓN ROBUSTA
    inicializarMapaAdmin() {
        console.log('🗺️ Inicializando mapa administrador...');

        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const container = document.getElementById('map-admin');
                    if (!container) {
                        console.error('❌ Contenedor map-admin no encontrado');
                        resolve(false);
                        return;
                    }

                    // Limpiar mapa existente
                    if (this.mapAdmin) {
                        this.mapAdmin.remove();
                    }

                    this.mapAdmin = L.map('map-admin', {
                        center: [-12.0464, -77.0428],
                        zoom: 12,
                        zoomControl: true,
                        preferCanvas: true
                    });

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 18
                    }).addTo(this.mapAdmin);

                    L.control.scale({ imperial: false }).addTo(this.mapAdmin);

                    if (!this.capaClientes) this.capaClientes = L.layerGroup();
                    this.capaClientes.addTo(this.mapAdmin);

                    // Forzar redimensionamiento
                    setTimeout(() => {
                        this.mapAdmin.invalidateSize(true);
                        console.log('✅ Mapa administrador inicializado correctamente');
                        resolve(true);
                    }, 200);

                } catch (error) {
                    console.error('❌ Error inicializando mapa admin:', error);
                    resolve(false);
                }
            }, 100);
        });
    }

    inicializarMapaTrabajadores() {
        console.log('🗺️ Inicializando mapa trabajadores...');

        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const container = document.getElementById('map-trabajadores');
                    if (!container) {
                        console.error('❌ Contenedor map-trabajadores no encontrado');
                        resolve(false);
                        return;
                    }

                    // Limpiar mapa existente
                    if (this.mapTrabajadores) {
                        this.mapTrabajadores.remove();
                    }

                    this.mapTrabajadores = L.map('map-trabajadores', {
                        center: [-12.0464, -77.0428],
                        zoom: 12,
                        zoomControl: false,
                        preferCanvas: true
                    });

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 18
                    }).addTo(this.mapTrabajadores);

                    L.control.zoom({ position: 'topright' }).addTo(this.mapTrabajadores);
                    L.control.scale({ imperial: false }).addTo(this.mapTrabajadores);

                    if (!this.capaClientes) this.capaClientes = L.layerGroup();
                    this.capaClientes.addTo(this.mapTrabajadores);

                    // Forzar redimensionamiento
                    setTimeout(() => {
                        this.mapTrabajadores.invalidateSize(true);
                        console.log('✅ Mapa trabajadores inicializado correctamente');
                        resolve(true);
                    }, 200);

                } catch (error) {
                    console.error('❌ Error inicializando mapa trabajadores:', error);
                    resolve(false);
                }
            }, 100);
        });
    }

    // Cargar clientes en el mapa - VERSIÓN DEFINITIVA
    async cargarClientesEnMapa(clientes) {
        console.log(`🗺️ MapSystem: Cargando ${clientes.length} clientes en el mapa...`);

        // Guardar datos de clientes
        this.clientesData = clientes;

        const mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) {
            console.error('❌ No hay mapa disponible para cargar clientes');
            return;
        }

        // Limpiar marcadores anteriores
        this.capaClientes.clearLayers();
        this.marcadoresClientes.clear();

        let clientesCargados = 0;
        let errores = 0;

        clientes.forEach(cliente => {
            try {
                // Validar datos del cliente
                if (!cliente.id || !cliente.latitud || !cliente.longitud) {
                    console.warn(`⚠️ Cliente ${cliente.nombre} tiene datos incompletos, omitiendo...`);
                    errores++;
                    return;
                }

                const icono = L.divIcon({
                    html: `
                        <div style="
                            background: #dc3545;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            color: white;
                            font-weight: bold;
                            cursor: pointer;
                        ">👨‍💼</div>
                    `,
                    className: 'icono-cliente',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });

                const marcador = L.marker([cliente.latitud, cliente.longitud], {
                    icon: icono,
                    title: cliente.nombre
                })
                    .addTo(this.capaClientes)
                    .bindPopup(`
                    <div style="min-width: 200px;">
                        <h6 class="fw-bold mb-2">${cliente.nombre}</h6>
                        <p class="mb-1 small">📞 ${cliente.telefono || 'No disponible'}</p>
                        <p class="mb-2 small">📍 ${cliente.direccion || 'No disponible'}</p>
                        <span class="badge bg-secondary">${cliente.categoria}</span>
                        <div class="mt-2 d-grid gap-1">
                            <button class="btn btn-sm btn-primary" onclick="mapSystem.centrarEnCliente(${cliente.id})">
                                🗺️ Centrar
                            </button>
                            <button class="btn btn-sm btn-success" onclick="mapSystem.irAlCliente(${cliente.id})">
                                🚗 Ir al Cliente
                            </button>
                        </div>
                    </div>
                `);

                // Guardar en Map para acceso rápido
                this.marcadoresClientes.set(cliente.id, {
                    marcador: marcador,
                    cliente: cliente
                });

                clientesCargados++;

            } catch (error) {
                console.error(`❌ Error creando marcador para cliente ${cliente.nombre}:`, error);
                errores++;
            }
        });

        console.log(`✅ ${clientesCargados}/${clientes.length} clientes cargados en el mapa, ${errores} errores`);
        console.log('📍 IDs de clientes cargados:', Array.from(this.marcadoresClientes.keys()));

        this.inicializacionCompleta = true;
    }

    // FUNCIÓN PRINCIPAL CORREGIDA - CENTRAR EN CLIENTE
    centrarEnCliente(id) {
        console.log(`📍 MapSystem: SOLICITUD de centrado para cliente ID: ${id}`);

        if (!this.inicializacionCompleta) {
            console.warn('⚠️ MapSystem no está completamente inicializado');
            this.mostrarNotificacion('El sistema de mapas aún se está cargando', 'warning');
            return;
        }

        const mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) {
            console.error('❌ No hay mapa disponible');
            this.mostrarNotificacion('El mapa no está disponible', 'danger');
            return;
        }

        // BUSCAR EN MARCADORES EXISTENTES
        const marcadorData = this.marcadoresClientes.get(id);

        if (marcadorData) {
            console.log(`✅ Marcador encontrado para: ${marcadorData.cliente.nombre}`);
            this.ejecutarCentrado(marcadorData.cliente, marcadorData.marcador);
            return;
        }

        // BUSCAR EN DATOS DE CLIENTES
        console.log(`🔄 Marcador no encontrado, buscando en datos...`);
        const cliente = this.clientesData.find(c => c.id === id);

        if (cliente) {
            console.log(`✅ Cliente encontrado en datos: ${cliente.nombre}`);
            console.warn(`⚠️ Creando marcador temporal - esto no debería pasar`);
            this.crearMarcadorTemporal(cliente);
            this.ejecutarCentrado(cliente);
        } else {
            console.error(`❌ Cliente ID ${id} no encontrado en ningún lugar`);
            this.mostrarErrorClienteNoEncontrado(id);
        }
    }

    // Ejecutar el centrado en el mapa - VERSIÓN MEJORADA
    ejecutarCentrado(cliente, marcador = null) {
        const mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) {
            console.error('❌ MapSystem: No hay mapa disponible');
            return;
        }

        console.log(`📍 MapSystem: Centrando en ${cliente.nombre} (${cliente.latitud}, ${cliente.longitud})`);

        // Centrar el mapa con animación suave
        mapa.flyTo([cliente.latitud, cliente.longitud], 16, {
            duration: 1,
            easeLinearity: 0.25
        });

        // Abrir popup si existe marcador
        if (marcador) {
            setTimeout(() => {
                marcador.openPopup();
            }, 800);
        }

        console.log('✅ ✅ ✅ MapSystem: CENTRADO EXITOSO ✅ ✅ ✅');
        this.mostrarNotificacion(`Centrado en: ${cliente.nombre}`, 'success');
    }

    // Crear marcador temporal SOLO en caso de emergencia
    crearMarcadorTemporal(cliente) {
        const mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) return;

        console.warn(`🔄 MapSystem: Creando marcador temporal para ${cliente.nombre} - ESTO ES UNA FALLA`);

        const iconoTemporal = L.divIcon({
            html: `
                <div style="
                    background: #ffc107;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    color: white;
                    font-weight: bold;
                ">⚠️</div>
            `,
            className: 'icono-cliente-temporal',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const marcadorTemporal = L.marker([cliente.latitud, cliente.longitud], {
            icon: iconoTemporal
        }).addTo(mapa);

        marcadorTemporal.bindPopup(`
            <div style="min-width: 200px;">
                <h6 class="fw-bold mb-2">${cliente.nombre} <small class="text-warning">(Temporal)</small></h6>
                <p class="mb-1 small">📞 ${cliente.telefono || 'No disponible'}</p>
                <p class="mb-2 small">📍 ${cliente.direccion || 'No disponible'}</p>
                <span class="badge bg-warning">${cliente.categoria}</span>
                <div class="mt-2">
                    <small class="text-muted">Marcador temporal - Recarga la página para corregir</small>
                </div>
            </div>
        `).openPopup();

        // Eliminar después de 5 segundos
        setTimeout(() => {
            if (marcadorTemporal && mapa) {
                mapa.removeLayer(marcadorTemporal);
            }
        }, 5000);
    }

    // Mostrar error si no se encuentra el cliente
    mostrarErrorClienteNoEncontrado(id) {
        const mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) return;

        const centro = mapa.getCenter();
        const iconoError = L.divIcon({
            html: `
                <div style="
                    background: #dc3545;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: white;
                    font-weight: bold;
                ">❌</div>
            `,
            className: 'icono-error',
            iconSize: [50, 50],
            iconAnchor: [25, 25]
        });

        const marcadorError = L.marker(centro, {
            icon: iconoError
        }).addTo(mapa);

        marcadorError.bindPopup(`
            <div style="min-width: 250px;" class="text-center">
                <h6 class="fw-bold mb-2 text-danger">Cliente No Encontrado</h6>
                <p class="mb-2">ID: <strong>${id}</strong></p>
                <p class="small text-muted">El cliente no está disponible en el mapa</p>
                <button class="btn btn-sm btn-warning w-100" onclick="mapSystem.recargarClientes()">
                    🔄 Recargar Clientes
                </button>
            </div>
        `).openPopup();

        this.mostrarNotificacion(`Cliente ID ${id} no encontrado`, 'danger');
    }

    // Recargar clientes - VERSIÓN MEJORADA
    async recargarClientes() {
        console.log('🔄 MapSystem: Recargando clientes desde fuente de verdad...');
        try {
            // Usar la ruta de datos real con cache-buster
            const response = await fetch('data/sistema.json?t=' + new Date().getTime());
            if (response.ok) {
                const data = await response.json();
                const clientes = data.clientes || [];
                await this.cargarClientesEnMapa(clientes);
                this.mostrarNotificacion('✅ Clientes recargados correctamente', 'success');
            } else {
                throw new Error(`Error HTTP: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error recargando clientes:', error);
            this.mostrarNotificacion('❌ Error al recargar clientes', 'danger');
        }
    }

    irAlCliente(id) {
        const marcadorData = this.marcadoresClientes.get(id);
        const cliente = marcadorData ? marcadorData.cliente : this.clientesData.find(c => c.id === id);

        if (cliente) {
            const url = `https://www.google.com/maps?q=${cliente.latitud},${cliente.longitud}`;
            window.open(url, '_blank');
            console.log(`🚗 MapSystem: Abriendo Google Maps para: ${cliente.nombre}`);
            this.mostrarNotificacion(`Abriendo Google Maps para: ${cliente.nombre}`, 'info');
        }
    }

    // SISTEMA GPS MEJORADO
    activarGPS() {
        console.log('🎯 Activando GPS...');
        
        // ✅ Marcar que el usuario solicitó GPS activo
        this.gpsActivoPorUsuario = true;

        if (!navigator.geolocation) {
            this.mostrarEstadoGPS('Tu navegador no soporta geolocalización', 'danger');
            return;
        }

        this.mostrarEstadoGPS('📍 Solicitando permisos de ubicación...', 'info');

        const opcionesGPS = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Permisos de GPS concedidos');
                this.iniciarSeguimientoGPS();
            },
            (error) => {
                this.manejarErrorGPS(error);
            },
            opcionesGPS
        );
    }

    iniciarSeguimientoGPS() {
        console.log('🛰️ Iniciando seguimiento GPS...');

        this.mostrarEstadoGPS('📍 Buscando señal GPS...', 'info');

        const opcionesSeguimiento = {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 15000
        };

        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        // Obtener posición actual primero
        navigator.geolocation.getCurrentPosition(
            (position) => this.manejarExitoGPS(position),
            (error) => this.manejarErrorGPS(error),
            opcionesSeguimiento
        );

        // Iniciar seguimiento continuo
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.manejarExitoGPS(position),
            (error) => this.manejarErrorGPS(error),
            opcionesSeguimiento
        );

        this.gpsActivo = true;
    }

manejarExitoGPS(position) {
        this.ultimoTimeGPS = Date.now();
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const precision = position.coords.accuracy;

        window.ubicacionActual = { lat, lng };
        window.ultimaUbicacion = position;

        this.actualizarMarcadorUsuario(lat, lng, precision);
        this.mostrarEstadoGPS('📍 Ubicación en tiempo real activa', 'success');
    }
    
actualizarMarcadorUsuario(lat, lng, precision) {
        var mapa = this.mapAdmin || this.mapTrabajadores;
        if (!mapa) {
            console.log('⏳ Esperando a que el mapa esté listo...');
            setTimeout(() => this.actualizarMarcadorUsuario(lat, lng, precision), 500);
            return;
        }

        if (this.marcadorUsuario) {
            mapa.removeLayer(this.marcadorUsuario);
        }

        this.marcadorUsuario = L.marker([lat, lng], {
            icon: L.divIcon({
                html: `
                    <div style="
                        background: #2c5aa0;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 15px rgba(44, 90, 160, 0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 18px;
                        font-weight: bold;
                        animation: pulse 2s infinite;
                    ">📍</div>
                    <style>
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.1); opacity: 0.8; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    </style>
                `,
                className: 'marcador-usuario-gps',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }),
            zIndexOffset: 1000
        }).addTo(mapa);

        this.marcadorUsuario.bindPopup(`
            <div class="text-center">
                <strong>📍 Tu ubicación actual</strong><br>
                <small>Lat: ${lat.toFixed(6)}</small><br>
                <small>Lng: ${lng.toFixed(6)}</small><br>
                <small>Precisión: ${Math.round(precision)} metros</small><br>
                <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
            </div>
        `).openPopup();

        const zoomLevel = precision < 100 ? 16 : precision < 500 ? 15 : 14;
        mapa.setView([lat, lng], zoomLevel);

        console.log('✅ Marcador de usuario actualizado correctamente');
    }

    manejarErrorGPS(error) {
        console.error('❌ Error GPS:', error);

        let mensaje = 'Error desconocido al obtener ubicación';
        let tipo = 'danger';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                mensaje = '❌ Permisos de ubicación denegados';
                tipo = 'warning';
                break;
            case error.POSITION_UNAVAILABLE:
                mensaje = '❌ Señal GPS no disponible';
                tipo = 'warning';
                break;
            case error.TIMEOUT:
                mensaje = '⏰ Tiempo de espera agotado';
                tipo = 'warning';
                break;
        }

        this.mostrarEstadoGPS(mensaje, tipo);
        this.gpsActivo = false;
    }

    mostrarEstadoGPS(mensaje, tipo = 'info') {
        const elementoAdmin = document.getElementById('estado-ubicacion-admin');
        if (elementoAdmin) {
            elementoAdmin.innerHTML = mensaje;
            const alertClass = `alert alert-${tipo} alert-dismissible fade show mb-0`;
            elementoAdmin.parentElement.className = alertClass;
        }

        const elementoTrabajadores = document.getElementById('estado-ubicacion');
        if (elementoTrabajadores) {
            elementoTrabajadores.innerHTML = mensaje;
            const alertClass = `alert alert-${tipo} alert-dismissible fade show mb-0`;
            elementoTrabajadores.parentElement.className = alertClass;
        }
    }

    volverAMiUbicacion() {
        console.log('📍 Volviendo a mi ubicación...');

        if (this.marcadorUsuario && (this.mapAdmin || this.mapTrabajadores)) {
            const mapa = this.mapAdmin || this.mapTrabajadores;
            const latlng = this.marcadorUsuario.getLatLng();
            mapa.flyTo(latlng, 16, {
                duration: 1,
                easeLinearity: 0.25
            });
            this.marcadorUsuario.openPopup();
            this.mostrarEstadoGPS('Centrado en tu ubicación', 'success');
        } else {
            this.mostrarEstadoGPS('Ubicación no disponible. Activa el GPS primero.', 'warning');
        }
    }

    forzarRedimensionMapa() {
        const mapas = [this.mapAdmin, this.mapTrabajadores];
        mapas.forEach(mapa => {
            if (mapa) {
                setTimeout(() => {
                    try {
                        mapa.invalidateSize(true);
                    } catch (error) {
                        console.error('Error redimensionando mapa:', error);
                    }
                }, 300);
            }
        });
    }

    limpiarSeguimientoGPS() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.gpsActivo = false;
        }
    }

    // Sistema de notificaciones mejorado - BARRA DE ESTADO
    mostrarNotificacion(mensaje, tipo = 'info') {
        console.log(`📢 Notificación [${tipo}]: ${mensaje}`);

        // Determinar icono según el tipo
        let icono = 'ℹ️';
        switch (tipo) {
            case 'success':
                icono = '✅';
                break;
            case 'warning':
                icono = '⚠️';
                break;
            case 'danger':
                icono = '❌';
                break;
            case 'info':
                icono = 'ℹ️';
                break;
        }

        // Mostrar en ambas barras de estado si existen
        this.mostrarEnBarraEstado('estado-sistema-admin', mensaje, tipo, icono);
        this.mostrarEnBarraEstado('estado-sistema-trabajadores', mensaje, tipo, icono);

        // También mostrar alerta flotante para mensajes importantes
        if (tipo === 'danger' || tipo === 'warning') {
            if (typeof showAlert === 'function') {
                showAlert(mensaje, tipo);
            }
        }
    }

    // Mostrar mensaje en barra de estado específica
    mostrarEnBarraEstado(elementoId, mensaje, tipo, icono) {
        const elemento = document.getElementById(elementoId);
        if (!elemento) return;

        // Limpiar clases anteriores
        elemento.className = 'estado-sistema';

        // Agregar clase del tipo
        elemento.classList.add(tipo);

        // Configurar contenido
        elemento.innerHTML = `
            <div class="estado-contenido">
                <span class="estado-icono">${icono}</span>
                <span class="estado-texto">${mensaje}</span>
            </div>
            <button class="estado-close" onclick="this.parentElement.style.display='none'">
                <i class="fas fa-times"></i>
            </button>
        `;

        // FORZAR VISIBILIDAD
        elemento.style.display = 'flex';
        elemento.style.opacity = '1';
        elemento.style.visibility = 'visible';

        // Ocultar automáticamente después de 4 segundos (excepto errores)
        if (tipo !== 'danger') {
            setTimeout(() => {
                if (elemento.textContent.includes(mensaje)) {
                    elemento.style.display = 'none';
                }
            }, 4000);
        }
    }

    verificarEstadoMapas() {
        console.log('🔍 Estado de mapas:');
        console.log('- Mapa Admin:', this.mapAdmin ? '✅ Inicializado' : '❌ No inicializado');
        console.log('- Mapa Trabajadores:', this.mapTrabajadores ? '✅ Inicializado' : '❌ No inicializado');
        console.log('- Clientes cargados:', this.marcadoresClientes.size);
        console.log('- GPS activo:', this.gpsActivo);
        console.log('- Inicialización completa:', this.inicializacionCompleta);
    }
}

// Instancia global del sistema de mapas
let mapSystem;
try {
    mapSystem = new MapSystem();
} catch (e) {
    console.error('⚠️ MapSystem falló inicialmente (posible falta de Leaflet). Se reintentará en inicialización.', e);
}

// Funciones globales para compatibilidad
window.inicializarMapaAdmin = () => mapSystem.inicializarMapaAdmin();
window.inicializarMapaTrabajadores = () => mapSystem.inicializarMapaTrabajadores();
window.cargarClientesEnMapa = (clientes) => mapSystem.cargarClientesEnMapa(clientes);
window.centrarEnCliente = (id) => mapSystem.centrarEnCliente(id);
window.irAlCliente = (id) => mapSystem.irAlCliente(id);
window.limpiarSeguimientoGPS = () => mapSystem.limpiarSeguimientoGPS();
window.forzarRedimensionMapa = () => mapSystem.forzarRedimensionMapa();
window.activarGPS = () => mapSystem.activarGPS();
window.volverAMiUbicacion = () => mapSystem.volverAMiUbicacion();
window.verificarMapas = () => mapSystem.verificarEstadoMapas();

// Inicialización automática y eventos
document.addEventListener('DOMContentLoaded', function () {
    console.log('🗺️ Sistema de mapas cargado - Listo para inicializar');

    window.addEventListener('resize', () => {
        mapSystem.forzarRedimensionMapa();
    });

    document.addEventListener('shown.bs.modal', () => {
        setTimeout(() => {
            mapSystem.forzarRedimensionMapa();
        }, 300);
    });
});