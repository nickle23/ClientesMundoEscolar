// SISTEMA TRABAJADORES - VERSIÓN HÍBRIDA DEFINITIVA PARA GITHUB PAGES
class TrabajadoresSystem {
    constructor() {
        this.mapa = null;
        this.marcadoresClientes = new Map();
        this.clientesData = [];
        this.marcadorUbicacion = null;
        this.circuloPrecision = null;
        this.inicializado = false;
        this.notificacionTimeout = null;
        this.notificacionPendiente = null; // ✅ Notificación pendiente si está buscando
        this.watchId = null;
        this.gpsIniciado = false;
        this.modoSeguirCentrado = true; // TRUE = centrado, FALSE = explorando
        
        // ✅ FILTRO DE ESTABILIDAD GPS - Solución definitiva contra saltos
        this.ultimaPosicionValida = null;
        this.historialPosiciones = []; // Últimas 3 posiciones para promediar
        this.ultimaActualizacion = 0;
        this.umbralMinimo = 3; // Mínimo 3 metros para actualizar (más sensible para rutas)
        this.umbralMaximo = 200; // Máximo 200 metros de salto (ignora errores graves)
        this.maxHistorial = 3; // Promediar últimas 3 lecturas
        
        // ✅ SISTEMA GPS EN SEGUNDO PLANO - Reactivar cuando vuelve la página
        this.gpsActivoPorUsuario = false;
        this.ultimoTimeGPS = 0;
        
        // Detectar cuando la página vuelve a estar visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.gpsActivoPorUsuario) {
                console.log('📱 Página visible - Reactivando GPS con centrado...');
                this.modoSeguirCentrado = true; // ✅ Centrar al volver
                this.reactivarGPS();
            }
        });
        
        // Verificar cada 10 segundos si el GPS aún responde
        setInterval(() => {
            if (this.gpsActivoPorUsuario && this.watchId) {
                const ahora = Date.now();
                if (ahora - this.ultimoTimeGPS > 8000) {
                    console.log('⚠️ GPS sin respuesta - Reiniciando...');
                    // ✅ NO cambiar modoSeguirCentrado para no molestar al usuario
                    this.reactivarGPSSilencioso();
                }
            }
        }, 10000);
    }

    // ✅ FUNCIÓN PARA REACTIVAR GPS SIN CAMBIAR MODO
    reactivarGPSSilencioso() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Obtener posición sin centrar el mapa
        this.obtenerUbicacionMaximaPrecision((lat, lng, precision) => {
            if (this.mapa) {
                this.actualizarMarcadorUbicacion(lat, lng, precision);
                // NO centrar el mapa, solo actualizar marcador
            }
        });
        
        // Reiniciar watch normal
        this.iniciarSeguimientoGPS();
    }

    // ✅ FUNCIÓN PARA REACTIVAR GPS
    reactivarGPS() {
        // Detener watch anterior
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Reiniciar seguimiento
        this.activarGPS();
    }

    // ✅ AGREGAR ESTA FUNCIÓN NUEVA DESPUÉS DEL CONSTRUCTOR
    configurarBotonesTactiles() {
        console.log('📱 Configurando botones táctiles...');

        // SOLO los botones que SÍ funcionan bien
        const botones = [
            'btn-volver-ubicacion',
            'btn-recargar-clientes'
        ];

        botones.forEach(botonId => {
            const boton = document.getElementById(botonId);
            if (!boton) return;

            // ✅ Esto SÍ funciona para botones normales
            boton.addEventListener('touchstart', () => {
                boton.style.background = '#2c5aa0';
                boton.style.color = 'white';
                boton.style.transform = 'scale(0.95)';
            });

            boton.addEventListener('touchend', () => {
                boton.style.background = '';
                boton.style.color = '';
                boton.style.transform = '';
            });
        });

        console.log('✅ Botones táctiles configurados (excepto zoom)');
    }

    async inicializar() {
        if (this.inicializado) return;

        // ✅ SEGUNDO BLINDAJE: Verificar autenticación antes de cualquier carga
        if (typeof authSystem === 'undefined' || !authSystem.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        console.log('🚀 Iniciando sistema trabajadores HÍBRIDO v4.8...');

        try {
            // Asegurar que apiSystem esté listo
            if (typeof apiSystem === 'undefined') {
                throw new Error('apiSystem no encontrado');
            }

            // 1. Forzar dimensiones del contenedor antes de Leaflet
            const divMapa = document.getElementById('map-trabajadores');
            if (divMapa) {
                divMapa.style.minHeight = '100vh';
                divMapa.style.minWidth = '100vw';
                divMapa.style.backgroundColor = '#f8f9fa';
            }

            // 2. Inicializar mapa con blindaje
            const mapaExitoso = await this.inicializarMapa();

            if (!mapaExitoso) {
                this.mostrarNotificacion('⚠️ El mapa no pudo cargarse. Verifica tu conexión.', 'warning');
            }

            // 3. Cargar clientes (Ya sincronizados por apiSystem v8.2)
            await this.cargarClientes();

            // 4. Configurar eventos
            this.configurarEventos();

            this.inicializado = true;
            console.log('✅ Sistema trabajadores 100% operativo v6.0');
            
            // ✅ ACTIVAR GPS AUTOMÁTICAMENTE al iniciar
            setTimeout(() => {
                console.log('🎯 Activando GPS automáticamente...');
                this.activarGPS();
            }, 1500);

            // Actualizar contador total de clientes
            const totalCountElem = document.getElementById('total-clientes-count');
            if (totalCountElem) {
                totalCountElem.textContent = this.clientesData.length;
            }

            // Actualizar nombre del usuario en el encabezado
            if (typeof authSystem !== 'undefined' && authSystem.currentUser) {
                const usernameElem = document.getElementById('navbar-username');
                const usernameElem2 = document.getElementById('current-username');
                if (usernameElem) {
                    usernameElem.textContent = authSystem.currentUser.username;
                }
                if (usernameElem2) {
                    usernameElem2.textContent = authSystem.currentUser.username;
                }
            }

            // Mostrar notificación de entorno
            setTimeout(() => {
                const status = apiSystem.getSystemStatus();
                if (status.environment === 'LOCAL') {
                    this.mostrarNotificacion('✅ Sistema LOCAL con base de datos SQLite', 'success');
                } else {
                    this.mostrarNotificacion('🌐 Sistema en GitHub Pages (modo demostración)', 'info');
                }
            }, 1000);

            // ✅ GPS con MÁXIMA PRECISIÓN al iniciar
            setTimeout(() => {
                console.log('🚀 Iniciando GPS y ubicando tu posición...');
                this.obtenerUbicacionMaximaPrecision((lat, lng, precision) => {
                    console.log(`📍 Ubicación inicial obtenida: ${lat}, ${lng}`);
                    this.modoSeguirCentrado = true;
                    this.activarGPS();
                    
                    if (this.mapa) {
                        // Asegurar que el mapa esté listo
                        this.mapa.invalidateSize();
                        
                        // Actualizar marcador
                        this.actualizarMarcadorUbicacion(lat, lng, precision);
                        
                        // Centrar con zoom máximo
                        setTimeout(() => {
                            this.mapa.flyTo([lat, lng], 19, {
                                duration: 0.8,
                                easeLinearity: 0.25
                            });
                            console.log('✅ Mapa centrado en tu ubicación');
                        }, 300);
                        
                        this.mostrarNotificacion(`📍 Precisión: ${Math.round(precision)}m - GPS activo`, 'success');
                    } else {
                        console.error('❌ Mapa no disponible para centrar');
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('❌ Error inicializando sistema trabajadores:', error);
            this.mostrarNotificacion('Error al inicializar el sistema', 'danger');
        }
    }

    // En la función inicializarMapa, modificar:
    inicializarMapa() {
        return new Promise((resolve) => {
            console.log('🗺️ Intentando inicializar Leaflet v4.8...');

            const reintentar = (intento = 0) => {
                try {
                    // Verificar si Leaflet está cargado
                    if (typeof L === 'undefined') {
                        if (intento < 10) {
                            console.warn('⏳ Esperando a Leaflet (L)...');
                            setTimeout(() => reintentar(intento + 1), 500);
                        } else {
                            throw new Error('Leaflet no cargó (¿Sin internet?)');
                        }
                        return;
                    }

                    const contenedor = document.getElementById('map-trabajadores');
                    if (!contenedor || contenedor.offsetWidth < 100) {
                        if (intento < 10) {
                            console.warn('⏳ Esperando dimensiones de contenedor...');
                            setTimeout(() => reintentar(intento + 1), 500);
                        } else {
                            throw new Error('Contenedor de mapa sin dimensiones');
                        }
                        return;
                    }

                    // Limpiar si ya existe un mapa de OTRA instancia (colisión)
                    if (this.mapa) this.mapa.remove();

                    // Truco para Leaflet: invalidar instancia previa si existe en el DOM
                    try {
                        const existingMap = contenedor._leaflet_id;
                        if (existingMap) {
                            contenedor._leaflet_id = null;
                        }
                    } catch (e) { }

                    this.mapa = L.map('map-trabajadores', {
                        center: [-12.0464, -77.0428],
                        zoom: 13,
                        zoomControl: false,
                        attributionControl: true
                    });

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19
                    }).addTo(this.mapa);

                    // Forzar aparición de controles
                    L.control.zoom({ position: 'topright' }).addTo(this.mapa);
                    L.control.scale({ imperial: false }).addTo(this.mapa);

                    // ✅ Evento: cuando el usuario mueve el mapa manualmente (drag)
                    this.mapa.on('dragstart', () => {
                        this.modoSeguirCentrado = false;
                        // Cerrar popup de ubicación si está abierto
                        if (this.marcadorUbicacion) {
                            this.marcadorUbicacion.closePopup();
                        }
                        console.log('🗺️ Modo: EXPLORANDO (usuario movió el mapa)');
                    });

                    setTimeout(() => {
                        this.mapa.invalidateSize(true);
                        console.log('✅ Leaflet v4.8 dibujado con éxito');
                        resolve(true);
                    }, 500);

                } catch (error) {
                    console.error('❌ Error crítico inicialización mapa:', error);
                    this.mostrarNotificacion(`Error Mapa: ${error.message}`, 'danger');
                    resolve(false);
                }
            };

            reintentar();
        });
    }

    aplicarEstilosControles() {
        console.log('🎨 Verificando estilos de controles...');

        // ✅ SOLO VERIFICACIÓN - LOS ESTILOS YA ESTÁN EN CSS
        const zoomControl = document.querySelector('.leaflet-control-zoom');
        if (zoomControl) {
            console.log('✅ Controles de zoom ya estilizados via CSS');
        } else {
            setTimeout(() => this.aplicarEstilosControles(), 100);
        }
    }

    async cargarClientes() {
        try {
            console.log('📥 Cargando clientes...');

            // ✅ USAR EL SISTEMA DE API HÍBRIDO
            this.clientesData = await apiSystem.getClientes();

            // ORDENAR CLIENTES ALFABÉTICAMENTE POR NOMBRE
            this.clientesData.sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log(`✅ ${this.clientesData.length} clientes cargados y ordenados`);

            this.mostrarNotificacion(`✅ ${this.clientesData.length} clientes cargados`, 'success');

            // Cargar clientes en el mapa
            this.cargarClientesEnMapa();

        } catch (error) {
            console.error('❌ Error cargando clientes:', error);
            this.mostrarNotificacion('Error al cargar clientes', 'danger');
        }
    }

    cargarClientesEnMapa() {
        if (!this.mapa) {
            console.error('❌ Mapa no disponible');
            return;
        }

        // Limpiar marcadores anteriores
        this.marcadoresClientes.forEach((marcadorData, id) => {
            this.mapa.removeLayer(marcadorData.marcador);
        });
        this.marcadoresClientes.clear();

        console.log(`🗺️ Agregando ${this.clientesData.length} clientes al mapa...`);

        this.clientesData.forEach(cliente => {
            try {
                // Validar datos del cliente
                if (!cliente.id || !cliente.latitud || !cliente.longitud) {
                    console.warn(`⚠️ Cliente ${cliente.nombre} tiene datos incompletos, omitiendo...`);
                    return;
                }

                // Crear icono personalizado
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
                        ">👨‍💼</div>
                    `,
                    className: 'icono-cliente',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });

                // Crear marcador
                const marcador = L.marker([cliente.latitud, cliente.longitud], {
                    icon: icono,
                    title: cliente.nombre
                }).addTo(this.mapa);

                // Popup elegante y centrado
                marcador.bindPopup(`
                    <div class="popup-cliente-elegante">
                        <div class="popup-header">
                            <div class="popup-titulo">${cliente.nombre}</div>
                            <div class="popup-categoria">${cliente.categoria || 'Sin Categoría'}</div>
                        </div>
                        <div class="popup-body">
                            <div class="popup-info-row">
                                <i class="fas fa-phone popup-icon popup-icon-phone"></i>
                                <span class="popup-text">${cliente.telefono || 'Sin Teléfono'}</span>
                            </div>
                            <div class="popup-info-row">
                                <i class="fas fa-map-marker-alt popup-icon popup-icon-location"></i>
                                <span class="popup-text">${cliente.direccion || 'Sin Dirección'}</span>
                            </div>
                        </div>
                        <div class="popup-actions">
                            <button class="popup-btn popup-btn-primary" onclick="trabajadoresSystem.centrarEnCliente(${cliente.id})">
                                <i class="fas fa-crosshairs"></i>
                                <span>Centrar</span>
                            </button>
                            <button class="popup-btn popup-btn-success" onclick="trabajadoresSystem.irAlCliente(${cliente.id})">
                                <i class="fas fa-directions"></i>
                                <span>Navegar</span>
                            </button>
                            <button class="popup-btn popup-btn-warning" onclick="trabajadoresSystem.compartirCliente(${cliente.id})">
                                <i class="fas fa-share-alt"></i>
                                <span>Compartir</span>
                            </button>
                        </div>
                    </div>
                `);

                // Guardar referencia
                this.marcadoresClientes.set(cliente.id, {
                    marcador: marcador,
                    cliente: cliente
                });

            } catch (error) {
                console.error(`❌ Error con cliente ${cliente.nombre}:`, error);
            }
        });

        console.log(`✅ ${this.marcadoresClientes.size} clientes cargados en el mapa`);
    }

    // FUNCIÓN PRINCIPAL PARA CENTRAR EN CLIENTE
    centrarEnCliente(id) {
        console.log(`📍 TrabajadoresSystem: Centrando en cliente ID: ${id}`);

        if (!this.mapa) {
            console.error('❌ Mapa no disponible');
            this.mostrarNotificacion('El mapa no está disponible', 'danger');
            return;
        }

        // ✅ IMPORTANTE: Desactivar seguimiento centrado para que el GPS no te jale de vuelta
        this.modoSeguirCentrado = false;
        console.log('🗺️ Modo: EXPLORANDO (buscando cliente)');

        const marcadorData = this.marcadoresClientes.get(id);

        if (marcadorData) {
            const cliente = marcadorData.cliente;
            console.log(`📍 Centrando en: ${cliente.nombre} (${cliente.latitud}, ${cliente.longitud})`);

            // Centrar el mapa con animación
            this.mapa.flyTo([cliente.latitud, cliente.longitud], 16, {
                duration: 1,
                easeLinearity: 0.25
            });

            // Abrir popup después de la animación
            setTimeout(() => {
                marcadorData.marcador.openPopup();
            }, 800);

            console.log('✅ ✅ ✅ CENTRADO EXITOSO ✅ ✅ ✅');
            this.mostrarNotificacion(`📍 Centrado en: ${cliente.nombre}`, 'success');

        } else {
            console.error(`❌ No se encontró marcador para ID: ${id}`);
            console.log('Marcadores disponibles:', Array.from(this.marcadoresClientes.keys()));
            this.mostrarNotificacion(`Cliente no encontrado en el mapa`, 'warning');

            // Buscar en datos y crear marcador temporal como fallback
            const cliente = this.clientesData.find(c => c.id === id);
            if (cliente) {
                console.warn(`🔄 Creando marcador temporal para: ${cliente.nombre}`);
                this.crearMarcadorTemporal(cliente);
                this.mapa.setView([cliente.latitud, cliente.longitud], 16);
            }
        }
    }

    crearMarcadorTemporal(cliente) {
        if (!this.mapa) return;

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
        }).addTo(this.mapa);

        marcadorTemporal.bindPopup(`
            <div style="min-width: 200px;">
                <h6 class="fw-bold mb-2">${cliente.nombre} <small class="text-warning">(Temporal)</small></h6>
                <p class="mb-1 small">📞 ${cliente.telefono || 'No disponible'}</p>
                <p class="mb-2 small">📍 ${cliente.direccion || 'No disponible'}</p>
                <span class="badge bg-warning">${cliente.categoria}</span>
                <div class="mt-2">
                    <small class="text-muted">Marcador temporal - Recarga la página</small>
                </div>
            </div>
        `).openPopup();

        // Eliminar después de 5 segundos
        setTimeout(() => {
            if (marcadorTemporal && this.mapa) {
                this.mapa.removeLayer(marcadorTemporal);
            }
        }, 5000);
    }

    // ✅ FUNCIÓN NAVEGAR - Selector nativo de mapas en móviles, pestaña en desktop
    irAlCliente(id) {
        const marcadorData = this.marcadoresClientes.get(id);
        if (!marcadorData) return;
        
        const cliente = marcadorData.cliente;
        const lat = cliente.latitud;
        const lng = cliente.longitud;
        const nombre = cliente.nombre;
        
        // Detectar dispositivo
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isMobile = isAndroid || isiOS;
        
        if (isMobile) {
            // MÓVIL: Crear iframe oculto para abrir app sin cambiar de página
            this.abrirAppMapas(lat, lng, nombre);
        } else {
            // DESKTOP: Nueva pestaña de Google Maps
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        }
        
        console.log(`🚗 Navegando a: ${cliente.nombre}`);
        this.mostrarNotificacion(`🗺️ Abriendo app de mapas...`, 'info');
    }
    
    // ✅ ABRIR APP DE MAPAS USANDO IFRAME (no cambia la página)
    abrirAppMapas(lat, lng, nombre) {
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isAndroid) {
            // Android: geo: abre selector nativo
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.position = 'fixed';
            iframe.style.bottom = '0';
            iframe.style.left = '0';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            document.body.appendChild(iframe);
            
            const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(nombre)})`;
            iframe.src = geoUrl;
            
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 3000);
            
        } else if (isiOS) {
            // iOS: Intentar Google Maps primero, si no funciona abrir Apple Maps
            this.abrirMapasiOSAutomatica(lat, lng, nombre);
        }
    }
    
    // ✅ ABERTURA AUTOMÁTICA DE MAPAS EN iOS
    abrirMapasiOSAutomatica(lat, lng, nombre) {
        // Intentar Google Maps primero
        const urlGoogle = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving&zoom=17`;
        
        // Hacer un intento con timeout
        let intentTimeout = setTimeout(() => {
            console.log('Google Maps no disponible, intentando Apple Maps...');
            // Fallback a Apple Maps
            const urlApple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
            window.location.href = urlApple;
        }, 800);
        
        // Intentar abrir Google Maps
        window.location.href = urlGoogle;
        
        // Limpiar el timeout si funciona antes
        setTimeout(() => {
            clearTimeout(intentTimeout);
        }, 100);
    }
    
    // ✅ FUNCIÓN COMPARTIR - Comparte como tarjeta estilo WhatsApp
    compartirCliente(id) {
        const marcadorData = this.marcadoresClientes.get(id);
        if (!marcadorData) return;
        
        const cliente = marcadorData.cliente;
        const lat = cliente.latitud;
        const lng = cliente.longitud;
        const nombre = cliente.nombre;
        const direccion = cliente.direccion || 'Sin dirección';
        
        // URL de Google Maps para la ubicación
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        
        // Texto formateado para compartir
        const texto = `📍 ${nombre}\n📌 ${direccion}\n🗺️ ${mapsUrl}`;
        
        // Detectar si soporta Web Share API
        if (navigator.share) {
            navigator.share({
                title: nombre,
                text: texto,
                url: mapsUrl
            }).then(() => {
                console.log(`✅ Compartido exitosamente`);
                this.mostrarNotificacion(`✅ Enlace compartido`, 'success');
            }).catch((err) => {
                console.log('Compartiendo cancelado o falló');
            });
        } else {
            // Fallback para navegadores sin Web Share API
            this.compartirFallback(texto, mapsUrl);
        }
    }
    
    // ✅ FALLBACK PARA COMPARTIR (copiar al portapapeles)
    compartirFallback(texto, url) {
        // Copiar al portapapeles
        navigator.clipboard.writeText(texto).then(() => {
            this.mostrarNotificacion(`📋 Enlace copiado. Pégalo en WhatsApp o cualquier app.`, 'success');
            
            // Intentar abrir WhatsApp directamente
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
            window.open(whatsappUrl, '_blank');
        }).catch(() => {
            // Si no funciona clipboard, mostrar modal con opciones
            this.mostrarModalCompartir(texto, url);
        });
    }
    
    // ✅ MODAL PARA COMPARTIR (fallback adicional)
    mostrarModalCompartir(texto, url) {
        // Crear modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', sans-serif;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 25px; max-width: 350px; width: 90%; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: #333;">Compartir Ubicación</h4>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; white-space: pre-line;">${texto}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="trabajadoresSystem.copiarAlPortapapeles('${texto}', this)" style="
                        background: #25D366; color: white; border: none; padding: 10px 20px;
                        border-radius: 8px; cursor: pointer; font-size: 14px; flex: 1; min-width: 120px;
                    ">📋 Copiar</button>
                    <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(texto)}', '_blank'); this.closest('div').parentElement.parentElement.remove()" style="
                        background: #25D366; color: white; border: none; padding: 10px 20px;
                        border-radius: 8px; cursor: pointer; font-size: 14px; flex: 1; min-width: 120px;
                    ">💬 WhatsApp</button>
                </div>
                <button onclick="this.closest('div').parentElement.remove()" style="
                    margin-top: 15px; background: #eee; color: #666; border: none;
                    padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px;
                ">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    // ✅ COPIAR AL PORTAPAPELES
    copiarAlPortapapeles(texto, boton) {
        navigator.clipboard.writeText(texto).then(() => {
            boton.textContent = '✅ Copiado';
            boton.style.background = '#27ae60';
            setTimeout(() => {
                boton.textContent = '📋 Copiar';
                boton.style.background = '#25D366';
            }, 2000);
        });
    }

    configurarEventos() {
        console.log('⚙️ Configurando eventos...');

        // 1. PRIMERO configurar botones táctiles (solo para estilo)
        this.configurarBotonesTactiles();

        // 2. Buscador (mantener igual)
        const buscador = document.getElementById('buscador-clientes');
        if (buscador) {
            let timeout;

            buscador.addEventListener('input', (e) => {
                clearTimeout(timeout);
                
                // ✅ Cerrar notificación al escribir en el buscador
                const estadoElem = document.getElementById('estado-sistema-trabajadores');
                if (estadoElem) {
                    estadoElem.classList.add('estado-oculto');
                    if (this.notificacionTimeout) {
                        clearTimeout(this.notificacionTimeout);
                        this.notificacionTimeout = null;
                    }
                }
                
                const termino = e.target.value.trim();

                if (termino.length === 0) {
                    this.ocultarSugerencias();
                    return;
                }

                timeout = setTimeout(() => {
                    if (termino.length >= 2) {
                        this.mostrarSugerencias(termino);
                    }
                }, 300);
            });

            buscador.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const termino = e.target.value.trim();
                    if (termino.length >= 2) {
                        this.buscarCliente(termino);
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.floating-search')) {
                    this.ocultarSugerencias();
                }
            });
        }

        // ✅ 3. BOTÓN VOLVER A UBICACIÓN - ¡ESTE FALTABA!
        document.getElementById('btn-volver-ubicacion')?.addEventListener('click', () => {
            console.log('📍 Botón volver a ubicación clickeado');
            this.volverAMiUbicacion();
        });

        // ✅ 4. BOTÓN RECARGAR CLIENTES - ¡ESTE TAMBIÉN FALTABA!
        document.getElementById('btn-recargar-clientes')?.addEventListener('click', () => {
            console.log('🔄 Botón recargar clientes clickeado');
            this.recargarClientes();
        });

        // Botón seleccionar ruta - llama funcion global
        document.getElementById('btn-seleccionar-ruta')?.addEventListener('click', () => {
            if (window.iniciarSeleccionRuta) {
                window.iniciarSeleccionRuta();
            }
        });
        
        // Botón calcular ruta - llama funcion global
        document.getElementById('btn-calcular-ruta')?.addEventListener('click', () => {
            if (window.calcularRutaOptima) {
                window.calcularRutaOptima();
            }
        });

        // 5. Botón GPS del buscador
        document.getElementById('btn-actualizar-ubicacion')?.addEventListener('click', () => this.activarGPS());

        // 6. Botón cerrar resultados
        document.getElementById('btn-cerrar-resultados')?.addEventListener('click', () => this.ocultarPanelResultados());

        // 7. Botón abrir maps en modal
        document.getElementById('btn-abrir-maps')?.addEventListener('click', () => {
            const clienteNombre = document.getElementById('modal-cliente-nombre').textContent;
            const cliente = this.clientesData.find(c => c.nombre === clienteNombre);
            if (cliente) {
                this.irAlCliente(cliente.id);
            }
        });

        console.log('✅ Eventos configurados');
    }

    normalizarTexto(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[áäà]/g, 'a')
            .replace(/[éëè]/g, 'e')
            .replace(/[íïì]/g, 'i')
            .replace(/[óöò]/g, 'o')
            .replace(/[úüù]/g, 'u')
            .replace(/[ñ]/g, 'n');
    }

    mostrarSugerencias(termino) {
        const container = document.getElementById('sugerencias-container-trabajadores');
        const lista = document.getElementById('lista-sugerencias-trabajadores');

        if (!container || !lista) {
            console.error('❌ No se encuentran los elementos de sugerencias');
            return;
        }

        console.log(`🔍 Buscando "${termino}" en ${this.clientesData.length} clientes`);

        const terminoNormalizado = this.normalizarTexto(termino);
        let sugerencias = this.clientesData.filter(cliente =>
            this.normalizarTexto(cliente.nombre).includes(terminoNormalizado)
        );

        // ORDENAR SUGERENCIAS ALFABÉTICAMENTE
        sugerencias.sort((a, b) => a.nombre.localeCompare(b.nombre));
        sugerencias = sugerencias.slice(0, 6);

        console.log(`🔍 ${sugerencias.length} sugerencias encontradas para: "${termino}"`);

        if (sugerencias.length === 0) {
            lista.innerHTML = `
                <div class="suggestion-item suggestion-no-results">
                    <div class="suggestion-content">
                        <div class="suggestion-name">
                            <i class="fas fa-search icon-search"></i>
                            Sin resultados
                        </div>
                        <div class="suggestion-info">
                            <div class="suggestion-row">
                                <span class="no-results-text">No hay coincidencias para "${termino}"</span>
                            </div>
                            <div class="suggestion-row">
                                <span class="no-results-hint">Intenta con otro nombre o verifica la ortografía</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            lista.innerHTML = '';
            sugerencias.forEach(cliente => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <div class="suggestion-content">
                        <div class="suggestion-name">${cliente.nombre}</div>
                        <div class="suggestion-info">
                            <div class="suggestion-row">
                                <span class="badge-categoria">${cliente.categoria || 'Sin Categoría'}</span>
                            </div>
                            <div class="suggestion-row">
                                <i class="fas fa-map-marker-alt icon-direccion"></i>
                                <span class="direccion-text">${cliente.direccion || 'Sin Dirección'}</span>
                            </div>
                            <div class="suggestion-row">
                                <i class="fas fa-phone icon-telefono"></i>
                                <span class="telefono-text">${cliente.telefono || 'Sin Teléfono'}</span>
                            </div>
                        </div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    console.log(`🎯 Click en sugerencia: ${cliente.nombre} (ID: ${cliente.id})`);
                    document.getElementById('buscador-clientes').value = cliente.nombre;
                    this.verCliente(cliente.id);
                    this.ocultarSugerencias();
                });
                lista.appendChild(item);
            });
        }

        container.style.display = 'block';
    }

    buscarCliente(termino) {
        if (!termino || termino.length < 2) return;

        console.log(`🔍 Búsqueda profunda para: "${termino}"`);
        const terminoNormalizado = this.normalizarTexto(termino);

        const resultados = this.clientesData.filter(cliente =>
            this.normalizarTexto(cliente.nombre).includes(terminoNormalizado) ||
            (cliente.direccion && this.normalizarTexto(cliente.direccion).includes(terminoNormalizado))
        );

        if (resultados.length === 1) {
            // Si solo hay uno, ir directo
            this.verCliente(resultados[0].id);
        } else if (resultados.length > 1) {
            // Si hay varios, mostrar panel de resultados
            this.mostrarResultadosEnPanel(resultados, termino);
        } else {
            this.mostrarNotificacion(`No se encontraron clientes para "${termino}"`, 'warning');
        }
    }

    mostrarResultadosEnPanel(resultados, termino) {
        const panel = document.getElementById('panel-resultados');
        const lista = document.getElementById('lista-resultados');
        const info = document.getElementById('info-resultados-busqueda');

        if (!panel || !lista) return;

        lista.innerHTML = '';

        if (info) {
            info.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-search me-1"></i> <strong>${resultados.length}</strong> resultados para "<strong>${termino}</strong>"</span>
                    <span class="badge bg-primary rounded-pill">${resultados.length}</span>
                </div>
            `;
        }

resultados.forEach(cliente => {
            const row = document.createElement('div');
            row.className = 'resultado-item p-3 border-bottom hover-bg-light cursor-pointer';
            row.style.cursor = 'pointer';
            
            const estaEnRuta = window.clientesSeleccionados && window.clientesSeleccionados.includes(cliente.id);
            const btnRuta = estaEnRuta 
                ? `<button class="btn btn-sm btn-success rounded-circle" title="En ruta" style="width:32px;height:32px;padding:0;"><i class="fas fa-check"></i></button>`
                : `<button class="btn btn-sm btn-outline-primary rounded-circle btn-agregar-ruta" title="Agregar a ruta" data-id="${cliente.id}" style="width:32px;height:32px;padding:0;"><i class="fas fa-route"></i></button>`;
            
            row.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="resultado-nombre">${cliente.nombre}</div>
                        <div class="resultado-direccion">
                            <i class="fas fa-map-marker-alt me-1"></i> ${cliente.direccion || 'Sin dirección'}
                        </div>
                        <div class="mt-1">
                            <span class="badge-zona-lg">${cliente.categoria || 'Sin Zona'}</span>
                        </div>
                    </div>
                    <div class="ms-3 d-flex gap-2">
                        ${btnRuta}
                        <button class="btn btn-sm btn-primary rounded-circle shadow-sm" title="Ver" style="width: 32px; height: 32px; padding: 0;">
                            <i class="fas fa-chevron-right" style="font-size: 12px;"></i>
                        </button>
                    </div>
                </div>
            `;
            
            row.addEventListener('click', (e) => {
                if (e.target.closest('.btn-agregar-ruta')) {
                    const id = parseInt(e.target.closest('.btn-agregar-ruta').dataset.id);
                    window.agregarClienteARuta(id);
                    return;
                }
                this.verCliente(cliente.id);
                this.ocultarPanelResultados();
});
            lista.appendChild(row);
        });

        panel.style.display = 'block';
        panel.classList.add('animate__animated', 'animate__fadeInDown');
    }

    verCliente(id) {
        console.log(`👁️ Ver cliente ID: ${id}`);

        const cliente = this.clientesData.find(c => c.id === id);
        if (!cliente) {
            console.error(`❌ Cliente ${id} no encontrado`);
            this.mostrarNotificacion('Cliente no encontrado', 'danger');
            return;
        }

        // 1. Centrar en el cliente
        this.centrarEnCliente(id);

        // 2. Limpiar interfaz
        this.ocultarSugerencias();
        document.getElementById('buscador-clientes').value = '';
    }

    activarGPS() {
        console.log('🎯 Activando GPS en tiempo real...');
        
        // ✅ Marcar que el usuario solicitó GPS activo
        this.gpsActivoPorUsuario = true;

        if (!navigator.geolocation) {
            this.mostrarNotificacion('❌ Tu dispositivo no soporta GPS', 'danger');
            return;
        }

        // Si ya hay un watch activo, detenerlo primero
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            console.log('🛑 GPS anterior detenido');
        }

        this.mostrarNotificacion('📡 Obteniendo tu ubicación...', 'info');

        // PRIMERO: Obtener posición inicial
        this.obtenerUbicacionMaximaPrecision((lat, lng, precision) => {
            if (this.mapa) {
                // Actualizar marcador con posición inicial
                this.actualizarMarcadorUbicacion(lat, lng, precision);
                
                // ✅ Zoom 16 (óptimo para rutas) - menos pegado, más área visible
                this.mapa.flyTo([lat, lng], 16, {
                    duration: 1.0,  // ✅ Más suave
                    easeLinearity: 0.3
                });
                
                // Actualizar modo
                this.modoSeguirCentrado = true;
                
                // NO abrir popup - solo mostrar notificación
                this.mostrarNotificacion(`📍 GPS activo - Precisión: ${Math.round(precision)}m`, 'success');
                console.log('✅ Ubicación inicial mostrada');
            }

            // LUEGO: Iniciar seguimiento en tiempo real
            this.iniciarSeguimientoGPS();
        });
    }

    iniciarSeguimientoGPS() {
        console.log('🛰️ Iniciando seguimiento GPS en tiempo real...');
        
        // Usar watchPosition para actualización continua CON FILTRO ANTI-SALTOS
this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.ultimoTimeGPS = Date.now();
                
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const precision = position.coords.accuracy || 0;
                
                const posicionFiltrada = this.filtrarPosicionGPS(lat, lng, precision);
                
                if (!posicionFiltrada) {
                    return;
                }

                if (this.mapa) {
                    this.actualizarMarcadorUbicacion(posicionFiltrada.lat, posicionFiltrada.lng, precision);

                    if (this.modoSeguirCentrado) {
                        this.mapa.setView([posicionFiltrada.lat, posicionFiltrada.lng], 16, {
                            animate: false
                        });
                    }
                }
            },
            (error) => {
                console.error('❌ Error GPS en seguimiento:', error.code, error.message);
                // No mostrar error, solo log
            },
{
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 10000
            }
        );
        
        console.log(`✅ GPS activo - watchId: ${this.watchId}`);
    }

    // ✅ FUNCIÓN FILTRO GPS - Solución definitiva contra saltos en móvil
filtrarPosicionGPS(lat, lng, precision) {
        const ahora = Date.now();
        
        if (!this.ultimaPosicionValida) {
            this.ultimaPosicionValida = { lat, lng };
            this.historialPosiciones = [{ lat, lng, peso: 1 }];
            return { lat, lng };
        }

        const distancia = this.calcularDistancia(
            this.ultimaPosicionValida.lat, 
            this.ultimaPosicionValida.lng, 
            lat, 
            lng
        );

        this.historialPosiciones.push({ lat: lat, lng: lng, peso: 1 });
        
        if (this.historialPosiciones.length > this.maxHistorial) {
            this.historialPosiciones.shift();
        }

        let latPromedio = 0;
        let lngPromedio = 0;
        let pesoTotal = 0;

        this.historialPosiciones.forEach((pos, index) => {
            const peso = index + 1;
            latPromedio += pos.lat * peso;
            lngPromedio += pos.lng * peso;
            pesoTotal += peso;
        });

        latPromedio /= pesoTotal;
        lngPromedio /= pesoTotal;

        // Actualizar última posición válida con el promedio suavizado
        this.ultimaPosicionValida = { lat: latPromedio, lng: lngPromedio };
        this.ultimaActualizacion = ahora;

        console.log(`✅ Posición suavizada: ${latPromedio.toFixed(6)}, ${lngPromedio.toFixed(6)}`);
        return { lat: latPromedio, lng: lngPromedio };
    }

    // Calcular distancia entre dos puntos (fórmula Haversine)
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Radio de la Tierra en metros
        const rad = Math.PI / 180;
        const dLat = (lat2 - lat1) * rad;
        const dLng = (lng2 - lng1) * rad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Función para obtener ubicación con máxima precisión
    obtenerUbicacionMaximaPrecision(callback) {
        console.log('🛰️ Obteniendo ubicación con máxima precisión...');
        
        if (!navigator.geolocation) {
            this.mostrarNotificacion('❌ GPS no disponible en este dispositivo', 'danger');
            return;
        }

        this.mostrarNotificacion('📡 Localizando su posición...', 'info');

        // ✅ Opciones optimizadas para mejor precisión en rutas
        const opcionesMaximaPrecision = {
            enableHighAccuracy: true,  // Máxima precisión
            timeout: 20000,            // 20 segundos para obtener buena señal
            maximumAge: 0              // Siempre obtener posición nueva
        };

        // Intentar obtener la mejor posición posible
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const precision = position.coords.accuracy;
                
                console.log(`📍 Ubicación obtenida: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, precisión=${precision}m`);

                if (callback) {
                    callback(lat, lng, precision);
                }
            },
                (error) => {
                    console.error('❌ Error GPS:', error.code, error.message);
                    // Intentar con ubicación menos precisa como fallback
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            const precision = position.coords.accuracy;
                            console.log(`📍 Ubicación estándar obtenida (precisión: ${precision}m)`);
                            if (callback) callback(lat, lng, precision);
                        },
                        (error2) => {
                            console.error('❌ Error definitivo GPS:', error2);
                            this.mostrarNotificacion('⚠️ Active el GPS de su dispositivo', 'warning');
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
                    );
                },
            opcionesMaximaPrecision
        );
    }

    // Función para actualizar el marcador de ubicación del usuario
    actualizarMarcadorUbicacion(lat, lng, precision) {
        // Si el marcador ya existe, solo actualizar su posición (sin saltos)
        if (this.marcadorUbicacion && this.mapa) {
            this.marcadorUbicacion.setLatLng([lat, lng]);
            
            // Actualizar círculo de precisión si existe
            if (this.circuloPrecision) {
                const radioVisual = precision > 0 ? Math.min(precision, 50) : 10;
                this.circuloPrecision.setLatLng([lat, lng]);
                this.circuloPrecision.setRadius(radioVisual);
            }
            return;
        }
        
        // Si no existe el marcador, crearlo por primera vez
        const iconoUbicacion = L.divIcon({
            html: `
                <div style="
                    background: #2c5aa0;
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 15px rgba(44, 90, 160, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 20px;
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
            className: 'marcador-ubicacion-usuario',
            iconSize: [45, 45],
            iconAnchor: [22, 22]
        });

        // Crear marcador de ubicación
        this.marcadorUbicacion = L.marker([lat, lng], {
            icon: iconoUbicacion,
            zIndexOffset: 1000
        }).addTo(this.mapa);

        // Crear círculo de precisión (máximo 50 metros para no saturar el mapa)
        const radioVisual = precision > 0 ? Math.min(precision, 50) : 10;
        this.circuloPrecision = L.circle([lat, lng], {
            radius: radioVisual,
            color: '#2c5aa0',
            fillColor: '#2c5aa0',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(this.mapa);

        // Popup informativo
        this.marcadorUbicacion.bindPopup(`
            <div class="text-center" style="min-width: 200px;">
                <strong>📍 Tu ubicación actual</strong><br>
                <small>Lat: ${lat.toFixed(6)}</small><br>
                <small>Lng: ${lng.toFixed(6)}</small><br>
                <small>Precisión: ${precision > 0 ? Math.round(precision) + ' metros' : 'Alta precisión'}</small><br>
                <small>Actualizado: ${new Date().toLocaleTimeString()}</small>
            </div>
        `);

        console.log('✅ Marcador de ubicación creado - Precisión:', precision);
    }

    async recargarClientes() {
        console.log('🔄 Recargando clientes (Sincronización Forzada)...');
        try {
            this.mostrarNotificacion('🔄 Sincronizando con base de datos maestra...', 'info');

            // ✅ SIEMPRE recargar desde JSON para obtener datos frescos
            if (typeof apiSystem !== 'undefined') {
                await apiSystem.cargarDatosIniciales();
            }
            
            // Luego cargar en el sistema local
            await this.cargarClientes();

            // Actualizar contador total
            const totalCountElem = document.getElementById('total-clientes-count');
            if (totalCountElem) {
                totalCountElem.textContent = this.clientesData.length;
            }

            this.mostrarNotificacion(`✅ Sincronización exitosa - ${this.clientesData.length} clientes actualizados`, 'success');
        } catch (error) {
            console.error('❌ Error recargando clientes:', error);
            this.mostrarNotificacion('❌ Error al sincronizar datos', 'danger');
        }
    }

    // Función para volver a la ubicación y activar modo seguimiento
    volverAMiUbicacion() {
        console.log('📍 Botón Mi Ubicación - Obteniendo posición exacta...');
        
        // Activar modo seguimiento centrado
        this.modoSeguirCentrado = true;
        
        // Usar la misma función de máxima precisión
        this.obtenerUbicacionMaximaPrecision((lat, lng, precision) => {
            if (this.mapa) {
                // Actualizar marcador con precisión real
                this.actualizarMarcadorUbicacion(lat, lng, precision);
                
                // Centrar el mapa con zoom óptimo para rutas
                this.mapa.flyTo([lat, lng], 16, {
                    duration: 1.0,
                    easeLinearity: 0.3
                });
                
                this.modoSeguirCentrado = true;
                
                this.mostrarNotificacion(`📍 Precisión: ${Math.round(precision)}m - SIGUIENDO`, 'success');
                console.log('✅ Centrado con máxima precisión');
            }
        });
    }

    // SISTEMA DE NOTIFICACIONES PREMIUM (v9.0) - INTELIGENTE
    mostrarNotificacion(mensaje, tipo = 'info') {
        const elemento = document.getElementById('estado-sistema-trabajadores');
        if (!elemento) return;

        // Si está escribiendo en el buscador, esperar
        const buscador = document.getElementById('buscador-clientes');
        if (buscador && buscador === document.activeElement) {
            this.notificacionPendiente = { mensaje, tipo };
            return;
        }

        let icono = 'fa-info-circle';
        switch (tipo) {
            case 'success': icono = 'fa-check-circle'; break;
            case 'warning': icono = 'fa-exclamation-triangle'; break;
            case 'danger': icono = 'fa-times-circle'; break;
        }

        if (this.notificacionTimeout) clearTimeout(this.notificacionTimeout);

        elemento.className = `estado-sistema ${tipo}`;
        elemento.innerHTML = `
            <div class="estado-contenido">
                <i class="fas ${icono} estado-icono"></i>
                <span class="estado-texto">${mensaje}</span>
            </div>
            <button class="estado-close" onclick="this.parentElement.classList.add('estado-oculto')">
                <i class="fas fa-times"></i>
            </button>
        `;

        elemento.classList.remove('estado-oculto');

        // ✅ 3 segundos (antes eran 5)
        if (tipo !== 'danger') {
            this.notificacionTimeout = setTimeout(() => {
                elemento.classList.add('estado-oculto');
            }, 3000);
        }
        
        // ✅ Si había una notificación pendiente, mostrarla después
        if (this.notificacionPendiente) {
            const pending = this.notificacionPendiente;
            this.notificacionPendiente = null;
            setTimeout(() => {
                if (!document.activeElement || document.activeElement.id !== 'buscador-clientes') {
                    this.mostrarNotificacion(pending.mensaje, pending.tipo);
                }
            }, 800);
        }
    }

    mostrarEstado(mensaje, tipo = 'info') {
        this.mostrarNotificacion(mensaje, tipo);
    }

    ocultarSugerencias() {
        const container = document.getElementById('sugerencias-container-trabajadores');
        if (container) {
            container.style.display = 'none';
        }
    }

    ocultarPanelResultados() {
        const panel = document.getElementById('panel-resultados');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Función de diagnóstico
    verificarEstadoSistema() {
        console.log('🔍 ESTADO DEL SISTEMA TRABAJADORES:');
        console.log('- Mapa inicializado:', !!this.mapa);
        console.log('- Clientes cargados:', this.clientesData.length);
        console.log('- Marcadores en mapa:', this.marcadoresClientes.size);
        console.log('- Sistema inicializado:', this.inicializado);
    }
}

// Instancia global del sistema trabajadores
const trabajadoresSystem = new TrabajadoresSystem();

// Hacer funciones disponibles globalmente
window.centrarEnCliente = (id) => trabajadoresSystem.centrarEnCliente(id);
window.irAlCliente = (id) => trabajadoresSystem.irAlCliente(id);
window.compartirCliente = (id) => trabajadoresSystem.compartirCliente(id);
window.verCliente = (id) => trabajadoresSystem.verCliente(id);
window.cargarClientesTrabajadores = () => trabajadoresSystem.recargarClientes();

// Función de diagnóstico global
window.verificarSistemaTrabajadores = () => trabajadoresSystem.verificarEstadoSistema();

console.log('📦 Sistema trabajadores HÍBRIDO cargado - Esperando inicialización...');