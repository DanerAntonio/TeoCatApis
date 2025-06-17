import { citaServicioModel } from "../../../Models/AppointmentService/appointment.model.js"

/**
 * Helpers para el módulo de citas - CORREGIDO para coincidir con BD
 */
export const appointmentHelpers = {
  /**
   * Formatea respuesta de cita
   */
  formatCitaResponse: (cita) => {
    if (!cita) return null

    return {
      IdCita: cita.IdCita,
      IdCliente: cita.IdCliente,
      IdMascota: cita.IdMascota,
      // Datos temporales
      NombreClienteTemporal: cita.NombreClienteTemporal,
      TelefonoClienteTemporal: cita.TelefonoClienteTemporal,
      DocumentoClienteTemporal: cita.DocumentoClienteTemporal,
      NombreMascotaTemporal: cita.NombreMascotaTemporal,
      EspecieMascotaTemporal: cita.EspecieMascotaTemporal,
      RazaMascotaTemporal: cita.RazaMascotaTemporal,
      TamañoMascotaTemporal: cita.TamañoMascotaTemporal,
      // Datos principales
      Notas: cita.Notas,
      Fecha: cita.Fecha,
      NotasAdicionales: cita.NotasAdicionales,
      Estado: cita.Estado,
      // Campos calculados
      TipoCita: appointmentHelpers.determineTipoCita(cita),
      FechaFormateada: appointmentHelpers.formatDateColombian(cita.Fecha),
      HoraFormateada: appointmentHelpers.formatTimeColombian(cita.Fecha),
      ClienteDisplay: appointmentHelpers.getClienteDisplay(cita),
      MascotaDisplay: appointmentHelpers.getMascotaDisplay(cita),
    }
  },

  /**
   * Formatea múltiples citas
   */
  formatCitasResponse: (citas) => {
    if (!Array.isArray(citas)) return []
    return citas.map((cita) => appointmentHelpers.formatCitaResponse(cita))
  },

  /**
   * Procesa datos de cita para BD
   */
  processCitaDataForDB: (data) => {
    const processedData = {
      IdCliente: data.IdCliente ? Number.parseInt(data.IdCliente, 10) : null,
      IdMascota: data.IdMascota ? Number.parseInt(data.IdMascota, 10) : null,
      NombreClienteTemporal: data.NombreClienteTemporal?.trim() || null,
      TelefonoClienteTemporal: data.TelefonoClienteTemporal?.trim() || null,
      DocumentoClienteTemporal: data.DocumentoClienteTemporal?.trim() || null,
      NombreMascotaTemporal: data.NombreMascotaTemporal?.trim() || null,
      EspecieMascotaTemporal: data.EspecieMascotaTemporal?.trim() || null,
      RazaMascotaTemporal: data.RazaMascotaTemporal?.trim() || null,
      TamañoMascotaTemporal: data.TamañoMascotaTemporal || null,
      Notas: data.Notas?.trim() || null,
      Fecha: data.Fecha,
      NotasAdicionales: data.NotasAdicionales?.trim() || null,
      Estado: data.Estado || "Programada",
    }

    return processedData
  },

  /**
   * Determina el tipo de cita
   */
  determineTipoCita: (cita) => {
    if (cita.IdCliente && cita.IdMascota) {
      return "Registrada"
    }
    if (cita.NombreClienteTemporal || cita.NombreMascotaTemporal) {
      return "Temporal"
    }
    return "Mixta"
  },

  /**
   * Obtiene el nombre del cliente para mostrar
   */
  getClienteDisplay: (cita) => {
    if (cita.NombreClienteTemporal) {
      return cita.NombreClienteTemporal
    }
    return "Cliente registrado"
  },

  /**
   * Obtiene el nombre de la mascota para mostrar
   */
  getMascotaDisplay: (cita) => {
    if (cita.NombreMascotaTemporal) {
      return cita.NombreMascotaTemporal
    }
    return "Mascota registrada"
  },

  /**
   * Formatea fecha para Colombia
   */
  formatDateColombian: (fecha) => {
    if (!fecha) return null

    const date = new Date(fecha)
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Bogota",
    })
  },

  /**
   * Formatea hora para Colombia
   */
  formatTimeColombian: (fecha) => {
    if (!fecha) return null

    const date = new Date(fecha)
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
    })
  },

  /**
   * Agrega servicios a las citas
   */
  addServiciosToCitas: async (citas) => {
    if (!Array.isArray(citas)) return []

    return await Promise.all(
      citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita)
        return {
          ...cita,
          servicios: servicios,
        }
      }),
    )
  },

  /**
   * Valida formato de fecha
   */
  validateDateFormat: (fecha) => {
    if (!fecha) return false

    const date = new Date(fecha)
    return !isNaN(date.getTime())
  },

  /**
   * Extrae fecha y hora de datetime
   */
  extractDateAndTime: (datetime) => {
    if (!datetime) return { fecha: null, hora: null }

    const date = new Date(datetime)
    const fecha = date.toISOString().split("T")[0]
    const hora = date.toTimeString().split(" ")[0].substring(0, 5)

    return { fecha, hora }
  },

  /**
   * Normaliza datos de búsqueda
   */
  normalizeSearchTerm: (term) => {
    if (!term || typeof term !== "string") return ""

    return term
      .trim()
      .toLowerCase()
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/[ñ]/g, "n")
  },

  /**
   * Construye query dinámico para actualización
   */
  buildUpdateQuery: (tableName, data, whereClause) => {
    const fields = Object.keys(data).filter((key) => data[key] !== undefined)

    if (fields.length === 0) {
      throw new Error("No hay campos para actualizar")
    }

    const setClause = fields.map((field) => `${field} = ?`).join(", ")
    const values = fields.map((field) => data[field])

    return {
      query: `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
      values,
    }
  },
}

export default {
  appointmentHelpers,
}
