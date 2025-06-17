// Validaciones para el módulo de notificaciones
export const notificationsValidations = {
  // Validar datos básicos de notificación
  validateNotificationData: (data) => {
    const errors = []

    if (!data.Titulo || data.Titulo.trim() === "") {
      errors.push("El título es requerido")
    } else if (data.Titulo.length > 100) {
      errors.push("El título no puede exceder 100 caracteres")
    }

    if (!data.Mensaje || data.Mensaje.trim() === "") {
      errors.push("El mensaje es requerido")
    } else if (data.Mensaje.length > 1000) {
      errors.push("El mensaje no puede exceder 1000 caracteres")
    }

    if (!data.TipoNotificacion) {
      errors.push("El tipo de notificación es requerido")
    } else {
      const tiposValidos = [
        "StockBajo",
        "Vencimiento",
        "Comprobante",
        "ReseñaProducto",
        "ReseñaServicio",
        "ReseñaGeneral",
        "Cita",
        "AnulacionVenta",
      ]
      if (!tiposValidos.includes(data.TipoNotificacion)) {
        errors.push(`Tipo de notificación no válido. Debe ser uno de: ${tiposValidos.join(", ")}`)
      }
    }

    // Validar prioridad si se proporciona
    if (data.Prioridad) {
      const prioridadesValidas = ["Baja", "Media", "Alta"]
      if (!prioridadesValidas.includes(data.Prioridad)) {
        errors.push(`Prioridad no válida. Debe ser uno de: ${prioridadesValidas.join(", ")}`)
      }
    }

    // Validar estado si se proporciona
    if (data.Estado) {
      const estadosValidos = ["Activa", "Archivada"]
      if (!estadosValidos.includes(data.Estado)) {
        errors.push(`Estado no válido. Debe ser uno de: ${estadosValidos.join(", ")}`)
      }
    }

    // Validar TablaReferencia e IdReferencia
    if (data.TablaReferencia && data.TablaReferencia.length > 50) {
      errors.push("La tabla de referencia no puede exceder 50 caracteres")
    }

    if (data.IdReferencia && (isNaN(data.IdReferencia) || data.IdReferencia < 0)) {
      errors.push("El ID de referencia debe ser un número válido")
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de notificación inválidos" : null,
      errors,
    }
  },

  // Validar destinatarios de notificación
  validateRecipients: (data) => {
    if (!data.IdUsuario && !data.ParaAdmins && !data.ParaTodos) {
      return {
        isValid: false,
        message: "Debe especificar al menos un destinatario: IdUsuario, ParaAdmins o ParaTodos",
      }
    }

    // Validar IdUsuario si se proporciona
    if (data.IdUsuario && (isNaN(data.IdUsuario) || data.IdUsuario <= 0)) {
      return {
        isValid: false,
        message: "El ID de usuario debe ser un número válido mayor a 0",
      }
    }

    return { isValid: true }
  },

  // Validar existencia de notificación
  validateNotificationExists: async (id) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return {
          isValid: false,
          message: "ID de notificación inválido",
        }
      }

      const { notificacionesModel } = await import("../../Models/NotificationService/notifications.model.js")
      const notificacion = await notificacionesModel.getById(id)

      if (!notificacion) {
        return {
          isValid: false,
          message: "Notificación no encontrada",
        }
      }

      return {
        isValid: true,
        notificacion,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar notificación",
        error: error.message,
      }
    }
  },

  // Validar existencia de usuario
  validateUserExists: async (idUsuario) => {
    try {
      if (!idUsuario || isNaN(idUsuario) || idUsuario <= 0) {
        return {
          isValid: false,
          message: "ID de usuario inválido",
        }
      }

      const { usuariosModel } = await import("../../Models/AuthService/auth.model.js")
      const usuario = await usuariosModel.getById(idUsuario)

      if (!usuario) {
        return {
          isValid: false,
          message: "Usuario no encontrado",
        }
      }

      return {
        isValid: true,
        usuario,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar usuario",
        error: error.message,
      }
    }
  },

  // Validar días para eliminar notificaciones antiguas
  validateDaysForDeletion: (days) => {
    const daysNum = Number.parseInt(days)

    if (isNaN(daysNum) || daysNum < 1) {
      return {
        isValid: false,
        message: "El número de días debe ser un número válido mayor a 0",
      }
    }

    if (daysNum > 365) {
      return {
        isValid: false,
        message: "El número de días no puede ser mayor a 365",
      }
    }

    return {
      isValid: true,
      daysNum,
    }
  },

  // Validar tipo de notificación
  validateNotificationType: (tipo) => {
    const tiposValidos = [
      "StockBajo",
      "Vencimiento",
      "Comprobante",
      "ReseñaProducto",
      "ReseñaServicio",
      "ReseñaGeneral",
      "Cita",
      "AnulacionVenta",
    ]

    if (!tipo || typeof tipo !== "string") {
      return {
        isValid: false,
        message: "Tipo de notificación es requerido",
        tiposValidos,
      }
    }

    if (!tiposValidos.includes(tipo)) {
      return {
        isValid: false,
        message: "Tipo de notificación no válido",
        tiposValidos,
      }
    }

    return { isValid: true }
  },

  // Validar estado de notificación de usuario
  validateNotificationUserStatus: (estado) => {
    const estadosValidos = ["Pendiente", "Vista", "Resuelta"]

    if (!estado || typeof estado !== "string") {
      return {
        isValid: false,
        message: "Estado de notificación es requerido",
        estadosValidos,
      }
    }

    if (!estadosValidos.includes(estado)) {
      return {
        isValid: false,
        message: "Estado de notificación no válido",
        estadosValidos,
      }
    }

    return { isValid: true }
  },

  // Validar parámetros de paginación
  validatePaginationParams: (page, limit) => {
    const pageNum = Number.parseInt(page) || 1
    const limitNum = Number.parseInt(limit) || 10

    if (pageNum < 1) {
      return {
        isValid: false,
        message: "El número de página debe ser mayor a 0",
      }
    }

    if (limitNum < 1 || limitNum > 100) {
      return {
        isValid: false,
        message: "El límite debe estar entre 1 y 100",
      }
    }

    return {
      isValid: true,
      page: pageNum,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    }
  },
}

// Reglas de negocio para notificaciones
export const notificationsBusinessRules = {
  // Determinar si se debe enviar correo
  shouldSendEmail: (notificacionData) => {
    return notificacionData.EnviarCorreo === true
  },

  // Determinar prioridad de notificación basada en tipo
  determinePriority: (tipoNotificacion) => {
    const highPriorityTypes = ["StockBajo", "Vencimiento", "AnulacionVenta"]
    const lowPriorityTypes = ["ReseñaGeneral", "ReseñaProducto", "ReseñaServicio"]

    if (highPriorityTypes.includes(tipoNotificacion)) {
      return "Alta"
    } else if (lowPriorityTypes.includes(tipoNotificacion)) {
      return "Baja"
    }

    return "Media" // Prioridad por defecto
  },

  // Determinar si una notificación puede ser eliminada
  canDeleteNotification: (notificacion) => {
    // No se pueden eliminar notificaciones de alta prioridad que no han sido resueltas
    if (notificacion.Prioridad === "Alta" && notificacion.Estado === "Activa") {
      return {
        canDelete: false,
        message: "No se pueden eliminar notificaciones de alta prioridad que están activas",
      }
    }

    return {
      canDelete: true,
    }
  },

  // Determinar si una notificación puede ser archivada
  canArchiveNotification: (notificacion) => {
    // Solo se pueden archivar notificaciones activas
    if (notificacion.Estado !== "Activa") {
      return {
        canArchive: false,
        message: "Solo se pueden archivar notificaciones activas",
      }
    }

    return {
      canArchive: true,
    }
  },

  // Determinar si se debe crear notificación automática
  shouldCreateAutomaticNotification: (tipo, data) => {
    const automaticTypes = ["StockBajo", "Vencimiento"]
    return automaticTypes.includes(tipo) && data
  },

  // Verificar si el usuario puede ver la notificación
  canUserViewNotification: (notificacion, usuario) => {
    // Los administradores pueden ver todas las notificaciones
    if (usuario.IdRol === 1) {
      return true
    }

    // Los usuarios solo pueden ver sus propias notificaciones
    return notificacion.IdUsuario === usuario.IdUsuario
  },

  // Verificar si el usuario puede modificar la notificación
  canUserModifyNotification: (notificacion, usuario) => {
    // Solo los administradores pueden modificar notificaciones
    if (usuario.IdRol === 1) {
      return true
    }

    // Los usuarios solo pueden marcar como leída/resuelta sus propias notificaciones
    return notificacion.IdUsuario === usuario.IdUsuario
  },
}
