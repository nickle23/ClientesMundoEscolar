// Sistema de API Híbrido con Sincronización Automática
class ApiSystem {
    constructor() {
        this.clientes = [];
        this.usuarios = [];
        this.isLocalEnvironment = this.detectLocalEnvironment();
        this.db = null;
        this.syncSystem = null;

        console.log(`🌍 Entorno detectado: ${this.isLocalEnvironment ? 'LOCAL (SQLite + Sync)' : 'GITHUB PAGES (JSON)'}`);
        this.initializeSystem();
    }

    detectLocalEnvironment() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' ||
            window.location.hostname.includes('local');
    }

    async initializeSystem() {
        if (this.isLocalEnvironment) {
            // Cargar sistema de sincronización (con reintento si es asíncrono)
            const checkSync = () => {
                if (typeof syncSystem !== 'undefined') {
                    this.syncSystem = syncSystem;
                    console.log('✅ SyncSystem vinculado a API (Instancia Global)');
                } else if (typeof SyncSystem !== 'undefined') {
                    this.syncSystem = new SyncSystem();
                    console.log('✅ SyncSystem detectado y vinculado a API (Nueva Instancia)');
                } else {
                    setTimeout(checkSync, 100);
                }
            };
            checkSync();
            await this.initializeLocalDatabase();
        } else {
            await this.loadJsonData();
        }
    }

    async initializeLocalDatabase() {
        try {
            if (typeof LocalDatabase !== 'undefined') {
                this.db = new LocalDatabase();
                await this.db.initialize();
                console.log('✅ IndexedDB inicializada correctamente');

                // ✅ REFUERZO V8.2: Sincronización única y atómica al arrancar
                if (this.isLocalEnvironment) {
                    console.log('⏳ Sincronizando con SQLITE (Arranque)...');
                    await this.cargarDatosIniciales();
                } else {
                    const clientes = await this.db.getClientes();
                    if (clientes.length === 0) {
                        await this.cargarDatosIniciales();
                    } else {
                        await this.loadFromLocalDatabase();
                    }
                }
            } else {
                await this.loadJsonData();
            }
        } catch (error) {
            console.error('❌ Error inicializando base de datos local:', error);
            await this.loadJsonData();
        }
    }

    async cargarDatosIniciales() {
        try {
            console.log('🔄 Sincronización Forzada v8.2: Verificando frescura...');
            const sistemaResponse = await fetch('data/sistema.json?t=' + new Date().getTime());
            if (!sistemaResponse.ok) throw new Error(`HTTP error! status: ${sistemaResponse.status}`);

            const sistemaData = await sistemaResponse.json();
            const clientesJson = sistemaData.clientes || [];
            const usuariosJson = sistemaData.usuarios || [];

            // ✅ CARGA EN MEMORIA (FALLBACK)
            this.clientes = clientesJson;
            this.usuarios = usuariosJson;

            // ✅ CARGA EN INDEXEDDB (PERSISTENCIA)
            if (this.db) {
                await this.db.cargarDatosIniciales(clientesJson, usuariosJson);
                console.log('✅ Sincronización completa con SQLite');
            }

        } catch (error) {
            console.error('❌ Error en sincronización inicial:', error);
            await this.loadJsonData();
        }
    }

    async loadFromLocalDatabase() {
        try {
            this.clientes = await this.db.getClientes();
            this.usuarios = await this.db.getUsuarios();
            console.log(`✅ ${this.clientes.length} clientes y ${this.usuarios.length} usuarios cargados desde SQLite`);
        } catch (error) {
            console.error('❌ Error cargando desde base de datos local:', error);
            await this.loadJsonData();
        }
    }

    async loadJsonData() {
        try {
            const sistemaResponse = await fetch('data/sistema.json?t=' + new Date().getTime());
            if (!sistemaResponse.ok) {
                throw new Error(`HTTP error! status: ${sistemaResponse.status}`);
            }

            const sistemaData = await sistemaResponse.json();
            this.clientes = sistemaData.clientes || [];
            this.usuarios = sistemaData.usuarios || [];

            console.log(`✅ ${this.clientes.length} clientes y ${this.usuarios.length} usuarios cargados desde sistema.json`);
        } catch (error) {
            console.error('❌ Error cargando datos desde sistema.json:', error);
            this.loadEmergencyData();
        }
    }

    loadEmergencyData() {
        console.warn('⚠️ Cargando datos de emergencia...');
        this.clientes = [];
        this.usuarios = [
            { id: 1, username: "admin", password: "admin123", role: "admin", activo: true },
            { id: 2, username: "trabajador", password: "trabajador123", role: "trabajador", activo: true }
        ];
    }

    // ==================== MÉTODOS CON SINCRONIZACIÓN AUTOMÁTICA ====================

    async agregarCliente(clienteData) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            const resultado = await this.db.agregarCliente(clienteData);

            // ✅ SINCRONIZACIÓN AUTOMÁTICA CON SQLITE
            if (this.syncSystem) {
                try {
                    await this.syncSystem.syncAfterOperation('agregarCliente', resultado);
                    console.log('✅ Cliente sincronizado automáticamente con SQLite');
                } catch (syncError) {
                    console.warn('⚠️ No se pudo sincronizar con SQLite:', syncError);
                }
            }

            return resultado;
        } else {
            const nuevoCliente = {
                id: Math.max(...this.clientes.map(c => c.id), 0) + 1,
                ...clienteData,
                activo: true
            };

            this.clientes.push(nuevoCliente);
            this.mostrarNotificacionModoDemo();
            return nuevoCliente;
        }
    }

    async actualizarCliente(id, clienteData) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            const resultado = await this.db.actualizarCliente(id, clienteData);

            // ✅ SINCRONIZACIÓN AUTOMÁTICA CON SQLITE
            if (this.syncSystem) {
                try {
                    await this.syncSystem.syncAfterOperation('actualizarCliente', { id, ...clienteData });
                    console.log('✅ Cliente actualizado automáticamente en SQLite');
                } catch (syncError) {
                    console.warn('⚠️ No se pudo actualizar en SQLite:', syncError);
                }
            }

            return resultado;
        } else {
            const index = this.clientes.findIndex(c => c.id === id);
            if (index === -1) throw new Error('Cliente no encontrado');

            this.clientes[index] = { ...this.clientes[index], ...clienteData };
            this.mostrarNotificacionModoDemo();
            return this.clientes[index];
        }
    }

    async eliminarCliente(id) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            const resultado = await this.db.eliminarCliente(id);

            // ✅ SINCRONIZACIÓN AUTOMÁTICA CON SQLITE
            if (this.syncSystem) {
                try {
                    await this.syncSystem.syncAfterOperation('eliminarCliente', id);
                    console.log('✅ Cliente eliminado automáticamente de SQLite');
                } catch (syncError) {
                    console.warn('⚠️ No se pudo eliminar de SQLite:', syncError);
                }
            }

            return resultado;
        } else {
            const index = this.clientes.findIndex(c => c.id === id);
            if (index === -1) throw new Error('Cliente no encontrado');

            this.clientes.splice(index, 1);
            this.mostrarNotificacionModoDemo();
            return { message: 'Cliente eliminado correctamente' };
        }
    }

    async crearUsuario(usuarioData) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            console.log('🔄 apiSystem.crearUsuario - INICIANDO...');

            const resultado = await this.db.crearUsuario(usuarioData);

            // ✅ VERIFICAR QUE ESTO SE EJECUTE
            console.log('🔄 Intentando sync después de crear usuario...');
            console.log('📦 syncSystem disponible:', !!this.syncSystem);

            if (this.syncSystem && this.syncSystem.syncEnabled) {
                try {
                    console.log('🚀 Ejecutando syncAfterOperation...');
                    await this.syncSystem.syncAfterOperation('crearUsuario', resultado);
                    console.log('✅ Sync después de crear usuario COMPLETADO');
                } catch (syncError) {
                    console.error('❌ Error en sync después de crear usuario:', syncError);
                }
            } else {
                console.warn('⚠️ syncSystem no disponible para sincronización automática');
            }

            return resultado;
        } else {
            const nuevoUsuario = {
                id: Math.max(...this.usuarios.map(u => u.id), 0) + 1,
                ...usuarioData,
                activo: true,
                fecha_creacion: new Date().toISOString(),
                ultimo_acceso: null
            };

            this.usuarios.push(nuevoUsuario);
            this.mostrarNotificacionModoDemo();
            return nuevoUsuario;
        }
    }

    async actualizarUsuario(id, usuarioData) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            const resultado = await this.db.actualizarUsuario(id, usuarioData);

            // ✅ SINCRONIZACIÓN AUTOMÁTICA CON SQLITE
            if (this.syncSystem) {
                try {
                    await this.syncSystem.syncAfterOperation('actualizarUsuario', { id, ...usuarioData });
                    console.log('✅ Usuario actualizado automáticamente en SQLite');
                } catch (syncError) {
                    console.warn('⚠️ No se pudo actualizar usuario en SQLite:', syncError);
                }
            }

            return resultado;
        } else {
            const index = this.usuarios.findIndex(u => u.id === id);
            if (index === -1) throw new Error('Usuario no encontrado');

            this.usuarios[index] = { ...this.usuarios[index], ...usuarioData };
            this.mostrarNotificacionModoDemo();
            return this.usuarios[index];
        }
    }

    async eliminarUsuario(id) {
        await this.simulateDelay();

        if (this.isLocalEnvironment && this.db) {
            const resultado = await this.db.eliminarUsuario(id);

            // ✅ SINCRONIZACIÓN AUTOMÁTICA CON SQLITE
            if (this.syncSystem) {
                try {
                    await this.syncSystem.syncAfterOperation('eliminarUsuario', id);
                    console.log('✅ Usuario eliminado automáticamente de SQLite');
                } catch (syncError) {
                    console.warn('⚠️ No se pudo eliminar usuario de SQLite:', syncError);
                }
            }

            return resultado;
        } else {
            const index = this.usuarios.findIndex(u => u.id === id);
            if (index === -1) throw new Error('Usuario no encontrado');

            this.usuarios.splice(index, 1);
            this.mostrarNotificacionModoDemo();
            return { message: 'Usuario eliminado correctamente' };
        }
    }

    // ==================== MÉTODOS DE CONSULTA ====================

    async getClientes() {
        await this.simulateDelay();
        if (this.isLocalEnvironment && this.db) {
            return await this.db.getClientes();
        }
        return this.clientes;
    }

    async buscarClientes(termino) {
        await this.simulateDelay();
        let clientes = [];
        if (this.isLocalEnvironment && this.db) {
            clientes = await this.db.buscarClientes(termino);
        } else {
            const terminoNormalizado = this.normalizarTexto(termino);
            clientes = this.clientes.filter(cliente =>
                this.normalizarTexto(cliente.nombre).includes(terminoNormalizado)
            );
        }
        return clientes.slice(0, 20);
    }

    async getUsuarios() {
        await this.simulateDelay();
        if (this.isLocalEnvironment && this.db) {
            return await this.db.getUsuarios();
        }
        return this.usuarios;
    }

    // ==================== MÉTODOS AUXILIARES ====================

    normalizarTexto(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[áäà]/g, 'a').replace(/[éëè]/g, 'e')
            .replace(/[íïì]/g, 'i').replace(/[óöò]/g, 'o')
            .replace(/[úüù]/g, 'u').replace(/[ñ]/g, 'n');
    }

    async simulateDelay(min = 100, max = 500) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    mostrarNotificacionModoDemo() {
        if (!this.isLocalEnvironment) {
            console.log('💡 MODO DEMO: Los cambios se guardan solo en memoria');
            if (typeof adminSystem !== 'undefined') {
                adminSystem.mostrarNotificacion('💡 Modo Demo: Cambios en memoria. Usa sistema local para persistencia.', 'info');
            }
        }
    }

    getSystemStatus() {
        return {
            environment: this.isLocalEnvironment ? 'LOCAL' : 'GITHUB_PAGES',
            database: this.isLocalEnvironment && this.db ? 'SQLite' : 'JSON',
            syncEnabled: !!this.syncSystem,
            clientesCount: this.clientes.length,
            usuariosCount: this.usuarios.length
        };
    }
}

// Instancia global del sistema de API
const apiSystem = new ApiSystem();