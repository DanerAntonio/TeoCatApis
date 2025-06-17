import { citasModel, citaServicioModel } from "../../../Models/AppointmentService/appointment.model.js"
import { query } from "../../../Config/Database.js"

/**
 * Validaciones para el módulo de citas - CORREGIDO para coincidir con BD
 */
export const appointmentValidations = {
  /**
   * Valida que una cita exista
   */
  validateCitaExists: async (id) => {
    try {
      if (!id) {
        return {
          isValid: false,
          message: "ID de cita no proporcionado",
        }
      }

      const idNumerico = Number.parseInt(id, 10)
      if (isNaN(idNumerico)) {
        return {
          isValid: false,
          message: `ID de cita inválido: ${id}`,
        }
      }

      const cita = await citasModel.getById(idNumerico)
      if (!cita) {
        return {
          isValid: false,
          message: "Cita no encontrada",
        }
      }

      return {
        isValid: true,
        cita,
      }
    } catch (error) {
      console.error("Error al validar existencia de cita:", error)
      return {
        isValid: false,
        message: "Error al verificar cita",
      }
    }
  },

  /**
   * Valida que un cliente exista
   */
  validateClienteExists: async (id) => {
    try {
      if (!id) {
        return {
          isValid: false,
          message: "ID de cliente no proporcionado",
        }
      }

      const idNumerico = Number.parseInt(id, 10)
      if (isNaN(idNumerico)) {
        return {
          isValid: false,
          message: `ID de cliente inválido: ${id}`,
        }
      }

      const clientes = await query("SELECT * FROM Clientes WHERE IdCliente = ?", [idNumerico])
      const cliente = clientes[0]

      if (!cliente) {
        return {
          isValid: false,
          message: "Cliente no encontrado",
        }
      }

      return {
        isValid: true,
        cliente,
      }
    } catch (error) {
      console.error("Error al validar existencia de cliente:", error)
      return {
        isValid: false,
        message: "Error al verificar cliente",
      }
    }
  },

  /**
   * Valida que una mascota exista
   */
  validateMascotaExists: async (id) => {
    try {
      if (!id) {
        return {
          isValid: false,
          message: "ID de mascota no proporcionado",
        }
      }

      const idNumerico = Number.parseInt(id, 10)
      if (isNaN(idNumerico)) {
        return {
          isValid: false,
          message: `ID de mascota inválido: ${id}`,
        }
      }

      const mascotas = await query("SELECT * FROM Mascotas WHERE IdMascota = ?", [idNumerico])
      const mascota = mascotas[0]

      if (!mascota) {
        return {
          isValid: false,
          message: "Mascota no encontrada",
        }
      }

      return {
        isValid: true,
        mascota,
      }
    } catch (error) {
      console.error("Error al validar existencia de mascota:", error)
      return {
        isValid: false,
        message: "Error al verificar mascota",
      }
    }
  },

  /**
   * Valida datos de cita
   */
  validateCitaData: (data, isUpdate = false) => {
    const errors = []

    // Validar fecha (requerida para crear, opcional para actualizar)
    if (!isUpdate || data.Fecha !== undefined) {
      if (!isUpdate && !data.Fecha) {
        errors.push("La fecha es requerida")
      } else if (data.Fecha) {
        const fecha = new Date(data.Fecha)
        if (isNaN(fecha.getTime())) {
          errors.push("Formato de fecha inválido")
        } else {
          // Solo validar que no sea en años anteriores
          const añoActual = new Date().getFullYear()
          const añoCita = fecha.getFullYear()
          if (añoCita < añoActual) {
            errors.push("No se pueden agendar citas en años anteriores")
          }
        }
      }
    }

    // Validar tipo de cita
    const tipoValidation = appointmentValidations.validateTipoCita(data)
    if (!tipoValidation.isValid) {
      errors.push(tipoValidation.message)
    }

    // Validar campos temporales si se proporcionan
    if (data.NombreClienteTemporal !== undefined) {
      if (data.NombreClienteTemporal && data.NombreClienteTemporal.trim().length > 100) {
        errors.push("El nombre del cliente temporal no puede exceder 100 caracteres")
      }
    }

    if (data.TelefonoClienteTemporal !== undefined) {
      if (data.TelefonoClienteTemporal && data.TelefonoClienteTemporal.trim().length > 100) {
        errors.push("El teléfono del cliente temporal no puede exceder 100 caracteres")
      }
    }

    if (data.DocumentoClienteTemporal !== undefined) {
      if (data.DocumentoClienteTemporal && data.DocumentoClienteTemporal.trim().length > 20) {
        errors.push("El documento del cliente temporal no puede exceder 20 caracteres")
      }
    }

    if (data.NombreMascotaTemporal !== undefined) {
      if (data.NombreMascotaTemporal && data.NombreMascotaTemporal.trim().length > 100) {
        errors.push("El nombre de la mascota temporal no puede exceder 100 caracteres")
      }
    }

    if (data.EspecieMascotaTemporal !== undefined) {
      if (data.EspecieMascotaTemporal && data.EspecieMascotaTemporal.trim().length > 50) {
        errors.push("La especie de la mascota temporal no puede exceder 50 caracteres")
      }
    }

    if (data.RazaMascotaTemporal !== undefined) {
      if (data.RazaMascotaTemporal && data.RazaMascotaTemporal.trim().length > 50) {
        errors.push("La raza de la mascota temporal no puede exceder 50 caracteres")
      }
    }

    if (data.TamañoMascotaTemporal !== undefined) {
      const tamañosValidos = ["Pequeño", "Mediano", "Grande"]
      if (data.TamañoMascotaTemporal && !tamañosValidos.includes(data.TamañoMascotaTemporal)) {
        errors.push(`El tamaño debe ser uno de: ${tamañosValidos.join(", ")}`)
      }
    }

    // Validar notas si se proporcionan
    if (data.Notas !== undefined && data.Notas !== null) {
      if (typeof data.Notas !== "string") {
        errors.push("Las notas deben ser texto")
      } else if (data.Notas.length > 1000) {
        errors.push("Las notas no pueden exceder 1000 caracteres")
      }
    }

    if (data.NotasAdicionales !== undefined && data.NotasAdicionales !== null) {
      if (typeof data.NotasAdicionales !== "string") {
        errors.push("Las notas adicionales deben ser texto")
      } else if (data.NotasAdicionales.length > 1000) {
        errors.push("Las notas adicionales no pueden exceder 1000 caracteres")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de cita inválidos" : "Datos válidos",
      errors,
    }
  },

  /**
   * Valida tipo de cita (registrada vs temporal)
   */
  validateTipoCita: (data) => {
    const tieneClienteRegistrado = data.IdCliente
    const tieneMascotaRegistrada = data.IdMascota
    const tieneClienteTemporal = data.NombreClienteTemporal
    const tieneMascotaTemporal = data.NombreMascotaTemporal

    // Debe tener al menos un cliente (registrado o temporal)
    if (!tieneClienteRegistrado && !tieneClienteTemporal) {
      return {
        isValid: false,
        message: "Debe especificar un cliente registrado o datos de cliente temporal",
      }
    }

    // Debe tener al menos una mascota (registrada o temporal)
    if (!tieneMascotaRegistrada && !tieneMascotaTemporal) {
      return {
        isValid: false,
        message: "Debe especificar una mascota registrada o datos de mascota temporal",
      }
    }

    return {
      isValid: true,
    }
  },

  /**
   * Valida que la mascota pertenezca al cliente
   */
  validateMascotaBelongsToCliente: (mascota, idCliente) => {
    if (!mascota || !idCliente) {
      return {
        isValid: false,
        message: "Datos insuficientes para validar relación mascota-cliente",
      }
    }

    if (mascota.IdCliente !== Number.parseInt(idCliente, 10)) {
      return {
        isValid: false,
        message: "La mascota no pertenece al cliente especificado",
      }
    }

    return {
      isValid: true,
    }
  },

  /**
   * Valida estado
   */
  validateEstado: (estado) => {
    const estadosValidos = ["Programada", "Completada", "Cancelada"]

    if (!estado) {
      return {
        isValid: false,
        message: "Estado no proporcionado",
        estadosValidos,
      }
    }

    if (!estadosValidos.includes(estado)) {
      return {
        isValid: false,
        message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}`,
        estadosValidos,
      }
    }

    return {
      isValid: true,
    }
  },

  /**
   * Valida formato de fecha
   */
  validateDateFormat: (fecha) => {
    if (!fecha) {
      return {
        isValid: false,
        message: "Fecha no proporcionada",
      }
    }

    const date = new Date(fecha)
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: "Formato de fecha inválido",
      }
    }

    return {
      isValid: true,
    }
  },

  /**
   * Valida rango de fechas
   */
  validateDateRange: (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) {
      return {
        isValid: false,
        message: "Fechas de inicio y fin son requeridas",
      }
    }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return {
        isValid: false,
        message: "Formato de fechas inválido",
      }
    }

    if (inicio > fin) {
      return {
        isValid: false,
        message: "La fecha de inicio no puede ser mayor que la fecha de fin",
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
 * Reglas de negocio para el módulo de citas - CORREGIDO
 */
export const appointmentBusinessRules = {
  /**
   * Verifica si se puede eliminar una cita
   */
  canDeleteCita: async (id) => {
    try {
      // Verificar si la cita está completada
      const cita = await citasModel.getById(id)
      if (cita && cita.Estado === "Completada") {
        return {
          canDelete: false,
          message: "No se puede eliminar una cita completada",
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      console.error("Error al verificar si se puede eliminar cita:", error)
      return {
        canDelete: false,
        message: "Error al verificar dependencias de la cita",
      }
    }
  },

  /**
   * Verifica si se puede cambiar el estado de una cita
   */
  canChangeStatus: async (id, nuevoEstado) => {
    try {
      const cita = await citasModel.getById(id)
      if (!cita) {
        return {
          canChange: false,
          message: "Cita no encontrada",
        }
      }

      const estadoActual = cita.Estado

      // Reglas de transición de estados
      const transicionesValidas = {
        Programada: ["Completada", "Cancelada"],
        Completada: [], // No se puede cambiar desde completada
        Cancelada: ["Programada"], // Solo se puede reprogramar
      }

      if (!transicionesValidas[estadoActual].includes(nuevoEstado)) {
        return {
          canChange: false,
          message: `No se puede cambiar de ${estadoActual} a ${nuevoEstado}`,
        }
      }

      return {
        canChange: true,
      }
    } catch (error) {
      console.error("Error al verificar cambio de estado:", error)
      return {
        canChange: false,
        message: "Error al verificar cambio de estado",
      }
    }
  },

  /**
   * Valida disponibilidad de horario (simplificado - sin restricciones de horario)
   */
  validateDisponibilidad: async (fecha, excludeCitaId = null) => {
    try {
      // Solo verificar que no sea en años anteriores
      const fechaObj = new Date(fecha)
      const añoActual = new Date().getFullYear()
      const añoCita = fechaObj.getFullYear()

      if (añoCita < añoActual) {
        return {
          isAvailable: false,
          message: "No se pueden agendar citas en años anteriores",
        }
      }

      // Verificar disponibilidad básica (no hay otra cita en la misma fecha/hora exacta)
      const disponible = await citasModel.checkDisponibilidad(fecha, excludeCitaId)

      if (!disponible) {
        return {
          isAvailable: false,
          message: "Ya existe una cita en esa fecha y hora exacta",
        }
      }

      return {
        isAvailable: true,
      }
    } catch (error) {
      console.error("Error al validar disponibilidad:", error)
      return {
        isAvailable: false,
        message: "Error al verificar disponibilidad",
      }
    }
  },

  /**
   * Procesa servicios para una cita (solo IDs)
   */
  processServiciosForCita: async (servicios, idCita) => {
    try {
      const serviciosAgregados = []

      for (const servicio of servicios) {
        const idServicio = servicio.IdServicio || servicio.idServicio || servicio.id

        // Crear relación
        const citaServicio = await citaServicioModel.create({
          IdCita: idCita,
          IdServicio: idServicio,
        })

        serviciosAgregados.push(citaServicio)
      }

      return serviciosAgregados
    } catch (error) {
      console.error("Error al procesar servicios para cita:", error)
      throw error
    }
  },
}

export default {
  appointmentValidations,
  appointmentBusinessRules,
}
