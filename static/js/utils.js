// ============================================================================
// MÓDULO DE UTILIDADES COMPARTIDAS
// Sistema de Gestión de Clientes - Mundo Escolar
// ============================================================================

/**
 * Sistema de Logging Centralizado
 * Controla el nivel de logs según el entorno (desarrollo/producción)
 */
class Logger {
    constructor() {
        // En localhost mostramos todos los logs, en producción solo errores
        this.isDevelopment = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.currentLevel = this.isDevelopment ? 'debug' : 'error';
    }

    /**
     * Log de depuración (solo en desarrollo)
     */
    debug(message, ...args) {
        if (this.levels[this.currentLevel] <= 0) {
            console.log(`🐛 [DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log informativo
     */
    info(message, ...args) {
        if (this.levels[this.currentLevel] <= 1) {
            console.log(`ℹ️ [INFO] ${message}`, ...args);
        }
    }

    /**
     * Advertencia
     */
    warn(message, ...args) {
        if (this.levels[this.currentLevel] <= 2) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
        }
    }

    /**
     * Error (siempre se muestra)
     */
    error(message, ...args) {
        console.error(`❌ [ERROR] ${message}`, ...args);
    }

    /**
     * Éxito
     */
    success(message, ...args) {
        if (this.levels[this.currentLevel] <= 1) {
            console.log(`✅ [SUCCESS] ${message}`, ...args);
        }
    }
}

/**
 * Validador de Datos
 * Centraliza todas las validaciones del sistema
 */
class Validator {

    /**
     * Valida un nombre (mínimo 3 caracteres, solo letras y espacios)
     */
    static validateNombre(nombre) {
        if (!nombre || typeof nombre !== 'string') {
            return { valid: false, error: 'El nombre es requerido' };
        }

        const nombreTrimmed = nombre.trim();

        if (nombreTrimmed.length < 3) {
            return { valid: false, error: 'El nombre debe tener al menos 3 caracteres' };
        }

        if (nombreTrimmed.length > 100) {
            return { valid: false, error: 'El nombre no puede exceder 100 caracteres' };
        }

        // Permitir letras, números, espacios y caracteres especiales comunes
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.,']+$/;
        if (!nombreRegex.test(nombreTrimmed)) {
            return { valid: false, error: 'El nombre contiene caracteres no permitidos' };
        }

        return { valid: true, value: nombreTrimmed };
    }

    /**
     * Valida un teléfono (9 dígitos, opcional)
     */
    static validateTelefono(telefono) {
        if (!telefono || telefono.trim() === '') {
            return { valid: true, value: '' }; // Teléfono es opcional
        }

        const telefonoTrimmed = telefono.trim();

        // Permitir solo dígitos y espacios
        const telefonoClean = telefonoTrimmed.replace(/\s/g, '');

        if (!/^\d{9}$/.test(telefonoClean)) {
            return { valid: false, error: 'El teléfono debe tener 9 dígitos' };
        }

        return { valid: true, value: telefonoClean };
    }

    /**
     * Valida una dirección
     */
    static validateDireccion(direccion) {
        if (!direccion || typeof direccion !== 'string') {
            return { valid: false, error: 'La dirección es requerida' };
        }

        const direccionTrimmed = direccion.trim();

        if (direccionTrimmed.length < 3) {
            return { valid: false, error: 'La dirección debe tener al menos 3 caracteres' };
        }

        if (direccionTrimmed.length > 200) {
            return { valid: false, error: 'La dirección no puede exceder 200 caracteres' };
        }

        return { valid: true, value: direccionTrimmed };
    }

    /**
     * Valida coordenadas de latitud (-90 a 90)
     */
    static validateLatitud(lat) {
        const latNum = parseFloat(lat);

        if (isNaN(latNum)) {
            return { valid: false, error: 'La latitud debe ser un número válido' };
        }

        if (latNum < -90 || latNum > 90) {
            return { valid: false, error: 'La latitud debe estar entre -90 y 90' };
        }

        return { valid: true, value: latNum };
    }

    /**
     * Valida coordenadas de longitud (-180 a 180)
     */
    static validateLongitud(lng) {
        const lngNum = parseFloat(lng);

        if (isNaN(lngNum)) {
            return { valid: false, error: 'La longitud debe ser un número válido' };
        }

        if (lngNum < -180 || lngNum > 180) {
            return { valid: false, error: 'La longitud debe estar entre -180 y 180' };
        }

        return { valid: true, value: lngNum };
    }

    /**
     * Valida un cliente completo
     */
    static validateCliente(clienteData) {
        const errors = [];

        // Validar nombre
        const nombreValidation = this.validateNombre(clienteData.nombre);
        if (!nombreValidation.valid) {
            errors.push(nombreValidation.error);
        }

        // Validar teléfono (opcional)
        if (clienteData.telefono) {
            const telefonoValidation = this.validateTelefono(clienteData.telefono);
            if (!telefonoValidation.valid) {
                errors.push(telefonoValidation.error);
            }
        }

        // Validar dirección
        const direccionValidation = this.validateDireccion(clienteData.direccion);
        if (!direccionValidation.valid) {
            errors.push(direccionValidation.error);
        }

        // Validar latitud
        const latValidation = this.validateLatitud(clienteData.latitud);
        if (!latValidation.valid) {
            errors.push(latValidation.error);
        }

        // Validar longitud
        const lngValidation = this.validateLongitud(clienteData.longitud);
        if (!lngValidation.valid) {
            errors.push(lngValidation.error);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            data: errors.length === 0 ? {
                nombre: nombreValidation.value,
                telefono: clienteData.telefono ? this.validateTelefono(clienteData.telefono).value : '',
                direccion: direccionValidation.value,
                latitud: latValidation.value,
                longitud: lngValidation.value,
                categoria: clienteData.categoria || 'Otro'
            } : null
        };
    }

    /**
     * Valida un nombre de usuario
     */
    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'El usuario es requerido' };
        }

        const usernameTrimmed = username.trim();

        if (usernameTrimmed.length < 3) {
            return { valid: false, error: 'El usuario debe tener al menos 3 caracteres' };
        }

        if (usernameTrimmed.length > 50) {
            return { valid: false, error: 'El usuario no puede exceder 50 caracteres' };
        }

        // Solo letras, números y guión bajo
        if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
            return { valid: false, error: 'El usuario solo puede contener letras, números y guión bajo' };
        }

        return { valid: true, value: usernameTrimmed };
    }

    /**
     * Valida una contraseña
     */
    static validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'La contraseña es requerida' };
        }

        if (password.length < 6) {
            return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
        }

        if (password.length > 100) {
            return { valid: false, error: 'La contraseña no puede exceder 100 caracteres' };
        }

        return { valid: true, value: password };
    }
}

/**
 * Utilidades de Texto
 */
class TextUtils {

    /**
     * Normaliza texto para búsquedas (elimina acentos, convierte a minúsculas)
     */
    static normalizar(texto) {
        if (!texto) return '';
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Capitaliza la primera letra de cada palabra
     */
    static capitalize(texto) {
        if (!texto) return '';
        return texto
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Trunca un texto a una longitud máxima
     */
    static truncate(texto, maxLength = 50) {
        if (!texto) return '';
        if (texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength) + '...';
    }

    /**
     * Formatea un teléfono (XXX XXX XXX)
     */
    static formatTelefono(telefono) {
        if (!telefono) return '';
        const clean = telefono.replace(/\D/g, '');
        if (clean.length === 9) {
            return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
        }
        return telefono;
    }
}

/**
 * Utilidades de Fecha
 */
class DateUtils {

    /**
     * Formatea una fecha a formato legible (DD/MM/YYYY HH:MM)
     */
    static formatear(fechaString) {
        if (!fechaString) return 'N/A';

        try {
            const fecha = new Date(fechaString);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';

            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            const horas = String(fecha.getHours()).padStart(2, '0');
            const minutos = String(fecha.getMinutes()).padStart(2, '0');

            return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    /**
     * Obtiene la fecha actual en formato ISO
     */
    static ahora() {
        return new Date().toISOString();
    }

    /**
     * Calcula tiempo transcurrido desde una fecha
     */
    static tiempoTranscurrido(fechaString) {
        if (!fechaString) return 'Nunca';

        try {
            const fecha = new Date(fechaString);
            const ahora = new Date();
            const diff = ahora - fecha;

            const minutos = Math.floor(diff / 60000);
            const horas = Math.floor(diff / 3600000);
            const dias = Math.floor(diff / 86400000);

            if (minutos < 1) return 'Hace un momento';
            if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
            if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
            if (dias < 30) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;

            return this.formatear(fechaString);
        } catch (error) {
            return 'Fecha inválida';
        }
    }
}

/**
 * Utilidades de Almacenamiento
 */
class StorageUtils {

    /**
     * Guarda un valor en localStorage de forma segura
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error('Error guardando en localStorage:', error);
            return false;
        }
    }

    /**
     * Obtiene un valor de localStorage
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            logger.error('Error leyendo de localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Elimina un valor de localStorage
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            logger.error('Error eliminando de localStorage:', error);
            return false;
        }
    }

    /**
     * Limpia todo el localStorage
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            logger.error('Error limpiando localStorage:', error);
            return false;
        }
    }
}

/**
 * Utilidades de Crypto (para hashing simple)
 * Nota: Para GitHub Pages usamos un hash simple. En producción usar bcrypt en backend.
 */
class CryptoUtils {

    /**
     * Genera un hash SHA-256 simple de un texto
     * NOTA: Esto NO es seguro para producción real, solo para GitHub Pages
     */
    static async hashSimple(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Verifica si un texto coincide con un hash
     */
    static async verifyHash(text, hash) {
        const encrypted = await this.hashSimple(text);
        return encrypted === hash;
    }

    /**
     * Ofusca un texto usando Base64 (para backups recuperables)
     */
    static obfuscate(text) {
        if (!text) return '';
        try {
            // Ofuscación básica con Base64 + prefijo para identificar
            return 'b64:' + btoa(unescape(encodeURIComponent(text)));
        } catch (e) {
            console.error('Error ofuscando:', e);
            return text;
        }
    }

    /**
     * Desofusca un texto usando Base64
     */
    static deobfuscate(text) {
        if (!text || !text.startsWith('b64:')) return text;
        try {
            const base64 = text.substring(4);
            return decodeURIComponent(escape(atob(base64)));
        } catch (e) {
            console.error('Error desofuscando:', e);
            return text;
        }
    }
}

// ============================================================================
// INSTANCIAS GLOBALES
// ============================================================================

const logger = new Logger();
const validator = Validator;
const textUtils = TextUtils;
const dateUtils = DateUtils;
const storageUtils = StorageUtils;
const cryptoUtils = CryptoUtils;

// Log de inicialización
logger.info('📦 Módulo de utilidades cargado correctamente');
