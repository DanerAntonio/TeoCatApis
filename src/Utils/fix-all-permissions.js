import { query } from "../Config/Database.js";

/**
 * Script para verificar y corregir los permisos de todos los roles
 */
async function fixAllRolesPermissions() {
  try {
    console.log("=== VERIFICACIÓN DE PERMISOS DE ROLES ===");
    
    // 1. Obtener todos los roles
    const roles = await query("SELECT * FROM Roles");
    console.log(`Total de roles: ${roles.length}`);
    
    // 2. Obtener todos los permisos
    const permisos = await query("SELECT * FROM Permisos");
    console.log(`Total de permisos: ${permisos.length}`);
    
    // 3. Verificar permisos de cada rol
    for (const rol of roles) {
      console.log(`\nVerificando rol: ${rol.NombreRol} (ID: ${rol.IdRol})`);
      
      // Obtener permisos asignados al rol
      const permisosRol = await query(`
        SELECT p.IdPermiso, p.NombrePermiso
        FROM Permisos p
        JOIN Rol_Permiso rp ON p.IdPermiso = rp.IdPermiso
        WHERE rp.IdRol = ?
      `, [rol.IdRol]);
      
      console.log(`Permisos asignados: ${permisosRol.length}`);
      
      // Si es Super Administrador, asignar todos los permisos
      if (rol.IdRol === 1) {
        console.log("Es Super Administrador, verificando que tenga todos los permisos...");
        
        // Verificar si faltan permisos
        if (permisosRol.length < permisos.length) {
          console.log(`Faltan ${permisos.length - permisosRol.length} permisos por asignar.`);
          
          // Asignar permisos faltantes
          const result = await query(`
            INSERT INTO Rol_Permiso (IdRol, IdPermiso)
            SELECT 1, IdPermiso FROM Permisos
            WHERE IdPermiso NOT IN (SELECT IdPermiso FROM Rol_Permiso WHERE IdRol = 1)
          `);
          
          console.log(`Se han asignado ${result.affectedRows} permisos faltantes al Super Administrador.`);
        } else {
          console.log("El Super Administrador ya tiene todos los permisos asignados.");
        }
      }
      
      // Verificar permisos duplicados
      const duplicados = await query(`
        SELECT IdPermiso, COUNT(*) as count
        FROM Rol_Permiso
        WHERE IdRol = ?
        GROUP BY IdPermiso
        HAVING count > 1
      `, [rol.IdRol]);
      
      if (duplicados.length > 0) {
        console.log(`Se encontraron ${duplicados.length} permisos duplicados. Eliminando duplicados...`);
        
        for (const dup of duplicados) {
          await query(`
            DELETE FROM Rol_Permiso
            WHERE IdRol = ? AND IdPermiso = ?
            LIMIT ?
          `, [rol.IdRol, dup.IdPermiso, dup.count - 1]);
        }
        
        console.log("Duplicados eliminados correctamente.");
      }
    }
    
    console.log("\n=== VERIFICACIÓN COMPLETADA ===");
    return true;
  } catch (error) {
    console.error("Error al verificar permisos de roles:", error);
    return false;
  }
}

export default fixAllRolesPermissions;