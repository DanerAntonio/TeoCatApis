// Agregar al inicio del archivo, después de los comentarios
import { uploadToCloudinary, deleteFromCloudinary } from "../../../Utils/Cloudinary.js"

// Funciones auxiliares para productos
export const productsHelpers = {
  // Procesar datos de categoría para base de datos
  processCategoriaDataForDB: (categoriaData) => {
    return {
      NombreCategoria: categoriaData.NombreCategoria.trim(),
      Estado: categoriaData.Estado !== undefined ? categoriaData.Estado : true,
    }
  },

  // Procesar datos de producto para base de datos
  processProductoDataForDB: (productoData) => {
    const processedData = {
      IdCategoriaDeProducto: productoData.IdCategoriaDeProducto,
      NombreProducto: productoData.NombreProducto.trim(),
      Descripcion: productoData.Descripcion || null,
      Caracteristicas: productoData.Caracteristicas || null,
      Stock: productoData.Stock || 0,
      UnidadMedida: productoData.UnidadMedida || "Unidad",
      ValorUnidad: productoData.ValorUnidad || 1,
      Precio: productoData.Precio,
      MargenGanancia: productoData.MargenGanancia || 30,
      AplicaIVA: productoData.AplicaIVA || false,
      PorcentajeIVA: productoData.PorcentajeIVA || 0,
      FechaVencimiento: productoData.FechaVencimiento || null,
      CodigoBarras: productoData.CodigoBarras || null,
      Referencia: productoData.Referencia || null,
      Estado: productoData.Estado !== undefined ? productoData.Estado : true,
      Origen: productoData.Origen || "Catálogo",
      EsVariante: productoData.EsVariante || false,
      ProductoBaseId: productoData.ProductoBaseId || null,
      FotosProducto: productoData.FotosProducto || null,
    }

    // ✅ CORRECCIÓN CRÍTICA: Calcular precio de venta automáticamente
    if (processedData.Precio && processedData.MargenGanancia) {
      processedData.PrecioVenta = productsHelpers.calculateSalePrice(processedData.Precio, processedData.MargenGanancia)
    } else {
      processedData.PrecioVenta = processedData.Precio || 0
    }

    // ✅ CORRECCIÓN CRÍTICA: Calcular precio con IVA automáticamente
    if (processedData.PrecioVenta && processedData.AplicaIVA && processedData.PorcentajeIVA) {
      processedData.PrecioConIVA = productsHelpers.calculatePriceWithIVA(
        processedData.PrecioVenta,
        processedData.AplicaIVA,
        processedData.PorcentajeIVA,
      )
    } else {
      processedData.PrecioConIVA = processedData.PrecioVenta || processedData.Precio || 0
    }

    // ✅ VALIDACIÓN: Asegurar que campos NOT NULL no sean null
    if (processedData.PrecioVenta === null || processedData.PrecioVenta === undefined) {
      processedData.PrecioVenta = 0
    }
    if (processedData.PrecioConIVA === null || processedData.PrecioConIVA === undefined) {
      processedData.PrecioConIVA = 0
    }

    return processedData
  },

  // Calcular precio de venta con margen
  calculateSalePrice: (precio, margenGanancia) => {
    if (!margenGanancia || margenGanancia === 0) {
      return precio
    }
    return Number.parseFloat((precio * (1 + margenGanancia / 100)).toFixed(2))
  },

  // Calcular precio con IVA
  calculatePriceWithIVA: (precio, aplicaIVA, porcentajeIVA) => {
    if (!aplicaIVA || !porcentajeIVA || porcentajeIVA === 0) {
      return precio
    }
    return Number.parseFloat((precio * (1 + porcentajeIVA / 100)).toFixed(2))
  },

  // ✅ NUEVA FUNCIÓN: Recalcular precios cuando cambian valores relacionados
  recalculatePrices: (productoData, existingData = {}) => {
    const precio = productoData.Precio !== undefined ? productoData.Precio : existingData.Precio
    const margenGanancia =
      productoData.MargenGanancia !== undefined ? productoData.MargenGanancia : existingData.MargenGanancia
    const aplicaIVA = productoData.AplicaIVA !== undefined ? productoData.AplicaIVA : existingData.AplicaIVA
    const porcentajeIVA =
      productoData.PorcentajeIVA !== undefined ? productoData.PorcentajeIVA : existingData.PorcentajeIVA

    const precioVenta = productsHelpers.calculateSalePrice(precio, margenGanancia)
    const precioConIVA = productsHelpers.calculatePriceWithIVA(precioVenta, aplicaIVA, porcentajeIVA)

    return {
      PrecioVenta: precioVenta,
      PrecioConIVA: precioConIVA,
    }
  },

  // Formatear respuesta de producto
  formatProductoResponse: (producto) => {
    if (!producto) return null

    return {
      ...producto,
      // Calcular campos derivados si no están presentes
      PrecioVenta: producto.PrecioVenta || productsHelpers.calculateSalePrice(producto.Precio, producto.MargenGanancia),
      PrecioConIVA:
        producto.PrecioConIVA ||
        productsHelpers.calculatePriceWithIVA(
          producto.PrecioVenta || producto.Precio,
          producto.AplicaIVA,
          producto.PorcentajeIVA,
        ),
      // Agregar información de estado
      EstadoStock: productsHelpers.getStockStatus(producto),
      EstadoVencimiento: productsHelpers.getExpiryStatus(producto),
      // Formatear fechas
      FechaVencimiento: producto.FechaVencimiento
        ? new Date(producto.FechaVencimiento).toISOString().split("T")[0]
        : null,
      FechaCreacion: producto.FechaCreacion ? new Date(producto.FechaCreacion).toISOString() : null,
      FechaModificacion: producto.FechaModificacion ? new Date(producto.FechaModificacion).toISOString() : null,
    }
  },

  // Obtener estado del stock
  getStockStatus: (producto) => {
    if (producto.Stock === 0) {
      return "Sin stock"
    } else if (producto.Stock <= 5) {
      return "Stock crítico"
    } else if (producto.Stock <= 10) {
      return "Stock bajo"
    }
    return "Normal"
  },

  // Obtener estado de vencimiento
  getExpiryStatus: (producto) => {
    if (!producto.FechaVencimiento) {
      return "Sin fecha de vencimiento"
    }

    const hoy = new Date()
    const fechaVencimiento = new Date(producto.FechaVencimiento)
    const diffTime = fechaVencimiento - hoy
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return "Vencido"
    } else if (diffDays <= 7) {
      return "Próximo a vencer"
    } else if (diffDays <= 30) {
      return "Vence pronto"
    }
    return "Normal"
  },

  // Procesar imagen de producto
  processProductImage: async (file, oldImageUrl = null, folder = "productos") => {
    try {
      // Eliminar imagen anterior si existe
      if (oldImageUrl) {
        try {
          const urlParts = oldImageUrl.split("/")
          const filename = urlParts[urlParts.length - 1]
          const publicId = filename.includes(".") ? filename.split(".")[0] : filename
          await deleteFromCloudinary(publicId)
        } catch (deleteError) {
          console.error("Error al eliminar imagen anterior:", deleteError)
          // Continuar con la subida de la nueva imagen
        }
      }

      // Subir nueva imagen
      const result = await uploadToCloudinary(file.path, folder)
      return {
        success: true,
        imageUrl: result.secure_url,
      }
    } catch (error) {
      console.error("Error al procesar imagen:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  },

  // Eliminar imagen de producto
  deleteProductImage: async (imageUrl) => {
    try {
      if (!imageUrl) return { success: true }

      const urlParts = imageUrl.split("/")
      const filename = urlParts[urlParts.length - 1]
      const publicId = filename.includes(".") ? filename.split(".")[0] : filename

      await deleteFromCloudinary(publicId)
      return { success: true }
    } catch (error) {
      console.error("Error al eliminar imagen:", error)
      return { success: false, error: error.message }
    }
  },

  // Generar código de barras automático
  generateBarcode: () => {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `${timestamp}${random}`
  },

  // Generar referencia automática
  generateReference: (nombreProducto) => {
    const prefix = nombreProducto.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")
    return `${prefix}-${timestamp}-${random}`
  },

  // Procesar datos de variante
  processVarianteData: (varianteData, productoBase) => {
    const processedData = {
      IdCategoriaDeProducto: productoBase.IdCategoriaDeProducto,
      NombreProducto: varianteData.NombreProducto || `${productoBase.NombreProducto} - Variante`,
      Descripcion: varianteData.Descripcion || productoBase.Descripcion,
      Caracteristicas: varianteData.Caracteristicas || productoBase.Caracteristicas,
      Stock: varianteData.Stock || 0,
      UnidadMedida: varianteData.UnidadMedida || productoBase.UnidadMedida,
      ValorUnidad: varianteData.ValorUnidad || productoBase.ValorUnidad,
      Precio: varianteData.Precio || productoBase.Precio,
      MargenGanancia: varianteData.MargenGanancia || productoBase.MargenGanancia,
      AplicaIVA: varianteData.AplicaIVA !== undefined ? varianteData.AplicaIVA : productoBase.AplicaIVA,
      PorcentajeIVA: varianteData.PorcentajeIVA !== undefined ? varianteData.PorcentajeIVA : productoBase.PorcentajeIVA,
      FechaVencimiento: varianteData.FechaVencimiento || productoBase.FechaVencimiento,
      CodigoBarras: varianteData.CodigoBarras || null,
      Referencia: varianteData.Referencia || null,
      Estado: varianteData.Estado !== undefined ? varianteData.Estado : true,
      Origen: varianteData.Origen || productoBase.Origen,
      EsVariante: true,
      ProductoBaseId: productoBase.IdProducto,
      FotosProducto: varianteData.FotosProducto || null,
    }

    // ✅ CORRECCIÓN: Calcular precios para variantes también
    processedData.PrecioVenta = productsHelpers.calculateSalePrice(processedData.Precio, processedData.MargenGanancia)
    processedData.PrecioConIVA = productsHelpers.calculatePriceWithIVA(
      processedData.PrecioVenta,
      processedData.AplicaIVA,
      processedData.PorcentajeIVA,
    )

    if (varianteData.FotosProducto) {
  if (Array.isArray(varianteData.FotosProducto)) {
    // Si es un array, convertir a string separado por |
    const urls = varianteData.FotosProducto
      .map((foto) => {
        if (typeof foto === 'object' && foto.url) {
          return foto.url
        }
        if (typeof foto === 'string') {
          return foto
        }
        return null
      })
      .filter((url) => url && url.trim() !== "")
      .slice(0, 4) // Máximo 4 imágenes
    
    processedData.FotosProducto = urls.length > 0 ? urls.join("|") : null
  } else if (typeof varianteData.FotosProducto === 'string') {
    // Si ya es string, validar que no exceda 4 URLs
    const urls = varianteData.FotosProducto
      .split("|")
      .map(url => url.trim())
      .filter(url => url)
      .slice(0, 4)
    
    processedData.FotosProducto = urls.length > 0 ? urls.join("|") : null
  }
} else {
  processedData.FotosProducto = null
}

    return processedData
  },

  // Formatear lista de productos para respuesta
  formatProductosResponse: (productos) => {
    if (!Array.isArray(productos)) return []
    return productos.map((producto) => productsHelpers.formatProductoResponse(producto))
  },

  // Calcular estadísticas de productos
  calculateProductStats: (productos) => {
    const stats = {
      total: productos.length,
      activos: 0,
      inactivos: 0,
      stockBajo: 0,
      sinStock: 0,
      proximosVencer: 0,
      vencidos: 0,
      valorTotalInventario: 0,
      porCategoria: {},
    }

    productos.forEach((producto) => {
      // Contar por estado
      if (producto.Estado) {
        stats.activos++
      } else {
        stats.inactivos++
      }

      // Contar por stock
      if (producto.Stock === 0) {
        stats.sinStock++
      } else if (producto.Stock <= 10) {
        stats.stockBajo++
      }

      // Contar por vencimiento
      const estadoVencimiento = productsHelpers.getExpiryStatus(producto)
      if (estadoVencimiento === "Vencido") {
        stats.vencidos++
      } else if (estadoVencimiento === "Próximo a vencer") {
        stats.proximosVencer++
      }

      // Calcular valor del inventario
      stats.valorTotalInventario += (producto.Precio || 0) * (producto.Stock || 0)

      // Contar por categoría
      const categoria = producto.NombreCategoria || "Sin categoría"
      if (!stats.porCategoria[categoria]) {
        stats.porCategoria[categoria] = 0
      }
      stats.porCategoria[categoria]++
    })

    return stats
  },

  // Filtrar productos por criterios
  filterProducts: (productos, filters) => {
    return productos.filter((producto) => {
      // Filtrar por categoría
      if (filters.categoria && producto.IdCategoriaDeProducto !== filters.categoria) {
        return false
      }

      // Filtrar por estado
      if (filters.estado !== undefined && producto.Estado !== filters.estado) {
        return false
      }

      // Filtrar por stock bajo
      if (filters.stockBajo && producto.Stock > 10) {
        return false
      }

      // Filtrar por próximos a vencer
      if (filters.proximosVencer) {
        const estadoVencimiento = productsHelpers.getExpiryStatus(producto)
        if (estadoVencimiento !== "Próximo a vencer" && estadoVencimiento !== "Vence pronto") {
          return false
        }
      }

      // Filtrar por rango de precios
      if (filters.precioMin && producto.Precio < filters.precioMin) {
        return false
      }
      if (filters.precioMax && producto.Precio > filters.precioMax) {
        return false
      }

      return true
    })
  },

  // Ordenar productos
  sortProducts: (productos, sortBy = "nombre", sortOrder = "asc") => {
    return productos.sort((a, b) => {
      let valueA, valueB

      switch (sortBy) {
        case "nombre":
          valueA = a.NombreProducto?.toLowerCase() || ""
          valueB = b.NombreProducto?.toLowerCase() || ""
          break
        case "precio":
          valueA = a.Precio || 0
          valueB = b.Precio || 0
          break
        case "stock":
          valueA = a.Stock || 0
          valueB = b.Stock || 0
          break
        case "categoria":
          valueA = a.NombreCategoria?.toLowerCase() || ""
          valueB = b.NombreCategoria?.toLowerCase() || ""
          break
        case "fechaCreacion":
          valueA = new Date(a.FechaCreacion || 0)
          valueB = new Date(b.FechaCreacion || 0)
          break
        case "fechaVencimiento":
          valueA = new Date(a.FechaVencimiento || "9999-12-31")
          valueB = new Date(b.FechaVencimiento || "9999-12-31")
          break
        default:
          valueA = a.NombreProducto?.toLowerCase() || ""
          valueB = b.NombreProducto?.toLowerCase() || ""
      }

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1
      }
      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1
      }
      return 0
    })
  },

  // Validar y procesar fecha de vencimiento
  processExpiryDate: (fechaVencimiento) => {
    if (!fechaVencimiento) return null

    const fecha = new Date(fechaVencimiento)
    if (isNaN(fecha.getTime())) {
      throw new Error("Fecha de vencimiento inválida")
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    if (fecha < hoy) {
      throw new Error("La fecha de vencimiento no puede ser anterior a hoy")
    }

    return fecha.toISOString().split("T")[0] // Formato YYYY-MM-DD
  },

  // Obtener información del producto desde request
  extractProductInfo: (req) => {
    return {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      userId: req.user?.id,
    }
  },

  // Limpiar datos de respuesta
  sanitizeProductData: (productData) => {
    // Remover campos sensibles si los hubiera
    const { ...cleanData } = productData
    return cleanData
  },
}
