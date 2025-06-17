import crypto from "crypto"
// ✅ CORRECCIÓN 1: Importación estática (más eficiente que dinámica)
import { uploadToCloudinary, deleteFromCloudinary } from "../../Cloudinary.js"
import { clientesModel } from "../../../Models/CustomerService/customers.model.js"
import { tokensRecuperacionModel } from "../../../Models/AuthService/auth.model.js"

// Funciones auxiliares para clientes
export const customersHelpers = {
  // Generar contraseña temporal
  generateTemporaryPassword: (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""

    // Asegurar al menos un carácter de cada tipo
    password += charset.substring(0, 26).charAt(Math.floor(Math.random() * 26)) // minúscula
    password += charset.substring(26, 52).charAt(Math.floor(Math.random() * 26)) // mayúscula
    password += charset.substring(52, 62).charAt(Math.floor(Math.random() * 10)) // número
    password += charset.substring(62).charAt(Math.floor(Math.random() * (charset.length - 62))) // especial

    // Completar con caracteres aleatorios
    for (let i = 4; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }

    // Mezclar los caracteres
    return password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("")
  },

  // Generar token de recuperación
  generateRecoveryToken: () => {
    return crypto.randomBytes(32).toString("hex")
  },

  // Calcular fecha de expiración
  calculateExpirationDate: (hours = 24) => {
    const expiracion = new Date()
    expiracion.setHours(expiracion.getHours() + hours)
    return expiracion
  },

  // ✅ CORRECCIÓN 2: Función processImage COMPLETAMENTE REPARADA
  processImage: async (file, oldImageUrl = null, folder = "customers") => {
    try {
      // ✅ VALIDACIÓN: Verificar que el archivo existe
      if (!file || !file.path) {
        throw new Error("No se proporcionó un archivo válido")
      }

      // ✅ MEJORA: Eliminar imagen anterior ANTES de subir la nueva (evita acumulación)
      if (oldImageUrl) {
        try {
          // Extraer public_id de la URL de Cloudinary
          const urlParts = oldImageUrl.split("/")
          const fileNameWithExtension = urlParts[urlParts.length - 1]
          const publicId = fileNameWithExtension.split(".")[0]

          console.log(`Eliminando imagen anterior: ${publicId}`)
          await deleteFromCloudinary(publicId)
          console.log("Imagen anterior eliminada exitosamente")
        } catch (deleteError) {
          console.error("Error al eliminar imagen anterior:", deleteError)
          // ✅ MEJORA: No interrumpir el proceso si falla la eliminación
          // Continuar con la subida de la nueva imagen
        }
      }

      // ✅ SUBIR NUEVA IMAGEN con manejo de errores mejorado
      console.log(`Subiendo nueva imagen desde: ${file.path} a carpeta: ${folder}`)
      const result = await uploadToCloudinary(file.path, folder)

      if (!result || !result.secure_url) {
        throw new Error("Error en la respuesta de Cloudinary")
      }

      console.log(`Imagen subida exitosamente: ${result.secure_url}`)

      return {
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id, // ✅ MEJORA: Devolver también el public_id
      }
    } catch (error) {
      console.error("Error al procesar imagen:", error)
      // ✅ CORRECCIÓN: Propagar el error correctamente (como en el archivo antiguo)
      throw new Error(`Error al procesar imagen: ${error.message}`)
    }
  },

  // ✅ NUEVA FUNCIÓN: Eliminar imagen (funcionalidad adicional)
  deleteImage: async (imageUrl) => {
    try {
      if (!imageUrl) {
        return { success: true, message: "No hay imagen para eliminar" }
      }

      const urlParts = imageUrl.split("/")
      const fileNameWithExtension = urlParts[urlParts.length - 1]
      const publicId = fileNameWithExtension.split(".")[0]

      await deleteFromCloudinary(publicId)

      return {
        success: true,
        message: "Imagen eliminada exitosamente",
      }
    } catch (error) {
      console.error("Error al eliminar imagen:", error)
      throw new Error(`Error al eliminar imagen: ${error.message}`)
    }
  },

  // ✅ CORRECCIÓN 3: Procesar imagen de cliente con validaciones robustas
  processClientImage: async (file, oldImageUrl = null) => {
    return await customersHelpers.processImage(file, oldImageUrl, "clientes")
  },

  // ✅ CORRECCIÓN 4: Procesar imagen de mascota con validaciones robustas
  processPetImage: async (file, oldImageUrl = null) => {
    return await customersHelpers.processImage(file, oldImageUrl, "mascotas")
  },

  // ✅ CORRECCIÓN 5: Validación de fecha de nacimiento (reemplaza trigger)
  processDateOfBirth: (fechaNacimiento) => {
    if (!fechaNacimiento) return null

    const fecha = new Date(fechaNacimiento)
    if (isNaN(fecha.getTime())) {
      throw new Error("Fecha de nacimiento inválida")
    }

    const hoy = new Date()
    const hace30Anos = new Date()
    hace30Anos.setFullYear(hoy.getFullYear() - 30)

    // Validar que no sea futura
    if (fecha > hoy) {
      throw new Error("La fecha de nacimiento no puede ser futura")
    }

    // Validar que no sea anterior a 30 años
    if (fecha < hace30Anos) {
      throw new Error("La fecha de nacimiento no puede ser anterior a hace 30 años")
    }

    return fecha.toISOString().split("T")[0] // Formato YYYY-MM-DD
  },

  // Procesar datos de usuario para cliente
  processUserDataForClient: (clienteData, tempPassword) => {
    return {
      Nombre: clienteData.Nombre,
      Apellido: clienteData.Apellido,
      Correo: clienteData.Correo,
      Documento: clienteData.Documento || "",
      Telefono: clienteData.Telefono || "",
      Direccion: clienteData.Direccion || "",
      IdRol: 3, // Rol de cliente por defecto
      Estado: true,
      Foto: null,
      Password: tempPassword,
    }
  },

  // Procesar datos de cliente para base de datos
  processClientDataForDB: (clienteData) => {
    const processedData = {
      Nombre: clienteData.Nombre,
      Apellido: clienteData.Apellido,
      Correo: clienteData.Correo,
      Documento: clienteData.Documento || "",
      Telefono: clienteData.Telefono || "",
      Direccion: clienteData.Direccion || "",
      Estado: clienteData.Estado !== undefined ? clienteData.Estado : true,
      Foto: clienteData.Foto || null,
    }

    // Agregar IdUsuario si se proporciona
    if (clienteData.IdUsuario) {
      processedData.IdUsuario = clienteData.IdUsuario
    }

    return processedData
  },

  // Procesar datos de mascota para base de datos
  processPetDataForDB: (mascotaData) => {
    const processedData = {
      Nombre: mascotaData.Nombre,
      Especie: mascotaData.Especie,
      Raza: mascotaData.Raza || "",
      Color: mascotaData.Color || "",
      Peso: mascotaData.Peso || null,
      Observaciones: mascotaData.Observaciones || "",
      Estado: mascotaData.Estado !== undefined ? mascotaData.Estado : true,
      Foto: mascotaData.Foto || null,
      IdCliente: mascotaData.IdCliente,
    }

    // Procesar fecha de nacimiento con validaciones
    if (mascotaData.FechaNacimiento) {
      processedData.FechaNacimiento = customersHelpers.processDateOfBirth(mascotaData.FechaNacimiento)
    }

    return processedData
  },

  // Formatear respuesta de cliente
  formatClientResponse: (cliente, usuario = null, mascotas = []) => {
    return {
      id: cliente.IdCliente,
      nombre: cliente.Nombre,
      apellido: cliente.Apellido,
      correo: cliente.Correo,
      documento: cliente.Documento,
      telefono: cliente.Telefono,
      direccion: cliente.Direccion,
      foto: cliente.Foto,
      estado: cliente.Estado,
      fechaCreacion: cliente.FechaCreacion,
      usuario: usuario
        ? {
            id: usuario.IdUsuario,
            correo: usuario.Correo,
            estado: usuario.Estado,
          }
        : null,
      mascotas: mascotas.map((mascota) => ({
        id: mascota.IdMascota,
        nombre: mascota.Nombre,
        especie: mascota.Especie,
        raza: mascota.Raza,
        foto: mascota.Foto,
      })),
    }
  },

  // Formatear respuesta de mascota
  formatPetResponse: (mascota, cliente = null) => {
    return {
      id: mascota.IdMascota,
      nombre: mascota.Nombre,
      especie: mascota.Especie,
      raza: mascota.Raza,
      color: mascota.Color,
      peso: mascota.Peso,
      fechaNacimiento: mascota.FechaNacimiento,
      observaciones: mascota.Observaciones,
      foto: mascota.Foto,
      estado: mascota.Estado,
      fechaCreacion: mascota.FechaCreacion,
      cliente: cliente
        ? {
            id: cliente.IdCliente,
            nombre: cliente.Nombre,
            apellido: cliente.Apellido,
            correo: cliente.Correo,
          }
        : null,
    }
  },

  // ✅ NUEVA FUNCIÓN: Crear token de recuperación de contraseña
  createPasswordResetToken: async (idUsuario) => {
    try {
      const token = customersHelpers.generateRecoveryToken()
      const expiracion = customersHelpers.calculateExpirationDate(24)

      await tokensRecuperacionModel.create({
        IdUsuario: idUsuario,
        Token: token,
        FechaCreacion: new Date(),
        FechaExpiracion: expiracion,
        FueUsado: false,
      })

      return token
    } catch (error) {
      console.error("Error al crear token de recuperación:", error)
      throw error
    }
  },

  // ✅ NUEVA FUNCIÓN: Validar que el correo no esté en uso (para clientes)
  validateEmailNotInUse: async (correo, excludeClientId = null) => {
    try {
      const existingClient = await clientesModel.getByEmail(correo)

      if (!existingClient) {
        return { isValid: true, message: null }
      }

      if (excludeClientId && existingClient.IdCliente === Number.parseInt(excludeClientId)) {
        return { isValid: true, message: null }
      }

      return {
        isValid: false,
        message: "El correo electrónico ya está registrado",
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar correo",
        error: error.message,
      }
    }
  },

  // ✅ NUEVA FUNCIÓN: Validar que el documento no esté en uso (para clientes)
  validateDocumentNotInUse: async (documento, excludeClientId = null) => {
    try {
      const existingClient = await clientesModel.getByDocument(documento)

      if (!existingClient) {
        return { isValid: true, message: null }
      }

      if (excludeClientId && existingClient.IdCliente === Number.parseInt(excludeClientId)) {
        return { isValid: true, message: null }
      }

      return {
        isValid: false,
        message: "El documento ya está registrado",
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar documento",
        error: error.message,
      }
    }
  },

  syncUserClientData: (clienteData) => {
  // Datos que se pueden sincronizar con el usuario
  const syncData = {}
  
  if (clienteData.Nombre !== undefined) {
    syncData.Nombre = clienteData.Nombre
  }
  
  if (clienteData.Apellido !== undefined) {
    syncData.Apellido = clienteData.Apellido
  }
  
  if (clienteData.Correo !== undefined) {
    syncData.Correo = clienteData.Correo
  }
  
  if (clienteData.Documento !== undefined) {
    syncData.Documento = clienteData.Documento
  }
  
  if (clienteData.Telefono !== undefined) {
    syncData.Telefono = clienteData.Telefono
  }
  
  if (clienteData.Direccion !== undefined) {
    syncData.Direccion = clienteData.Direccion
  }
  
  return syncData
},

  // Limpiar datos sensibles
  sanitizeData: (data) => {
    const { Password, Contraseña, ...cleanData } = data
    return cleanData
  },

  // ✅ FUNCIONES QUE FALTAN - Agregar al final de customersHelpers

// Formatear respuesta de múltiples mascotas (se usa en controladores)
formatMascotasResponse: (mascotas) => {
  return mascotas.map(mascota => customersHelpers.normalizeMascotaResponse(mascota))
},

// Normalizar respuesta individual de mascota (se usa en controladores)
normalizeMascotaResponse: (mascota) => {
  return {
    id: mascota.IdMascota,
    nombre: mascota.Nombre,
    idCliente: mascota.IdCliente,
    nombreCliente: mascota.NombreCliente || `${mascota.ClienteNombre || ''} ${mascota.ClienteApellido || ''}`.trim(),
    idEspecie: mascota.IdEspecie,
    nombreEspecie: mascota.NombreEspecie || mascota.EspecieNombre,
    raza: mascota.Raza || "",
    tamaño: mascota.Tamaño,
    fechaNacimiento: mascota.FechaNacimiento,
    foto: mascota.Foto,
    estado: mascota.Estado,
    fechaCreacion: mascota.FechaCreacion
  }
},
}

