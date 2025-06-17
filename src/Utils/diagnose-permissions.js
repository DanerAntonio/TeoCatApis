import { query } from "../Config/Database.js";

/**
 * Script para diagnosticar problemas con los permisos
 */
async function diagnosePermissions(userId, rolId) {
  try {
    console.log("=== DIAGNÓSTICO DE PERMISOS ===");
    
    // 1. Verificar si el usuario existe
    const usuarios = await query("SELECT * FROM Usuarios WHERE IdUsuario = ?", [userId]);
    if (usuarios.length === 0) {
      console.error(`Error: No existe el usuario con ID ${userId}`);
      return;
    }
    
    const usuario = usuarios[0];
    console.log(`Usuario encontrado: ${usuario.Nombre} ${usuario.Apellido} (ID: ${usuario.IdUsuario})`);
    console.log(`Rol del usuario: ${usuario.IdRol}`);
    
    // 2. Verificar si el rol existe
    const roles = await query("SELECT * FROM Roles WHERE IdRol = ?", [usuario.IdRol]);
    if (roles.length === 0) {
      console.error(`Error: No existe el rol con ID ${usuario.IdRol}`);
      return;
    }
    
    const rol = roles[0];
    console.log(`Rol encontrado: ${rol.NombreRol} (ID: ${rol.IdRol})`);
    
    // 3. Verificar permisos asignados al rol
    const permisosRol = await query(`
      SELECT p.IdPermiso, p.NombrePermiso
      FROM Permisos p
      JOIN Rol_Permiso rp ON p.IdPermiso = rp.IdPermiso
      WHERE rp.IdRol = ?
    `, [usuario.IdRol]);
    
    console.log(`Total de permisos asignados al rol: ${permisosRol.length}`);
    
    if (permisosRol.length === 0) {
      console.error(`Error: El rol ${rol.NombreRol} no tiene permisos asignados`);
    } else {
      console.log("Permisos asignados al rol:");
      permisosRol.forEach(p => {
        console.log(`- ${p.NombrePermiso} (ID: ${p.IdPermiso})`);
      });
    }
    
    // 4. Verificar si existe el permiso "Visualizar Usuarios"
    const permisosVisualizarUsuarios = await query(`
      SELECT * FROM Permisos WHERE NombrePermiso = 'Visualizar Usuarios'
    `);
    
    if (permisosVisualizarUsuarios.length === 0) {
      console.error("Error: No existe el permiso 'Visualizar Usuarios' en la base de datos");
      return;
    }
    
    const permisoVisualizarUsuarios = permisosVisualizarUsuarios[0];
    console.log(`Permiso 'Visualizar Usuarios' encontrado (ID: ${permisoVisualizarUsuarios.IdPermiso})`);
    
    // 5. Verificar si el rol tiene el permiso "Visualizar Usuarios"
    const tienePermiso = await query(`
      SELECT * FROM Rol_Permiso 
      WHERE IdRol = ? AND IdPermiso = ?
    `, [usuario.IdRol, permisoVisualizarUsuarios.IdPermiso]);
    
    if (tienePermiso.length === 0) {
      console.error(`Error: El rol ${rol.NombreRol} no tiene asignado el permiso 'Visualizar Usuarios'`);
    } else {
      console.log(`El rol ${rol.NombreRol} tiene asignado el permiso 'Visualizar Usuarios'`);
    }
    
    console.log("=== FIN DEL DIAGNÓSTICO ===");
  } catch (error) {
    console.error("Error al diagnosticar permisos:", error);
  }
}

export default diagnosePermissions;