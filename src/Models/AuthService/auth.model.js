import { query } from "../../Config/Database.js"
import bcrypt from "bcrypt"
import crypto from "crypto"

// Modelo para la tabla Permisos
export const permisosModel = {
  // Obtener todos los permisos
  getAll: async () => {
    return await query(`SELECT * FROM Permisos ORDER BY NombrePermiso`)
  },

  // Obtener un permiso por ID
  getById: async (id) => {
    const permisos = await query(`SELECT * FROM Permisos WHERE IdPermiso = ?`, [id])
    return permisos[0]
  },

  // Crear un nuevo permiso
  create: async (permisoData) => {
    const result = await query(`INSERT INTO Permisos (NombrePermiso, Descripcion) VALUES (?, ?)`, [
      permisoData.NombrePermiso,
      permisoData.Descripcion || "",
    ])
    return { id: result.insertId, ...permisoData }
  },

  // Actualizar un permiso
  update: async (id, permisoData) => {
    await query(`UPDATE Permisos SET NombrePermiso = ?, Descripcion = ? WHERE IdPermiso = ?`, [
      permisoData.NombrePermiso,
      permisoData.Descripcion || "",
      id,
    ])
    return { id, ...permisoData }
  },

  // Eliminar un permiso
  delete: async (id) => {
    await query(`DELETE FROM Permisos WHERE IdPermiso = ?`, [id])
    return { id }
  },

  // Buscar permisos por nombre
  searchByName: async (nombre) => {
    return await query(`SELECT * FROM Permisos WHERE NombrePermiso LIKE ? ORDER BY NombrePermiso`, [`%${nombre}%`])
  },
}

// Modelo para la tabla Roles
export const rolesModel = {
  // Obtener todos los roles
  getAll: async () => {
    return await query(`SELECT * FROM Roles ORDER BY NombreRol`)
  },

  // Obtener un rol por ID
  getById: async (id) => {
    const roles = await query(`SELECT * FROM Roles WHERE IdRol = ?`, [id])
    return roles[0]
  },

  // Crear un nuevo rol
  create: async (rolData) => {
    const result = await query(`INSERT INTO Roles (NombreRol) VALUES (?)`, [
      rolData.NombreRol,
    ])
    return { id: result.insertId, ...rolData }
  },

  // Actualizar un rol
  update: async (id, rolData) => {
    await query(`UPDATE Roles SET NombreRol = ? WHERE IdRol = ?`, [
      rolData.NombreRol,
      id,
    ])
    return { id, ...rolData }
  },

  // Cambiar estado de un rol
changeStatus: async (id, estado) => {
  await query(`UPDATE Roles SET Estado = ? WHERE IdRol = ?`, [estado, id])
  return { id, Estado: estado }
},

  // Eliminar un rol
  delete: async (id) => {
    await query(`DELETE FROM Roles WHERE IdRol = ?`, [id])
    return { id }
  },

  // Buscar roles por nombre
  searchByName: async (nombre) => {
    return await query(`SELECT * FROM Roles WHERE NombreRol LIKE ? ORDER BY NombreRol`, [`%${nombre}%`])
  },

  // Obtener permisos de un rol
getPermisos: async (idRol) => {
  try {
    const permisos = await query(`
      SELECT p.IdPermiso, p.NombrePermiso
      FROM Permisos p
      JOIN Rol_Permiso rp ON p.IdPermiso = rp.IdPermiso
      WHERE rp.IdRol = ?
    `, [idRol]);
    
    return permisos;
  } catch (error) {
    console.error("Error al obtener permisos del rol:", error);
    throw error;
  }
},

  // Obtener permisos de un rol (nombres de permisos)
  getPermissions: async (idRol) => {
    return await query(
      `SELECT p.* FROM Permisos p
      JOIN Rol_Permiso rp ON p.IdPermiso = rp.IdPermiso
      WHERE rp.IdRol = ?
      ORDER BY p.NombrePermiso`,
      [idRol],
    )
  },
}

// Modelo para la tabla Rol_Permiso
export const rolPermisoModel = {
  // Obtener todas las relaciones rol-permiso
  getAll: async () => {
    return await query(
      `SELECT rp.*, r.NombreRol, p.NombrePermiso
      FROM Rol_Permiso rp
      JOIN Roles r ON rp.IdRol = r.IdRol
      JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
      ORDER BY r.NombreRol, p.NombrePermiso`,
    )
  },

  // Obtener una relación rol-permiso específica
  getById: async (idRol, idPermiso) => {
    const relaciones = await query(
      `SELECT rp.*, r.NombreRol, p.NombrePermiso
      FROM Rol_Permiso rp
      JOIN Roles r ON rp.IdRol = r.IdRol
      JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
      WHERE rp.IdRol = ? AND rp.IdPermiso = ?`,
      [idRol, idPermiso],
    )
    return relaciones[0]
  },

  // Crear una nueva relación rol-permiso
  create: async (rolPermisoData) => {
    await query(`INSERT INTO Rol_Permiso (IdRol, IdPermiso) VALUES (?, ?)`, [
      rolPermisoData.IdRol,
      rolPermisoData.IdPermiso,
    ])
    return rolPermisoData
  },

  // Eliminar una relación rol-permiso
  delete: async (idRol, idPermiso) => {
    await query(`DELETE FROM Rol_Permiso WHERE IdRol = ? AND IdPermiso = ?`, [idRol, idPermiso])
    return { IdRol: idRol, IdPermiso: idPermiso }
  },

  // Eliminar todas las relaciones de un rol
  deleteByRol: async (idRol) => {
    await query(`DELETE FROM Rol_Permiso WHERE IdRol = ?`, [idRol])
    return { IdRol: idRol }
  },

  // Verificar si un rol tiene un permiso específico
  hasPermiso: async (idRol, nombrePermiso) => {
    const result = await query(
      `SELECT COUNT(*) AS count
      FROM Rol_Permiso rp
      JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
      WHERE rp.IdRol = ? AND p.NombrePermiso = ?`,
      [idRol, nombrePermiso],
    )
    return result[0].count > 0
  },
}

// Modelo para la tabla Usuarios
export const usuariosModel = {
  // Obtener todos los usuarios
  getAll: async () => {
    return await query(
      `SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, u.FechaCreacion, 
      u.Estado, u.Foto AS FotoURL, r.IdRol, r.NombreRol
      FROM Usuarios u
      JOIN Roles r ON u.IdRol = r.IdRol
      ORDER BY u.Apellido, u.Nombre`,
    )
  },

  // Obtener un usuario por ID
  getById: async (id) => {
    const usuarios = await query(
      `SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, u.FechaCreacion, 
      u.Estado, u.Foto AS FotoURL, r.IdRol, r.NombreRol
      FROM Usuarios u
      JOIN Roles r ON u.IdRol = r.IdRol
      WHERE u.IdUsuario = ?`,
      [id],
    )
    return usuarios[0]
  },

  // Obtener un usuario por correo
  getByEmail: async (correo) => {
    const usuarios = await query(
      `SELECT u.*, r.NombreRol
      FROM Usuarios u
      JOIN Roles r ON u.IdRol = r.IdRol
      WHERE u.Correo = ?`,
      [correo],
    )
    return usuarios[0]
  },

  // Crear un nuevo usuario
  create: async (usuarioData) => {
  // Encriptar contraseña
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(usuarioData.Password, salt)

  const result = await query(
    `INSERT INTO Usuarios 
    (Nombre, Apellido, Correo, Contraseña, Telefono, Direccion, IdRol, Estado, Foto, Documento) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioData.Nombre,
      usuarioData.Apellido,
      usuarioData.Correo,
      hashedPassword,
      usuarioData.Telefono || "",
      usuarioData.Direccion || "",
      usuarioData.IdRol,
      usuarioData.Estado !== undefined ? usuarioData.Estado : true,
      usuarioData.Foto || null,
      usuarioData.Documento || "",
    ],
  )

  // No devolver la contraseña
  const { Password, ...usuarioSinPassword } = usuarioData
  return { id: result.insertId, ...usuarioSinPassword }
},

  // Actualizar un usuario
  update: async (id, usuarioData) => {
    let query_str = `UPDATE Usuarios SET `
    const params = []

    // Construir la consulta dinámicamente
    if (usuarioData.Nombre) {
      query_str += `Nombre = ?, `
      params.push(usuarioData.Nombre)
    }
    if (usuarioData.Apellido) {
      query_str += `Apellido = ?, `
      params.push(usuarioData.Apellido)
    }
    if (usuarioData.Correo) {
      query_str += `Correo = ?, `
      params.push(usuarioData.Correo)
    }
    if (usuarioData.Password) {
      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(usuarioData.Password, salt)

      query_str += `Contraseña = ?, `
      params.push(hashedPassword)
    }
    if (usuarioData.Telefono !== undefined) {
      query_str += `Telefono = ?, `
      params.push(usuarioData.Telefono)
    }
    if (usuarioData.Direccion !== undefined) {
      query_str += `Direccion = ?, `
      params.push(usuarioData.Direccion)
    }
    if (usuarioData.IdRol) {
      query_str += `IdRol = ?, `
      params.push(usuarioData.IdRol)
    }
    if (usuarioData.Estado !== undefined) {
      query_str += `Estado = ?, `
      params.push(usuarioData.Estado)
    }
    if (usuarioData.Foto !== undefined) {
      query_str += `Foto = ?, `
      params.push(usuarioData.Foto)
    }
    if (usuarioData.Documento !== undefined) {
      query_str += `Documento = ?, `
      params.push(usuarioData.Documento)
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2)

    // Añadir la condición WHERE
    query_str += ` WHERE IdUsuario = ?`
    params.push(id)

    await query(query_str, params)

    // No devolver la contraseña
    const { Password, ...usuarioSinPassword } = usuarioData
    return { id, ...usuarioSinPassword }
  },

  // Cambiar contraseña
  changePassword: async (id, newPassword) => {
    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await query(`UPDATE Usuarios SET Contraseña = ? WHERE IdUsuario = ?`, [hashedPassword, id])

    return { id }
  },

  // Cambiar estado de un usuario
  changeStatus: async (id, estado) => {
    await query(`UPDATE Usuarios SET Estado = ? WHERE IdUsuario = ?`, [estado, id])

    return { id, Estado: estado }
  },

  // Eliminar un usuario
  delete: async (id) => {
    await query(`DELETE FROM Usuarios WHERE IdUsuario = ?`, [id])

    return { id }
  },

  // Verificar credenciales
  verifyCredentials: async (correo, password) => {
    const usuarios = await query(`SELECT * FROM Usuarios WHERE Correo = ?`, [correo])

    if (usuarios.length === 0) {
      return null
    }

    const usuario = usuarios[0]
    const isMatch = await bcrypt.compare(password, usuario.Contraseña)

    if (!isMatch) {
      return null
    }

    // No devolver la contraseña
    const { Contraseña, ...usuarioSinPassword } = usuario
    return usuarioSinPassword
  },

  // Buscar usuarios
  search: async (searchTerm) => {
    return await query(
      `SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, u.FechaCreacion, 
      u.Estado, u.Foto AS FotoURL, r.IdRol, r.NombreRol
      FROM Usuarios u
      JOIN Roles r ON u.IdRol = r.IdRol
      WHERE u.Nombre LIKE ? OR u.Apellido LIKE ? OR u.Correo LIKE ?
      ORDER BY u.Apellido, u.Nombre`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    )
  },

  // Obtener usuarios por rol
  getByRol: async (idRol) => {
    return await query(
      `SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, u.FechaCreacion, 
      u.Estado, u.Foto AS FotoURL, r.IdRol, r.NombreRol
      FROM Usuarios u
      JOIN Roles r ON u.IdRol = r.IdRol
      WHERE u.IdRol = ?
      ORDER BY u.Apellido, u.Nombre`,
      [idRol],
    )
  },
}

// Modelo para la tabla SesionesUsuarios
export const sesionesUsuariosModel = {
  // Obtener todas las sesiones
  getAll: async () => {
    return await query(
      `SELECT s.*, u.Nombre, u.Apellido, u.Correo
      FROM SesionesUsuarios s
      JOIN Usuarios u ON s.IdUsuario = u.IdUsuario
      ORDER BY s.FechaCreacion DESC`,
    )
  },

  // Obtener una sesión por ID
  getById: async (id) => {
    const sesiones = await query(
      `SELECT s.*, u.Nombre, u.Apellido, u.Correo
      FROM SesionesUsuarios s
      JOIN Usuarios u ON s.IdUsuario = u.IdUsuario
      WHERE s.IdSesion = ?`,
      [id],
    )
    return sesiones[0]
  },

  // Crear una nueva sesión
  create: async (sesionData) => {
    // Calcular el hash del token para almacenarlo
    const tokenHash = crypto.createHash("sha256").update(sesionData.Token).digest("hex")

    const result = await query(
      `INSERT INTO SesionesUsuarios 
      (IdUsuario, TokenHash, Dispositivo, DireccionIP, FechaCreacion, FechaExpiracion, EstaRevocado) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sesionData.IdUsuario,
        tokenHash,
        sesionData.Dispositivo || null,
        sesionData.IP || null,
        sesionData.FechaInicio || new Date(),
        sesionData.FechaExpiracion,
        false,
      ],
    )
    return { id: result.insertId, ...sesionData }
  },

  // Eliminar sesiones por usuario
  deleteByUsuario: async (idUsuario) => {
    await query(`DELETE FROM SesionesUsuarios WHERE IdUsuario = ?`, [idUsuario])
    return { IdUsuario: idUsuario }
  },

  // Eliminar sesión por token
  deleteByToken: async (token) => {
    // Calcular el hash del token para buscarlo
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    await query(`DELETE FROM SesionesUsuarios WHERE TokenHash = ?`, [tokenHash])
    return { Token: token }
  },

  // Verificar si una sesión es válida por token
  isValid: async (token) => {
    try {
      // Calcular el hash del token para buscarlo
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

      const sesiones = await query(
        `SELECT * FROM SesionesUsuarios 
        WHERE TokenHash = ? AND FechaExpiracion > NOW() AND EstaRevocado = FALSE`,
        [tokenHash],
      )
      return sesiones.length > 0 ? sesiones[0] : null
    } catch (error) {
      console.error("Error in isValid:", error)
      return null
    }
  },

  // Eliminar sesiones expiradas
  deleteExpired: async () => {
    const result = await query(`DELETE FROM SesionesUsuarios WHERE FechaExpiracion <= NOW()`)
    return { affectedRows: result.affectedRows }
  },
}

// Modelo para la tabla TokensRecuperacion
export const tokensRecuperacionModel = {
  // Obtener todos los tokens
  getAll: async () => {
    return await query(
      `SELECT t.*, u.Nombre, u.Apellido, u.Correo
      FROM TokensRecuperacion t
      JOIN Usuarios u ON t.IdUsuario = u.IdUsuario
      ORDER BY t.FechaCreacion DESC`,
    )
  },

  // Obtener un token por ID
  getById: async (id) => {
    const tokens = await query(
      `SELECT t.*, u.Nombre, u.Apellido, u.Correo
      FROM TokensRecuperacion t
      JOIN Usuarios u ON t.IdUsuario = u.IdUsuario
      WHERE t.IdToken = ?`,
      [id],
    )
    return tokens[0]
  },

  // NUEVO MÉTODO: Obtener token válido por usuario
  getValidByUsuario: async (idUsuario) => {
    const tokens = await query(
      `SELECT * FROM TokensRecuperacion 
      WHERE IdUsuario = ? AND FechaExpiracion > NOW() AND FueUsado = FALSE
      ORDER BY FechaCreacion DESC
      LIMIT 1`,
      [idUsuario],
    )
    return tokens.length > 0 ? tokens[0] : null
  },

  // Obtener un token por su valor
  getByToken: async (token) => {
    const tokens = await query(
      `SELECT t.*, u.Nombre, u.Apellido, u.Correo
      FROM TokensRecuperacion t
      JOIN Usuarios u ON t.IdUsuario = u.IdUsuario
      WHERE t.Token = ?`,
      [token],
    )
    return tokens[0]
  },

  // Crear un nuevo token
  create: async (tokenData) => {
    // Generar token aleatorio si no se proporciona
    const token = tokenData.Token || crypto.randomBytes(32).toString("hex")

    const result = await query(
      `INSERT INTO TokensRecuperacion 
      (IdUsuario, Token, FechaCreacion, FechaExpiracion, FueUsado) 
      VALUES (?, ?, ?, ?, ?)`,
      [
        tokenData.IdUsuario,
        token,
        tokenData.FechaCreacion || new Date(),
        tokenData.FechaExpiracion,
        tokenData.Utilizado || false,
      ],
    )
    return { id: result.insertId, Token: token, ...tokenData }
  },

  // Marcar un token como utilizado
  markAsUsed: async (id) => {
    await query(`UPDATE TokensRecuperacion SET FueUsado = TRUE WHERE IdToken = ?`, [id])
    return { id, FueUsado: true }
  },

  // Eliminar un token
  delete: async (id) => {
    await query(`DELETE FROM TokensRecuperacion WHERE IdToken = ?`, [id])
    return { id }
  },

  // Eliminar tokens por usuario
  deleteByUsuario: async (idUsuario) => {
    await query(`DELETE FROM TokensRecuperacion WHERE IdUsuario = ?`, [idUsuario])
    return { IdUsuario: idUsuario }
  },

  // Verificar si un token es válido
  isValid: async (token) => {
    const tokens = await query(
      `SELECT * FROM TokensRecuperacion 
      WHERE Token = ? AND FechaExpiracion > NOW() AND FueUsado = FALSE`,
      [token],
    )
    return tokens.length > 0 ? tokens[0] : null
  },

  // Eliminar tokens expirados o utilizados
  deleteExpiredOrUsed: async () => {
    const result = await query(
      `DELETE FROM TokensRecuperacion 
      WHERE FechaExpiracion <= NOW() OR FueUsado = TRUE`,
    )
    return { affectedRows: result.affectedRows }
  },
}

export default {
  permisos: permisosModel,
  roles: rolesModel,
  rolPermiso: rolPermisoModel,
  usuarios: usuariosModel,
  sesionesUsuarios: sesionesUsuariosModel,
  tokensRecuperacion: tokensRecuperacionModel,
}
