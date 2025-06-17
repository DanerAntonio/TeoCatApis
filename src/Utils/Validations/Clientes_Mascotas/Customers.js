import { query } from "../../../Config/Database.js"
import { clientesModel, mascotasModel, especiesModel } from "../../../Models/CustomerService/customers.model.js"
import { usuariosModel } from "../../../Models/AuthService/auth.model.js"

// Validaciones para el módulo de customers
export const customersValidations = {
  // Validar datos de cliente
  validateClienteData: (data, isUpdate = false) => {
    const errors = []

    // Validaciones para creación y actualización
    if (!isUpdate || data.Nombre !== undefined) {
      if (!data.Nombre || data.Nombre.trim() === "") {
        errors.push("El nombre es requerido")
      } else if (data.Nombre.length < 2) {
        errors.push("El nombre debe tener al menos 2 caracteres")
      } else if (data.Nombre.length > 100) {
        errors.push("El nombre no puede exceder 100 caracteres")
      }
    }

    if (!isUpdate || data.Apellido !== undefined) {
      if (!data.Apellido || data.Apellido.trim() === "") {
        errors.push("El apellido es requerido")
      } else if (data.Apellido.length < 2) {
        errors.push("El apellido debe tener al menos 2 caracteres")
      } else if (data.Apellido.length > 100) {
        errors.push("El apellido no puede exceder 100 caracteres")
      }
    }

    if (!isUpdate || data.Correo !== undefined) {
      if (!data.Correo || data.Correo.trim() === "") {
        errors.push("El correo electrónico es requerido")
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.Correo)) {
          errors.push("El formato del correo electrónico es inválido")
        } else if (data.Correo.length > 100) {
          errors.push("El correo no puede exceder 100 caracteres")
        }
      }
    }

    if (!isUpdate || data.Documento !== undefined) {
      if (data.Documento && data.Documento.length > 20) {
        errors.push("El documento no puede exceder 20 caracteres")
      }
    }

    if (!isUpdate || data.Telefono !== undefined) {
      if (data.Telefono && data.Telefono.length > 300) {
        errors.push("El teléfono no puede exceder 300 caracteres")
      }
    }

    if (!isUpdate || data.Direccion !== undefined) {
      if (data.Direccion && data.Direccion.length > 65535) {
        errors.push("La dirección es demasiado larga")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de cliente inválidos" : null,
      errors,
    }
  },

  // Validar existencia de cliente
  validateClienteExists: async (id) => {
    try {
      const cliente = await clientesModel.getById(id)

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
      return {
        isValid: false,
        message: "Error al verificar cliente",
        error: error.message,
      }
    }
  },

  // ✅ CORRECCIÓN 1: Validar datos de mascota con validación robusta de fecha
  validateMascotaData: (data, isUpdate = false) => {
    const errors = []

    if (!isUpdate || data.Nombre !== undefined) {
      if (!data.Nombre || data.Nombre.trim() === "") {
        errors.push("El nombre de la mascota es requerido")
      } else if (data.Nombre.length < 2) {
        errors.push("El nombre debe tener al menos 2 caracteres")
      } else if (data.Nombre.length > 100) {
        errors.push("El nombre no puede exceder 100 caracteres")
      }
    }

    if (!isUpdate || data.IdCliente !== undefined) {
      if (!isUpdate && (!data.IdCliente || isNaN(data.IdCliente))) {
        errors.push("El cliente es requerido")
      }
    }

    if (!isUpdate || data.IdEspecie !== undefined) {
      if (!isUpdate && (!data.IdEspecie || isNaN(data.IdEspecie))) {
        errors.push("La especie es requerida")
      }
    }

    if (!isUpdate || data.Raza !== undefined) {
      if (data.Raza && data.Raza.length > 50) {
        errors.push("La raza no puede exceder 50 caracteres")
      }
    }

    if (!isUpdate || data.Tamaño !== undefined) {
      const tamañosValidos = ["Pequeño", "Mediano", "Grande"]
      if (data.Tamaño && !tamañosValidos.includes(data.Tamaño)) {
        errors.push(`Tamaño no válido. Debe ser uno de: ${tamañosValidos.join(", ")}`)
      }
    }

    // ✅ MEJORA: Validación completa de fecha de nacimiento
    if (!isUpdate || data.FechaNacimiento !== undefined) {
      if (data.FechaNacimiento) {
        try {
          const fechaNacimiento = new Date(data.FechaNacimiento)
          const hoy = new Date()

          if (isNaN(fechaNacimiento.getTime())) {
            errors.push("Fecha de nacimiento inválida")
          } else {
            if (fechaNacimiento > hoy) {
              errors.push("La fecha de nacimiento no puede ser futura")
            }

            const treintaAñosAtras = new Date()
            treintaAñosAtras.setFullYear(hoy.getFullYear() - 30)
            if (fechaNacimiento < treintaAñosAtras) {
              errors.push("La fecha de nacimiento no puede ser anterior a hace 30 años")
            }
          }
        } catch (error) {
          errors.push("Error al procesar la fecha de nacimiento")
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de mascota inválidos" : null,
      errors,
    }
  },

  // Validar existencia de mascota
  validateMascotaExists: async (id) => {
    try {
      const mascota = await mascotasModel.getById(id)

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
      return {
        isValid: false,
        message: "Error al verificar mascota",
        error: error.message,
      }
    }
  },

  // Validar datos de especie
  validateEspecieData: (data, isUpdate = false) => {
    const errors = []

    if (!isUpdate || data.NombreEspecie !== undefined) {
      if (!data.NombreEspecie || data.NombreEspecie.trim() === "") {
        errors.push("El nombre de la especie es requerido")
      } else if (data.NombreEspecie.length < 2) {
        errors.push("El nombre debe tener al menos 2 caracteres")
      } else if (data.NombreEspecie.length > 50) {
        errors.push("El nombre no puede exceder 50 caracteres")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de especie inválidos" : null,
      errors,
    }
  },

  // Validar existencia de especie
  validateEspecieExists: async (id) => {
    try {
      const especie = await especiesModel.getById(id)

      if (!especie) {
        return {
          isValid: false,
          message: "Especie no encontrada",
        }
      }

      return {
        isValid: true,
        especie,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar especie",
        error: error.message,
      }
    }
  },

  // Validar estado
  validateEstado: (estado) => {
    if (estado === undefined || estado === null) {
      return {
        isValid: false,
        message: "El estado es requerido",
      }
    }

    if (typeof estado !== "boolean") {
      return {
        isValid: false,
        message: "El estado debe ser verdadero o falso",
      }
    }

    return {
      isValid: true,
    }
  },

  // Validar parámetros de búsqueda
  validateSearchParams: (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === "") {
      return {
        isValid: false,
        message: "El término de búsqueda es requerido",
      }
    }

    if (searchTerm.length < 2) {
      return {
        isValid: false,
        message: "El término de búsqueda debe tener al menos 2 caracteres",
      }
    }

    return {
      isValid: true,
    }
  },

  // ✅ CORRECCIÓN 2: Validar correo único para clientes (mejorado)
  validateEmailNotInUse: async (correo, excludeClienteId = null) => {
    try {
      // Verificar en clientes
      const existingClient = await clientesModel.getByEmail(correo)
      if (existingClient && (!excludeClienteId || existingClient.IdCliente !== Number.parseInt(excludeClienteId))) {
        return {
          isValid: false,
          message: "El correo electrónico ya está registrado como cliente",
        }
      }

      // Verificar en usuarios
      const existingUser = await usuariosModel.getByEmail(correo)
      if (existingUser) {
        // Si el usuario existe pero no está asociado a este cliente
        if (!excludeClienteId) {
          // En creación, verificar si el usuario ya tiene cliente asociado
          const clienteAsociado = await clientesModel.getByUsuario(existingUser.IdUsuario)
          if (clienteAsociado) {
            return {
              isValid: false,
              message: "El usuario ya está asociado a otro cliente",
            }
          }
        }
      }

      return { isValid: true, message: null }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar correo",
        error: error.message,
      }
    }
  },

  // Validar documento único para clientes
  validateDocumentoNotInUse: async (documento, excludeClienteId = null) => {
    try {
      const existingClient = await clientesModel.getByDocument(documento)
      if (existingClient && (!excludeClienteId || existingClient.IdCliente !== Number.parseInt(excludeClienteId))) {
        return {
          isValid: false,
          message: "El documento ya está registrado",
        }
      }

      return { isValid: true, message: null }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar documento",
        error: error.message,
      }
    }
  },

  // Validar nombre de especie único
  validateEspecieNameNotInUse: async (nombre, excludeEspecieId = null) => {
    try {
      const especies = await query(`SELECT * FROM Especies WHERE NombreEspecie = ?`, [nombre])
      if (especies.length > 0 && (!excludeEspecieId || especies[0].IdEspecie !== Number.parseInt(excludeEspecieId))) {
        return {
          isValid: false,
          message: "Ya existe una especie con ese nombre",
        }
      }

      return { isValid: true, message: null }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar nombre de especie",
        error: error.message,
      }
    }
  },

  // ✅ NUEVA FUNCIÓN: Validar mascota para servicios (reemplaza procedimiento almacenado)
  validateMascotaForServices: async (mascotaId) => {
    try {
      const mascota = await mascotasModel.getById(mascotaId)

      if (!mascota) {
        return {
          isValid: false,
          message: "Mascota no encontrada",
        }
      }

      if (!mascota.Estado) {
        return {
          isValid: false,
          message: "La mascota no está activa para recibir servicios",
        }
      }

      return {
        isValid: true,
        mascota,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al validar mascota para servicios",
        error: error.message,
      }
    }
  },
}

// ✅ CORRECCIÓN 3: Reglas de negocio para customers (mejoradas)
export const customersBusinessRules = {
  // ✅ IMPLEMENTACIÓN 4: Verificar si se puede eliminar un cliente (reemplaza procedimiento)
  canDeleteCliente: async (clienteId) => {
    try {
      // Verificar mascotas asociadas
      const mascotas = await query(`SELECT * FROM Mascotas WHERE IdCliente = ?`, [clienteId])

      if (mascotas.length > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar el cliente porque tiene mascotas asociadas",
          mascotas,
        }
      }

      // Verificar citas asociadas
      const citas = await query(`SELECT * FROM AgendamientoDeCitas WHERE IdCliente = ?`, [clienteId])

      if (citas.length > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar el cliente porque tiene citas asociadas",
          citas,
        }
      }

      // ✅ MEJORA: Verificar servicios asociados
      const servicios = await query(
        `SELECT dvs.* FROM DetalleVentasServicios dvs
         JOIN Mascotas m ON dvs.IdMascota = m.IdMascota
         WHERE m.IdCliente = ?`,
        [clienteId],
      )

      if (servicios.length > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar el cliente porque tiene servicios asociados a sus mascotas",
          servicios,
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias del cliente",
        error: error.message,
      }
    }
  },

  // ✅ IMPLEMENTACIÓN 5: Verificar si se puede eliminar una mascota (reemplaza procedimiento)
  canDeleteMascota: async (mascotaId) => {
  try {
    // Verificar que la mascota existe
    const mascota = await mascotasModel.getById(mascotaId)
    if (!mascota) {
      return {
        canDelete: false,
        message: "Mascota no encontrada"
      }
    }

    // ✅ NUEVA RESTRICCIÓN: Verificar si es la única mascota del cliente
    const mascotasDelCliente = await query(
      `SELECT COUNT(*) as count FROM Mascotas WHERE IdCliente = ?`, 
      [mascota.IdCliente]
    )
    
    if (mascotasDelCliente[0]?.count <= 1) {
      return {
        canDelete: false,
        message: "No se puede eliminar la mascota porque es la única mascota asociada al cliente"
      }
    }

    // Verificar citas asociadas
    const citas = await query(`SELECT COUNT(*) as count FROM AgendamientoDeCitas WHERE IdMascota = ?`, [mascotaId])
    if (citas[0]?.count > 0) {
      return {
        canDelete: false,
        message: "No se puede eliminar la mascota porque tiene citas asociadas",
        citas: citas[0]?.count
      }
    }

    // Verificar servicios asociados
    const servicios = await query(`SELECT COUNT(*) as count FROM DetalleVentasServicios WHERE IdMascota = ?`, [mascotaId])
    if (servicios[0]?.count > 0) {
      return {
        canDelete: false,
        message: "No se puede eliminar la mascota porque tiene servicios asociados",
        servicios: servicios[0]?.count
      }
    }

    return {
      canDelete: true,
      message: "La mascota puede ser eliminada"
    }
  } catch (error) {
    return {
      canDelete: false,
      message: "Error al verificar dependencias de la mascota",
      error: error.message
    }
  }
},

  // Verificar si se puede eliminar una especie
  canDeleteEspecie: async (especieId) => {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM Mascotas WHERE IdEspecie = ?`, [especieId])
      const count = result && result[0] && result[0].count !== undefined ? result[0].count : 0

      if (count > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar la especie porque tiene mascotas asociadas",
          count,
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias de la especie",
        error: error.message,
      }
    }
  },

  // Verificar si se debe crear usuario para cliente
  shouldCreateUser: (clienteData) => {
    // Crear usuario si no se proporciona IdUsuario
    return !clienteData.IdUsuario
  },

  // Verificar si se debe enviar correo de bienvenida
  shouldSendWelcomeEmail: (sendEmail = true) => {
    return sendEmail !== false
  },

  // ✅ MEJORA: Verificar si un usuario puede ser asociado a un cliente
  canAssociateUserToClient: async (idUsuario, excludeClienteId = null) => {
    try {
      // Verificar que el usuario existe
      const usuario = await usuariosModel.getById(idUsuario)
      if (!usuario) {
        return {
          canAssociate: false,
          message: "El usuario especificado no existe",
        }
      }

      // Verificar que el usuario no esté ya asociado a otro cliente
      const clienteExistente = await clientesModel.getByUsuario(idUsuario)
      if (clienteExistente && (!excludeClienteId || clienteExistente.IdCliente !== Number.parseInt(excludeClienteId))) {
        return {
          canAssociate: false,
          message: "El usuario ya está asociado a otro cliente",
          cliente: clienteExistente,
        }
      }

      // ✅ MEJORA: Verificar que el rol del usuario sea compatible
      if (usuario.IdRol !== 3 && usuario.IdRol !== 2) {
        // Asumiendo que 2 y 3 son roles de cliente
        return {
          canAssociate: false,
          message: "El usuario no tiene un rol compatible para ser asociado a un cliente",
          usuario,
        }
      }

      return {
        canAssociate: true,
        usuario,
      }
    } catch (error) {
      return {
        canAssociate: false,
        message: "Error al verificar asociación de usuario",
        error: error.message,
      }
    }
  },

  // ✅ NUEVA FUNCIÓN: Validar mascotas para servicios (reemplaza procedimiento almacenado)
  validateMascotasParaServicios: async (idCliente, tieneServicios = false) => {
    try {
      // Verificar que el cliente existe
      const clientes = await query(`SELECT * FROM Clientes WHERE IdCliente = ?`, [idCliente])
      if (clientes.length === 0) {
        return {
          esValido: false,
          mensaje: "Cliente no encontrado",
        }
      }

      // Verificar que el cliente tiene mascotas activas
      const mascotas = await query(`SELECT * FROM Mascotas WHERE IdCliente = ? AND Estado = 1`, [idCliente])

      if (mascotas.length === 0) {
        return {
          esValido: false,
          mensaje: "El cliente no tiene mascotas activas para recibir servicios",
        }
      }

      // Si hay servicios asociados, verificar compatibilidad
      if (tieneServicios) {
        // Implementar lógica específica si es necesario
        // ...
      }

      return {
        esValido: true,
        mensaje: "Cliente con mascotas válidas para servicios",
        cantidadMascotas: mascotas.length,
      }
    } catch (error) {
      console.error("Error al validar mascotas para servicios:", error)
      return {
        esValido: false,
        mensaje: `Error en la validación: ${error.message}`,
      }
    }
  },

  // ✅ NUEVA FUNCIÓN: Sincronizar usuario a cliente (reemplaza procedimiento almacenado)
  syncUserToClient: async (idUsuario) => {
    try {
      // Obtener datos del usuario
      const usuario = await usuariosModel.getById(idUsuario)
      if (!usuario) {
        return {
          success: false,
          message: "Usuario no encontrado",
        }
      }

      // Verificar si ya existe un cliente asociado
      const clienteExistente = await clientesModel.getByUsuario(idUsuario)
      if (clienteExistente) {
        // Actualizar datos del cliente con los del usuario
        await clientesModel.update(clienteExistente.IdCliente, {
          Nombre: usuario.Nombre,
          Apellido: usuario.Apellido,
          Correo: usuario.Correo,
          Documento: usuario.Documento,
          Telefono: usuario.Telefono,
          Direccion: usuario.Direccion,
        })

        return {
          success: true,
          message: "Cliente actualizado con datos del usuario",
          cliente: await clientesModel.getById(clienteExistente.IdCliente),
        }
      } else {
        // Crear nuevo cliente con datos del usuario
        const nuevoCliente = await clientesModel.create({
          IdUsuario: idUsuario,
          Nombre: usuario.Nombre,
          Apellido: usuario.Apellido,
          Correo: usuario.Correo,
          Documento: usuario.Documento,
          Telefono: usuario.Telefono,
          Direccion: usuario.Direccion,
          Estado: true,
        })

        return {
          success: true,
          message: "Nuevo cliente creado con datos del usuario",
          cliente: await clientesModel.getById(nuevoCliente.id),
        }
      }
    } catch (error) {
      console.error("Error al sincronizar usuario a cliente:", error)
      return {
        success: false,
        message: `Error en la sincronización: ${error.message}`,
        error,
      }
    }
  },

  // ✅ VALIDACIÓN QUE FALTA - Agregar al final de customersValidations

// Validar que el usuario no esté ya asociado a otro cliente (se usa en controladores)
validateUserNotAssociated: async (idUsuario, excludeClienteId = null) => {
  try {
    const clienteExistente = await clientesModel.getByUsuario(idUsuario)
    
    if (!clienteExistente) {
      return { isValid: true, message: null }
    }

    if (excludeClienteId && clienteExistente.IdCliente === Number.parseInt(excludeClienteId)) {
      return { isValid: true, message: null }
    }

    return {
      isValid: false,
      message: "El usuario ya está asociado a otro cliente",
      cliente: clienteExistente
    }
  } catch (error) {
    return {
      isValid: false,
      message: "Error al verificar asociación de usuario",
      error: error.message
    }
  }
},
}