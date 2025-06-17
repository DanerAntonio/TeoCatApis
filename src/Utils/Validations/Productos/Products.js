// Importaciones estáticas al inicio del archivo
import { categoriasModel, productosModel } from "../../../Models/ProductService/products.model.js"

// Validaciones para el módulo de productos
export const productsValidations = {
  // Validar datos de categoría
  validateCategoriaData: async (data, isUpdate = false, excludeId = null) => {
    const errors = []

    if (!isUpdate || data.NombreCategoria !== undefined) {
      if (!data.NombreCategoria || data.NombreCategoria.trim() === "") {
        errors.push("El nombre de la categoría es requerido")
      } else if (data.NombreCategoria.length < 2) {
        errors.push("El nombre de la categoría debe tener al menos 2 caracteres")
      } else if (data.NombreCategoria.length > 100) {
        errors.push("El nombre de la categoría no puede exceder 100 caracteres")
      } else {
        // ✅ CORRECCIÓN: Usar importación estática
        try {
          const existingCategoria = await categoriasModel.getByName(data.NombreCategoria.trim())

          if (
            existingCategoria &&
            (!excludeId || existingCategoria.IdCategoriaDeProducto !== Number.parseInt(excludeId))
          ) {
            errors.push("Ya existe una categoría con ese nombre")
          }
        } catch (error) {
          console.error('Error al verificar unicidad:', error)
          errors.push("Error al verificar unicidad del nombre de categoría")
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de categoría inválidos" : null,
      errors,
    }
  },

  // Validar existencia de categoría
  validateCategoriaExists: async (id) => {
    try {
      // ✅ CORRECCIÓN: Usar importación estática
      const categoria = await categoriasModel.getById(id)

      if (!categoria) {
        return {
          isValid: false,
          message: "Categoría no encontrada",
        }
      }

      return {
        isValid: true,
        categoria,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar categoría",
        error: error.message,
      }
    }
  },

  // Validar datos de producto
  validateProductoData: (data, isUpdate = false) => {
    const errors = []

    // Validaciones para creación y actualización
    if (!isUpdate || data.NombreProducto !== undefined) {
      if (!data.NombreProducto || data.NombreProducto.trim() === "") {
        errors.push("El nombre del producto es requerido")
      } else if (data.NombreProducto.length < 2) {
        errors.push("El nombre del producto debe tener al menos 2 caracteres")
      } else if (data.NombreProducto.length > 100) {
        errors.push("El nombre del producto no puede exceder 100 caracteres")
      }
    }

    if (!isUpdate || data.IdCategoriaDeProducto !== undefined) {
      if (!isUpdate && (!data.IdCategoriaDeProducto || isNaN(data.IdCategoriaDeProducto))) {
        errors.push("La categoría es requerida")
      }
    }

    if (!isUpdate || data.Precio !== undefined) {
      if (!isUpdate && (data.Precio === undefined || data.Precio === null)) {
        errors.push("El precio es requerido")
      } else if (data.Precio !== undefined && (isNaN(data.Precio) || data.Precio < 0)) {
        errors.push("El precio debe ser un número válido mayor o igual a 0")
      } else if (data.Precio !== undefined && !productsValidations.validateDecimalPrecision(data.Precio, 10, 2)) {
        errors.push("El precio debe tener máximo 10 dígitos enteros y 2 decimales")
      }
    }

    // Validaciones opcionales con precisión decimal
    if (data.Descripcion && data.Descripcion.length > 65535) {
      errors.push("La descripción es demasiado larga")
    }

    if (data.Caracteristicas && data.Caracteristicas.length > 65535) {
      errors.push("Las características son demasiado largas")
    }

    if (data.Stock !== undefined && (isNaN(data.Stock) || data.Stock < 0)) {
      errors.push("El stock debe ser un número válido mayor o igual a 0")
    } else if (data.Stock !== undefined && !productsValidations.validateDecimalPrecision(data.Stock, 10, 2)) {
      errors.push("El stock debe tener máximo 10 dígitos enteros y 2 decimales")
    }

    if (data.ValorUnidad !== undefined && (isNaN(data.ValorUnidad) || data.ValorUnidad <= 0)) {
      errors.push("El valor de unidad debe ser un número válido mayor a 0")
    } else if (
      data.ValorUnidad !== undefined &&
      !productsValidations.validateDecimalPrecision(data.ValorUnidad, 10, 4)
    ) {
      errors.push("El valor de unidad debe tener máximo 10 dígitos enteros y 4 decimales")
    }

    if (
      data.MargenGanancia !== undefined &&
      (isNaN(data.MargenGanancia) || data.MargenGanancia < 0 || data.MargenGanancia > 100)
    ) {
      errors.push("El margen de ganancia debe estar entre 0 y 100")
    } else if (
      data.MargenGanancia !== undefined &&
      !productsValidations.validateDecimalPrecision(data.MargenGanancia, 5, 2)
    ) {
      errors.push("El margen de ganancia debe tener máximo 5 dígitos enteros y 2 decimales")
    }

    if (
      data.PorcentajeIVA !== undefined &&
      (isNaN(data.PorcentajeIVA) || data.PorcentajeIVA < 0 || data.PorcentajeIVA > 100)
    ) {
      errors.push("El porcentaje de IVA debe estar entre 0 y 100")
    } else if (
      data.PorcentajeIVA !== undefined &&
      !productsValidations.validateDecimalPrecision(data.PorcentajeIVA, 5, 2)
    ) {
      errors.push("El porcentaje de IVA debe tener máximo 5 dígitos enteros y 2 decimales")
    }

    if (data.CodigoBarras && data.CodigoBarras.length > 50) {
      errors.push("El código de barras no puede exceder 50 caracteres")
    }

    if (data.Referencia && data.Referencia.length > 50) {
      errors.push("La referencia no puede exceder 50 caracteres")
    }

    // Validar fecha de vencimiento
    if (data.FechaVencimiento) {
      const fechaVencimiento = new Date(data.FechaVencimiento)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      if (isNaN(fechaVencimiento.getTime())) {
        errors.push("Fecha de vencimiento inválida")
      } else if (fechaVencimiento < hoy) {
        errors.push("La fecha de vencimiento no puede ser anterior a hoy")
      }
    }

    // ✅ NUEVA VALIDACIÓN: Campos calculados NOT NULL
    if (!isUpdate) {
      // En creación, validar que se puedan calcular los precios
      if (data.Precio !== undefined && data.MargenGanancia !== undefined) {
        const precioVenta = data.Precio * (1 + (data.MargenGanancia || 0) / 100)
        const precioConIVA =
          data.AplicaIVA && data.PorcentajeIVA ? precioVenta * (1 + data.PorcentajeIVA / 100) : precioVenta

        if (precioVenta <= 0) {
          errors.push("El precio de venta calculado debe ser mayor a 0")
        }
        if (precioConIVA <= 0) {
          errors.push("El precio con IVA calculado debe ser mayor a 0")
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de producto inválidos" : null,
      errors,
    }
  },

  // Validar precisión decimal
  validateDecimalPrecision: (value, integerDigits, decimalDigits) => {
    const valueStr = value.toString()
    const parts = valueStr.split(".")

    // Validar dígitos enteros
    if (parts[0].length > integerDigits) {
      return false
    }

    // Validar dígitos decimales
    if (parts[1] && parts[1].length > decimalDigits) {
      return false
    }

    return true
  },

  // Validar constraint CodigoBarras OR Referencia
  validateCodigoBarrasOrReferencia: (data, isUpdate = false, existingData = null) => {
    if (isUpdate && existingData) {
      // En actualización, verificar que al menos uno quede con valor
      const newCodigoBarras = data.CodigoBarras !== undefined ? data.CodigoBarras : existingData.CodigoBarras
      const newReferencia = data.Referencia !== undefined ? data.Referencia : existingData.Referencia

      if (!newCodigoBarras && !newReferencia) {
        return {
          isValid: false,
          message: "Debe mantener al menos un código de barras o una referencia",
        }
      }
    } else if (!isUpdate) {
      // En creación, validar que al menos uno esté presente
      if (!data.CodigoBarras && !data.Referencia) {
        return {
          isValid: false,
          message: "Debe proporcionar al menos un código de barras o una referencia",
        }
      }
    }

    return { isValid: true }
  },

  // Validar existencia de producto
  validateProductoExists: async (id) => {
    try {
      // ✅ CORRECCIÓN: Usar importación estática
      const producto = await productosModel.getById(id)

      if (!producto) {
        return {
          isValid: false,
          message: "Producto no encontrado",
        }
      }

      return {
        isValid: true,
        producto,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar producto",
        error: error.message,
      }
    }
  },

  // Validar unidad de medida
  validateUnidadMedida: (unidadMedida) => {
    const unidadesValidas = [
      "Unidad",
      "Kilogramo",
      "Libra",
      "Bulto",
      "Gramo",
      "Litro",
      "Mililitro",
      "Metro",
      "Centimetro",
    ]

    if (!unidadMedida) {
      return { isValid: true } // Es opcional
    }

    if (!unidadesValidas.includes(unidadMedida)) {
      return {
        isValid: false,
        message: "Unidad de medida no válida",
        unidadesValidas,
      }
    }

    return { isValid: true }
  },

  // Validar origen del producto
  validateOrigen: (origen) => {
    const origenesValidos = ["Catálogo", "Stock"]

    if (!origen) {
      return { isValid: true } // Es opcional, por defecto es "Catálogo"
    }

    if (!origenesValidos.includes(origen)) {
      return {
        isValid: false,
        message: "Origen no válido",
        origenesValidos,
      }
    }

    return { isValid: true }
  },

  // Validar código de barras único
  validateCodigoBarrasUnique: async (codigoBarras, excludeProductId = null) => {
    try {
      if (!codigoBarras) {
        return { isValid: true } // Es opcional
      }

      // ✅ CORRECCIÓN: Usar importación estática
      const existingProduct = await productosModel.getByBarcode(codigoBarras)

      if (existingProduct && (!excludeProductId || existingProduct.IdProducto !== Number.parseInt(excludeProductId))) {
        return {
          isValid: false,
          message: "Ya existe un producto con ese código de barras",
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar código de barras",
        error: error.message,
      }
    }
  },

  // Validar referencia única
  validateReferenciaUnique: async (referencia, excludeProductId = null) => {
    try {
      if (!referencia) {
        return { isValid: true } // Es opcional
      }

      // ✅ CORRECCIÓN: Usar importación estática
      const existingProduct = await productosModel.getByReference(referencia)

      if (existingProduct && (!excludeProductId || existingProduct.IdProducto !== Number.parseInt(excludeProductId))) {
        return {
          isValid: false,
          message: "Ya existe un producto con esa referencia",
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar referencia",
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

    return { isValid: true }
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

    return { isValid: true }
  },

  // Validar threshold para stock bajo
  validateStockThreshold: (threshold) => {
    const thresholdNum = Number.parseInt(threshold) || 10

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      return {
        isValid: false,
        message: "El umbral de stock debe ser un número válido mayor o igual a 0",
      }
    }

    return {
      isValid: true,
      threshold: thresholdNum,
    }
  },

  // Validar días para productos próximos a vencer
  validateExpiryDays: (days) => {
    const daysNum = Number.parseInt(days) || 30

    if (isNaN(daysNum) || daysNum < 1) {
      return {
        isValid: false,
        message: "Los días deben ser un número válido mayor a 0",
      }
    }

    if (daysNum > 365) {
      return {
        isValid: false,
        message: "Los días no pueden ser mayores a 365",
      }
    }

    return {
      isValid: true,
      days: daysNum,
    }
  },

  // Validar cantidad para actualización de stock
  validateStockQuantity: (cantidad) => {
    if (cantidad === undefined || cantidad === null) {
      return {
        isValid: false,
        message: "La cantidad es requerida",
      }
    }

    if (isNaN(cantidad)) {
      return {
        isValid: false,
        message: "La cantidad debe ser un número válido",
      }
    }

    return { isValid: true }
  },

  // Validar datos de variante
  validateVarianteData: (data, productoBase) => {
    const errors = []

    // La variante debe tener al menos un nombre o usar el del producto base
    if (!data.NombreProducto && !productoBase.NombreProducto) {
      errors.push("El nombre del producto es requerido para la variante")
    }

    // Validar que tenga código de barras o referencia única
    if (!data.CodigoBarras && !data.Referencia) {
      errors.push("La variante debe tener al menos un código de barras o una referencia")
    }

    // Validar precio si se proporciona
    if (data.Precio !== undefined && (isNaN(data.Precio) || data.Precio < 0)) {
      errors.push("El precio debe ser un número válido mayor o igual a 0")
    }

    // Validar stock si se proporciona
    if (data.Stock !== undefined && (isNaN(data.Stock) || data.Stock < 0)) {
      errors.push("El stock debe ser un número válido mayor o igual a 0")
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de variante inválidos" : null,
      errors,
    }
  },
}

// Reglas de negocio para productos
export const productsBusinessRules = {
  // Verificar si se puede eliminar una categoría
  canDeleteCategoria: async (categoriaId) => {
    try {
      // ✅ CORRECCIÓN: Usar importación estática
      const productos = await productosModel.getByCategoria(categoriaId)

      if (productos.length > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar la categoría porque tiene productos asociados",
          productos,
        }
      }

      return { canDelete: true }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias de la categoría",
        error: error.message,
      }
    }
  },

  // Verificar si se puede eliminar un producto
  canDeleteProducto: async (productoId) => {
    try {
      // ✅ CORRECCIÓN: Usar importación estática
      const variantes = await productosModel.getVariants(productoId)

      if (variantes.length > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar el producto porque tiene variantes asociadas",
          variantes,
        }
      }

      return { canDelete: true }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias del producto",
        error: error.message,
      }
    }
  },

  // Calcular precio de venta con margen
  calculateSalePrice: (precio, margenGanancia) => {
    if (!margenGanancia || margenGanancia === 0) {
      return precio
    }
    return Number.parseFloat((precio * (1 + margenGanancia / 100)).toFixed(2))
  },

  // Calcular precio con IVA
  calculatePriceWithIVA: (precioVenta, aplicaIVA, porcentajeIVA) => {
    if (!aplicaIVA || !porcentajeIVA || porcentajeIVA === 0) {
      return precioVenta
    }
    return Number.parseFloat((precioVenta * (1 + porcentajeIVA / 100)).toFixed(2))
  },

  // Verificar si un producto tiene stock bajo
  hasLowStock: (producto, threshold = 10) => {
    return producto.Stock <= threshold
  },

  // Verificar si un producto está próximo a vencer
  isNearExpiry: (producto, days = 30) => {
    if (!producto.FechaVencimiento) {
      return false
    }

    const fechaVencimiento = new Date(producto.FechaVencimiento)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + days)

    return fechaVencimiento <= fechaLimite && fechaVencimiento >= new Date()
  },

  // Verificar si se debe enviar notificación de stock bajo
  shouldNotifyLowStock: (producto, threshold = 10) => {
    return productsBusinessRules.hasLowStock(producto, threshold)
  },

  // Verificar si se debe enviar notificación de vencimiento
  shouldNotifyExpiry: (producto, days = 30) => {
    return productsBusinessRules.isNearExpiry(producto, days)
  },

  // Determinar el estado del producto basado en stock y vencimiento
  determineProductStatus: (producto) => {
    const hoy = new Date()

    // Si está vencido
    if (producto.FechaVencimiento && new Date(producto.FechaVencimiento) < hoy) {
      return "Vencido"
    }

    // Si está próximo a vencer (7 días)
    if (productsBusinessRules.isNearExpiry(producto, 7)) {
      return "Próximo a vencer"
    }

    // Si tiene stock bajo
    if (productsBusinessRules.hasLowStock(producto, 5)) {
      return "Stock crítico"
    }

    if (productsBusinessRules.hasLowStock(producto, 10)) {
      return "Stock bajo"
    }

    // Si no tiene stock
    if (producto.Stock === 0) {
      return "Sin stock"
    }

    return "Normal"
  },

  // Verificar si una variante puede ser creada
  canCreateVariant: (productoBase) => {
    if (!productoBase.Estado) {
      return {
        canCreate: false,
        message: "No se pueden crear variantes de un producto inactivo",
      }
    }

    return { canCreate: true }
  },

  // Verificar si una variante pertenece al producto base
  isValidVariant: (variante, productoBaseId) => {
    return variante.EsVariante && variante.ProductoBaseId == productoBaseId
  },
}