import { uploadToCloudinary, deleteFromCloudinary } from "../../Cloudinary.js"
import { query } from "../../../Config/Database.js"

/**
 * Helpers para el módulo de servicios
 * Equivalente a customersHelpers pero para servicios
 */
export const servicesHelpers = {
  /**
   * Procesa imagen de servicio para Cloudinary
   */
  processServiceImage: async (file, previousImageUrl = null) => {
    try {
      // Eliminar imagen anterior si existe
      if (previousImageUrl) {
        try {
          await servicesHelpers.deleteImage(previousImageUrl)
          console.log("Imagen anterior eliminada de Cloudinary")
        } catch (deleteError) {
          console.error("Error al eliminar imagen anterior:", deleteError)
          // Continuar con la subida de la nueva imagen
        }
      }

      // Subir nueva imagen
      const result = await uploadToCloudinary(file.path, "servicios")

      if (!result || !result.secure_url) {
        throw new Error("Error al subir imagen a Cloudinary")
      }

      return {
        imageUrl: result.secure_url,
        publicId: result.public_id,
        success: true,
      }
    } catch (error) {
      console.error("Error al procesar imagen de servicio:", error)
      throw new Error(`Error al procesar imagen: ${error.message}`)
    }
  },

  /**
   * Elimina imagen de Cloudinary
   */
  deleteImage: async (imageUrl) => {
    try {
      if (!imageUrl) return

      // Extraer public_id de la URL de Cloudinary
      const urlParts = imageUrl.split("/")
      const fileWithExtension = urlParts[urlParts.length - 1]
      const publicId = fileWithExtension.split(".")[0]

      // Incluir la carpeta si existe
      const folderIndex = urlParts.findIndex((part) => part === "servicios")
      if (folderIndex !== -1) {
        const fullPublicId = `servicios/${publicId}`
        await deleteFromCloudinary(fullPublicId)
      } else {
        await deleteFromCloudinary(publicId)
      }

      console.log("Imagen eliminada de Cloudinary:", publicId)
    } catch (error) {
      console.error("Error al eliminar imagen de Cloudinary:", error)
      throw error
    }
  },

  /**
   * Formatea respuesta de tipo de servicio
   */
  formatTipoServicioResponse: (tipoServicio) => {
    if (!tipoServicio) return null

    return {
      IdTipoServicio: tipoServicio.IdTipoServicio,
      Nombre: tipoServicio.Nombre,
      Estado: Boolean(tipoServicio.Estado),
      // Agregar campos calculados si es necesario
      FechaCreacion: tipoServicio.FechaCreacion || null,
      FechaActualizacion: tipoServicio.FechaActualizacion || null,
    }
  },

  /**
   * Formatea respuesta de servicio
   */
  formatServicioResponse: (servicio) => {
    if (!servicio) return null

    return {
      IdServicio: servicio.IdServicio,
      IdTipoServicio: servicio.IdTipoServicio,
      NombreTipoServicio: servicio.NombreTipoServicio || null,
      Nombre: servicio.Nombre,
      Foto: servicio.Foto,
      Descripcion: servicio.Descripcion,
      Que_incluye: servicio.Que_incluye || "",
      Precio: Number.parseFloat(servicio.Precio),
      Duracion: Number.parseInt(servicio.Duracion, 10),
      Estado: Boolean(servicio.Estado),
      // Campos calculados
      PrecioFormateado: servicesHelpers.formatPrice(servicio.Precio),
      DuracionFormateada: servicesHelpers.formatDuration(servicio.Duracion),
      FechaCreacion: servicio.FechaCreacion || null,
      FechaActualizacion: servicio.FechaActualizacion || null,
    }
  },

  /**
   * Formatea múltiples servicios
   */
  formatServiciosResponse: (servicios) => {
    if (!Array.isArray(servicios)) return []

    return servicios.map((servicio) => servicesHelpers.formatServicioResponse(servicio))
  },

  /**
   * Formatea múltiples tipos de servicio
   */
  formatTiposServicioResponse: (tipos) => {
    if (!Array.isArray(tipos)) return []

    return tipos.map((tipo) => servicesHelpers.formatTipoServicioResponse(tipo))
  },

  /**
   * Procesa datos de tipo de servicio para BD
   */
  processTipoServicioDataForDB: (data) => {
    return {
      Nombre: data.Nombre?.trim(),
      Estado: data.Estado !== undefined ? Boolean(data.Estado) : true,
    }
  },

  /**
   * Procesa datos de servicio para BD
   */
  processServicioDataForDB: (data) => {
    const processedData = {
      IdTipoServicio: data.IdTipoServicio ? Number.parseInt(data.IdTipoServicio, 10) : undefined,
      Nombre: data.Nombre?.trim(),
      Descripcion: data.Descripcion?.trim() || null,
      Que_incluye: data.Que_incluye?.trim() || "",
      Precio: data.Precio ? Number.parseFloat(data.Precio) : undefined,
      Duracion: data.Duracion ? Number.parseInt(data.Duracion, 10) : undefined,
      Estado: data.Estado !== undefined ? Boolean(data.Estado) : true,
    }

    // Solo incluir Foto si se proporciona
    if (data.Foto !== undefined) {
      processedData.Foto = data.Foto
    }

    return processedData
  },

  /**
   * Formatea precio para mostrar
   */
  formatPrice: (precio) => {
    if (!precio) return "$0.00"

    const number = Number.parseFloat(precio)
    if (isNaN(number)) return "$0.00"

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number)
  },

  /**
   * Formatea duración para mostrar
   */
  formatDuration: (duracion) => {
    if (!duracion) return "0 min"

    const minutes = Number.parseInt(duracion, 10)
    if (isNaN(minutes)) return "0 min"

    if (minutes < 60) {
      return `${minutes} min`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours}h`
    }

    return `${hours}h ${remainingMinutes}min`
  },

  /**
   * Obtiene estadísticas de un tipo de servicio
   */
  getTipoServicioStats: async (id) => {
    try {
      const stats = {}

      // Contar servicios totales
      const serviciosTotal = await query(`SELECT COUNT(*) as count FROM Servicios WHERE IdTipoServicio = ?`, [id])
      stats.serviciosTotal = serviciosTotal[0]?.count || 0

      // Contar servicios activos
      const serviciosActivos = await query(
        `SELECT COUNT(*) as count FROM Servicios WHERE IdTipoServicio = ? AND Estado = 1`,
        [id],
      )
      stats.serviciosActivos = serviciosActivos[0]?.count || 0

      // Precio promedio
      const precioPromedio = await query(
        `SELECT AVG(Precio) as promedio FROM Servicios WHERE IdTipoServicio = ? AND Estado = 1`,
        [id],
      )
      stats.precioPromedio = Number.parseFloat(precioPromedio[0]?.promedio || 0)

      // Duración promedio
      const duracionPromedio = await query(
        `SELECT AVG(Duracion) as promedio FROM Servicios WHERE IdTipoServicio = ? AND Estado = 1`,
        [id],
      )
      stats.duracionPromedio = Number.parseInt(duracionPromedio[0]?.promedio || 0, 10)

      return stats
    } catch (error) {
      console.error("Error al obtener estadísticas de tipo de servicio:", error)
      return {}
    }
  },

  /**
   * Obtiene estadísticas de un servicio
   */
  getServicioStats: async (id) => {
    try {
      const stats = {}

      // Contar citas totales
      const citasTotal = await query(`SELECT COUNT(*) as count FROM Cita_Servicio WHERE IdServicio = ?`, [id])
      stats.citasTotal = citasTotal[0]?.count || 0

      // Contar ventas totales
      const ventasTotal = await query(`SELECT COUNT(*) as count FROM DetalleVentasServicios WHERE IdServicio = ?`, [id])
      stats.ventasTotal = ventasTotal[0]?.count || 0

      // Ingresos totales
      const ingresosTotales = await query(
        `SELECT SUM(Precio) as total FROM DetalleVentasServicios WHERE IdServicio = ?`,
        [id],
      )
      stats.ingresosTotales = Number.parseFloat(ingresosTotales[0]?.total || 0)

      return stats
    } catch (error) {
      console.error("Error al obtener estadísticas de servicio:", error)
      return {}
    }
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

  /**
   * Valida archivo de imagen
   */
  validateImageFile: (file) => {
    if (!file) {
      return {
        isValid: true, // Es opcional
      }
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        message: "Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)",
      }
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        message: "El archivo es demasiado grande. Tamaño máximo: 5MB",
      }
    }

    return {
      isValid: true,
    }
  },
}

export default {
  servicesHelpers,
}
