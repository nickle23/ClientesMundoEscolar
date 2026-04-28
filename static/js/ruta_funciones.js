// ===================== SISTEMA DE RUTAS =====================

var clientesRuta = [];
var modoSeleccion = false;
var rutaActiva = false;
var rutaPolyline = null;

function mostrarPanelRuta() {
    var panel = document.getElementById('panel-ruta');
    if (panel) panel.style.display = 'block';
    actualizarListaRuta();
}

function ocultarPanelRuta() {
    var panel = document.getElementById('panel-ruta');
    if (panel) panel.style.display = 'none';
}

function actualizarListaRuta() {
    var lista = document.getElementById('lista-ruta');
    if (!lista || !trabajadoresSystem) return;
    
    lista.innerHTML = '';
    
    if (clientesRuta.length === 0) {
        lista.innerHTML = '<div class="text-center text-muted p-3">Toca los clientes en el mapa</div>';
        return;
    }
    
    clientesRuta.forEach(function(id, index) {
        var cliente = trabajadoresSystem.clientesData.find(function(c) { return c.id === id; });
        if (!cliente) return;
        
        var item = document.createElement('div');
        item.className = 'ruta-item';
        item.style.cssText = 'display:flex;align-items:center;padding:8px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;cursor:pointer;';
        item.innerHTML = `
            <span style="width:24px;height:24px;background:#10b981;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;margin-right:8px;flex-shrink:0;">${index + 1}</span>
            <div style="flex-grow:1;overflow:hidden;">
                <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cliente.nombre}</div>
                <div style="font-size:11px;color:#666;">${cliente.direccion || cliente.categoria}</div>
            </div>
            <button style="background:none;border:none;color:#dc3545;font-size:18px;padding:4px;cursor:pointer;">&times;</button>
        `;
        
        item.querySelector('button').onclick = function(e) {
            e.stopPropagation();
            quitarClienteRuta(id);
        };
        
        item.onclick = function() {
            trabajadoresSystem.centrarEnCliente(id);
        };
        
        lista.appendChild(item);
    });
}

function restaurarIcono(data) {
    var cat = data.cliente.categoria;
    var color = '#dc3545';
    var icono = '👨‍💼';
    if (cat === 'Colegio') { color = '#6b7280'; icono = '👨‍🏫'; }
    else if (cat === 'Bodega') { color = '#f59e0b'; icono = '🏪'; }
    else if (cat === 'Universidad') { color = '#8e44ad'; icono = '🎓'; }
    else if (cat === 'Instituto') { color = '#e67e22'; icono = '📚'; }
    
    data.marcador.setIcon(L.divIcon({
        html: '<div style="background:' + color + ';width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;color:white;font-weight:bold;">' + icono + '</div>',
        className: 'icono-cliente',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    }));
}

function alternarCliente(id) {
    if (!modoSeleccion) return;
    
    var idx = clientesRuta.indexOf(id);
    var data = trabajadoresSystem.marcadoresClientes.get(id);
    if (!data || !data.marcador) return;
    
    if (idx > -1) {
        clientesRuta.splice(idx, 1);
        data.marcador.setIcon(L.divIcon({
            html: '<div style="background:#64748b;width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:11px;cursor:pointer;">📍</div>',
            className: 'marcador-seleccionable',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));
    } else {
        var num = clientesRuta.push(id);
        data.marcador.setIcon(L.divIcon({
            html: '<div style="background:#10b981;width:26px;height:26px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:12px;">' + num + '</div>',
            className: 'marcador-seleccionado',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        }));
    }
    
    actualizarBotones();
    actualizarListaRuta();
}

function quitarClienteRuta(id) {
    var idx = clientesRuta.indexOf(id);
    if (idx > -1) {
        clientesRuta.splice(idx, 1);
        var data = trabajadoresSystem.marcadoresClientes.get(id);
        if (data) {
            data.marcador.setIcon(L.divIcon({
                html: '<div style="background:#64748b;width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:11px;">📍</div>',
                className: 'marcador-seleccionable',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }));
        }
        actualizarBotones();
        actualizarListaRuta();
    }
}

function actualizarBotones() {
    var btnIniciar = document.getElementById('btn-iniciar-ruta');
    var btnRuta = document.getElementById('btn-ruta');
    
    if (clientesRuta.length > 0) {
        if (btnIniciar) btnIniciar.style.display = 'flex';
        if (btnRuta) btnRuta.classList.add('ruta-activo');
    } else {
        if (btnIniciar) btnIniciar.style.display = 'none';
        if (btnRuta) btnRuta.classList.remove('ruta-activo');
    }
}

function quitarEventosRuta() {
    if (!trabajadoresSystem || !trabajadoresSystem.marcadoresClientes) return;
    
    var mapeo = trabajadoresSystem.marcadoresClientes;
    for (var i = 0; i < mapeo.size; i++) {
        var data = Array.from(mapeo.values())[i];
        if (!data || !data.marcador) continue;
        
        if (data.clickHandler) {
            data.marcador.off('click', data.clickHandler);
            data.clickHandler = null;
        }
        data.eventoRuta = false;
        restaurarIcono(data);
    }
}

function limpiarTodo() {
    quitarEventosRuta();
    
    clientesRuta = [];
    modoSeleccion = false;
    rutaActiva = false;
    
    if (trabajadoresSystem) {
        trabajadoresSystem.modoSeleccionRuta = false;
    }
    
    var btnRuta = document.getElementById('btn-ruta');
    var btnIniciar = document.getElementById('btn-iniciar-ruta');
    
    if (btnRuta) {
        btnRuta.innerHTML = '<i class="fas fa-route"></i>';
        btnRuta.classList.remove('ruta-activo');
    }
    if (btnIniciar) btnIniciar.style.display = 'none';
    
    if (rutaPolyline) {
        rutaPolyline.remove();
        rutaPolyline = null;
    }
    
    ocultarPanelRuta();
    
    console.log('🧹 Todo limpiado - estado reset');
}

function activarModoRuta() {
    if (!trabajadoresSystem) return;
    
    if (rutaActiva || modoSeleccion) {
        limpiarTodo();
        return;
    }
    
    clientesRuta = [];
    modoSeleccion = true;
    rutaActiva = true;
    trabajadoresSystem.modoSeleccionRuta = true;
    
    var btnRuta = document.getElementById('btn-ruta');
    if (btnRuta) {
        btnRuta.innerHTML = '<i class="fas fa-times"></i>';
        btnRuta.classList.add('ruta-activo');
    }
    
    var mapeo = trabajadoresSystem.marcadoresClientes;
    
    for (var i = 0; i < mapeo.size; i++) {
        var data = Array.from(mapeo.values())[i];
        var id = Array.from(mapeo.keys())[i];
        if (!data || !data.marcador) continue;
        
        (function(clienteId, markerData) {
            var clickFn = function(e) {
                L.DomEvent.stopPropagation(e);
                alternarCliente(clienteId);
            };
            markerData.marcador.off('click', markerData.clickHandler);
            markerData.clickHandler = clickFn;
            markerData.marcador.on('click', clickFn);
            markerData.eventoRuta = true;
        })(id, data);
        
        data.marcador.setIcon(L.divIcon({
            html: '<div style="background:#64748b;width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:11px;cursor:pointer;">📍</div>',
            className: 'marcador-seleccionable',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }));
    }
    
    var panel = document.getElementById('panel-ruta');
    if (panel) panel.style.display = 'block';
    actualizarListaRuta();
}

function iniciarRuta() {
    if (!trabajadoresSystem || clientesRuta.length === 0) {
        trabajadoresSystem.mostrarNotificacion('Selecciona clientes primero', 'warning');
        return;
    }
    
    var posActual = null;
    if (trabajadoresSystem.marcadorUbicacion) {
        var latlng = trabajadoresSystem.marcadorUbicacion.getLatLng();
        posActual = [latlng.lat, latlng.lng];
    }
    
    var ordenados = [...clientesRuta];
    
    if (posActual) {
        var resultado = [];
        var disponibles = [...clientesRuta];
        var desde = posActual;
        
        while (disponibles.length > 0) {
            var masCerca = null;
            var distMin = Infinity;
            var idx = -1;
            
            disponibles.forEach(function(cid, i) {
                var c = trabajadoresSystem.clientesData.find(function(x) { return x.id === cid; });
                if (c && c.latitud && c.longitud) {
                    var d = calcularDistancia(desde[0], desde[1], c.latitud, c.longitud);
                    if (d < distMin) {
                        distMin = d;
                        masCerca = c;
                        idx = i;
                    }
                }
            });
            
            if (masCerca && idx > -1) {
                resultado.push(masCerca.id);
                disponibles.splice(idx, 1);
                desde = [masCerca.latitud, masCerca.longitud];
            } else {
                break;
            }
        }
        
        if (disponibles.length > 0) resultado = resultado.concat(disponibles);
        ordenados = resultado;
    }
    
    clientesRuta = ordenados;
    
    if (rutaPolyline) {
        rutaPolyline.remove();
        rutaPolyline = null;
    }
    
    // No quitar eventos - dejar que el popup funcione naturalmente
    // Los popups de Leaflet trabajan automáticamente
    
    var coords = [];
    if (posActual) coords.push(posActual);
    
    // Numerar clientes
    ordenados.forEach(function(id, i) {
        var c = trabajadoresSystem.clientesData.find(function(x) { return x.id === id; });
        if (c && c.latitud && c.longitud) {
            coords.push([c.latitud, c.longitud]);
            
            var data = trabajadoresSystem.marcadoresClientes.get(id);
            if (data) {
                data.marcador.setIcon(L.divIcon({
                    html: '<div style="background:#10b981;width:30px;height:30px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:13px;">' + (i + 1) + '</div>',
                    className: 'marcador-ruta',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                }));
            }
        }
    });
    
    if (coords.length > 1) {
        rutaPolyline = L.polyline(coords, {
            color: '#10b981',
            weight: 4,
            opacity: 0.8
        }).addTo(trabajadoresSystem.mapa);
        
        trabajadoresSystem.mapa.fitBounds(rutaPolyline.getBounds(), { padding: [30, 30] });
    }
    
    modoSeleccion = false;
    rutaActiva = true;
    if (trabajadoresSystem) {
        trabajadoresSystem.modoSeleccionRuta = false;
    }
    
    var btnRuta = document.getElementById('btn-ruta');
    if (btnRuta) {
        btnRuta.innerHTML = '<i class="fas fa-times"></i>';
        btnRuta.classList.add('ruta-activo');
    }
    
    actualizarListaRuta();
    trabajadoresSystem.mostrarNotificacion('Ruta iniciada: ' + ordenados.length + ' clientes - Toca un cliente para ver', 'success');
}

function cancelarSeleccion() {
    limpiarTodo();
    trabajadoresSystem.mostrarNotificacion('Selección cancelada', 'info');
}

function cerrarRuta() {
    limpiarTodo();
    trabajadoresSystem.mostrarNotificacion('Ruta cerrada', 'info');
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function abrirEnGoogleMaps() {
    if (!trabajadoresSystem || clientesRuta.length === 0) return;
    
    var coords = [];
    
    if (trabajadoresSystem.marcadorUbicacion) {
        var latlng = trabajadoresSystem.marcadorUbicacion.getLatLng();
        coords.push(latlng.lat + ',' + latlng.lng);
    }
    
    clientesRuta.forEach(function(id) {
        var c = trabajadoresSystem.clientesData.find(function(x) { return x.id === id; });
        if (c && c.latitud && c.longitud) {
            coords.push(c.latitud + ',' + c.longitud);
        }
    });
    
    if (coords.length === 0) return;
    
    var isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
    var url = 'https://www.google.com/maps/dir/' + coords.join('/');
    
    if (isMobile) {
        var appUrl = 'comgooglemaps:////maps/dir/' + coords.join('/');
        var win = window.open(appUrl, '_blank');
        setTimeout(function() {
            if (!win || win.closed) {
                window.open(url, '_blank');
            }
        }, 1000);
    } else {
        window.open(url, '_blank');
    }
}

console.log('Sistema de rutas cargado');

// Verificación global
if (typeof window !== 'undefined') {
    window.activarModoRuta = activarModoRuta;
    window.iniciarRuta = iniciarRuta;
    window.cerrarRuta = cerrarRuta;
    window.cancelarSeleccion = cancelarSeleccion;
    window.alternarCliente = alternarCliente;
    window.abrirEnGoogleMaps = abrirEnGoogleMaps;
    window.limpiarTodo = limpiarTodo;
    console.log('Funciones de ruta asignadas a window');
}
