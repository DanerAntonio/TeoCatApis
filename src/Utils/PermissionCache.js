/**
 * Servicio de caché para permisos
 * Almacena los permisos de los usuarios en memoria para mejorar el rendimiento
 */
class PermissionCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 3600000; // 1 hora en milisegundos
  }

  /**
   * Obtiene los permisos de un usuario desde la caché
   * @param {number} userId - ID del usuario
   * @returns {Array|null} - Array de permisos o null si no está en caché
   */
  getPermissions(userId) {
    const cacheEntry = this.cache.get(userId);
    
    if (!cacheEntry) {
      return null;
    }
    
    // Verificar si la caché ha expirado
    if (Date.now() > cacheEntry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    
    return cacheEntry.permissions;
  }

  /**
   * Almacena los permisos de un usuario en la caché
   * @param {number} userId - ID del usuario
   * @param {Array} permissions - Array de permisos
   */
  setPermissions(userId, permissions) {
    this.cache.set(userId, {
      permissions,
      expiresAt: Date.now() + this.ttl
    });
  }

  /**
   * Elimina los permisos de un usuario de la caché
   * @param {number} userId - ID del usuario
   */
  invalidatePermissions(userId) {
    this.cache.delete(userId);
  }

  /**
   * Elimina todos los permisos de la caché
   */
  clearCache() {
    this.cache.clear();
  }
}

// Exportar una instancia única del servicio de caché
export const permissionCache = new PermissionCache();

export default permissionCache;