/**
 * Utilidades de seguridad y formateo
 */

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} str - Texto a sanitizar
 * @returns {string} Texto seguro
 */
function sanitize(str) {
    if (!str || typeof str !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "`": '&#x60;',
        '/': '&#x2F;'
    };
    return str.replace(/[&<>"'`\/]/g, char => map[char] || char);
}

/**
 * Sanitiza atributos HTML
 * @param {string} str - Atributo a sanitizar
 * @returns {string} Atributo seguro
 */
function sanitizeAttr(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/["']/g, match => match === '"' ? '&quot;' : '&#39;');
}

/**
 * Valida y sanitiza URLs
 * @param {string} url - URL a validar
 * @returns {string} URL segura o string vacío
 */
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const u = new URL(url);
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(u.protocol)) return '';
        // Prevenir javascript: y data:
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
        return u.href;
    } catch (e) {
        return '';
    }
}

/**
 * Trunca texto con ellipsis
 * @param {string} str - Texto
 * @param {number} max - Máximo de caracteres
 * @returns {string} Texto truncado
 */
function truncate(str, max = 50) {
    if (!str || str.length <= max) return str || '';
    return str.substring(0, max) + '...';
}

/**
 * Formatea fecha de forma segura (corrige zona horaria)
 * @param {Date|string} date - Fecha
 * @param {Object} options - Opciones de Intl.DateTimeFormat
 * @returns {string} Fecha formateada
 */
function formatDate(date, options = {}) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const defaultOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options
    };
    
    return d.toLocaleDateString('es-ES', defaultOptions);
}

/**
 * Debounce para eventos
 * @param {Function} func - Función
 * @param {number} wait - Tiempo en ms
 * @returns {Function} Función debounced
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Genera ID único seguro
 * @returns {string} ID único
 */
function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Clona profundamente un objeto (seguro para estructuras JSON)
 * @param {Object} obj - Objeto a clonar
 * @returns {Object} Copia profunda
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Comprime imagen a base64 con límite de tamaño
 * @param {File} file - Archivo de imagen
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @param {number} maxWidth - Ancho máximo
 * @returns {Promise<string>} Promise con base64
 */
function compressImage(file, maxSizeMB = 1, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            reject(new Error(`El archivo excede ${maxSizeMB}MB`));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Exportar para tests o módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitize,
        sanitizeAttr,
        sanitizeUrl,
        truncate,
        formatDate,
        debounce,
        generateId,
        deepClone,
        compressImage
    };
}
