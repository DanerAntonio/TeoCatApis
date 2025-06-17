import fixSuperAdminPermissions from "../../Utils/fix-permissions.js";
import fixAllRolesPermissions from "../../Utils/fix-all-permissions.js";
import permissionCache from "../../Utils/PermissionCache.js";
import { query } from "../../Config/Database.js";

// Controlador para tareas administrativas
export const adminController = {
  // Corregir permisos del Super Administrador
  fixSuperAdminPermissions: async (req, res) => {
    try {
      await fixSuperAdminPermissions();
      
      // Limpiar caché de permisos
      permissionCache.clearCache();
      
      res.status(200).json({ message: "Permisos del Super Administrador corregidos correctamente" });
    } catch (error) {
      console.error("Error al corregir permisos:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  },

  // Corregir permisos de todos los roles
  fixAllRolesPermissions: async (req, res) => {
    try {
      const result = await fixAllRolesPermissions();
      
      // Limpiar caché de permisos
      permissionCache.clearCache();
      
      if (result) {
        res.status(200).json({ message: "Permisos de todos los roles corregidos correctamente" });
      } else {
        res.status(500).json({ message: "Error al corregir permisos de roles" });
      }
    } catch (error) {
      console.error("Error al corregir permisos de roles:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  },

  // Limpiar caché de permisos
  clearPermissionCache: async (req, res) => {
    try {
      permissionCache.clearCache();
      
      res.status(200).json({ message: "Caché de permisos limpiada correctamente" });
    } catch (error) {
      console.error("Error al limpiar caché:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  },

  // Limpiar caché de un usuario específico
  clearUserPermissionCache: async (req, res) => {
    try {
      const { userId } = req.params;
      
      permissionCache.invalidatePermissions(parseInt(userId));
      
      res.status(200).json({ message: `Caché de permisos del usuario ${userId} limpiada correctamente` });
    } catch (error) {
      console.error("Error al limpiar caché de usuario:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  },

  // Diagnosticar permisos de un usuario
  diagnoseUserPermissions: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Obtener información del usuario
      const usuarios = await query("SELECT * FROM Usuarios WHERE IdUsuario = ?", [userId]);
      if (usuarios.length === 0) {
        return res.status(404).json({ message: `Usuario con ID ${userId} no encontrado` });
      }
      
      const usuario = usuarios[0];
      
      // Obtener información del rol
      const roles = await query("SELECT * FROM Roles WHERE IdRol = ?", [usuario.IdRol]);
      if (roles.length === 0) {
        return res.status(404).json({ message: `Rol con ID ${usuario.IdRol} no encontrado` });
      }
      
      const rol = roles[0];
      
      // Obtener permisos del rol
      const permisos = await query(`
        SELECT p.IdPermiso, p.NombrePermiso
        FROM Permisos p
        JOIN Rol_Permiso rp ON p.IdPermiso = rp.IdPermiso
        WHERE rp.IdRol = ?
      `, [usuario.IdRol]);
      
      // Devolver diagnóstico
      res.status(200).json({
        usuario: {
          id: usuario.IdUsuario,
          nombre: usuario.Nombre,
          apellido: usuario.Apellido,
          correo: usuario.Correo,
          estado: usuario.Estado
        },
        rol: {
          id: rol.IdRol,
          nombre: rol.NombreRol
        },
        permisos: permisos.map(p => ({
          id: p.IdPermiso,
          nombre: p.NombrePermiso
        })),
        totalPermisos: permisos.length
      });
    } catch (error) {
      console.error("Error al diagnosticar permisos:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  }
};

export default adminController;