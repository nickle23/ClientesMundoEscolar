let mapAdmin, mapTrabajadores;
let marcadoresClientes = [];
let marcadorUsuario = null;
let capaClientes = L.layerGroup();
let watchId = null;
let gpsActivo = true;
let ultimaUbicacion = null;

// 🔥 NUEVA VARIABLE: Controlar si el mapa debe seguir la ubicación
let seguirUbicacionUsuario = true;

// 🔥 NUEVA VARIABLE PARA MOVIMIENTO
let ultimaPosicion = null;  // ← AGREGAR ESTA LÍNEA

// ==============================================
// CONFIGURACIÓN INICIAL MEJORADA
// ==============================================

function esDispositivoMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
}

// 🔥 NUEVA FUNCIÓN - REEMPLAZA ESTO 🔥
function esConexionSegura() {
    // SOLUCIÓN DEFINITIVA PARA MÓVILES
    const esMovil = esDispositivoMovil();
    const esHTTPS = window.location.protocol === 'https:';
    
    if (esMovil && !esHTTPS) {
        console.warn('📱 Móvil detectado en HTTP - Mostrando instrucciones HTTPS');
        return false;
    }
    
    return esHTTPS;
}
// 🔥 HASTA AQUÍ 🔥

// ==============================================
// INICIALIZACIÓN DE MAPAS - CORREGIDA
// ==============================================

function inicializarMapaAdmin() {
    console.log('🗺️ Inicializando mapa admin...');
    
    // Verificar que el contenedor existe
    const mapContainer = document.getElementById('map-admin');
    if (!mapContainer) {
        console.error('❌ No se encontró el contenedor map-admin');
        return;
    }

    // Limpiar mapa existente
    if (mapAdmin) {
        mapAdmin.remove();
    }

    mapAdmin = L.map('map-admin', {
        center: [-12.0464, -77.0428],
        zoom: 12,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(mapAdmin);

    L.control.scale({ imperial: false }).addTo(mapAdmin);
    capaClientes.addTo(mapAdmin);
    
    console.log('✅ Mapa admin inicializado correctamente');
}

function inicializarMapaTrabajadores() {
    console.log('🗺️ Inicializando mapa trabajadores...');
    
    const mapContainer = document.getElementById('map-trabajadores');
    if (!mapContainer) {
        console.error('❌ No se encontró el contenedor map-trabajadores');
        return;
    }

    if (mapTrabajadores) {
        mapTrabajadores.remove();
    }

    mapTrabajadores = L.map('map-trabajadores', {
        center: [-12.0464, -77.0428],
        zoom: 12,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(mapTrabajadores);

    L.control.scale({ imperial: false }).addTo(mapTrabajadores);
    capaClientes.addTo(mapTrabajadores);
    
    console.log('✅ Mapa trabajadores inicializado correctamente');
    
    // 🔥 SOLUCIÓN DEFINITIVA: CREAR MARCADOR INMEDIATAMENTE Y LUEGO GPS
    console.log('🎯 CREANDO MARCADOR INMEDIATO...');
    
    // Forzar creación del marcador AHORA MISMO
    actualizarMarcadorUsuario(-12.0464, -77.0428, 5); // 🔥 PRECISIÓN MÁXIMA
    
    // Iniciar GPS después de 1 segundo
    setTimeout(() => {
        console.log('📍 INICIANDO GPS...');
        iniciarSistemaGeolocalizacion();
    }, 1000);
    
    // Backup: Verificar después de 3 segundos
    setTimeout(() => {
        if (!marcadorUsuario || !marcadorUsuario.marker) {
            console.log('🚨 BACKUP: Forzando marcador de nuevo...');
            actualizarMarcadorUsuario(-12.0464, -77.0428, 5); // 🔥 PRECISIÓN MÁXIMA
        }
    }, 3000);
}

// ==============================================
// SISTEMA PROFESIONAL DE GEOLOCALIZACIÓN - CORREGIDO
// ==============================================

function iniciarSistemaGeolocalizacion() {
    console.log('🎯 Iniciando sistema de geolocalización profesional...');
    
    // Verificar que el mapa esté inicializado
    if (!mapTrabajadores) {
        console.error('❌ Mapa no inicializado, reintentando...');
        setTimeout(iniciarSistemaGeolocalizacion, 500);
        return;
    }
    
    // Verificar HTTPS primero
    if (!esConexionSegura()) {
        mostrarErrorConexionInsegura();
        return;
    }
    
    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
        mostrarErrorNoSoportado();
        return;
    }
    
    // Mostrar estado inicial
    actualizarEstadoUbicacion('📍 Iniciando GPS profesional...', 'Buscando señal satelital');
    
    // Solicitar permisos de manera profesional
    solicitarPermisosGeolocalizacion();
}

function solicitarPermisosGeolocalizacion() {
    console.log('🔐 Solicitando permisos de geolocalización...');
    
    const opcionesPrueba = {
        enableHighAccuracy: true, // 🔥 ALTA PRECISIÓN DESDE EL INICIO
        timeout: 10000,
        maximumAge: 0 // 🔥 SIEMPRE DATOS FRESCOS
    };
    
    navigator.geolocation.getCurrentPosition(
        // Permisos concedidos
        function(position) {
            console.log('✅ Permisos concedidos - Iniciando GPS de alta precisión');
            ultimaUbicacion = position;
            iniciarGPSAltaPrecision();
        },
        // Permisos denegados
        function(error) {
            console.log('❌ Error permisos:', error);
            manejarErrorPermisos(error);
        },
        opcionesPrueba
    );
}

function iniciarGPSAltaPrecision() {

    // 🔥 NUEVO: VERIFICAR SI EL GPS ESTÁ ACTIVO
    if (!gpsActivo) {
        console.log('📱 GPS DESACTIVADO - No se inicia seguimiento');
        return;
    }

    console.log('🎯 Activando GPS de alta precisión...');
    
    actualizarEstadoUbicacion('🎯 GPS profesional activado', 'Obteniendo ubicación de alta precisión');
    
    const opcionesAltaPrecision = {
        enableHighAccuracy: true,    // FORZAR GPS real
        timeout: 10000,              // 10 segundos máximo para mejor precisión
        maximumAge: 0                // Siempre datos frescos
    };
    
    // LIMPIAR SEGUIMIENTO ANTERIOR
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // 🔥 FORZAR CREACIÓN INICIAL DEL MARCADOR EN TODOS LOS DISPOSITIVOS
    if (!marcadorUsuario || !marcadorUsuario.marker) {
        console.log('🎯 Creando marcador inicial para todos los dispositivos...');
        // Usar posición por defecto de Lima temporalmente
        actualizarMarcadorUsuario(-12.0464, -77.0428, 5); // 🔥 PRECISIÓN MÁXIMA
    }
    
    // PRIMERO: Obtener posición actual rápida
    navigator.geolocation.getCurrentPosition(
        funcionExitoGPS,
        funcionErrorGPS,
        opcionesAltaPrecision
    );
    
        // LUEGO: Iniciar seguimiento continuo (CONFIGURACIÓN DIFERENTE PARA MÓVIL)
    const opcionesMovil = esDispositivoMovil() ? {
        enableHighAccuracy: true,
        timeout: 15000,           // 🔥 MÁS TIEMPO EN MÓVIL
        maximumAge: 60000,        // 🔥 USAR DATOS DE HASTA 1 MINUTO
        distanceFilter: 25        // 🔥 ACTUALIZAR CADA 25 METROS EN MÓVIL
    } : {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, 
        distanceFilter: 10
    };

    watchId = navigator.geolocation.watchPosition(
        funcionExitoGPS,
        funcionErrorGPS,
        opcionesMovil
    );
    
    console.log('🔄 Seguimiento GPS continuo iniciado');
}

// ==============================================
// FUNCIONES MEJORADAS DE ÉXITO Y ERROR
// ==============================================

function funcionExitoGPS(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const precision = position.coords.accuracy;
    
    console.log(`🎯 📍 📍 📍 GPS REAL OBTENIDO: ${lat}, ${lng} (Precisión: ${precision}m)`);
    
    // 🔥 CALCULAR VELOCIDAD Y MOVIMIENTO
    if (ultimaPosicion) {
        const distancia = calcularDistancia(
            ultimaPosicion.lat, ultimaPosicion.lng, 
            lat, lng
        );
        const tiempo = (Date.now() - ultimaPosicion.tiempo) / 1000;
        const velocidad = distancia / tiempo * 3.6; // km/h
        
        console.log(`🚗 Movimiento: ${distancia.toFixed(1)}m en ${tiempo.toFixed(1)}s (${velocidad.toFixed(1)} km/h)`);
        
        if (distancia > 5) { // Si se movió más de 5 metros
            actualizarEstadoUbicacion('🎯 EN MOVIMIENTO', `Velocidad: ${velocidad.toFixed(1)} km/h`);
        }
    }
    
    // Guardar última posición para cálculo
    ultimaPosicion = { lat, lng, tiempo: Date.now() };
    
    // Guardar última ubicación EXACTA
    ultimaUbicacion = position;
    window.ultimaUbicacion = position;
    window.ubicacionActual = { lat: lat, lng: lng };

    // ACTUALIZAR MARCADOR
    actualizarMarcadorUsuario(lat, lng, precision);
    
    // 🔥 NUCLEAR: NUNCA CENTRAR AUTOMÁTICAMENTE - SOLO ACTUALIZAR MARCADOR
    console.log('📍 Marcador actualizado - SIN centrado automático');
    
    // Mostrar mensaje de estado
    actualizarEstadoUbicacion('📍 UBICACIÓN ACTIVA', `Precisión: ${Math.round(precision)}m`);
}

function funcionErrorGPS(error) {
    console.error('❌ Error GPS profesional:', error);
    
    const esMovil = esDispositivoMovil();
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            if (esMovil) {
                mostrarInstruccionesPermisosMovil();
            } else {
                actualizarEstadoUbicacion('❌ PERMISOS BLOQUEADOS', 'Haz clic en "📍 Permitir ubicación"');
            }
            break;
        case error.POSITION_UNAVAILABLE:
            if (esMovil) {
                actualizarEstadoUbicacion('❌ GPS NO DISPONIBLE', 'Activa la ubicación en ajustes del teléfono');
            } else {
                actualizarEstadoUbicacion('❌ GPS NO DISPONIBLE', 'Verifica tu conexión y permisos');
            }
            break;
        case error.TIMEOUT:
            actualizarEstadoUbicacion('⏰ GPS TARDANDO', 'Sal a área abierta y toca "🚀 GPS"');
            // Reintentar automáticamente en móviles
            if (esMovil) {
                setTimeout(iniciarGPSAltaPrecision, 3000);
            }
            break;
        default:
            actualizarEstadoUbicacion('❌ ERROR GPS', 'Actualiza la página e intenta de nuevo');
    }
}

// ==============================================
// FUNCIONES AUXILIARES MEJORADAS
// ==============================================

function actualizarEstadoUbicacion(estado, detalle) {
    // Actualizar para trabajadores
    const elemento = document.getElementById('estado-ubicacion');
    if (elemento) {
        elemento.innerHTML = `${estado}<br><small>${detalle}</small>`;
    }
    
    // 🔥 NUEVO: Actualizar para admin también
    const elementoAdmin = document.getElementById('estado-ubicacion-admin');
    const elementoAdminMobile = document.getElementById('estado-ubicacion-admin-mobile');
    
    if (elementoAdmin) {
        elementoAdmin.innerHTML = `${estado}<br><small>${detalle}</small>`;
        // Actualizar clases para colores
        if (estado.includes('ACTIVA') || estado.includes('ACTIVADO') || estado.includes('UBICACIÓN')) {
            elementoAdmin.className = 'text-success';
        } else if (estado.includes('ERROR') || estado.includes('BLOQUEADOS') || estado.includes('NO DISPONIBLE')) {
            elementoAdmin.className = 'text-danger';
        } else if (estado.includes('INICIANDO') || estado.includes('TARDANDO') || estado.includes('OBTENIENDO')) {
            elementoAdmin.className = 'text-warning';
        } else {
            elementoAdmin.className = 'text-muted';
        }
    }
    
    if (elementoAdminMobile) {
        elementoAdminMobile.innerHTML = `${estado}<br><small>${detalle}</small>`;
        // Actualizar clases para colores
        if (estado.includes('ACTIVA') || estado.includes('ACTIVADO') || estado.includes('UBICACIÓN')) {
            elementoAdminMobile.className = 'text-success';
        } else if (estado.includes('ERROR') || estado.includes('BLOQUEADOS') || estado.includes('NO DISPONIBLE')) {
            elementoAdminMobile.className = 'text-danger';
        } else if (estado.includes('INICIANDO') || estado.includes('TARDANDO') || estado.includes('OBTENIENDO')) {
            elementoAdminMobile.className = 'text-warning';
        } else {
            elementoAdminMobile.className = 'text-muted';
        }
    }
}

function actualizarMarcadorUsuario(lat, lng, precision) {
    console.log('🎯 CREANDO MARCADOR SIMPLE en:', lat, lng);
    
    const mapaActual = mapAdmin || mapTrabajadores;
    if (!mapaActual) return;

    // 🔥 ELIMINAR TODO LO ANTERIOR
    if (marcadorUsuario && marcadorUsuario.marker) {
        mapaActual.removeLayer(marcadorUsuario.marker);
    }

    // 🔥 CREAR MARCADOR BÁSICO DE LEAFLET (NO personalizado)
    const marker = L.marker([lat, lng])
        .addTo(mapaActual)
        .bindPopup(`📍 Tu ubicación: ${lat}, ${lng}`);

    if (!marcadorUsuario) marcadorUsuario = {};
    marcadorUsuario.marker = marker;

        console.log('✅ Marcador Leaflet básico creado');
    
    // 🔥 SOLUCIÓN DEFINITIVA: NUNCA CENTRAR AUTOMÁTICAMENTE AL ACTUALIZAR MARCADOR
    console.log('📍 Marcador actualizado - SIN centrado automático');
    // ELIMINADO COMPLETAMENTE EL setTimeout CON setView
}

// ==============================================
// MANEJO DE ERRORES ESPECÍFICOS PARA MÓVILES
// ==============================================

function mostrarErrorConexionInsegura() {
    const html = `
        🔒 CONEXIÓN NO SEGURA<br>
        <small>El GPS requiere HTTPS para funcionar</small>
        <div class="mt-2">
            <button onclick="location.href='https://' + window.location.hostname + ':5000'" 
                    class="btn btn-success btn-sm w-100">
                🔐 Acceder vía HTTPS
            </button>
        </div>
        <small class="text-muted">Si sale advertencia, haz clic en "Avanzado" → "Continuar"</small>
    `;
    document.getElementById('estado-ubicacion').innerHTML = html;
}

function mostrarErrorNoSoportado() {
    document.getElementById('estado-ubicacion').innerHTML = 
        '❌ GPS no soportado<br><small>Tu navegador no tiene capacidad de GPS</small>';
}

function manejarErrorPermisos(error) {
    const esMovil = esDispositivoMovil();
    const html = `
        📱 PERMISOS REQUERIDOS<br>
        <small>Esta app necesita acceso a tu ubicación para el reparto</small>
        <div class="mt-2">
            <button onclick="solicitarPermisosManual()" 
                    class="btn btn-primary btn-sm w-100">
                📍 Permitir ubicación
            </button>
        </div>
        ${esMovil ? `
        <small class="text-muted">
            <strong>En móvil:</strong> Toca "Permitir" en el popup<br>
            O ve a: Chrome → ⋮ → Configuración → Ubicación → Permitir
        </small>
        ` : ''}
    `;
    document.getElementById('estado-ubicacion').innerHTML = html;
}

function mostrarInstruccionesPermisosMovil() {
    const esIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const esAndroid = /Android/i.test(navigator.userAgent);
    
    let instrucciones = '';
    
    if (esIOS) {
        instrucciones = `
            <strong>iPhone Safari:</strong><br>
            <small>1. Toca  (Compartir)<br>
            2. "Configuración de la página web"<br>
            3. "Ubicación" → "Permitir"</small>
        `;
    } else if (esAndroid) {
        instrucciones = `
            <strong>Android Chrome:</strong><br>
            <small>1. Toca ⋮ (3 puntos arriba)<br>
            2. "Configuración del sitio"<br>
            3. "Ubicación" → "Permitir"</small>
        `;
    } else {
        instrucciones = `
            <strong>En móvil:</strong><br>
            <small>1. Toca el ícono de candado en la barra de URL<br>
            2. Busca "Ubicación" o "Permisos"<br>
            3. Cambia a "Permitir"</small>
        `;
    }
    
    const html = `
        📱 PERMISOS REQUERIDOS<br>
        <small>Necesitamos tu ubicación para el sistema de reparto</small>
        <div class="mt-2">
            ${instrucciones}
        </div>
        <div class="mt-2">
            <button onclick="solicitarPermisosManual()" 
                    class="btn btn-success btn-sm w-100">
                🔄 Intentar de nuevo
            </button>
        </div>
        <small class="text-muted">Si no funciona, reinicia el navegador</small>
    `;
    
    document.getElementById('estado-ubicacion').innerHTML = html;
}

// ==============================================
// FUNCIONES DE CONTROL MANUAL MEJORADAS
// ==============================================

function solicitarPermisosManual() {
    actualizarEstadoUbicacion('📱 SOLICITANDO PERMISOS...', 'Selecciona "Permitir" en el popup');
    
    // Forzar nueva solicitud de permisos
    setTimeout(() => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        iniciarSistemaGeolocalizacion();
    }, 500);
}

function actualizarUbicacionManual() {
    console.log('🚀 Actualización manual solicitada');
    
    // Limpiar seguimiento anterior
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    actualizarEstadoUbicacion('🚀 REINICIANDO GPS...', 'Buscando mejor señal satelital');
    
    // Forzar nueva inicialización
    setTimeout(iniciarSistemaGeolocalizacion, 800);
}

// ==============================================
// FUNCIONES PARA CLIENTES
// ==============================================

function cargarClientesEnMapa(clientes) {
    if (!mapTrabajadores && !mapAdmin) {
        console.error('❌ No hay mapa inicializado para cargar clientes');
        return;
    }
    
    capaClientes.clearLayers();
    marcadoresClientes = [];

    clientes.forEach(cliente => {
        const icono = L.divIcon({
            html: `
                <div style="
                    background: #EA4335;
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
                ">👨‍💼</div>
            `,
            className: 'icono-cliente',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        const marcador = L.marker([cliente.latitud, cliente.longitud], { icon: icono })
            .addTo(capaClientes)
            .bindPopup(`
                <div class="popup-cliente" style="min-width: 200px; max-width: 300px;">
                    <div class="popup-header mb-2">
                        <h6 class="mb-1 fw-bold text-dark">${cliente.nombre}</h6>
                        <span class="badge bg-secondary">${cliente.categoria}</span>
                    </div>
                    <div class="popup-content">
                        <p class="mb-1 small text-muted">📞 ${cliente.telefono || 'No disponible'}</p>
                        <p class="mb-2 small text-muted">📍 ${cliente.direccion || 'No disponible'}</p>
                    </div>
                    <div class="popup-actions d-grid gap-1">
                        <button onclick="centrarEnCliente(${cliente.id})" 
                                class="btn btn-sm btn-primary">
                            🗺️ Centrar
                        </button>
                        <button onclick="abrirGoogleMaps(${cliente.latitud}, ${cliente.longitud}, '${cliente.nombre.replace(/'/g, "\\'")}')" 
                                class="btn btn-sm btn-outline-success">
                            🚗 Google Maps
                        </button>
                    </div>
                </div>
            `);

        marcadoresClientes.push({
            id: cliente.id,
            marcador: marcador,
            cliente: cliente
        });
    });
    
    console.log(`✅ ${clientes.length} clientes cargados en el mapa`);
}

function centrarEnCliente(id) {
    const marcador = marcadoresClientes.find(m => m.id === id);
    if (marcador) {
        const mapa = mapAdmin || mapTrabajadores;
        if (mapa) {
            mapa.setView([marcador.cliente.latitud, marcador.cliente.longitud], 16);
            marcador.marcador.openPopup();
        }
    }
}

// ==============================================
// LIMPIEZA AL SALIR
// ==============================================

function limpiarSeguimientoGPS() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        gpsActivo = false; // 🔥 DESACTIVAR GPS
        console.log('🧹 Seguimiento GPS limpiado y DESACTIVADO');
    }
}

// 🔥 AGREGAR ESTA FUNCIÓN NUEVA en map.js
function forzarGPSAdmin() {
    console.log('🎯 Forzando GPS para admin...');
    
    // 🔥 ACTUALIZAR ESTADO INMEDIATAMENTE
    actualizarEstadoUbicacion('🎯 INICIANDO GPS...', 'Buscando señal satelital');
    
    if (!mapAdmin) {
        console.error('❌ Mapa admin no inicializado');
        actualizarEstadoUbicacion('❌ ERROR GPS', 'Mapa no inicializado');
        return;
    }
    
    // Usar el mismo sistema que funciona en trabajadores
    iniciarSistemaGeolocalizacion();
    
    // Forzar centrado en ubicación actual
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const precision = position.coords.accuracy;
                
                console.log('📍 Ubicación admin obtenida:', lat, lng);
                
                // Centrar mapa y agregar marcador
                mapAdmin.setView([lat, lng], 15);
                actualizarMarcadorUsuario(lat, lng, precision);
                
                // 🔥 ACTUALIZAR ESTADO CORRECTAMENTE
                actualizarEstadoUbicacion('📍 GPS ACTIVADO', `Precisión: ${Math.round(precision)}m`);
            },
            function(error) {
                console.error('❌ Error GPS admin:', error);
                // 🔥 ACTUALIZAR ESTADO DE ERROR
                actualizarEstadoUbicacion('❌ ERROR GPS', 'No se pudo obtener la ubicación');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }
}

// ==============================================
// NUEVA FUNCIÓN PARA CENTRAR EN UBICACIÓN
// ==============================================

function centrarEnUbicacion(lat, lng) {
    const mapa = mapAdmin || mapTrabajadores;
    if (mapa) {
        mapa.setView([lat, lng], 16);
    }
}

// Hacer la función global
window.centrarEnUbicacion = centrarEnUbicacion;

// Limpiar al cerrar la página
window.addEventListener('beforeunload', limpiarSeguimientoGPS);

// ==============================================
// INICIALIZACIÓN AUTOMÁTICA
// ==============================================

// Esperar a que Leaflet se cargue completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, verificando inicialización de mapas...');
    
    // Los mapas se inicializarán desde trabajadores.js o admin.js
});

// 🔥 FUNCIONES SIMPLES PARA CONTROLAR EL SEGUIMIENTO
function activarSeguimientoUbicacion() {
    seguirUbicacionUsuario = true;
    console.log('✅ Seguimiento de ubicación ACTIVADO');
}

function desactivarSeguimientoUbicacion() {
    seguirUbicacionUsuario = false;
    console.log('🛑 Seguimiento de ubicación DESACTIVADO');
}

function forzarCentradoEnUbicacion() {
    if (ultimaUbicacion && mapTrabajadores) {
        const lat = ultimaUbicacion.coords.latitude;
        const lng = ultimaUbicacion.coords.longitude;
        const precision = ultimaUbicacion.coords.accuracy;
        
        const zoom = precision <= 10 ? 18 : precision <= 20 ? 17 : 16;
        mapTrabajadores.setView([lat, lng], zoom);
        console.log('🎯 Forzando centrado en ubicación actual');
    }
}

// 🔥 FUNCIÓN DE DEBUG PARA VERIFICAR EL ESTADO DEL GPS
function debugEstadoGPS() {
    console.log('🐛 DEBUG GPS:');
    console.log('  - watchId:', watchId);
    console.log('  - marcadorUsuario:', marcadorUsuario);
    console.log('  - seguirUbicacionUsuario:', seguirUbicacionUsuario);
    console.log('  - ultimaUbicacion:', ultimaUbicacion);
    console.log('  - mapTrabajadores:', !!mapTrabajadores);
    
    if (marcadorUsuario) {
        console.log('  - Marcador existe:', !!marcadorUsuario.marker);
        console.log('  - Círculo existe:', !!marcadorUsuario.circle);
    }
}

// 🔥 FUNCIÓN DE SEGURIDAD PARA MÓVILES
function verificarMarcadorMovil() {
    if (esDispositivoMovil() && (!marcadorUsuario || !marcadorUsuario.marker)) {
        console.log('📱 SEGURIDAD MÓVIL: Creando marcador de emergencia...');
        actualizarMarcadorUsuario(-12.0464, -77.0428, 5);
    }
}

// Ejecutar verificación después de 3 segundos en móviles
if (esDispositivoMovil()) {
    setTimeout(verificarMarcadorMovil, 3000);
}

// 🔥 SOLUCIÓN PARA REDIMENSIONAMIENTO
function forzarRedrawMapa() {
    console.log('🔄 Forzando redraw del mapa...');
    
    const mapa = mapAdmin || mapTrabajadores;
    if (mapa) {
        // Forzar recálculo del tamaño
        mapa.invalidateSize(true);
        
        // Forzar actualización de la vista
        mapa._onResize();
        
        // Si tenemos ubicación actual, recentrar
        if (window.ubicacionActual) {
            setTimeout(() => {
                mapa.setView([window.ubicacionActual.lat, window.ubicacionActual.lng], mapa.getZoom());
            }, 100);
        }
        
        console.log('✅ Redraw del mapa forzado');
    }
}

// 🔥 NUEVA FUNCIÓN: Reactivar GPS completamente
function reactivarGPSCompleto() {
    gpsActivo = true;
    console.log('🔄 REACTIVANDO GPS COMPLETAMENTE');
    
    // Limpiar cualquier seguimiento anterior
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Reiniciar el sistema de GPS
    setTimeout(() => {
        iniciarSistemaGeolocalizacion();
    }, 1000);
}

// Hacer la función global
window.reactivarGPSCompleto = reactivarGPSCompleto;

// 🔥 DETECTAR CAMBIOS DE TAMAÑO EN ESCRITORIO
window.addEventListener('resize', function() {
    console.log('📱 Cambio de tamaño detectado');
    setTimeout(forzarRedrawMapa, 300);
});

// 🔥 EN MÓVIL, FORZAR REDRAW AL CARGAR
if (esDispositivoMovil()) {
    setTimeout(() => {
        console.log('📱 Forzando redraw en móvil...');
        forzarRedrawMapa();
    }, 2000);
}

// 🔥 FUNCIÓN PARA CALCULAR DISTANCIA ENTRE DOS PUNTOS
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ==============================================
// 🔥 NUEVA FUNCIÓN: ABRIR GOOGLE MAPS PARA RUTAS
// ==============================================

function abrirGoogleMaps(lat, lng, nombreCliente) {
    console.log('🚗 Abriendo Google Maps para:', nombreCliente);
    
    try {
        // Validar coordenadas
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        if (isNaN(latNum) || isNaN(lngNum)) {
            alert('❌ Error: Coordenadas del cliente inválidas');
            return;
        }
        
        // Crear URL de Google Maps
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;
        
        console.log('🔗 URL Google Maps:', googleMapsUrl);
        
        // Abrir en nueva pestaña
        window.open(googleMapsUrl, '_blank');
        
    } catch (error) {
        console.error('💥 Error en abrirGoogleMaps:', error);
        alert('❌ Error al abrir Google Maps');
    }
}

// Exportar funciones globales
window.inicializarMapaAdmin = inicializarMapaAdmin;
window.inicializarMapaTrabajadores = inicializarMapaTrabajadores;
window.obtenerUbicacionUsuario = iniciarSistemaGeolocalizacion;
window.cargarClientesEnMapa = cargarClientesEnMapa;
window.centrarEnCliente = centrarEnCliente;
window.actualizarUbicacionManual = actualizarUbicacionManual;
window.limpiarSeguimientoGPS = limpiarSeguimientoGPS;
window.activarSeguimientoUbicacion = activarSeguimientoUbicacion;
window.desactivarSeguimientoUbicacion = desactivarSeguimientoUbicacion;
window.forzarCentradoEnUbicacion = forzarCentradoEnUbicacion;
window.debugEstadoGPS = debugEstadoGPS;
window.verificarMarcadorMovil = verificarMarcadorMovil;