import crypto from "crypto"
import { notificationsBusinessRules } from "../Notificaciones/Notifications.js"

// Funciones auxiliares para notificaciones
export const notificationsHelpers = {
  // Procesar datos de notificación para base de datos
  processNotificationDataForDB: (notificacionData) => {
    return {
      TipoNotificacion: notificacionData.TipoNotificacion,
      Titulo: notificacionData.Titulo.trim(),
      Mensaje: notificacionData.Mensaje.trim(),
      TablaReferencia: notificacionData.TablaReferencia || "",
      IdReferencia: notificacionData.IdReferencia || 0,
      Prioridad:
        notificacionData.Prioridad || notificationsBusinessRules.determinePriority(notificacionData.TipoNotificacion),
      Estado: notificacionData.Estado || "Activa",
      FechaCreacion: new Date(),
    }
  },

  // Formatear datos de notificación para respuesta
  formatNotificationResponse: (notificacion) => {
    if (!notificacion) return null

    return {
      ...notificacion,
      FechaCreacion: notificacion.FechaCreacion ? new Date(notificacion.FechaCreacion).toISOString() : null,
      FechaVista: notificacion.FechaVista ? new Date(notificacion.FechaVista).toISOString() : null,
      FechaResuelta: notificacion.FechaResuelta ? new Date(notificacion.FechaResuelta).toISOString() : null,
      // Agregar campos calculados
      esReciente: notificacion.FechaCreacion
        ? notificationsHelpers.isRecentNotification(notificacion.FechaCreacion)
        : false,
      tiempoTranscurrido: notificacion.FechaCreacion
        ? notificationsHelpers.getTimeElapsed(notificacion.FechaCreacion)
        : null,
    }
  },

  // ✅ CORRECCIÓN: Obtener destinatarios para notificación con manejo de getByRol mejorado
  getNotificationRecipients: async (notificacionData) => {
    try {
      const { usuariosModel } = await import("../../../Models/AuthService/auth.model.js")
      let recipients = []

      // Si es para un usuario específico
      if (notificacionData.IdUsuario) {
        const usuario = await usuariosModel.getById(notificacionData.IdUsuario)
        if (usuario && usuario.Estado) {
          recipients.push({
            id: usuario.IdUsuario,
            email: usuario.Correo,
            nombre: usuario.Nombre,
            apellido: usuario.Apellido,
            rol: usuario.IdRol,
          })
        }
      }
      // Si es para todos los administradores
      else if (notificacionData.ParaAdmins) {
        try {
          // ✅ CORRECCIÓN: Intentar usar getByRol, si no existe usar alternativa
          let admins = []
          if (typeof usuariosModel.getByRol === "function") {
            admins = await usuariosModel.getByRol(1) // Obtener administradores (rol 1)
          } else {
            // ✅ ALTERNATIVA: Si no existe getByRol, usar getAll con filtro
            const allUsers = await usuariosModel.getAll()
            admins = allUsers.filter((user) => user.IdRol === 1)
          }

          recipients = admins
            .filter((admin) => admin.Estado) // Solo administradores activos
            .map((admin) => ({
              id: admin.IdUsuario,
              email: admin.Correo,
              nombre: admin.Nombre,
              apellido: admin.Apellido,
              rol: admin.IdRol,
            }))
        } catch (adminError) {
          console.error("Error al obtener administradores:", adminError)
          // Continuar sin administradores si hay error
        }
      }
      // Si es para todos los usuarios
      else if (notificacionData.ParaTodos) {
        const usuarios = await usuariosModel.getAll()
        recipients = usuarios
          .filter((usuario) => usuario.Estado) // Solo usuarios activos
          .map((usuario) => ({
            id: usuario.IdUsuario,
            email: usuario.Correo,
            nombre: usuario.Nombre,
            apellido: usuario.Apellido,
            rol: usuario.IdRol,
          }))
      }

      return recipients
    } catch (error) {
      console.error("Error al obtener destinatarios:", error)
      return []
    }
  },

  // Calcular fecha para eliminar notificaciones antiguas
  calculateOldNotificationsDate: (days) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
  },

  // Verificar si una notificación es reciente (últimas 24 horas)
  isRecentNotification: (fechaCreacion) => {
    const now = new Date()
    const notificationDate = new Date(fechaCreacion)
    const diffInHours = (now - notificationDate) / (1000 * 60 * 60)
    return diffInHours <= 24
  },

  // Obtener tiempo transcurrido desde la creación
  getTimeElapsed: (fechaCreacion) => {
    const now = new Date()
    const notificationDate = new Date(fechaCreacion)
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60))

    if (diffInMinutes < 1) {
      return "Hace menos de un minuto"
    } else if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? "s" : ""}`
    } else if (diffInMinutes < 1440) {
      // 24 horas
      const hours = Math.floor(diffInMinutes / 60)
      return `Hace ${hours} hora${hours > 1 ? "s" : ""}`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `Hace ${days} día${days > 1 ? "s" : ""}`
    }
  },

  // Generar ID único para notificación
  generateNotificationId: () => {
    return crypto.randomBytes(16).toString("hex")
  },

  // Agrupar notificaciones por tipo
  groupNotificationsByType: (notificaciones) => {
    return notificaciones.reduce((groups, notificacion) => {
      const tipo = notificacion.TipoNotificacion
      if (!groups[tipo]) {
        groups[tipo] = []
      }
      groups[tipo].push(notificacion)
      return groups
    }, {})
  },

  // Filtrar notificaciones por estado
  filterNotificationsByStatus: (notificaciones, estado) => {
    return notificaciones.filter((notificacion) => notificacion.Estado === estado)
  },

  // Ordenar notificaciones por prioridad y fecha
  sortNotificationsByPriority: (notificaciones) => {
    const priorityOrder = { Alta: 3, Media: 2, Baja: 1 }

    return notificaciones.sort((a, b) => {
      // Primero por prioridad
      const priorityDiff = priorityOrder[b.Prioridad] - priorityOrder[a.Prioridad]
      if (priorityDiff !== 0) return priorityDiff

      // Luego por fecha (más recientes primero)
      return new Date(b.FechaCreacion) - new Date(a.FechaCreacion)
    })
  },

  // Crear datos para notificación de usuario
  createNotificationUserData: (idNotificacion, idUsuario, estado = "Pendiente") => {
    return {
      IdNotificacion: idNotificacion,
      IdUsuario: idUsuario,
      Estado: estado,
      FechaVista: estado === "Vista" || estado === "Resuelta" ? new Date() : null,
      FechaResuelta: estado === "Resuelta" ? new Date() : null,
    }
  },

  // Procesar notificaciones masivas
  processBulkNotifications: async (notificaciones, recipients) => {
    const results = {
      created: 0,
      failed: 0,
      errors: [],
    }

    try {
      const { notificacionesModel } = await import("../../../Models/NotificationService/notifications.model.js")

      for (const notificacionData of notificaciones) {
        try {
          // Crear la notificación principal
          const notificacion = await notificacionesModel.create(notificacionData)

          // Crear registros para cada destinatario
          for (const recipient of recipients) {
            const userData = notificationsHelpers.createNotificationUserData(notificacion.IdNotificacion, recipient.id)
            await notificacionesModel.createUserNotification(userData)
          }

          results.created++
        } catch (error) {
          results.failed++
          results.errors.push({
            notificacion: notificacionData.Titulo,
            error: error.message,
          })
        }
      }
    } catch (error) {
      console.error("Error en procesamiento masivo:", error)
      results.errors.push({
        general: error.message,
      })
    }

    return results
  },

  // Limpiar notificaciones antiguas automáticamente
  cleanupOldNotifications: async (daysToKeep = 30) => {
    try {
      const { notificacionesModel } = await import("../../../Models/NotificationService/notifications.model.js")
      const cutoffDate = notificationsHelpers.calculateOldNotificationsDate(daysToKeep)

      const result = await notificacionesModel.deleteOld(daysToKeep)

      console.log(`Limpieza automática completada: ${result.deletedCount} notificaciones eliminadas`)
      return result
    } catch (error) {
      console.error("Error en limpieza automática:", error)
      throw error
    }
  },

  // Obtener estadísticas de notificaciones
  getNotificationStats: async (idUsuario = null) => {
    try {
      const { notificacionesModel } = await import("../../../Models/NotificationService/notifications.model.js")

      const stats = {
        total: 0,
        pendientes: 0,
        vistas: 0,
        resueltas: 0,
        porTipo: {},
        porPrioridad: {
          Alta: 0,
          Media: 0,
          Baja: 0,
        },
      }

      if (idUsuario) {
        // Estadísticas para un usuario específico
        const notificaciones = await notificacionesModel.getByUsuario(idUsuario)
        stats.total = notificaciones.length

        notificaciones.forEach((notif) => {
          // Contar por estado
          if (notif.Estado === "Pendiente") stats.pendientes++
          else if (notif.Estado === "Vista") stats.vistas++
          else if (notif.Estado === "Resuelta") stats.resueltas++

          // Contar por tipo
          if (!stats.porTipo[notif.TipoNotificacion]) {
            stats.porTipo[notif.TipoNotificacion] = 0
          }
          stats.porTipo[notif.TipoNotificacion]++

          // Contar por prioridad
          if (stats.porPrioridad[notif.Prioridad] !== undefined) {
            stats.porPrioridad[notif.Prioridad]++
          }
        })
      } else {
        // Estadísticas generales
        const todasNotificaciones = await notificacionesModel.getAll()
        stats.total = todasNotificaciones.length

        todasNotificaciones.forEach((notif) => {
          // Contar por tipo
          if (!stats.porTipo[notif.TipoNotificacion]) {
            stats.porTipo[notif.TipoNotificacion] = 0
          }
          stats.porTipo[notif.TipoNotificacion]++

          // Contar por prioridad
          if (stats.porPrioridad[notif.Prioridad] !== undefined) {
            stats.porPrioridad[notif.Prioridad]++
          }
        })
      }

      return stats
    } catch (error) {
      console.error("Error al obtener estadísticas:", error)
      return null
    }
  },

  // Formatear notificaciones para dashboard
  formatNotificationsForDashboard: (notificaciones) => {
    return notificaciones.map((notif) => ({
      id: notif.IdNotificacion,
      titulo: notif.Titulo,
      mensaje: notif.Mensaje.length > 100 ? notif.Mensaje.substring(0, 100) + "..." : notif.Mensaje,
      tipo: notif.TipoNotificacion,
      prioridad: notif.Prioridad,
      estado: notif.Estado,
      fechaCreacion: notif.FechaCreacion,
      esReciente: notificationsHelpers.isRecentNotification(notif.FechaCreacion),
      tiempoTranscurrido: notificationsHelpers.getTimeElapsed(notif.FechaCreacion),
    }))
  },
}
