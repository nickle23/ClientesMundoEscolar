// Sistema de Sincronización Automática - SQLITE COMO FUENTE DE VERDAD
class SyncSystem {
    constructor() {
        this.isLocalEnvironment = this.detectLocalEnvironment();
        // Redirigir al puerto 8000 si estamos en Live Server (5500) o similar
        this.baseUrl = (this.isLocalEnvironment && window.location.port !== '8000' && window.location.protocol !== 'file:')
            ? 'http://127.0.0.1:8000'
            : '';
        this.syncEnabled = this.isLocalEnvironment;
        this.syncServerAvailable = false;
        this.sqliteAsSourceOfTruth = true;

        console.log(`🔄 SyncSystem: ${this.syncEnabled ? 'CARGADO' : 'DESACTIVADO'}`);

        // ✅ REFUERZO PROFESIONAL: Solo chequear automáticamente si estamos en el mismo puerto (8000)
        // Si el puerto es diferente (ej. 5500), evitamos el fetch automático para que no aparezcan 
        // errores rojos (ERR_CONNECTION_REFUSED) en la consola si el gestor no está abierto.
        if (this.syncEnabled && this.baseUrl === '') {
            this.verificarServidorSync();
        }
    }

    detectLocalEnvironment() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' ||
            window.location.hostname.includes('local');
    }

    // ✅ CORREGIDO: Usar rutas sin parámetros para JSON
    async sincronizarDesdeSQLite() {
        if (!this.syncEnabled || !this.syncServerAvailable) return;

        try {
            console.log('🔄 FORZANDO sincronización desde SQLite (fuente de verdad)...');

            // 1. PRIMERO generar JSON desde SQLite
            console.log('📁 Generando JSON desde SQLite...');
            await this.generarJSON();

            // Pequeña pausa para asegurar que los JSON se generaron
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Obtener datos ACTUALES de SQLite via JSON (con cache-buster)
            console.log('📥 Cargando JSON generados desde SQLite (fresco)...');
            const sistemaResponse = await fetch('data/sistema.json?t=' + new Date().getTime());

            if (!sistemaResponse.ok) {
                // console.log('⚠️ JSON no disponible, intentando cargar datos locales...');
                return false;
            }

            const sistemaData = await sistemaResponse.json();
            const clientesSQLite = sistemaData.clientes || [];
            const usuariosSQLite = sistemaData.usuarios || [];

            console.log(`📊 SQLite (fuente verdad): ${clientesSQLite.length} clientes, ${usuariosSQLite.length} usuarios`);

            // 3. Limpiar COMPLETAMENTE IndexedDB y cargar desde SQLite
            if (typeof apiSystem !== 'undefined' && apiSystem.db) {
                console.log('🗑️ Limpiando IndexedDB completamente...');
                await apiSystem.db.limpiarBaseDeDatos();

                console.log('💾 Cargando datos exactos desde SQLite a IndexedDB...');
                await apiSystem.db.cargarDatosIniciales(clientesSQLite, usuariosSQLite);

                console.log('✅ IndexedDB ahora es réplica exacta de SQLite');

                // 4. Actualizar interfaces
                if (typeof adminSystem !== 'undefined') {
                    setTimeout(() => {
                        adminSystem.cargarClientes();
                        adminSystem.mostrarNotificacion('✅ Base de datos sincronizada - SQLite como fuente de verdad', 'success');
                    }, 500);
                }

                if (typeof trabajadoresSystem !== 'undefined') {
                    setTimeout(() => {
                        trabajadoresSystem.recargarClientes();
                    }, 500);
                }

                return true;
            }

        } catch (error) {
            console.error('❌ Error en sincronización desde SQLite:', error);

            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('❌ Error sincronizando desde SQLite', 'danger');
            }
        }

        return false;
    }

    // ✅ REEMPLAZAR: Sincronización manual para usar SQLite como fuente de verdad
    async sincronizarManual() {
        if (!this.syncEnabled) {
            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('🔒 Sincronización solo disponible en entorno local', 'info');
            }
            return;
        }

        if (!this.syncServerAvailable) {
            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion(
                    '⚠️ Servidor de sincronización no configurado\n\nEjecuta: python sync_server.py',
                    'warning'
                );
            }
            return;
        }

        try {
            console.log('🔄 INICIANDO SINCRONIZACIÓN COMPLETA...');

            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('🔄 Sincronizando desde SQLite (fuente de verdad)...', 'info');
            }

            // ✅ PASO 1: SQLite → IndexedDB (FUENTE DE VERDAD)
            const syncExitoso = await this.sincronizarDesdeSQLite();

            if (!syncExitoso) {
                throw new Error('Falló la sincronización desde SQLite');
            }

            console.log('✅ SINCRONIZACIÓN COMPLETA EXITOSA');

            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('✅ Sincronización completa exitosa', 'success');
            }

        } catch (error) {
            console.error('❌ Error en sincronización manual:', error);

            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('❌ Error en sincronización completa', 'danger');
            }
        }
    }

    // ✅ MODIFICAR: Sincronización automática para respetar fuente de verdad
    async syncAfterOperation(operation, data) {
        if (!this.syncEnabled || !this.syncServerAvailable) return;

        try {
            console.log(`🔄 Sincronizando operación: ${operation}`);

            // Operaciones normales hacia SQLite
            switch (operation) {
                case 'agregarCliente':
                    await this.syncAgregarCliente(data);
                    break;
                case 'actualizarCliente':
                    await this.syncActualizarCliente(data);
                    break;
                case 'eliminarCliente':
                    await this.syncEliminarCliente(data);
                    break;
                case 'crearUsuario':
                    await this.syncCrearUsuario(data);
                    break;
                case 'actualizarUsuario':
                    await this.syncActualizarUsuario(data);
                    break;
                case 'eliminarUsuario':
                    await this.syncEliminarUsuario(data);
                    break;
            }

            // ✅ SIEMPRE generar JSON desde SQLite después de cada operación
            await this.generarJSON();

        } catch (error) {
            console.error('❌ Error en sincronización automática:', error);
        }
    }

    // ✅ Sincronización automatica eliminada en favor de apiSystem.initializeLocalDatabase()

    // ✅ MÉTODOS EXISTENTES (mantener igual)
    async sincronizarClientesExistentes() {
        if (!this.syncEnabled || !this.syncServerAvailable) return;

        try {
            console.log('🔄 Sincronizando clientes existentes desde IndexedDB...');

            let clientesIndexedDB = [];
            if (typeof apiSystem !== 'undefined' && apiSystem.db) {
                clientesIndexedDB = await apiSystem.db.getClientes();
            }

            console.log(`📊 ${clientesIndexedDB.length} clientes en IndexedDB para sincronizar`);

            for (const cliente of clientesIndexedDB) {
                try {
                    await this.syncAgregarClienteExistente(cliente);
                } catch (error) {
                    console.warn(`⚠️ No se pudo sincronizar cliente ${cliente.nombre}:`, error);
                }
            }

        } catch (error) {
            console.error('❌ Error sincronizando clientes existentes:', error);
        }
    }

    async syncAgregarClienteExistente(cliente) {
        try {
            const response = await fetch(this.baseUrl + '/sync/cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'agregar_existente',
                    data: cliente
                })
            });

            if (response.ok) {
                console.log(`✅ Cliente existente sincronizado: ${cliente.nombre}`);
            }
        } catch (error) {
            console.warn(`⚠️ No se pudo sincronizar cliente existente ${cliente.nombre}`);
        }
    }

    async verificarServidorSync() {
        try {
            const response = await fetch(this.baseUrl + '/sync/status', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                this.syncServerAvailable = true;
                console.log('✅ Servidor de sincronización disponible');

                // ✅ INICIAR SINCRONIZACIÓN AUTOMÁTICA AL DETECTAR SERVIDOR
                this.sincronizacionInicial();
            }
        } catch (error) {
            // Silencio total ante fallos de conexión (Entorno Local/Demo)
        }
    }

    async syncAgregarCliente(clienteData) {
        try {
            const response = await fetch(this.baseUrl + '/sync/cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'agregar',
                    data: clienteData
                })
            });

            if (response.ok) {
                // console.log('✅ Cliente sincronizado con SQLite');
            }
        } catch (error) {
            console.warn('⚠️ No se pudo sincronizar con SQLite');
        }
    }

    async syncActualizarCliente({ id, ...clienteData }) {
        try {
            const response = await fetch(this.baseUrl + '/sync/cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'actualizar',
                    id: id,
                    data: clienteData
                })
            });

            if (response.ok) {
                console.log('✅ Cliente actualizado en SQLite');
            }
        } catch (error) {
            // Silencio
        }
    }

    async syncEliminarCliente(id) {
        try {
            const response = await fetch(this.baseUrl + '/sync/cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'eliminar',
                    id: id
                })
            });

            if (response.ok) {
                console.log(`🗑️ Cliente ID ${id} ELIMINADO de SQLite`);
            }
        } catch (error) {
            // Silencio
        }
    }

    async syncCrearUsuario(usuarioData) {
        try {
            const response = await fetch(this.baseUrl + '/sync/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'crear',
                    data: usuarioData
                })
            });

            if (response.ok) {
                console.log('✅ Usuario sincronizado con SQLite');
            }
        } catch (error) {
            // Silencio
        }
    }

    async syncActualizarUsuario({ id, ...usuarioData }) {
        try {
            const response = await fetch(this.baseUrl + '/sync/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'actualizar',
                    id: id,
                    data: usuarioData
                })
            });

            if (response.ok) {
                console.log('✅ Usuario actualizado en SQLite');
            }
        } catch (error) {
            // Silencio
        }
    }

    async syncEliminarUsuario(id) {
        try {
            const response = await fetch(this.baseUrl + '/sync/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'eliminar',
                    id: id
                })
            });

            if (response.ok) {
                console.log(`🗑️ Usuario ID ${id} ELIMINADO de SQLite`);
            }
        } catch (error) {
            // Silencio
        }
    }

    async generarJSON() {
        try {
            const response = await fetch(this.baseUrl + '/sync/generate-json', { method: 'POST' });

            if (response.ok) {
                console.log('✅ JSON generados desde SQLite (fuente de verdad)');
                return true;
            } else {
                // console.log('⚠️ No se pudieron generar JSON automáticamente');
                return false;
            }
        } catch (error) {
            // Silencio
            return false;
        }
    }
}

// Instancia global del sistema de sincronización
const syncSystem = new SyncSystem();