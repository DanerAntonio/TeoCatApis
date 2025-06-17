import { tipoServicioModel, serviciosModel } from "../../../Models/ServiceManagement/service.model.js"
import { query } from "../../../Config/Database.js"

/**
 * Validaciones para el módulo de servicios
 * Equivalente a customersValidations pero para servicios
 */
export const servicesValidations = {
  /**
   * Valida que un tipo de servicio exista
   */
  validateTipoServicioExists: async (id) => {
    try {
      if (!id) {
        return {
          isValid: false,
          message: "ID de tipo de servicio no proporcionado",
        }
      }

      const idNumerico = Number.parseInt(id, 10)
      if (isNaN(idNumerico)) {
        return {
          isValid: false,
          message: `ID de tipo de servicio inválido: ${id}`,
        }
      }

      const tipoServicio = await tipoServicioModel.getById(idNumerico)
      if (!tipoServicio) {
        return {
          isValid: false,
          message: "Tipo de servicio no encontrado",
        }
      }

      return {
        isValid: true,
        tipoServicio,
      }
    } catch (error) {
      console.error("Error al validar existencia de tipo de servicio:", error)
      return {
        isValid: false,
        message: "Error al verificar tipo de servicio",
      }
    }
  },

  /**
   * Valida que un servicio exista
   */
  validateServicioExists: async (id) => {
    try {
      if (!id) {
        return {
          isValid: false,
          message: "ID de servicio no proporcionado",
        }
      }

      const idNumerico = Number.parseInt(id, 10)
      if (isNaN(idNumerico)) {
        return {
          isValid: false,
          message: `ID de servicio inválido: ${id}`,
        }
      }

      const servicio = await serviciosModel.getById(idNumerico)
      if (!servicio) {
        return {
          isValid: false,
          message: "Servicio no encontrado",
        }
      }

      return {
        isValid: true,
        servicio,
      }
    } catch (error) {
      console.error("Error al validar existencia de servicio:", error)
      return {
        isValid: false,
        message: "Error al verificar servicio",
      }
    }
  },

  /**
   * Valida datos de tipo de servicio
   */
  validateTipoServicioData: (data, isUpdate = false) => {
    const errors = []

    // Validar nombre (requerido para crear, opcional para actualizar)
    if (!isUpdate || data.Nombre !== undefined) {
      if (!data.Nombre || typeof data.Nombre !== "string" || !data.Nombre.trim()) {
        errors.push("El nombre del tipo de servicio es requerido")
      } else if (data.Nombre.trim().length > 100) {
        errors.push("El nombre del tipo de servicio no puede exceder 100 caracteres")
      }
    }

    // Validar estado si se proporciona
    if (data.Estado !== undefined) {
      if (typeof data.Estado !== "boolean" && data.Estado !== 0 && data.Estado !== 1) {
        errors.push("El estado debe ser un valor booleano")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de tipo de servicio inválidos" : "Datos válidos",
      errors,
    }
  },

  /**
   * Valida datos de servicio
   */
  validateServicioData: (data, isUpdate = false) => {
    const errors = []

    // Validar nombre (requerido para crear, opcional para actualizar)
    if (!isUpdate || data.Nombre !== undefined) {
      if (!data.Nombre || typeof data.Nombre !== "string" || !data.Nombre.trim()) {
        errors.push("El nombre del servicio es requerido")
      } else if (data.Nombre.trim().length > 100) {
        errors.push("El nombre del servicio no puede exceder 100 caracteres")
      }
    }

    // Validar tipo de servicio (requerido para crear)
    if (!isUpdate || data.IdTipoServicio !== undefined) {
      if (!isUpdate && (!data.IdTipoServicio || isNaN(Number.parseInt(data.IdTipoServicio, 10)))) {
        errors.push("El tipo de servicio es requerido y debe ser un número válido")
      } else if (isUpdate && data.IdTipoServicio && isNaN(Number.parseInt(data.IdTipoServicio, 10))) {
        errors.push("El tipo de servicio debe ser un número válido")
      }
    }

    // Validar precio (requerido para crear)
    if (!isUpdate || data.Precio !== undefined) {
      if (!isUpdate && (data.Precio === undefined || data.Precio === null)) {
        errors.push("El precio es requerido")
      } else if (data.Precio !== undefined && data.Precio !== null) {
        const precio = Number.parseFloat(data.Precio)
        if (isNaN(precio) || precio < 0) {
          errors.push("El precio debe ser un número positivo")
        } else if (precio > 999999.99) {
          errors.push("El precio no puede exceder 999,999.99")
        }
      }
    }

    // Validar duración (requerido para crear)
    if (!isUpdate || data.Duracion !== undefined) {
      if (!isUpdate && (data.Duracion === undefined || data.Duracion === null)) {
        errors.push("La duración es requerida")
      } else if (data.Duracion !== undefined && data.Duracion !== null) {
        const duracion = Number.parseInt(data.Duracion, 10)
        if (isNaN(duracion) || duracion <= 0) {
          errors.push("La duración debe ser un número entero positivo")
        } else if (duracion > 1440) {
          // Máximo 24 horas (1440 minutos)
          errors.push("La duración no puede exceder 1440 minutos (24 horas)")
        }
      }
    }

    // Validar descripción si se proporciona
    if (data.Descripcion !== undefined && data.Descripcion !== null) {
      if (typeof data.Descripcion !== "string") {
        errors.push("La descripción debe ser texto")
      } else if (data.Descripcion.length > 1000) {
        errors.push("La descripción no puede exceder 1000 caracteres")
      }
    }

    // Validar qué incluye si se proporciona
    if (data.Que_incluye !== undefined && data.Que_incluye !== null) {
      if (typeof data.Que_incluye !== "string") {
        errors.push("El campo 'Qué incluye' debe ser texto")
      } else if (data.Que_incluye.length > 300) {
        errors.push("El campo 'Qué incluye' no puede exceder 300 caracteres")
      }
    }

    // Validar estado si se proporciona
    if (data.Estado !== undefined) {
      if (typeof data.Estado !== "boolean" && data.Estado !== 0 && data.Estado !== 1) {
        errors.push("El estado debe ser un valor booleano")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de servicio inválidos" : "Datos válidos",
      errors,
    }
  },

  /**
   * Valida que el nombre de tipo de servicio no esté en uso
   */
  validateTipoServicioNameNotInUse: async (nombre, excludeId = null) => {
    try {
      if (!nombre || !nombre.trim()) {
        return {
          isValid: false,
          message: "Nombre no proporcionado",
        }
      }

      const existingTipo = await tipoServicioModel.getByName(nombre.trim())
      if (existingTipo && (!excludeId || existingTipo.IdTipoServicio !== Number.parseInt(excludeId, 10))) {
        return {
          isValid: false,
          message: "Ya existe un tipo de servicio con ese nombre",
        }
      }

      return {
        isValid: true,
      }
    } catch (error) {
      console.error("Error al validar nombre de tipo de servicio:", error)
      return {
        isValid: false,
        message: "Error al verificar nombre de tipo de servicio",
      }
    }
  },

  /**
   * Valida estado
   */
  validateEstado: (estado) => {
    if (estado === undefined || estado === null) {
      return {
        isValid: false,
        message: "Estado no proporcionado",
      }
    }

    const estadoValido =
      typeof estado === "boolean" || estado === 0 || estado === 1 || estado === "true" || estado === "false"

    if (!estadoValido) {
      return {
        isValid: false,
        message: "Estado inválido. Debe ser true/false o 1/0",
      }
    }

    return {
      isValid: true,
    }
  },

  /**
   * Valida parámetros de búsqueda
   */
  validateSearchParams: (term) => {
    if (!term || typeof term !== "string" || !term.trim()) {
      return {
        isValid: false,
        message: "Término de búsqueda no válido",
      }
    }

    if (term.trim().length < 2) {
      return {
        isValid: false,
        message: "El término de búsqueda debe tener al menos 2 caracteres",
      }
    }

    if (term.trim().length > 100) {
      return {
        isValid: false,
        message: "El término de búsqueda no puede exceder 100 caracteres",
      }
    }

    return {
      isValid: true,
    }
  },
}

/**
 * Reglas de negocio para el módulo de servicios
 * Equivalente a customersBusinessRules pero para servicios
 */
export const servicesBusinessRules = {
  /**
   * Verifica si se puede eliminar un tipo de servicio
   */
  canDeleteTipoServicio: async (id) => {
    try {
      // Verificar si hay servicios asociados
      const servicios = await tipoServicioModel.getServices(id)
      if (servicios.length > 0) {
        return {
          canDelete: false,
          message: `No se puede eliminar el tipo de servicio porque tiene ${servicios.length} servicio(s) asociado(s)`,
          dependencias: {
            servicios: servicios.length,
          },
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      console.error("Error al verificar dependencias de tipo de servicio:", error)
      return {
        canDelete: false,
        message: "Error al verificar dependencias del tipo de servicio",
      }
    }
  },

  /**
   * Verifica si se puede eliminar un servicio
   */
  canDeleteServicio: async (id) => {
    try {
      // Verificar si hay citas asociadas
      const citas = await query(`SELECT COUNT(*) as count FROM Cita_Servicio WHERE IdServicio = ?`, [id])
      const citasCount = citas[0]?.count || 0

      if (citasCount > 0) {
        return {
          canDelete: false,
          message: `No se puede eliminar el servicio porque tiene ${citasCount} cita(s) asociada(s)`,
          dependencias: {
            citas: citasCount,
          },
        }
      }

      // Verificar si hay ventas asociadas
      const ventas = await query(`SELECT COUNT(*) as count FROM DetalleVentasServicios WHERE IdServicio = ?`, [id])
      const ventasCount = ventas[0]?.count || 0

      if (ventasCount > 0) {
        return {
          canDelete: false,
          message: `No se puede eliminar el servicio porque tiene ${ventasCount} venta(s) asociada(s)`,
          dependencias: {
            ventas: ventasCount,
          },
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      console.error("Error al verificar dependencias de servicio:", error)
      return {
        canDelete: false,
        message: "Error al verificar dependencias del servicio",
      }
    }
  },

  /**
   * Verifica si se puede cambiar el estado de un tipo de servicio
   */
  canChangeTipoServicioStatus: async (id, nuevoEstado) => {
    try {
      // Si se está desactivando, verificar que no tenga servicios activos
      if (!nuevoEstado) {
        const serviciosActivos = await query(
          `SELECT COUNT(*) as count FROM Servicios WHERE IdTipoServicio = ? AND Estado = 1`,
          [id],
        )
        const count = serviciosActivos[0]?.count || 0

        if (count > 0) {
          return {
            canChange: false,
            message: `No se puede desactivar el tipo de servicio porque tiene ${count} servicio(s) activo(s)`,
            dependencias: {
              serviciosActivos: count,
            },
          }
        }
      }

      return {
        canChange: true,
      }
    } catch (error) {
      console.error("Error al verificar cambio de estado de tipo de servicio:", error)
      return {
        canChange: false,
        message: "Error al verificar cambio de estado",
      }
    }
  },

  /**
   * Verifica si se puede cambiar el estado de un servicio
   */
  canChangeServicioStatus: async (id, nuevoEstado) => {
    try {
      // Si se está desactivando, verificar que no tenga citas futuras
      if (!nuevoEstado) {
        const citasFuturas = await query(
          `SELECT COUNT(*) as count FROM AgendamientoDeCitas ac
           JOIN Cita_Servicio cs ON ac.IdCita = cs.IdCita
           WHERE cs.IdServicio = ? AND ac.Fecha > NOW() AND ac.Estado = 'Programada'`,
          [id],
        )
        const count = citasFuturas[0]?.count || 0

        if (count > 0) {
          return {
            canChange: false,
            message: `No se puede desactivar el servicio porque tiene ${count} cita(s) futura(s) programada(s)`,
            dependencias: {
              citasFuturas: count,
            },
          }
        }
      }

      return {
        canChange: true,
      }
    } catch (error) {
      console.error("Error al verificar cambio de estado de servicio:", error)
      return {
        canChange: false,
        message: "Error al verificar cambio de estado",
      }
    }
  },

  /**
   * Valida reglas de precio
   */
  validatePricingRules: (precio, tipoServicio) => {
    // Aquí se pueden agregar reglas específicas de precios según el tipo
    const warnings = []

    if (precio < 10) {
      warnings.push("El precio es muy bajo, verifique si es correcto")
    }

    if (precio > 500) {
      warnings.push("El precio es alto, verifique si es correcto")
    }

    return {
      isValid: true,
      warnings,
    }
  },

  /**
   * Valida reglas de duración
   */
  validateDurationRules: (duracion, tipoServicio) => {
    const warnings = []

    if (duracion < 15) {
      warnings.push("La duración es muy corta, verifique si es correcta")
    }

    if (duracion > 480) {
      // Más de 8 horas
      warnings.push("La duración es muy larga, verifique si es correcta")
    }

    return {
      isValid: true,
      warnings,
    }
  },
}

export default {
  servicesValidations,
  servicesBusinessRules,
}
