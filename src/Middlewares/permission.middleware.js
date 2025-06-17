import { rolesModel } from "../Models/AuthService/auth.model.js"
import permissionCache from "../Utils/PermissionCache.js"

// Middleware para verificar permisos
export const validatePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Verificar si el usuario está autenticado
      if (!req.user) {
        console.log("Usuario no autenticado");
        return res.status(401).json({ message: "No autorizado" })
      }

      console.log(`Verificando permiso: ${permissionName} para usuario ID: ${req.user.id}, rol: ${req.user.role}`);

      // Verificar si es Super Administrador (rol ID 1)
      if (req.user.role === 1) {
        console.log("Usuario es Super Administrador, acceso permitido");
        return next();
      }

      // Obtener permisos del usuario
      let permisos = permissionCache.getPermissions(req.user.id);
      
      // Si no están en caché, obtenerlos de la base de datos
      if (!permisos) {
        console.log("Permisos no encontrados en caché, obteniendo de BD...");
        permisos = await rolesModel.getPermisos(req.user.role);
        
        // Guardar en caché para futuras solicitudes
        permissionCache.setPermissions(req.user.id, permisos);
        console.log(`Permisos obtenidos de BD y guardados en caché: ${permisos.length}`);
      } else {
        console.log(`Permisos obtenidos de caché: ${permisos.length}`);
      }
      
      // Debug: mostrar todos los permisos del usuario
      console.log("Permisos del usuario:", permisos.map(p => p.NombrePermiso));
      
      // Verificar si el usuario tiene el permiso requerido
      const hasPermission = permisos.some((p) => p.NombrePermiso === permissionName);

      if (!hasPermission) {
        console.log(`❌ Acceso denegado para usuario ID ${req.user.id}, rol ${req.user.role}. Permiso requerido: ${permissionName}`);
        console.log("Permisos disponibles:", permisos.map(p => p.NombrePermiso));
        return res.status(403).json({
          message: "Acceso denegado. No tienes permiso para realizar esta acción",
          requiredPermission: permissionName,
        });
      }

      console.log(`✅ Acceso permitido para usuario ID ${req.user.id}. Permiso: ${permissionName}`);
      next();
    } catch (error) {
      console.error("Error en el middleware de permisos:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  };
};

export default validatePermission;