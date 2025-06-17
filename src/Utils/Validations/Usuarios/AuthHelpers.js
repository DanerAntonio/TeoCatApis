import crypto from "crypto"
// ✅ CORRECCIÓN 1: Importación estática (más eficiente que dinámica)
import { uploadToCloudinary, deleteFromCloudinary } from "../../Cloudinary.js"
import { usuariosModel } from "../../../Models/AuthService/auth.model.js"

// Funciones auxiliares para autenticación
export const authHelpers = {
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

  // Limpiar datos de usuario (remover contraseña)
  sanitizeUserData: (userData) => {
    const { Password, Contraseña, ...cleanData } = userData
    return cleanData
  },

  // Formatear respuesta de usuario
  formatUserResponse: (usuario, rol, permisos = [], cliente = null) => {
    return {
      id: usuario.IdUsuario,
      nombre: usuario.Nombre,
      apellido: usuario.Apellido,
      correo: usuario.Correo,
      documento: usuario.Documento,
      telefono: usuario.Telefono,
      direccion: usuario.Direccion,
      foto: usuario.Foto,
      estado: usuario.Estado,
      fechaCreacion: usuario.FechaCreacion,
      rol: {
        id: rol.IdRol,
        nombre: rol.NombreRol,
      },
      permisos: permisos.map((p) => p.NombrePermiso),
      cliente: cliente
        ? {
            id: cliente.IdCliente,
            nombre: cliente.Nombre,
            apellido: cliente.Apellido,
          }
        : null,
    }
  },

  // Procesar datos de usuario para base de datos
  processUserDataForDB: (usuarioData) => {
    return {
      Nombre: usuarioData.Nombre,
      Apellido: usuarioData.Apellido,
      Correo: usuarioData.Correo,
      Documento: usuarioData.Documento || "",
      Telefono: usuarioData.Telefono || "",
      Direccion: usuarioData.Direccion || "",
      IdRol: usuarioData.IdRol,
      Estado: usuarioData.Estado !== undefined ? usuarioData.Estado : true,
      Foto: usuarioData.Foto || null,
      Password: usuarioData.Password,
    }
  },

  // Extraer información del token JWT
  extractTokenInfo: (req) => {
    const token = req.headers.authorization?.split(" ")[1]
    return {
      token,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    }
  },

  // Validar que el correo no esté en uso
validateEmailNotInUse: async (correo, excludeUserId = null) => {
  try {
    // ❌ ELIMINAR ESTA LÍNEA:
    // const { usuariosModel } = await import("../../Models/AuthService/auth.model.js")
    
    // ✅ AGREGAR AL INICIO DEL ARCHIVO:
    // import { usuariosModel } from "../../Models/AuthService/auth.model.js"
    
    const existingUser = await usuariosModel.getByEmail(correo)

    if (!existingUser) {
      return { isValid: true, message: null }
    }

    if (excludeUserId && existingUser.IdUsuario === Number.parseInt(excludeUserId)) {
      return { isValid: true, message: null }
    }

    return {
      isValid: false,
      message: "El correo electrónico ya está registrado",
    }
  } catch (error) {
    console.error('Error en validateEmailNotInUse:', error); // ✅ AGREGAR LOG
    return {
      isValid: false,
      message: "Error al verificar correo",
      error: error.message,
    }
  }
},

  // ✅ CORRECCIÓN 2: Función processUserImage COMPLETAMENTE REPARADA
  processUserImage: async (file, oldImageUrl = null) => {
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
      console.log(`Subiendo nueva imagen desde: ${file.path}`)
      const result = await uploadToCloudinary(file.path, "usuarios")

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

  // ✅ NUEVA FUNCIÓN: Eliminar imagen de usuario (funcionalidad adicional)
  deleteUserImage: async (imageUrl) => {
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
}
