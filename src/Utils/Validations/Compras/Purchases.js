import { query } from "../../../Config/Database.js"

// Validaciones para el módulo de compras
export const purchasesValidations = {
  // Validar datos de proveedor
  validateProveedorData: (data, isUpdate = false) => {
    const errors = []

    // Validaciones para creación y actualización
    if (!isUpdate || data.NombreEmpresa !== undefined) {
      if (!data.NombreEmpresa || data.NombreEmpresa.trim() === "") {
        errors.push("El nombre de la empresa es requerido")
      } else if (data.NombreEmpresa.length < 2) {
        errors.push("El nombre de la empresa debe tener al menos 2 caracteres")
      } else if (data.NombreEmpresa.length > 100) {
        errors.push("El nombre de la empresa no puede exceder 100 caracteres")
      }
    }

    if (!isUpdate || data.Direccion !== undefined) {
      if (!data.Direccion || data.Direccion.trim() === "") {
        errors.push("La dirección es requerida")
      } else if (data.Direccion.length > 255) {
        errors.push("La dirección no puede exceder 255 caracteres")
      }
    }

    if (!isUpdate || data.Documento !== undefined) {
      if (!data.Documento || data.Documento.trim() === "") {
        errors.push("El documento es requerido")
      } else if (data.Documento.length > 20) {
        errors.push("El documento no puede exceder 20 caracteres")
      }
    }

    if (!isUpdate || data.Telefono !== undefined) {
      if (!data.Telefono || data.Telefono.trim() === "") {
        errors.push("El teléfono es requerido")
      } else if (data.Telefono.length > 20) {
        errors.push("El teléfono no puede exceder 20 caracteres")
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

    if (!isUpdate || data.PersonaDeContacto !== undefined) {
      if (!data.PersonaDeContacto || data.PersonaDeContacto.trim() === "") {
        errors.push("La persona de contacto es requerida")
      } else if (data.PersonaDeContacto.length > 100) {
        errors.push("La persona de contacto no puede exceder 100 caracteres")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de proveedor inválidos" : null,
      errors,
    }
  },

  // Validar existencia de proveedor
  validateProveedorExists: async (id) => {
    try {
      const { proveedoresModel } = await import("../../../Models/PurchaseService/purchases.model.js")
      const proveedor = await proveedoresModel.getById(id)

      if (!proveedor) {
        return {
          isValid: false,
          message: "Proveedor no encontrado",
        }
      }

      return {
        isValid: true,
        proveedor,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar proveedor",
        error: error.message,
      }
    }
  },

  // Validar documento único para proveedores
  validateDocumentoNotInUse: async (documento, excludeProveedorId = null) => {
    try {
      const { proveedoresModel } = await import("../../../Models/PurchaseService/purchases.model.js")
      const existingProveedor = await proveedoresModel.getByDocumento(documento)

      if (!existingProveedor) {
        return { isValid: true, message: null }
      }

      if (excludeProveedorId && existingProveedor.IdProveedor === Number.parseInt(excludeProveedorId)) {
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

  // Validar correo único para proveedores
  validateCorreoNotInUse: async (correo, excludeProveedorId = null) => {
    try {
      const { proveedoresModel } = await import("../../../Models/PurchaseService/purchases.model.js")
      const existingProveedor = await proveedoresModel.getByCorreo(correo)

      if (!existingProveedor) {
        return { isValid: true, message: null }
      }

      if (excludeProveedorId && existingProveedor.IdProveedor === Number.parseInt(excludeProveedorId)) {
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

  // Validar estado
  validateEstado: (estado) => {
    if (estado === undefined || estado === null) {
      return {
        isValid: false,
        message: "El estado es requerido",
      }
    }

    if (typeof estado !== "boolean" && typeof estado !== "string") {
      return {
        isValid: false,
        message: "El estado debe ser verdadero/falso o 'Activo'/'Inactivo'",
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

  // Validar datos de compra
  validateCompraData: (data, isUpdate = false) => {
    const errors = []

    // Validaciones para creación
    if (!isUpdate) {
      if (!data.IdProveedor) {
        errors.push("El proveedor es requerido")
      }
    }

    // Validaciones para actualización
    if (isUpdate) {
      if (data.Estado !== undefined) {
        const estadosValidos = ["Efectiva", "Cancelada"]
        if (!estadosValidos.includes(data.Estado)) {
          errors.push(`Estado no válido. Debe ser uno de: ${estadosValidos.join(", ")}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de compra inválidos" : null,
      errors,
    }
  },

  // Validar existencia de compra
  validateCompraExists: async (id) => {
    try {
      const { comprasModel } = await import("../../../Models/PurchaseService/purchases.model.js")
      const compra = await comprasModel.getById(id)

      if (!compra) {
        return {
          isValid: false,
          message: "Compra no encontrada",
        }
      }

      return {
        isValid: true,
        compra,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar compra",
        error: error.message,
      }
    }
  },

  // Validar estado de compra
  validateCompraEstado: (estado) => {
    const estadosValidos = ["Efectiva", "Cancelada"]

    if (!estado || !estadosValidos.includes(estado)) {
      return {
        isValid: false,
        message: `Estado no válido. Debe ser uno de: ${estadosValidos.join(", ")}`,
        estadosValidos,
      }
    }

    return {
      isValid: true,
    }
  },

  // Validar datos de detalle de compra
  validateDetalleCompraData: (data, isUpdate = false) => {
    const errors = []

    // Validaciones para creación
    if (!isUpdate) {
      if (!data.IdProducto) {
        errors.push("El producto es requerido")
      }

      if (!data.IdCompra) {
        errors.push("La compra es requerida")
      }
    }

    // Validaciones para creación y actualización
    if (!isUpdate || data.Cantidad !== undefined) {
      if (data.Cantidad === undefined || data.Cantidad === null) {
        errors.push("La cantidad es requerida")
      } else if (isNaN(data.Cantidad) || data.Cantidad <= 0) {
        errors.push("La cantidad debe ser un número mayor que cero")
      }
    }

    if (!isUpdate || data.PrecioUnitario !== undefined) {
      if (data.PrecioUnitario === undefined || data.PrecioUnitario === null) {
        errors.push("El precio unitario es requerido")
      } else if (isNaN(data.PrecioUnitario) || data.PrecioUnitario < 0) {
        errors.push("El precio unitario debe ser un número no negativo")
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de detalle de compra inválidos" : null,
      errors,
    }
  },

  // Validar existencia de detalle de compra
  validateDetalleCompraExists: async (id) => {
    try {
      const { detalleComprasModel } = await import("../../../Models/PurchaseService/purchases.model.js")
      const detalleCompra = await detalleComprasModel.getById(id)

      if (!detalleCompra) {
        return {
          isValid: false,
          message: "Detalle de compra no encontrado",
        }
      }

      return {
        isValid: true,
        detalleCompra,
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar detalle de compra",
        error: error.message,
      }
    }
  },

  // Validar existencia de producto
  validateProductoExists: async (id) => {
    try {
      const productos = await query(`SELECT * FROM Productos WHERE IdProducto = ?`, [id])

      if (productos.length === 0) {
        return {
          isValid: false,
          message: "Producto no encontrado",
        }
      }

      return {
        isValid: true,
        producto: productos[0],
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar producto",
        error: error.message,
      }
    }
  },

  // Validar rango de fechas
  validateDateRange: (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) {
      return {
        isValid: false,
        message: "Ambas fechas son requeridas",
      }
    }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return {
        isValid: false,
        message: "Formato de fecha inválido",
      }
    }

    if (inicio > fin) {
      return {
        isValid: false,
        message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      }
    }

    return {
      isValid: true,
      fechaInicio: inicio,
      fechaFin: fin,
    }
  },

  // Validar datos para catálogo de proveedor
  validateCatalogoData: (data) => {
    const errors = []

    if (!data.IdProducto) {
      errors.push("El producto es requerido")
    }

    if (data.PrecioReferencia !== undefined && (isNaN(data.PrecioReferencia) || data.PrecioReferencia < 0)) {
      errors.push("El precio de referencia debe ser un número no negativo")
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Datos de catálogo inválidos" : null,
      errors,
    }
  },

  // Validar existencia de producto en catálogo
  validateProductoInCatalogo: async (idProveedor, idProducto) => {
    try {
      // Intentar primero con la tabla CatalogoProveedores
      try {
        const catalogo = await query(`SELECT * FROM CatalogoProveedores WHERE IdProveedor = ? AND IdProducto = ?`, [
          idProveedor,
          idProducto,
        ])

        if (catalogo.length > 0) {
          return {
            isValid: true,
            catalogoItem: catalogo[0],
            source: "CatalogoProveedores",
          }
        }
      } catch (error) {
        // Si la tabla no existe, ignorar el error
        if (error.code !== "ER_NO_SUCH_TABLE") {
          throw error
        }
      }

      // Método alternativo si no existe la tabla o no se encontró el producto
      const productos = await query(
        `SELECT * FROM Productos WHERE IdProducto = ? AND Origen = 'Proveedor' AND IdProveedorPrincipal = ?`,
        [idProducto, idProveedor],
      )

      if (productos.length > 0) {
        return {
          isValid: true,
          catalogoItem: {
            IdProveedor: idProveedor,
            IdProducto: idProducto,
            PrecioReferencia: productos[0].PrecioCompra || productos[0].Precio,
            Notas: null,
            Estado: true,
          },
          source: "Productos",
        }
      }

      return {
        isValid: false,
        message: "Producto no encontrado en el catálogo del proveedor",
      }
    } catch (error) {
      return {
        isValid: false,
        message: "Error al verificar producto en catálogo",
        error: error.message,
      }
    }
  },

  // Validar detalles de compra
  validateDetallesCompra: (detalles) => {
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return {
        isValid: false,
        message: "Se requiere al menos un detalle de compra",
      }
    }

    const errors = []

    detalles.forEach((detalle, index) => {
      if (!detalle.IdProducto) {
        errors.push(`Detalle ${index + 1}: El producto es requerido`)
      }

      if (!detalle.Cantidad || isNaN(detalle.Cantidad) || detalle.Cantidad <= 0) {
        errors.push(`Detalle ${index + 1}: La cantidad debe ser un número mayor que cero`)
      }

      if (!detalle.PrecioUnitario || isNaN(detalle.PrecioUnitario) || detalle.PrecioUnitario < 0) {
        errors.push(`Detalle ${index + 1}: El precio unitario debe ser un número no negativo`)
      }
    })

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? "Detalles de compra inválidos" : null,
      errors,
    }
  },
}
