import { query } from "../../Config/Database.js"

// Modelo para las notificaciones
export const notificacionesModel = {
  // Obtener todas las notificaciones
  getAll: async () => {
    return await query(
      `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
      u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Notificaciones n
      LEFT JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      LEFT JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
      ORDER BY n.FechaCreacion DESC`,
    )
  },

  // Obtener una notificación por ID
  getById: async (id) => {
    const notificaciones = await query(
      `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
      u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Notificaciones n
      LEFT JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      LEFT JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
      WHERE n.IdNotificacion = ?`,
      [id],
    )
    return notificaciones[0]
  },

 // Crear una nueva notificación
 create: async (notificacionData) => {
  try {
    // Insertar en la tabla Notificaciones sin usar transacción explícita
    const result = await query(
      `INSERT INTO Notificaciones (
    TipoNotificacion, Titulo, Mensaje, TablaReferencia, 
    IdReferencia, Imagen, fechaCita, Prioridad, Estado
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificacionData.TipoNotificacion,
        notificacionData.Titulo,
        notificacionData.Mensaje,
        notificacionData.TablaReferencia || "",
        notificacionData.IdReferencia || 0,
        notificacionData.Imagen || null,
        notificacionData.fechaCita || null, // <--- AGREGADO
        notificacionData.Prioridad || "Media",
        "Activa",
      ],
    )

    const idNotificacion = result.insertId

      // Si es para un usuario específico
      if (notificacionData.IdUsuario) {
        await query(
          `INSERT INTO NotificacionesUsuarios (IdNotificacion, IdUsuario, Estado)
          VALUES (?, ?, 'Pendiente')`,
          [idNotificacion, notificacionData.IdUsuario],
        )
      }
      // Si es para todos los administradores
      else if (notificacionData.ParaAdmins) {
        // Obtener todos los administradores (rol 1)
        const admins = await query(`SELECT IdUsuario FROM Usuarios WHERE IdRol = 1 AND Estado = TRUE`)

        // Insertar una entrada para cada administrador
        for (const admin of admins) {
          await query(
            `INSERT INTO NotificacionesUsuarios (IdNotificacion, IdUsuario, Estado)
            VALUES (?, ?, 'Pendiente')`,
            [idNotificacion, admin.IdUsuario],
          )
        }
      }
      // Si es para todos los usuarios
      else if (notificacionData.ParaTodos) {
        // Obtener todos los usuarios activos
        const usuarios = await query(`SELECT IdUsuario FROM Usuarios WHERE Estado = TRUE`)

        // Insertar una entrada para cada usuario
        for (const usuario of usuarios) {
          await query(
            `INSERT INTO NotificacionesUsuarios (IdNotificacion, IdUsuario, Estado)
            VALUES (?, ?, 'Pendiente')`,
            [idNotificacion, usuario.IdUsuario],
          )
        }
      }

      return { id: idNotificacion, ...notificacionData }
    } catch (error) {
      console.error("Error al crear notificación:", error)
      throw error
    }
  },

  // Actualizar una notificación
  update: async (id, notificacionData) => {
    let query_str = `UPDATE Notificaciones SET `
    const params = []

    // Construir la consulta dinámicamente
    if (notificacionData.TipoNotificacion) {
      query_str += `TipoNotificacion = ?, `
      params.push(notificacionData.TipoNotificacion)
    }
    if (notificacionData.Titulo) {
      query_str += `Titulo = ?, `
      params.push(notificacionData.Titulo)
    }
    if (notificacionData.Mensaje) {
      query_str += `Mensaje = ?, `
      params.push(notificacionData.Mensaje)
    }
    if (notificacionData.TablaReferencia) {
      query_str += `TablaReferencia = ?, `
      params.push(notificacionData.TablaReferencia)
    }
    if (notificacionData.IdReferencia) {
      query_str += `IdReferencia = ?, `
      params.push(notificacionData.IdReferencia)
    }
    if (notificacionData.Prioridad) {
      query_str += `Prioridad = ?, `
      params.push(notificacionData.Prioridad)
    }
    if (notificacionData.Estado) {
      query_str += `Estado = ?, `
      params.push(notificacionData.Estado)
    }

    // Si no hay campos para actualizar, retornar
    if (params.length === 0) {
      return { id, ...notificacionData }
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2)

    // Añadir la condición WHERE
    query_str += ` WHERE IdNotificacion = ?`
    params.push(id)

    await query(query_str, params)
    return { id, ...notificacionData }
  },

  // Marcar notificación como vista
  markAsRead: async (idNotificacion, idUsuario) => {
    await query(
      `UPDATE NotificacionesUsuarios 
      SET Estado = 'Vista', FechaVista = NOW() 
      WHERE IdNotificacion = ? AND IdUsuario = ? AND Estado = 'Pendiente'`,
      [idNotificacion, idUsuario],
    )
    return { idNotificacion, idUsuario, Estado: "Vista" }
  },

  // Marcar notificación como resuelta
  markAsResolved: async (idNotificacion, idUsuario) => {
    await query(
      `UPDATE NotificacionesUsuarios 
      SET Estado = 'Resuelta', FechaResuelta = NOW() 
      WHERE IdNotificacion = ? AND IdUsuario = ? AND (Estado = 'Pendiente' OR Estado = 'Vista')`,
      [idNotificacion, idUsuario],
    )
    return { idNotificacion, idUsuario, Estado: "Resuelta" }
  },

  // Eliminar una notificación
  delete: async (id) => {
    await query(`DELETE FROM Notificaciones WHERE IdNotificacion = ?`, [id])
    return { id }
  },

  // Obtener notificaciones por usuario
  getByUsuario: async (idUsuario) => {
    return await query(
      `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
      u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Notificaciones n
      JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
      WHERE nu.IdUsuario = ? AND n.Estado = 'Activa'
      ORDER BY n.Prioridad DESC, n.FechaCreacion DESC`,
      [idUsuario],
    )
  },

  // Obtener notificaciones por cliente (adaptado para la nueva estructura)
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
      u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Notificaciones n
      JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
      JOIN Clientes c ON u.IdUsuario = c.IdUsuario
      WHERE c.IdCliente = ? AND n.Estado = 'Activa'
      ORDER BY n.Prioridad DESC, n.FechaCreacion DESC`,
      [idCliente],
    )
  },

  // Obtener notificaciones por tipo
  getByTipo: async (tipo) => {
    return await query(
      `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
      u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Notificaciones n
      LEFT JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      LEFT JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
      WHERE n.TipoNotificacion = ? AND n.Estado = 'Activa'
      ORDER BY n.FechaCreacion DESC`,
      [tipo],
    )
  },

 // Obtener notificaciones no leídas por usuario
 getUnread: async (idUsuario) => {
  return await query(
    `SELECT n.*, nu.Estado, nu.FechaVista, nu.FechaResuelta,
    u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
    FROM Notificaciones n
    JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
    JOIN Usuarios u ON nu.IdUsuario = u.IdUsuario
    WHERE nu.IdUsuario = ? AND nu.Estado = 'Pendiente' AND n.Estado = 'Activa'
    ORDER BY n.Prioridad DESC, n.FechaCreacion DESC`,
    [idUsuario],
  )
},

  // Marcar todas las notificaciones como leídas para un usuario
  markAllAsRead: async (idUsuario) => {
    const result = await query(
      `UPDATE NotificacionesUsuarios 
      SET Estado = 'Vista', FechaVista = NOW() 
      WHERE IdUsuario = ? AND Estado = 'Pendiente'`,
      [idUsuario],
    )
    return { affectedRows: result.affectedRows }
  },

  // Eliminar notificaciones antiguas (ahora las marca como archivadas)
  deleteOld: async (days) => {
    const date = new Date()
    date.setDate(date.getDate() - days)

    const result = await query(
      `UPDATE Notificaciones SET Estado = 'Archivada' 
      WHERE FechaCreacion < ? AND Estado = 'Activa'`,
      [date],
    )

    return { affectedRows: result.affectedRows }
  },

  // Obtener conteo de notificaciones no leídas por usuario
  getUnreadCount: async (idUsuario) => {
    const result = await query(
      `SELECT COUNT(*) as count
      FROM Notificaciones n
      JOIN NotificacionesUsuarios nu ON n.IdNotificacion = nu.IdNotificacion
      WHERE nu.IdUsuario = ? AND nu.Estado = 'Pendiente' AND n.Estado = 'Activa'`,
      [idUsuario],
    )
    return result[0].count
  },

  // ✅ Actualizar estado de una notificación (aprobada/rechazada) para todos los usuarios asignados
  updateStatus: async (idNotificacion, nuevoEstado, motivo = null) => {
    // 1. Actualiza el estado general de la notificación
    await query(
      `UPDATE Notificaciones 
       SET Estado = ? 
       WHERE IdNotificacion = ?`,
      [nuevoEstado, idNotificacion]
    );

    // 2. Marca la notificación de usuario como resuelta
    await query(
      `UPDATE NotificacionesUsuarios 
       SET Estado = 'Resuelta', FechaResuelta = NOW() 
       WHERE IdNotificacion = ?`,
      [idNotificacion]
    );

    // Opcional: guardar motivo de rechazo
    if (motivo) {
      console.log(`Motivo de rechazo para notificación ${idNotificacion}: ${motivo}`);
      // Puedes guardar el motivo si lo necesitas en una columna o en otra tabla.
    }

    return { idNotificacion, nuevoEstado };
  },
}

export default {
  notificaciones: notificacionesModel,
}
