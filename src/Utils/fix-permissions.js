import { query } from "../Config/Database.js";

/**
 * Script para verificar y corregir los permisos del Super Administrador
 * Este script se puede ejecutar manualmente cuando sea necesario
 */
async function fixSuperAdminPermissions() {
  try {
    console.log("Iniciando verificación de permisos del Super Administrador...");
    
    // 1. Verificar si existe el rol de Super Administrador
    const roles = await query("SELECT * FROM Roles WHERE IdRol = 1");
    if (roles.length === 0) {
      console.error("Error: No existe el rol de Super Administrador (IdRol = 1)");
      return;
    }
    
    console.log(`Rol encontrado: ${roles[0].NombreRol}`);
    
    // 2. Contar permisos totales y permisos asignados
    const [totalPermisos] = await query("SELECT COUNT(*) as total FROM Permisos");
    const [permisosAsignados] = await query("SELECT COUNT(*) as total FROM Rol_Permiso WHERE IdRol = 1");
    
    console.log(`Total de permisos en el sistema: ${totalPermisos.total}`);
    console.log(`Permisos asignados al Super Administrador: ${permisosAsignados.total}`);
    
    // 3. Verificar si faltan permisos
    if (totalPermisos.total > permisosAsignados.total) {
      console.log(`Faltan ${totalPermisos.total - permisosAsignados.total} permisos por asignar.`);
      
      // 4. Asignar permisos faltantes
      const result = await query(`
        INSERT INTO Rol_Permiso (IdRol, IdPermiso)
        SELECT 1, IdPermiso FROM Permisos
        WHERE IdPermiso NOT IN (SELECT IdPermiso FROM Rol_Permiso WHERE IdRol = 1)
      `);
      
      console.log(`Se han asignado ${result.affectedRows} permisos faltantes al Super Administrador.`);
    } else {
      console.log("El Super Administrador ya tiene todos los permisos asignados.");
    }
    
    // 5. Verificar permisos duplicados
    const duplicados = await query(`
      SELECT IdPermiso, COUNT(*) as count
      FROM Rol_Permiso
      WHERE IdRol = 1
      GROUP BY IdPermiso
      HAVING count > 1
    `);
    
    if (duplicados.length > 0) {
      console.log(`Se encontraron ${duplicados.length} permisos duplicados. Eliminando duplicados...`);
      
      for (const dup of duplicados) {
        await query(`
          DELETE FROM Rol_Permiso
          WHERE IdRol = 1 AND IdPermiso = ?
          LIMIT ?
        `, [dup.IdPermiso, dup.count - 1]);
      }
      
      console.log("Duplicados eliminados correctamente.");
    } else {
      console.log("No se encontraron permisos duplicados.");
    }
    
    console.log("Verificación y corrección de permisos completada con éxito.");
  } catch (error) {
    console.error("Error al verificar/corregir permisos:", error);
  }
}

export default fixSuperAdminPermissions;