// Variables globales
let clientes = [];
let mapaInicializado = false;
let buscadorTimeout = null;
// Función para detectar si es dispositivo móvil
function esDispositivoMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
}

// ==============================================
// NUEVAS VARIABLES PARA CONTROL DE UBICACIÓN
// ==============================================
let modoSeguimientoUbicacion = true; // true = siguiendo ubicación en tiempo real
let clienteSeleccionado = null;

// Cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaTrabajadores();
});

function inicializarSistemaTrabajadores() {

    // 🔥 NUEVA LÍNEA: INICIALIZAR VARIABLE GLOBAL (NO HAY CLIENTE SELECCIONADO AL INICIAR)
    window.clienteSeleccionado = false;
    
    // Inicializar mapa
    inicializarMapaTrabajadores();
    mapaInicializado = true;
    
    // Cargar clientes
    cargarClientesTrabajadores();
    
    // Configurar event listeners
    configurarEventListenersTrabajadores();
    
    // Actualizar ubicación cada 30 segundos
    setInterval(obtenerUbicacionUsuario, 30000);
}

function configurarEventListenersTrabajadores() {
    console.log('🔧 [Trabajadores] Configurando event listeners...');
    
    // AGREGAR BOTÓN "VOLVER A MI UBICACIÓN"
    agregarBotonVolverUbicacion();
    
    // BUSCADOR CON SUGERENCIAS PARA TRABAJADORES
    const buscador = document.getElementById('buscador-clientes');
    const sugerenciasContainer = document.getElementById('sugerencias-container-trabajadores');
    
    if (buscador && sugerenciasContainer) {
        console.log('✅ [Trabajadores] Buscador y contenedor encontrados');
        
        let buscadorTimeout;
        
        buscador.addEventListener('input', function(e) {
            console.log('📝 [Trabajadores] Input detectado:', e.target.value);
            const termino = e.target.value.trim();
            clearTimeout(buscadorTimeout);
            
            // Ocultar panel de resultados si está visible
            document.getElementById('panel-resultados').style.display = 'none';
            
            if (termino.length === 0) {
                console.log('❌ [Trabajadores] Término vacío, ocultando sugerencias');
                ocultarSugerenciasTrabajadores();
                cargarClientesEnMapa(clientes);
                return;
            }
            
            if (termino.length < 2) {
                console.log('⚠️ [Trabajadores] Término muy corto, ocultando sugerencias');
                ocultarSugerenciasTrabajadores();
                return;
            }
            
            buscadorTimeout = setTimeout(() => {
                console.log('🔍 [Trabajadores] Buscando sugerencias para:', termino);
                mostrarSugerenciasTrabajadores(termino);
            }, 300);
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            const buscador = document.getElementById('buscador-clientes');
            const sugerenciasContainer = document.getElementById('sugerencias-container-trabajadores');
            
            if (buscador && sugerenciasContainer) {
                const isBuscador = buscador.contains(e.target);
                const isSugerencias = sugerenciasContainer.contains(e.target);
                
                if (!isBuscador && !isSugerencias) {
                    ocultarSugerenciasTrabajadores();
                }
            }
        });
        
        // Navegación con teclado
        buscador.addEventListener('keydown', function(e) {
            const sugerencias = document.querySelectorAll('#sugerencias-container-trabajadores .sugerencia-item');
            const sugerenciaActiva = document.querySelector('#sugerencias-container-trabajadores .sugerencia-item.active');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navegarSugerenciasTrabajadores(sugerencias, 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navegarSugerenciasTrabajadores(sugerencias, -1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (sugerenciaActiva) {
                        sugerenciaActiva.click();
                    } else {
                        buscarClientesTrabajadores(buscador.value);
                        ocultarSugerenciasTrabajadores();
                    }
                    break;
                case 'Escape':
                    ocultarSugerenciasTrabajadores();
                    break;
            }
        });
        
    } else {
        console.error('❌ [Trabajadores] No se encontró el buscador o el contenedor de sugerencias');
    }
    
    // Botón actualizar ubicación
    const btnActualizar = document.getElementById('btn-actualizar-ubicacion');
    if (btnActualizar) {
        btnActualizar.addEventListener('click', function() {
            console.log('🔄 Actualizando ubicación manualmente...');
            actualizarUbicacionManual(); // Usar la nueva función
        });
    }
    
    // Botón cerrar resultados
    const btnCerrarResultados = document.getElementById('btn-cerrar-resultados');
    if (btnCerrarResultados) {
        btnCerrarResultados.addEventListener('click', function() {
            document.getElementById('panel-resultados').style.display = 'none';
        });
    }

    // 🔥 NUEVO: Configurar el botón "Volver a mi ubicación" que ahora está en el HTML
    const btnVolver = document.getElementById('btn-volver-ubicacion');
    if (btnVolver) {
        btnVolver.addEventListener('click', volverAMiUbicacion);
    }
}

// Cargar clientes para trabajadores
async function cargarClientesTrabajadores() {
    try {
        const response = await fetch('/api/clientes');
        clientes = await response.json();
        
        // Cargar clientes en el mapa
        cargarClientesEnMapa(clientes);
        
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// Buscar clientes (super inteligente) - VERSIÓN ACTUALIZADA
function buscarClientesTrabajadores(termino) {
    console.log('🔍 [Trabajadores] Búsqueda ejecutada:', termino);
    
    const panelResultados = document.getElementById('panel-resultados');
    const listaResultados = document.getElementById('lista-resultados');
    
    if (!termino.trim()) {
        panelResultados.style.display = 'none';
        cargarClientesEnMapa(clientes);
        return;
    }
    
    const terminoNormalizado = normalizarTexto(termino);
    const resultados = clientes.filter(cliente => {
        const nombreNormalizado = normalizarTexto(cliente.nombre);
        return nombreNormalizado.includes(terminoNormalizado);
    });
    
    // Mostrar resultados en el panel
    if (resultados.length > 0) {
        listaResultados.innerHTML = '';
        
        resultados.forEach(cliente => {
            const elemento = document.createElement('div');
            elemento.className = 'resultado-cliente p-3 border';
            elemento.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${cliente.nombre}</h6>
                        <p class="mb-1 text-muted small">📞 ${cliente.telefono || 'No disponible'}</p>
                        <p class="mb-1 text-muted small">📍 ${cliente.direccion || 'No disponible'}</p>
                        <span class="badge bg-secondary">${cliente.categoria}</span>
                    </div>
                    <div class="ms-2">
                        <button class="btn btn-sm btn-primary" onclick="centrarYMostrarCliente(${cliente.id})">
                            🗺️ Ver
                        </button>
                    </div>
                </div>
            `;
            listaResultados.appendChild(elemento);
        });
        
        panelResultados.style.display = 'block';
        
        // Mostrar solo los clientes encontrados en el mapa
        cargarClientesEnMapa(resultados);
        
    } else {
        listaResultados.innerHTML = `
            <div class="text-center p-3 text-muted">
                ❌ No se encontraron clientes que coincidan con "${termino}"
            </div>
        `;
        panelResultados.style.display = 'block';
        capaClientes.clearLayers();
    }
    
    // Ocultar sugerencias después de la búsqueda
    ocultarSugerenciasTrabajadores();
}

// Centrar y mostrar información del cliente - VERSIÓN MEJORADA
function centrarYMostrarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    
    console.log('🎯 Mostrando modal para cliente:', cliente.nombre);
    
    // 1. DESACTIVAR SEGUIMIENTO AUTOMÁTICO
    setModoSeguimientoUbicacion(false);
    clienteSeleccionado = cliente;

    // 🔥 NUEVO: DETENER COMPLETAMENTE EL GPS SOLO EN MÓVIL
    if (window.limpiarSeguimientoGPS && esDispositivoMovil()) {
        window.limpiarSeguimientoGPS();
        console.log('📱 Móvil: GPS DETENIDO COMPLETAMENTE');
    } else if (window.limpiarSeguimientoGPS) {
        window.limpiarSeguimientoGPS();
        console.log('🖥️ Escritorio: GPS DETENIDO COMPLETAMENTE');
    }

    // 🔥 MEJORADO: INDICAR QUE HAY CLIENTE SELECCIONADO Y FORZAR DESACTIVACIÓN
    window.clienteSeleccionado = true;
    if (window.desactivarSeguimientoUbicacion) {
        window.desactivarSeguimientoUbicacion();
    }

    // 2. CENTRAR EN EL CLIENTE Y BLOQUEAR TEMPORALMENTE
    centrarEnCliente(id);

        // 2. CENTRAR EN EL CLIENTE Y BLOQUEAR TEMPORALMENTE
    centrarEnCliente(id);
    
    // 🔥 NUEVO: FORZAR QUE EL MAPA SE QUEDE EN EL CLIENTE
    if (mapTrabajadores) {
        // Guardar la vista del cliente
        const clienteView = [cliente.latitud, cliente.longitud];
        
        // Centrar inmediatamente
        mapTrabajadores.setView(clienteView, 16);
        
        // Forzar que se mantenga cada segundo por 10 segundos
        let contador = 0;
        const intervalo = setInterval(() => {
            if (contador < 10) {
                mapTrabajadores.setView(clienteView, mapTrabajadores.getZoom());
                contador++;
                console.log('🔒 Forzando mapa en cliente:', contador);
            } else {
                clearInterval(intervalo);
                console.log('✅ Bloqueo automático finalizado');
            }
        }, 1000);
        
        // Limpiar intervalo si el usuario cambia de cliente
        setTimeout(() => {
            clearInterval(intervalo);
        }, 10000);
        
        console.log('🔒 Mapa BLOQUEADO en cliente por 10 segundos');
    }

    // 🔥 NUEVO: BLOQUEAR CUALQUIER INTENTO DE CENTRADO AUTOMÁTICO
    if (mapTrabajadores && esDispositivoMovil()) {
        // Forzar que el mapa se quede en el cliente
        mapTrabajadores.setView([cliente.latitud, cliente.longitud], 16);
        // Deshabilitar cualquier interacción automática
        mapTrabajadores.dragging.disable();
        setTimeout(() => {
            mapTrabajadores.dragging.enable();
        }, 5000);
        console.log('📱 Móvil: Mapa BLOQUEADO en cliente por 5 segundos');
    }
    
    // 🔥 NUEVO: EN MÓVIL, FORZAR QUE EL MAPA MANTENGA LA VISTA POR MÁS TIEMPO
    if (esDispositivoMovil()) {
        console.log('📱 Móvil: Bloqueando centrado automático por 30 segundos');
        // Bloquear completamente el centrado automático por 30 segundos
        setTimeout(() => {
            if (window.clienteSeleccionado) {
                console.log('🔒 Bloqueo activo - Cliente aún seleccionado');
            }
        }, 30000);
    }

    if (window.desactivarSeguimientoUbicacion) {
        window.desactivarSeguimientoUbicacion();
    }
    
    // 2. CENTRAR EN EL CLIENTE EN EL MAPA
    centrarEnCliente(id);
    
    // 3. CARGAR DATOS EN EL MODAL
    document.getElementById('modal-cliente-nombre').textContent = cliente.nombre;
    document.getElementById('modal-cliente-telefono').textContent = cliente.telefono || 'No disponible';
    document.getElementById('modal-cliente-direccion').textContent = cliente.direccion || 'No disponible';
    document.getElementById('modal-cliente-categoria').textContent = cliente.categoria;
    
    // 4. CONFIGURAR BOTÓN GOOGLE MAPS
    document.getElementById('btn-abrir-maps').onclick = function() {
        const url = `https://www.google.com/maps?q=${cliente.latitud},${cliente.longitud}`;
        window.open(url, '_blank');
    };
    
    // 5. MOSTRAR EL MODAL (¡ESTO ES LO QUE FALTABA!)
    const modalElement = document.getElementById('infoClienteModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // 6. LIMPIAR INTERFAZ
    document.getElementById('panel-resultados').style.display = 'none';
    document.getElementById('buscador-clientes').value = '';
    ocultarSugerenciasTrabajadores();
    
    console.log('✅ Modal mostrado correctamente');
}

// Función para normalizar texto (igual que en admin.js)
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
        .replace(/[vb]/g, 'b')  // v y b son iguales
        .replace(/[szc]/g, 's') // s, z, c son iguales
        .replace(/[yj]/g, 'i')  // y y j son similares
        .replace(/ll/g, 'y')    // ll = y
        .replace(/rr/g, 'r')    // rr = r
        .replace(/nn/g, 'n')    // nn = n
        .replace(/mm/g, 'm');   // mm = m
}

// Resaltar coincidencias en los resultados
function resaltarCoincidencia(texto, termino) {
    const terminoNormalizado = normalizarTexto(termino);
    const textoNormalizado = normalizarTexto(texto);
    
    const indice = textoNormalizado.indexOf(terminoNormalizado);
    if (indice === -1) return texto;
    
    // Encontrar la coincidencia real en el texto original
    const coincidenciaReal = texto.substring(indice, indice + termino.length);
    
    return texto.replace(
        new RegExp(coincidenciaReal, 'gi'), 
        match => `<mark class="bg-warning">${match}</mark>`
    );
}

// Ver detalle del cliente desde el mapa
function verDetalleCliente(id) {
    centrarYMostrarCliente(id);
}

// ==============================================
// SISTEMA DE AUTOCOMPLETADO PARA TRABAJADORES
// ==============================================

// Mostrar sugerencias para trabajadores - VERSIÓN CORREGIDA
function mostrarSugerenciasTrabajadores(termino) {
    console.log('🎯 [Trabajadores] Mostrar sugerencias para:', termino);
    
    const sugerenciasContainer = document.getElementById('sugerencias-container-trabajadores');
    const listaSugerencias = document.getElementById('lista-sugerencias-trabajadores');
    
    if (!sugerenciasContainer || !listaSugerencias) {
        console.error('❌ [Trabajadores] Elementos de sugerencias no encontrados');
        return;
    }
    
    // Filtrar clientes para sugerencias
    const terminoNormalizado = normalizarTexto(termino);
    const sugerencias = clientes.filter(cliente => {
        const nombreNormalizado = normalizarTexto(cliente.nombre);
        return nombreNormalizado.includes(terminoNormalizado);
    }).slice(0, 8);
    
    console.log('📋 [Trabajadores] Sugerencias encontradas:', sugerencias.length);
    
    if (sugerencias.length === 0) {
        listaSugerencias.innerHTML = `
            <div class="sugerencia-item text-muted">
                ❌ No se encontraron coincidencias para "${termino}"
            </div>
        `;
    } else {
        listaSugerencias.innerHTML = '';
        
        sugerencias.forEach((cliente) => {
            const sugerenciaItem = document.createElement('div');
            sugerenciaItem.className = 'sugerencia-item';
            sugerenciaItem.innerHTML = `
                <div class="sugerencia-nombre">${cliente.nombre}</div>
                <div class="sugerencia-detalles">
                    📞 ${cliente.telefono || 'No disponible'} 
                    <span class="badge bg-secondary ms-1">${cliente.categoria}</span>
                </div>
                <div class="sugerencia-detalles">
                    📍 ${cliente.direccion || 'No disponible'}
                </div>
            `;
            
            // Al hacer clic en una sugerencia
            sugerenciaItem.addEventListener('click', function() {
                console.log('🖱️ [Trabajadores] Sugerencia clickeada:', cliente.nombre);
                document.getElementById('buscador-clientes').value = cliente.nombre;
                centrarYMostrarCliente(cliente.id);
                ocultarSugerenciasTrabajadores();
            });
            
            listaSugerencias.appendChild(sugerenciaItem);
        });
    }
    
    // MOSTRAR SUGERENCIAS
    sugerenciasContainer.style.display = 'block';
}

// Ocultar sugerencias para trabajadores
// Ocultar sugerencias para trabajadores - VERSIÓN CORREGIDA
function ocultarSugerenciasTrabajadores() {
    const sugerenciasContainer = document.getElementById('sugerencias-container-trabajadores');
    if (sugerenciasContainer) {
        sugerenciasContainer.style.display = 'none';
        console.log('👻 [Trabajadores] Sugerencias ocultadas');
    }
}

// Navegación por teclado para trabajadores - VERSIÓN CORREGIDA
function navegarSugerenciasTrabajadores(sugerencias, direccion) {
    if (sugerencias.length === 0) return;
    
    const sugerenciaActiva = document.querySelector('#sugerencias-container-trabajadores .sugerencia-item.active');
    let siguienteIndex = 0;
    
    if (sugerenciaActiva) {
        const currentIndex = Array.from(sugerencias).indexOf(sugerenciaActiva);
        siguienteIndex = currentIndex + direccion;
        
        if (siguienteIndex < 0) siguienteIndex = sugerencias.length - 1;
        if (siguienteIndex >= sugerencias.length) siguienteIndex = 0;
        
        sugerenciaActiva.classList.remove('active');
    }
    
    if (sugerencias[siguienteIndex]) {
        sugerencias[siguienteIndex].classList.add('active');
        
        // Scroll para mantener visible la sugerencia activa
        sugerencias[siguienteIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
        });
    }
}

// ==============================================
// NUEVAS FUNCIONES PARA CONTROL DE UBICACIÓN
// ==============================================

// Función para activar/desactivar seguimiento de ubicación
function setModoSeguimientoUbicacion(activar) {
    modoSeguimientoUbicacion = activar;
    const estadoElement = document.getElementById('estado-ubicacion');
    
    if (activar) {
        estadoElement.innerHTML = '📍 Siguiendo tu ubicación...';
        estadoElement.className = 'd-block d-md-inline text-success';
        toggleBotonVolverUbicacion(false);
        
        // Centrar en la ubicación actual si está disponible
        if (window.ubicacionActual) {
            centrarEnUbicacion(window.ubicacionActual.lat, window.ubicacionActual.lng);
        }
    } else {
        estadoElement.innerHTML = '📍 Cliente seleccionado';
        estadoElement.className = 'd-block d-md-inline text-warning';
        toggleBotonVolverUbicacion(true);
    }
}

function volverAMiUbicacion() {
    console.log('🔄 VOLVIENDO A MI UBICACIÓN...');
    
    // 🔥 SOLO PARA MÓVIL: Centrar manualmente en la ubicación actual
    if (esDispositivoMovil() && window.ultimaUbicacion) {
        const lat = window.ultimaUbicacion.coords.latitude;
        const lng = window.ultimaUbicacion.coords.longitude;
        
        if (mapTrabajadores) {
            mapTrabajadores.setView([lat, lng], 16);
            console.log('📱 Móvil: Centrado MANUAL en ubicación actual');
        }
    }
    
    window.clienteSeleccionado = false;
    setModoSeguimientoUbicacion(true);
    clienteSeleccionado = null;
    
    console.log('✅ Modo seguimiento reactivado');
}

// Función para agregar botón "Volver a mi ubicación"
// Función para agregar botón "Volver a mi ubicación" - VERSIÓN CORREGIDA
function agregarBotonVolverUbicacion() {
    // 🔥 YA NO ES NECESARIO - EL BOTÓN AHORA ESTÁ EN EL HTML
    console.log('✅ Botón "Volver a mi ubicación" ya está en el HTML');
}

// Función para mostrar/ocultar botón volver
// Función para mostrar/ocultar botón volver - VERSIÓN CORREGIDA
function toggleBotonVolverUbicacion(mostrar) {
    const btnVolver = document.getElementById('btn-volver-ubicacion');
    if (btnVolver) {
        if (mostrar) {
            btnVolver.classList.remove('d-none');
        } else {
            btnVolver.classList.add('d-none');
        }
    }
}

function actualizarUbicacionManual() {
    console.log('🔄 Reactivando GPS manualmente...');
    
    // 🔥 INDICAR QUE NO HAY CLIENTE SELECCIONADO
    window.clienteSeleccionado = false;
    setModoSeguimientoUbicacion(true);
    clienteSeleccionado = null;
    
    // 🔥 REINICIAR COMPLETAMENTE EL GPS
    setTimeout(() => {
        if (window.obtenerUbicacionUsuario) {
            window.obtenerUbicacionUsuario();
        }
    }, 500);
    
    console.log('✅ GPS REACTIVADO MANUALMENTE');
}

