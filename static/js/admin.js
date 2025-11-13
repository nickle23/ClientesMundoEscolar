// Variables globales
let clientes = [];
let mapaInicializado = false;
let gpsAdminActivado = false;

// Cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistema();
});

function inicializarSistema() {
    // Inicializar mapa
    inicializarMapaAdmin();
    mapaInicializado = true;
    
    // Cargar clientes
    cargarClientes();
    
    // Configurar event listeners
    configurarEventListenersAdmin();
}

function configurarEventListenersAdmin() {
    console.log('🔧 Configurando event listeners admin...');
    
    // Botón guardar cliente
    document.getElementById('btn-guardar-cliente').addEventListener('click', guardarCliente);
    
    // Botón ver clientes
    document.getElementById('btn-ver-clientes').addEventListener('click', cargarClientes);
    
    // 🔥 NUEVO: Botón GPS para admin
    const btnGPSAdmin = document.getElementById('btn-actualizar-ubicacion-admin');
    if (btnGPSAdmin) {
        btnGPSAdmin.addEventListener('click', activarGPSAdmin);
        console.log('✅ Botón GPS admin configurado');
    }
    // Botón actualizar cliente
    document.getElementById('btn-actualizar-cliente').addEventListener('click', actualizarCliente);
    
    // BUSCADOR CON SUGERENCIAS - VERSIÓN PARA ADMIN
    const buscador = document.getElementById('buscador-clientes');
    const sugerenciasContainer = document.getElementById('sugerencias-container-admin');
    
    if (buscador && sugerenciasContainer) {
        console.log('✅ Buscador admin y contenedor encontrados');
        
        let buscadorTimeout;
        
        buscador.addEventListener('input', function(e) {
            console.log('📝 Input admin detectado:', e.target.value);
            const termino = e.target.value.trim();
            clearTimeout(buscadorTimeout);
            
            if (termino.length === 0) {
                console.log('❌ Término vacío, ocultando sugerencias admin');
                ocultarSugerenciasAdmin();
                mostrarTodosLosClientes();
                return;
            }
            
            if (termino.length < 2) {
                console.log('⚠️ Término muy corto, ocultando sugerencias admin');
                ocultarSugerenciasAdmin();
                return;
            }
            
            buscadorTimeout = setTimeout(() => {
                console.log('🔍 Buscando sugerencias admin para:', termino);
                mostrarSugerenciasAdmin(termino);
            }, 300);
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            const buscadorContainer = document.getElementById('buscador-container-admin');
            if (!buscadorContainer.contains(e.target) && !sugerenciasContainer.contains(e.target)) {
                ocultarSugerenciasAdmin();
            }
        });
        
        // Navegación con teclado
        buscador.addEventListener('keydown', function(e) {
            const sugerencias = document.querySelectorAll('#sugerencias-container-admin .sugerencia-item');
            const sugerenciaActiva = document.querySelector('#sugerencias-container-admin .sugerencia-item.active');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navegarSugerenciasAdmin(sugerencias, 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navegarSugerenciasAdmin(sugerencias, -1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (sugerenciaActiva) {
                        sugerenciaActiva.click();
                    } else {
                        buscarClientes(buscador.value);
                        ocultarSugerenciasAdmin();
                    }
                    break;
                case 'Escape':
                    ocultarSugerenciasAdmin();
                    break;
            }
        });
        
    } else {
        console.error('❌ No se encontró el buscador admin o el contenedor de sugerencias');
    }
}

// 🔥 NUEVO: Función para activar GPS en admin
function activarGPSAdmin() {
    console.log('🎯 Activando GPS en panel admin...');
    
    // Actualizar estado inmediatamente
    const estadoElement = document.getElementById('estado-ubicacion-admin');
    if (estadoElement) {
        estadoElement.textContent = '📍 GPS: Obteniendo ubicación...';
        estadoElement.className = 'text-warning';
    }
    
    // Usar la función específica para admin
    if (window.forzarGPSAdmin) {
        window.forzarGPSAdmin();
    } else if (window.iniciarSistemaGeolocalizacion) {
        window.iniciarSistemaGeolocalizacion();
    } else {
        console.error('❌ Sistema GPS no disponible');
        alert('Sistema GPS no disponible. Recarga la página.');
    }
}

// Cargar clientes desde la API
async function cargarClientes() {
    try {
        console.log('🔄 Cargando clientes desde API...');
        const response = await fetch('/api/clientes');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        clientes = await response.json();
        console.log('✅ Clientes cargados:', clientes.length);

        // Debug: mostrar primeros 3 clientes
        clientes.slice(0, 3).forEach((cliente, index) => {
            console.log(`   ${index + 1}. ${cliente.nombre}`);
        });
        
        actualizarInterfazClientes();
        actualizarContador();
        
    } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        alert('Error al cargar los clientes: ' + error.message);
    }
}

// Actualizar la interfaz con los clientes
function actualizarInterfazClientes() {
    const tbody = document.getElementById('cuerpo-tabla-clientes');
    tbody.innerHTML = '';
    
    clientes.forEach(cliente => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${cliente.nombre}</td>
            <td>${cliente.direccion || 'No especificada'}</td>
            <td>${cliente.telefono || '-'}</td>
            <td><span class="badge bg-secondary">${cliente.categoria}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="centrarEnCliente(${cliente.id})">
                    🗺️ Ver en Mapa
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="abrirEditarCliente(${cliente.id})">
                    ✏️ Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCliente(${cliente.id})">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
    
    // Cargar clientes en el mapa
    cargarClientesEnMapa(clientes);
}

// Actualizar contador de clientes
function actualizarContador() {
    const contador = document.getElementById('contador-clientes');
    contador.textContent = `📊 ${clientes.length} clientes`;
}

// Guardar nuevo cliente
async function guardarCliente() {
    const form = document.getElementById('form-agregar-cliente');
    const formData = new FormData(form);
    
    // Validar campos requeridos
    if (!formData.get('nombre') || !formData.get('latitud') || !formData.get('longitud')) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    const clienteData = {
        nombre: formData.get('nombre'),
        direccion: formData.get('direccion'),
        telefono: formData.get('telefono'),
        latitud: parseFloat(formData.get('latitud')),
        longitud: parseFloat(formData.get('longitud')),
        categoria: formData.get('categoria')
    };
    
    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clienteData)
        });
        
        if (response.ok) {
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('agregarClienteModal'));
            modal.hide();
            form.reset();
            
            // Recargar clientes
            cargarClientes();
            
            alert('✅ Cliente agregado correctamente');
        } else {
            alert('Error al guardar el cliente');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// Buscar clientes
function buscarClientes(termino) {
    console.log('🔍 Búsqueda admin ejecutada:', termino);
    
    if (!termino || termino.trim() === '') {
        mostrarTodosLosClientes();
        return;
    }
    
    const terminoNormalizado = normalizarTexto(termino);
    const clientesFiltrados = clientes.filter(cliente => {
        const nombreNormalizado = normalizarTexto(cliente.nombre);
        return nombreNormalizado.includes(terminoNormalizado);
    });
    
    // Actualizar tabla con resultados filtrados
    const tbody = document.getElementById('cuerpo-tabla-clientes');
    tbody.innerHTML = '';
    
    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    ❌ No se encontraron clientes que coincidan con "${termino}"
                </td>
            </tr>
        `;
    } else {
        clientesFiltrados.forEach(cliente => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${resaltarCoincidencia(cliente.nombre, termino)}</td>
                <td>${cliente.direccion || 'No especificada'}</td>
                <td>${cliente.telefono || '-'}</td>
                <td><span class="badge bg-secondary">${cliente.categoria}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="centrarEnCliente(${cliente.id})">
                        🗺️ Ver en Mapa
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });
    }
    
    // Actualizar mapa con clientes filtrados
    cargarClientesEnMapa(clientesFiltrados);
}

// 🔥 NUEVO: Mostrar sugerencias para admin
function mostrarSugerenciasAdmin(termino) {
    console.log('🎯 Mostrar sugerencias admin para:', termino);
    console.log('📊 Total clientes disponibles:', clientes.length);
    
    const sugerenciasContainer = document.getElementById('sugerencias-container-admin');
    const listaSugerencias = document.getElementById('lista-sugerencias-admin');
    const buscador = document.getElementById('buscador-clientes');
    
    if (!sugerenciasContainer) {
        console.error('❌ sugerenciasContainer no encontrado');
        return;
    }
    if (!listaSugerencias) {
        console.error('❌ listaSugerencias no encontrado');
        return;
    }
    if (!buscador) {
        console.error('❌ buscador no encontrado');
        return;
    }
    
    // Verificar que tenemos clientes
    if (clientes.length === 0) {
        console.log('⚠️ No hay clientes cargados');
        listaSugerencias.innerHTML = `
            <div class="sugerencia-item text-muted p-2">
                ⚠️ Cargando clientes...
            </div>
        `;
    } else {
        // Filtrar clientes para sugerencias
        const terminoNormalizado = normalizarTexto(termino);
        const sugerencias = clientes.filter(cliente => {
            const nombreNormalizado = normalizarTexto(cliente.nombre);
            const coincide = nombreNormalizado.includes(terminoNormalizado);
            console.log(`Cliente: "${cliente.nombre}" -> Coincide: ${coincide}`);
            return coincide;
        }).slice(0, 8);
        
        console.log('📋 Sugerencias encontradas:', sugerencias.length);
        
        if (sugerencias.length === 0) {
            listaSugerencias.innerHTML = `
                <div class="sugerencia-item text-muted p-2">
                    ❌ No hay coincidencias para "${termino}"
                </div>
            `;
        } else {
            listaSugerencias.innerHTML = '';
            
            sugerencias.forEach((cliente) => {
                const sugerenciaItem = document.createElement('div');
                sugerenciaItem.className = 'sugerencia-item p-2 border-bottom';
                sugerenciaItem.style.cursor = 'pointer';
                sugerenciaItem.innerHTML = `
                    <div class="sugerencia-nombre fw-bold">${cliente.nombre}</div>
                    <div class="sugerencia-detalles small text-muted">
                        📞 ${cliente.telefono || 'No disponible'} 
                        <span class="badge bg-secondary ms-1">${cliente.categoria}</span>
                    </div>
                `;
                
                sugerenciaItem.addEventListener('click', function() {
                    console.log('🖱️ Sugerencia clickeada:', cliente.nombre);
                    buscador.value = cliente.nombre;
                    centrarEnCliente(cliente.id);
                    buscarClientes(cliente.nombre);
                    ocultarSugerenciasAdmin();
                });
                
                listaSugerencias.appendChild(sugerenciaItem);
            });
        }
    }
    
    // POSICIONAMIENTO SIMPLIFICADO - Esto siempre debe funcionar
    const buscadorRect = buscador.getBoundingClientRect();
    sugerenciasContainer.style.position = 'absolute';
    sugerenciasContainer.style.top = '100%';
    sugerenciasContainer.style.left = '0';
    sugerenciasContainer.style.width = '100%';
    sugerenciasContainer.style.display = 'block';
    sugerenciasContainer.style.zIndex = '1050';
    
    console.log('✅ Sugerencias mostradas');
}

// 🔥 NUEVO: Ocultar sugerencias para admin
function ocultarSugerenciasAdmin() {
    const sugerenciasContainer = document.getElementById('sugerencias-container-admin');
    if (sugerenciasContainer) {
        sugerenciasContainer.style.display = 'none';
    }
}

// 🔥 NUEVO: Navegación por teclado para admin
function navegarSugerenciasAdmin(sugerencias, direccion) {
    if (sugerencias.length === 0) return;
    
    const sugerenciaActiva = document.querySelector('#sugerencias-container-admin .sugerencia-item.active');
    let siguienteIndex = 0;
    
    if (sugerenciaActiva) {
        const currentIndex = Array.from(sugerencias).indexOf(sugerenciaActiva);
        siguienteIndex = currentIndex + direccion;
        
        if (siguienteIndex < 0) siguienteIndex = sugerencias.length - 1;
        if (siguienteIndex >= sugerencias.length) siguienteIndex = 0;
        
        sugerenciaActiva.classList.remove('active');
    }
    
    sugerencias[siguienteIndex].classList.add('active');
}

// Mostrar todos los clientes
function mostrarTodosLosClientes() {
    actualizarInterfazClientes();
    cargarClientesEnMapa(clientes);
}

// Función para normalizar texto
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[vb]/g, 'b')
        .replace(/[szc]/g, 's')
        .replace(/[yj]/g, 'i')
        .replace(/ll/g, 'y')
        .replace(/rr/g, 'r')
        .replace(/nn/g, 'n')
        .replace(/mm/g, 'm');
}

// Resaltar coincidencias
function resaltarCoincidencia(texto, termino) {
    const terminoNormalizado = normalizarTexto(termino);
    const textoNormalizado = normalizarTexto(texto);
    
    const indice = textoNormalizado.indexOf(terminoNormalizado);
    if (indice === -1) return texto;
    
    const coincidenciaReal = texto.substring(indice, indice + termino.length);
    
    return texto.replace(
        new RegExp(coincidenciaReal, 'gi'), 
        match => `<mark>${match}</mark>`
    );
}

// Eliminar cliente
async function eliminarCliente(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            cargarClientes();
            alert('✅ Cliente eliminado correctamente');
        } else {
            alert('Error al eliminar el cliente');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// 🔥 NUEVO: Abrir modal de edición
function abrirEditarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) {
        alert('Cliente no encontrado');
        return;
    }
    
    // Llenar el formulario con los datos actuales
    document.getElementById('editar-cliente-id').value = cliente.id;
    document.getElementById('editar-nombre').value = cliente.nombre;
    document.getElementById('editar-telefono').value = cliente.telefono || '';
    document.getElementById('editar-direccion').value = cliente.direccion || '';
    document.getElementById('editar-latitud').value = cliente.latitud;
    document.getElementById('editar-longitud').value = cliente.longitud;
    document.getElementById('editar-categoria').value = cliente.categoria;
    
    // Mostrar modal
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('editarClienteModal'));
    modal.show();
}

// 🔥 NUEVO: Actualizar cliente
async function actualizarCliente() {
    const form = document.getElementById('form-editar-cliente');
    const formData = new FormData(form);
    const clienteId = formData.get('id');
    
    // Validar campos requeridos
    if (!formData.get('nombre') || !formData.get('latitud') || !formData.get('longitud')) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    const clienteData = {
        nombre: formData.get('nombre'),
        direccion: formData.get('direccion'),
        telefono: formData.get('telefono'),
        latitud: parseFloat(formData.get('latitud')),
        longitud: parseFloat(formData.get('longitud')),
        categoria: formData.get('categoria')
    };
    
    try {
        // 🔥 IMPORTANTE: Necesitamos crear esta ruta en app.py
        const response = await fetch(`/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clienteData)
        });
        
        if (response.ok) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editarClienteModal'));
            modal.hide();
            
            // Recargar clientes
            cargarClientes();
            
            alert('✅ Cliente actualizado correctamente');
        } else {
            const error = await response.json();
            alert('Error al actualizar el cliente: ' + (error.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// 🔥 NUEVO COMPLETO: Gestión de Usuarios Avanzada
let usuarioAEliminar = null;
let usuarioAReset = null;
let usuarioAEditar = null;

// Cargar usuarios cuando se abre el modal
document.getElementById('gestionUsuariosModal').addEventListener('show.bs.modal', function () {
    cargarUsuarios();
});

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'success') {
    const alerta = document.getElementById('alert-usuarios');
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
    alerta.style.display = 'block';
    
    setTimeout(() => {
        alerta.style.display = 'none';
    }, 5000);
}

// Cargar lista de usuarios
async function cargarUsuarios() {
    try {
        const response = await fetch('/api/usuarios-list');
        if (!response.ok) throw new Error('Error al cargar usuarios');
        
        const usuarios = await response.json();
        
        const tbody = document.getElementById('tabla-usuarios-body');
        tbody.innerHTML = '';
        
        let usuariosActivos = 0;
        
        usuarios.forEach(usuario => {
            if (usuario.activo) usuariosActivos++;
            
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>
                    ${usuario.username}
                    ${usuario.id === currentUserId ? '<span class="badge bg-primary ms-1">Tú</span>' : ''}
                </td>
                <td>
                    ${usuario.role === 'admin' ? 
                      '<span class="badge bg-danger">Admin</span>' : 
                      '<span class="badge bg-warning">Trabajador</span>'}
                </td>
                <td>
                    ${usuario.activo ? 
                      '<span class="badge bg-success">Activo</span>' : 
                      '<span class="badge bg-secondary">Inactivo</span>'}
                </td>
                <td>
                    <small class="text-muted">
                        ${usuario.ultimo_acceso ? 
                          new Date(usuario.ultimo_acceso).toLocaleDateString('es-ES') : 
                          'Nunca'}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${usuario.id !== currentUserId ? 
                          `<button class="btn btn-outline-primary" onclick="editarUsuario(${usuario.id}, '${usuario.username}', '${usuario.role}', ${usuario.activo})" title="Editar">
                              ✏️
                           </button>
                           <button class="btn btn-outline-${usuario.activo ? 'warning' : 'success'}" onclick="toggleUsuario(${usuario.id}, '${usuario.username}', ${usuario.activo})" title="${usuario.activo ? 'Desactivar' : 'Activar'}">
                              ${usuario.activo ? '⏸️' : '▶️'}
                           </button>
                           <button class="btn btn-outline-info" onclick="resetPasswordUsuario(${usuario.id}, '${usuario.username}')" title="Reiniciar Contraseña">
                              🔑
                           </button>
                           <button class="btn btn-outline-danger" onclick="prepararEliminarUsuario(${usuario.id}, '${usuario.username}')" title="Eliminar">
                              🗑️
                           </button>` : 
                          `<button class="btn btn-outline-primary" onclick="editarUsuario(${usuario.id}, '${usuario.username}', '${usuario.role}', ${usuario.activo})" title="Editar mi usuario">
                              ✏️ Editar
                           </button>
                           <button class="btn btn-outline-info" onclick="resetPasswordUsuario(${usuario.id}, '${usuario.username}')" title="Cambiar mi contraseña">
                              🔑 Contraseña
                           </button>`}
                    </div>
                </td>
            `;
            tbody.appendChild(fila);
        });
        
        // Actualizar contador
        document.getElementById('contador-usuarios').textContent = 
            `${usuariosActivos}/${usuarios.length} activos`;
            
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        mostrarAlerta('Error al cargar usuarios: ' + error.message, 'danger');
    }
}

// Crear usuario
document.getElementById('form-crear-usuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-crear-usuario');
    const formData = new FormData(this);
    
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    btn.disabled = true;
    btn.textContent = 'Creando...';
    
    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarAlerta('✅ Usuario creado exitosamente');
            this.reset();
            cargarUsuarios(); // Recargar la lista
        } else {
            mostrarAlerta('❌ Error: ' + result.error, 'danger');
        }
    } catch (error) {
        mostrarAlerta('❌ Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Crear Usuario';
    }
});

// Editar usuario - VERSIÓN COMPLETA
function editarUsuario(id, username, role, activo) {
    usuarioAEditar = id;
    
    document.getElementById('editar-usuario-id').value = id;
    document.getElementById('editar-username').value = username;
    document.getElementById('editar-role').value = role;
    document.getElementById('editar-activo').checked = activo;
    document.getElementById('editar-password').value = '';
    
    // 🔥 PERMITIR edición completa sin restricciones
    const roleSelect = document.getElementById('editar-role');
    const activoCheckbox = document.getElementById('editar-activo');
    const modalTitle = document.querySelector('#modalEditarUsuario .modal-title');
    
    // Siempre habilitar todos los campos
    roleSelect.disabled = false;
    activoCheckbox.disabled = false;
    
    if (id === currentUserId) {
        modalTitle.textContent = '✏️ Editar Mi Usuario (ADMIN)';
        // Solo advertencia, no restricción
        activoCheckbox.title = "ADVERTENCIA: Si te desactivas, no podrás volver a iniciar sesión";
    } else {
        modalTitle.textContent = '✏️ Editar Usuario';
        activoCheckbox.title = "";
    }
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarUsuario'));
    modal.show();
}

// Guardar cambios de edición - CON ADVERTENCIAS
document.getElementById('btn-guardar-usuario').addEventListener('click', async function() {
    const btn = this;
    const form = document.getElementById('form-editar-usuario');
    const formData = new FormData(form);
    
    const data = {
        username: formData.get('username'),
        role: formData.get('role'),
        activo: formData.get('activo') === 'on'
    };
    
    // 🔥 ADVERTENCIA si el usuario se está desactivando a sí mismo
    if (usuarioAEditar === currentUserId && !data.activo) {
        const confirmar = confirm(`⚠️ ¡ADVERTENCIA!\n\nEstás a punto de DESACTIVAR tu propio usuario.\n\nSi continúas:\n• NO podrás iniciar sesión\n• Perderás acceso inmediatamente\n• Necesitarás ayuda de otro admin\n\n¿Continuar?`);
        if (!confirmar) return;
    }
    
    // Solo agregar password si no está vacío
    const password = formData.get('password');
    if (password) {
        data.password = password;
    }
    
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    
    try {
        const response = await fetch(`/api/usuarios/${usuarioAEditar}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
            modal.hide();
            mostrarAlerta('✅ Usuario actualizado correctamente');
            cargarUsuarios();
            
            // 🔥 Redirigir si se desactivó a sí mismo
            if (usuarioAEditar === currentUserId && !data.activo) {
                setTimeout(() => {
                    alert('Tu usuario ha sido desactivado. Serás redirigido.');
                    window.location.href = '/logout';
                }, 1500);
            }
        } else {
            mostrarAlerta('❌ Error: ' + result.error, 'danger');
        }
    } catch (error) {
        mostrarAlerta('❌ Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Guardar Cambios';
        usuarioAEditar = null;
    }
});

// Activar/Desactivar usuario - CON ADVERTENCIA
async function toggleUsuario(id, username, activoActual) {
    const accion = activoActual ? 'desactivar' : 'activar';
    
    // 🔥 ADVERTENCIA ESPECIAL si es el usuario actual
    if (id === currentUserId && activoActual) {
        const confirmar = confirm(`⚠️ ¡ADVERTENCIA CRÍTICA!\n\nEstás a punto de DESACTIVAR tu propio usuario (${username}).\n\nSi lo haces:\n• NO podrás volver a iniciar sesión\n• Perderás acceso al sistema\n• Necesitarás que otro admin te reactive\n\n¿Estás ABSOLUTAMENTE seguro?`);
        if (!confirmar) return;
    } else {
        if (!confirm(`¿Estás seguro de que quieres ${accion} al usuario "${username}"?`)) {
            return;
        }
    }
    
    try {
        const response = await fetch(`/api/usuarios/${id}/toggle`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarAlerta(`✅ Usuario ${result.activo ? 'activado' : 'desactivado'} correctamente`);
            cargarUsuarios();
            
            // 🔥 ADVERTENCIA si se desactivó a sí mismo
            if (id === currentUserId && !result.activo) {
                setTimeout(() => {
                    alert('⚠️ Has desactivado tu propio usuario. Serás redirigido al login.');
                    window.location.href = '/logout';
                }, 1000);
            }
        } else {
            mostrarAlerta('❌ Error: ' + result.error, 'danger');
        }
    } catch (error) {
        mostrarAlerta('❌ Error de conexión', 'danger');
    }
}

// Reiniciar contraseña
function resetPasswordUsuario(id, username) {
    usuarioAReset = id;
    document.getElementById('usuario-reset-nombre').textContent = username;
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalResetPassword'));
    modal.show();
}

// Confirmar reinicio de contraseña
document.getElementById('btn-confirmar-reset').addEventListener('click', async function() {
    const btn = this;
    const nuevaPassword = document.getElementById('nueva-password').value;
    
    if (!nuevaPassword) {
        mostrarAlerta('❌ La contraseña no puede estar vacía', 'danger');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Reiniciando...';
    
    try {
        const response = await fetch(`/api/usuarios/${usuarioAReset}/reset-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: nuevaPassword })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalResetPassword'));
            modal.hide();
            mostrarAlerta('✅ Contraseña reiniciada correctamente');
            document.getElementById('nueva-password').value = '123456';
        } else {
            mostrarAlerta('❌ Error: ' + result.error, 'danger');
        }
    } catch (error) {
        mostrarAlerta('❌ Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔑 Reiniciar Contraseña';
        usuarioAReset = null;
    }
});

// Preparar eliminación de usuario
function prepararEliminarUsuario(id, username) {
    usuarioAEliminar = id;
    document.getElementById('usuario-eliminar-nombre').textContent = username;
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarEliminar'));
    modal.show();
}

// Confirmar eliminación
document.getElementById('btn-confirmar-eliminar').addEventListener('click', async function() {
    if (!usuarioAEliminar) return;
    
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Eliminando...';
    
    try {
        const response = await fetch('/api/usuarios/' + usuarioAEliminar, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
            modal.hide();
            mostrarAlerta('✅ Usuario eliminado correctamente');
            cargarUsuarios();
        } else {
            const result = await response.json();
            mostrarAlerta('❌ Error: ' + result.error, 'danger');
        }
    } catch (error) {
        mostrarAlerta('❌ Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = '🗑️ Eliminar';
        usuarioAEliminar = null;
    }
});

// Variable global para el ID del usuario actual (esto debe venir de tu sistema)
// 🔥 CORREGIDO: ID del usuario admin actual
const currentUserId = 1;