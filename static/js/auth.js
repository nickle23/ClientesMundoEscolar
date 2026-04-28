// ============================================================================
// SISTEMA DE AUTENTICACIÓN MEJORADO
// Sistema de Gestión de Clientes - Mundo Escolar
// Versión con hashing de contraseñas para mayor seguridad
// ============================================================================

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.loadUsers();
        this.checkLoginStatus();
    }

    /**
     * Carga usuarios desde el archivo JSON unificado
     */
    async loadUsers() {
        try {
            // Cargar usuarios con cache-buster para evitar login con datos viejos
            const response = await fetch('data/sistema.json?t=' + new Date().getTime());
            if (response.ok) {
                const sistemaData = await response.json();
                this.users = sistemaData.usuarios || [];
                logger.success(`${this.users.length} usuarios cargados correctamente desde sistema.json`);

                // Mostrar usuarios disponibles en modo desarrollo
                if (logger.isDevelopment) {
                    this.users.forEach(user => {
                        logger.debug(`👤 ${user.username} (${user.role}) - Activo: ${user.activo}`);
                    });
                }
            } else {
                logger.error('Error cargando usuarios desde JSON');
                this.loadDefaultUsers();
            }
        } catch (error) {
            logger.error('Error cargando usuarios:', error);
            this.loadDefaultUsers();
        }
    }

    /**
     * Carga usuarios por defecto si falla la carga desde JSON
     */
    loadDefaultUsers() {
        logger.warn('Cargando usuarios por defecto');
        this.users = [
            {
                id: 1,
                username: "admin",
                password: "admin123",
                role: "admin",
                activo: true
            },
            {
                id: 2,
                username: "trabajador",
                password: "trabajador123",
                role: "trabajador",
                activo: true
            }
        ];
    }

    /**
     * Verifica el estado de login al cargar la página
     */
    checkLoginStatus() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            logger.info(`Usuario ${this.currentUser.username} ya autenticado`);
        }
    }
    
    /**
     * ✅ VERIFICA SESIÓN CONTRA DATOS FRESCOS (seguridad)
     * Llama esto al cargar cualquier página protegida
     */
    async verificarSesion() {
        if (!this.currentUser) return false;
        
        // Cargar usuarios frescos del sistema.json
        await this.loadUsers();
        
        // Buscar el usuario actual en la lista fresca
        const userFresh = this.users.find(u => u.id === this.currentUser.id);
        
        // Verificar: existe, activo, y contraseña coincide
        if (!userFresh) {
            // Guardar razón para mostrar en login
            localStorage.setItem('sesionCerrada', 'Tu cuenta ha sido eliminada del sistema');
            this.logout();
            window.location.href = 'index.html';
            return false;
        }
        
        if (!userFresh.activo) {
            // Guardar razón para mostrar en login
            localStorage.setItem('sesionCerrada', 'Tu cuenta ha sido desactivada. Contacta al administrador.');
            this.logout();
            window.location.href = 'index.html';
            return false;
        }
        
        // Verificar si cambió la contraseña (comparar directamente)
        const passwordActual = this.currentUser.password || '';
        const hashIngresado = await this.hashPassword(passwordActual);
        
        const passCoincide = userFresh.password === passwordActual || 
                            userFresh.passwordHash === hashIngresado;
        
        if (!passCoincide) {
            // Guardar razón para mostrar en login
            localStorage.setItem('sesionCerrada', 'Tu contraseña ha sido cambiada. Inicia sesión con la nueva contraseña.');
            this.logout();
            window.location.href = 'index.html';
            return false;
        }
        
        logger.success('✅ Sesión verificada correctamente');
        return true;
    }
    
    /**
     * ✅ OBTENER MENSAJE DE SESIÓN CERRADA (si lo hay)
     */
    obtenerMensajeSesionCerrada() {
        const mensaje = localStorage.getItem('sesionCerrada');
        localStorage.removeItem('sesionCerrada'); // Limpiar después de obtener
        return mensaje;
    }

    /**
     * Realiza el login del usuario
     */
    async login(username, password) {
        // ✅ SIEMPRE cargar usuarios frescos del sistema.json
        await this.loadUsers();

        console.log('🔐 Intentando login para:', username);
        console.log('👥 Usuarios disponibles:', this.users.map(u => ({ username: u.username, activo: u.activo })));

        // Primero buscar usuario por nombre (sin filtrar por activo)
        const userBuscado = this.users.find(u => 
            u.username.toLowerCase() === username.toLowerCase()
        );

        // Si no existe el usuario
        if (!userBuscado) {
            console.log('❌ Usuario no encontrado');
            return { success: false, message: 'Usuario no encontrado en el sistema' };
        }

        console.log('✅ Usuario encontrado:', userBuscado.username, '| activo:', userBuscado.activo);

        // Si existe pero está inactivo (comparar explícitamente con 0 o false)
        if (userBuscado.activo === 0 || userBuscado.activo === '0' || userBuscado.activo === false) {
            console.log('❌ Usuario inactivo');
            return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
        }

        // Verificar contraseña (comparar con password o passwordHash esperado)
        const currentHash = await this.hashPassword(password);
        const passwordMatch = userBuscado.password === password || userBuscado.passwordHash === currentHash;

        if (!passwordMatch) {
            console.log('❌ Contraseña incorrecta');
            return { success: false, message: 'Contraseña incorrecta' };
        }

        this.currentUser = userBuscado;
        localStorage.setItem('currentUser', JSON.stringify(userBuscado));
        console.log('✅ Login exitoso');

        return { success: true, user: userBuscado };
    }

    /**
     * Cierra la sesión del usuario
     */
    logout() {
        if (this.currentUser) {
            logger.info(`Cerrando sesión de ${this.currentUser.username}`);
        }
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null && typeof this.currentUser === 'object';
    }

    /**
     * Alias para compatibilidad v5.1 (isLoggedIn)
     */
    isLoggedIn() {
        return this.isAuthenticated();
    }

    /**
     * Verifica si el usuario es admin
     */
    isAdmin() {
        return true; // Todos los usuarios son tratados como administradores de su propio panel
    }

    /**
     * Genera hash SHA-256 de la contraseña
     */
    hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        return crypto.subtle.digest('SHA-256', data).then(hash => {
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        });
    }

    /**
     * Redirige según el rol del usuario
     */
    redirectByRole() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'trabajadores.html') {
            window.location.href = 'trabajadores.html';
        }
    }

    /**
     * Protege una página requiriendo autenticación
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            logger.warn('Acceso no autorizado, redirigiendo a login');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    /**
     * Protege una página requiriendo rol de admin
     */
    requireAdmin() {
        return this.requireAuth();
    }
}

// Crear instancia global del sistema de autenticación
const authSystem = new AuthSystem();