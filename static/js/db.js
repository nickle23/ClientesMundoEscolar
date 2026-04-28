// Sistema de Base de Datos Local con IndexedDB - VERSIÓN ELIMINACIÓN REAL
class LocalDatabase {
    constructor() {
        this.dbName = 'ClientesDB';
        this.version = 1;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB no soportado en este navegador'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Error abriendo IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB inicializada correctamente');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacén de clientes
                if (!db.objectStoreNames.contains('clientes')) {
                    const clientesStore = db.createObjectStore('clientes', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    clientesStore.createIndex('nombre', 'nombre', { unique: false });
                    clientesStore.createIndex('activo', 'activo', { unique: false });
                }

                // Crear almacén de usuarios
                if (!db.objectStoreNames.contains('usuarios')) {
                    const usuariosStore = db.createObjectStore('usuarios', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    usuariosStore.createIndex('username', 'username', { unique: true });
                    usuariosStore.createIndex('activo', 'activo', { unique: false });
                }

                console.log('✅ Estructura de IndexedDB creada');
            };
        });
    }

    // ==================== MÉTODOS DE CLIENTES ====================

    async getClientes() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes'], 'readonly');
            const store = transaction.objectStore('clientes');

            // ✅ Obtener TODOS los clientes (sin filtrar por activo)
            const request = store.getAll();

            request.onsuccess = () => {
                // Ordenar clientes alfabéticamente
                const clientes = request.result
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));
                resolve(clientes);
            };

            request.onerror = () => {
                reject(new Error('Error obteniendo clientes'));
            };
        });
    }

    async buscarClientes(termino) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes'], 'readonly');
            const store = transaction.objectStore('clientes');
            const request = store.getAll();

            request.onsuccess = () => {
                const clientes = request.result.filter(cliente =>
                    cliente.nombre && // Asegurar que tiene nombre
                    cliente.nombre.toLowerCase().includes(termino.toLowerCase())
                );
                resolve(clientes.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            };

            request.onerror = () => {
                reject(new Error('Error buscando clientes'));
            };
        });
    }

    async agregarCliente(clienteData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes'], 'readwrite');
            const store = transaction.objectStore('clientes');

            const cliente = {
                ...clienteData,
                activo: true,
                fecha_creacion: new Date().toISOString()
            };

            const request = store.add(cliente);

            request.onsuccess = () => {
                resolve({
                    id: request.result,
                    ...cliente
                });
            };

            request.onerror = () => {
                reject(new Error('Error agregando cliente'));
            };
        });
    }

    async actualizarCliente(id, clienteData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes'], 'readwrite');
            const store = transaction.objectStore('clientes');

            // Primero obtener el cliente existente
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const clienteExistente = getRequest.result;
                if (!clienteExistente) {
                    reject(new Error('Cliente no encontrado'));
                    return;
                }

                const clienteActualizado = {
                    ...clienteExistente,
                    ...clienteData,
                    id: id // Mantener el mismo ID
                };

                const putRequest = store.put(clienteActualizado);

                putRequest.onsuccess = () => {
                    resolve(clienteActualizado);
                };

                putRequest.onerror = () => {
                    reject(new Error('Error actualizando cliente'));
                };
            };

            getRequest.onerror = () => {
                reject(new Error('Error obteniendo cliente para actualizar'));
            };
        });
    }

    // ✅ ELIMINACIÓN REAL - BORRAR FÍSICAMENTE DE INDEXEDDB
    async eliminarCliente(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes'], 'readwrite');
            const store = transaction.objectStore('clientes');

            // ✅ BORRAR FÍSICAMENTE el registro
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`🗑️ Cliente ID ${id} ELIMINADO FÍSICAMENTE de IndexedDB`);
                resolve({ message: 'Cliente eliminado permanentemente' });
            };

            request.onerror = () => {
                reject(new Error('Error eliminando cliente'));
            };
        });
    }

    // ==================== MÉTODOS DE USUARIOS ====================

    async getUsuarios() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['usuarios'], 'readonly');
            const store = transaction.objectStore('usuarios');
            const request = store.getAll();

            request.onsuccess = () => {
                const usuarios = request.result.sort((a, b) => a.username.localeCompare(b.username));
                resolve(usuarios);
            };

            request.onerror = () => {
                reject(new Error('Error obteniendo usuarios'));
            };
        });
    }

    async crearUsuario(usuarioData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['usuarios'], 'readwrite');
            const store = transaction.objectStore('usuarios');

            const usuario = {
                ...usuarioData,
                activo: true,
                fecha_creacion: new Date().toISOString(),
                ultimo_acceso: null
            };

            const request = store.add(usuario);

            request.onsuccess = () => {
                resolve({
                    id: request.result,
                    ...usuario
                });
            };

            request.onerror = () => {
                reject(new Error('Error creando usuario'));
            };
        });
    }

    async actualizarUsuario(id, usuarioData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['usuarios'], 'readwrite');
            const store = transaction.objectStore('usuarios');

            // Primero obtener el usuario existente
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const usuarioExistente = getRequest.result;
                if (!usuarioExistente) {
                    reject(new Error('Usuario no encontrado'));
                    return;
                }

                const usuarioActualizado = {
                    ...usuarioExistente,
                    ...usuarioData,
                    id: id // Mantener el mismo ID
                };

                const putRequest = store.put(usuarioActualizado);

                putRequest.onsuccess = () => {
                    resolve(usuarioActualizado);
                };

                putRequest.onerror = () => {
                    reject(new Error('Error actualizando usuario'));
                };
            };

            getRequest.onerror = () => {
                reject(new Error('Error obteniendo usuario para actualizar'));
            };
        });
    }

    // ✅ ELIMINACIÓN REAL - BORRAR FÍSICAMENTE DE INDEXEDDB
    async eliminarUsuario(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['usuarios'], 'readwrite');
            const store = transaction.objectStore('usuarios');

            // ✅ BORRAR FÍSICAMENTE el registro
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`🗑️ Usuario ID ${id} ELIMINADO FÍSICAMENTE de IndexedDB`);
                resolve({ message: 'Usuario eliminado permanentemente' });
            };

            request.onerror = () => {
                reject(new Error('Error eliminando usuario'));
            };
        });
    }

    // ==================== MÉTODOS AUXILIARES ====================

    async limpiarBaseDeDatos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['clientes', 'usuarios'], 'readwrite');
            const clientesStore = transaction.objectStore('clientes');
            const usuariosStore = transaction.objectStore('usuarios');

            clientesStore.clear();
            usuariosStore.clear();

            transaction.oncomplete = () => {
                resolve({ message: 'Base de datos limpiada' });
            };

            transaction.onerror = () => {
                reject(new Error('Error limpiando base de datos'));
            };
        });
    }

    async cargarDatosIniciales(clientes = [], usuarios = []) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🚀 Iniciando carga masiva: ${clientes.length} clientes, ${usuarios.length} usuarios`);

                const transaction = this.db.transaction(['clientes', 'usuarios'], 'readwrite');
                const clientesStore = transaction.objectStore('clientes');
                const usuariosStore = transaction.objectStore('usuarios');

                // Limpiar antes de cargar masivamente
                clientesStore.clear();
                usuariosStore.clear();

                // Cargar clientes en lote
                clientes.forEach(c => {
                    clientesStore.add({
                        ...c,
                        activo: c.activo !== undefined ? c.activo : true,
                        fecha_creacion: c.fecha_creacion || new Date().toISOString()
                    });
                });

                // Cargar usuarios en lote
                usuarios.forEach(u => {
                    usuariosStore.add({
                        ...u,
                        activo: u.activo !== undefined ? u.activo : true,
                        fecha_creacion: u.fecha_creacion || new Date().toISOString()
                    });
                });

                transaction.oncomplete = () => {
                    console.log('✅ Carga masiva completada con éxito');
                    resolve();
                };

                transaction.onerror = (event) => {
                    console.error('❌ Error en transacción masiva:', event.target.error);
                    reject(event.target.error);
                };

            } catch (error) {
                console.error('❌ Error crítico en cargarDatosIniciales:', error);
                reject(error);
            }
        });
    }
}