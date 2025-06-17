import { query } from "../../../Config/Database.js"

// Reglas de negocio para el módulo de compras
export const purchasesBusinessRules = {
  // ========== CÁLCULOS DE DETALLES ==========
  
  // Calcular todos los campos automáticos de un detalle de compra
  calculateDetalleFields: async (detalleInput, producto = null) => {
    try {
      // Si no se proporciona el producto, obtenerlo
      if (!producto) {
        producto = await purchasesBusinessRules.getProductoCompleto(detalleInput.IdProducto)
      }

      // Datos base del detalle
      const cantidad = Number(detalleInput.Cantidad)
      const precioUnitario = Number(detalleInput.PrecioUnitario)

      // Obtener datos del producto con valores por defecto
      const unidadMedida = producto.UnidadMedida || 'Unidad'
      const valorUnidad = Number(producto.ValorUnidad || 1)
      const porcentajeIVA = Number(producto.PorcentajeIVA || 0)
      const aplicaIVA = Boolean(producto.AplicaIVA)

      // Cálculos automáticos
      const cantidadConvertida = cantidad * valorUnidad
      const subtotal = cantidad * precioUnitario
      
      // Calcular IVA solo si aplica
      let ivaUnitario = 0
      if (aplicaIVA && porcentajeIVA > 0) {
        ivaUnitario = precioUnitario * (porcentajeIVA / 100)
      }
      
      const totalIvaDetalle = ivaUnitario * cantidad
      const subtotalConIva = subtotal + totalIvaDetalle

      return {
        IdCompra: detalleInput.IdCompra,
        IdProducto: detalleInput.IdProducto,
        Cantidad: cantidad,
        UnidadMedida: unidadMedida,
        FactorConversion: valorUnidad,
        CantidadConvertida: cantidadConvertida,
        PrecioUnitario: precioUnitario,
        Subtotal: Number(subtotal.toFixed(2)),
        IvaUnitario: Number(ivaUnitario.toFixed(2)),
        SubtotalConIva: Number(subtotalConIva.toFixed(2))
      }
    } catch (error) {
      console.error('Error al calcular campos del detalle:', error)
      throw error
    }
  },

  // ========== CÁLCULOS DE TOTALES ==========
  
  // Calcular totales de una compra basado en sus detalles
  calculateCompraTotals: (detalles) => {
    try {
      let totalMonto = 0
      let totalIva = 0

      detalles.forEach(detalle => {
        const subtotal = Number(detalle.Subtotal || 0)
        const ivaUnitario = Number(detalle.IvaUnitario || 0)
        const cantidad = Number(detalle.Cantidad || 0)

        totalMonto += subtotal
        totalIva += (ivaUnitario * cantidad)
      })

      const totalMontoConIva = totalMonto + totalIva

      return {
        TotalMonto: Number(totalMonto.toFixed(2)),
        TotalIva: Number(totalIva.toFixed(2)),
        TotalMontoConIva: Number(totalMontoConIva.toFixed(2))
      }
    } catch (error) {
      console.error('Error al calcular totales de compra:', error)
      throw error
    }
  },

  // ========== OPERACIONES DE STOCK ==========
  
  // Actualizar stock de un producto
  updateProductStock: async (idProducto, cantidad, connection = null) => {
    try {
      const queryFunc = connection ? connection.query.bind(connection) : query

      console.log(`📦 Actualizando stock del producto ${idProducto}: ${cantidad > 0 ? '+' : ''}${cantidad}`)

      const [updateResult] = await queryFunc(
        `UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`,
        [cantidad, idProducto]
      )

      return updateResult.affectedRows > 0
    } catch (error) {
      console.error(`Error al actualizar stock del producto ${idProducto}:`, error)
      throw error
    }
  },

  // Actualizar precio de venta de un producto
  updateProductPrecioVenta: async (idProducto, precioVenta, connection = null) => {
    try {
      const queryFunc = connection ? connection.query.bind(connection) : query

      console.log(`💰 Actualizando precio de venta del producto ${idProducto}: ${precioVenta}`)

      const [updateResult] = await queryFunc(
        `UPDATE Productos SET PrecioVenta = ? WHERE IdProducto = ?`,
        [precioVenta, idProducto]
      )

      return updateResult.affectedRows > 0
    } catch (error) {
      console.error(`Error al actualizar precio de venta del producto ${idProducto}:`, error)
      throw error
    }
  },

  // ========== UTILIDADES ==========
  
  // Obtener datos completos de un producto
  getProductoCompleto: async (idProducto) => {
    try {
      const productos = await query(`
        SELECT p.*, 
          COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
          COALESCE(p.ValorUnidad, 1) as ValorUnidad,
          COALESCE(p.PorcentajeIVA, 0) as PorcentajeIVA,
          COALESCE(p.AplicaIVA, 0) as AplicaIVA
        FROM Productos p
        WHERE p.IdProducto = ?
      `, [idProducto])

      if (productos.length === 0) {
        throw new Error(`Producto con ID ${idProducto} no encontrado`)
      }

      return productos[0]
    } catch (error) {
      console.error(`Error al obtener producto ${idProducto}:`, error)
      throw error
    }
  },

  // ========== VALIDACIONES DE NEGOCIO EXISTENTES ==========
  
  // Verificar si se puede eliminar un proveedor
  canDeleteProveedor: async (idProveedor) => {
    try {
      // Verificar si tiene compras asociadas
      const compras = await query(`SELECT COUNT(*) as count FROM Compras WHERE IdProveedor = ?`, [idProveedor])

      if (compras[0].count > 0) {
        return {
          canDelete: false,
          message: "No se puede eliminar el proveedor porque tiene compras asociadas",
          count: compras[0].count,
        }
      }

      // Verificar si tiene productos en catálogo
      try {
        const catalogo = await query(`SELECT COUNT(*) as count FROM CatalogoProveedores WHERE IdProveedor = ?`, [
          idProveedor,
        ])

        if (catalogo[0].count > 0) {
          return {
            canDelete: false,
            message: "No se puede eliminar el proveedor porque tiene productos en su catálogo",
            count: catalogo[0].count,
          }
        }
      } catch (error) {
        // Si la tabla no existe, ignorar el error
        if (error.code !== "ER_NO_SUCH_TABLE") {
          throw error
        }
      }

      return {
        canDelete: true,
      }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias del proveedor",
        error: error.message,
      }
    }
  },

  // Verificar si se puede eliminar una compra
  canDeleteCompra: async (idCompra) => {
    try {
      // Verificar si la compra tiene detalles
      const detalles = await query(`SELECT COUNT(*) as count FROM DetalleCompras WHERE IdCompra = ?`, [idCompra])

      // Si tiene detalles, se puede eliminar pero hay que revertir el stock
      if (detalles[0].count > 0) {
        return {
          canDelete: true,
          requiresStockReversal: true,
          message: "La compra tiene detalles asociados. Se revertirá el stock al eliminar.",
          count: detalles[0].count,
        }
      }

      return {
        canDelete: true,
        requiresStockReversal: false,
      }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias de la compra",
        error: error.message,
      }
    }
  },

  // Verificar si se puede eliminar un detalle de compra
  canDeleteDetalleCompra: async (idDetalleCompra) => {
    try {
      // Obtener el detalle para verificar la cantidad
      const detalles = await query(`SELECT * FROM DetalleCompras WHERE IdDetalleCompras = ?`, [idDetalleCompra])

      if (detalles.length === 0) {
        return {
          canDelete: false,
          message: "Detalle de compra no encontrado",
        }
      }

      const detalle = detalles[0]

      // Verificar si hay suficiente stock para revertir
      const productos = await query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [detalle.IdProducto])

      if (productos.length === 0) {
        return {
          canDelete: false,
          message: "Producto no encontrado",
        }
      }

      const stockActual = productos[0].Stock

      if (stockActual < detalle.Cantidad) {
        return {
          canDelete: false,
          message: `No hay suficiente stock para revertir. Stock actual: ${stockActual}, Cantidad a revertir: ${detalle.Cantidad}`,
          stockActual,
          cantidadRevertir: detalle.Cantidad,
        }
      }

      return {
        canDelete: true,
        requiresStockReversal: true,
        detalle,
      }
    } catch (error) {
      return {
        canDelete: false,
        message: "Error al verificar dependencias del detalle de compra",
        error: error.message,
      }
    }
  },

  // Verificar si se debe actualizar el precio de venta
  shouldUpdatePrecioVenta: (detalle) => {
    return detalle.actualizarPrecioVenta === true && detalle.PrecioVentaSugerido > 0
  },

  // Verificar si se puede cambiar el estado de una compra
  canChangeCompraEstado: async (idCompra, nuevoEstado) => {
    try {
      // Obtener la compra actual
      const compras = await query(`SELECT * FROM Compras WHERE IdCompra = ?`, [idCompra])

      if (compras.length === 0) {
        return {
          canChange: false,
          message: "Compra no encontrada",
        }
      }

      const compra = compras[0]

      // Si el estado es el mismo, no hay cambio
      if (compra.Estado === nuevoEstado) {
        return {
          canChange: false,
          message: `La compra ya tiene el estado ${nuevoEstado}`,
        }
      }

      // Si se está cancelando una compra efectiva
      if (compra.Estado === "Efectiva" && nuevoEstado === "Cancelada") {
        // Verificar si hay suficiente stock para revertir
        const detalles = await query(
          `SELECT dc.*, p.Stock FROM DetalleCompras dc
                                     JOIN Productos p ON dc.IdProducto = p.IdProducto
                                     WHERE dc.IdCompra = ?`,
          [idCompra],
        )

        for (const detalle of detalles) {
          if (detalle.Stock < detalle.Cantidad) {
            return {
              canChange: false,
              message: `No hay suficiente stock para cancelar la compra. Producto ID ${detalle.IdProducto} tiene ${detalle.Stock} unidades, pero se requieren ${detalle.Cantidad}.`,
              producto: detalle.IdProducto,
              stockActual: detalle.Stock,
              cantidadRevertir: detalle.Cantidad,
            }
          }
        }

        return {
          canChange: true,
          requiresStockReversal: true,
          detalles,
        }
      }

      // Si se está activando una compra cancelada
      if (compra.Estado === "Cancelada" && nuevoEstado === "Efectiva") {
        return {
          canChange: true,
          requiresStockUpdate: true,
        }
      }

      return {
        canChange: true,
      }
    } catch (error) {
      return {
        canChange: false,
        message: "Error al verificar cambio de estado de la compra",
        error: error.message,
      }
    }
  },

  // Determinar si un producto ya existe en el catálogo
  isProductInCatalogo: async (idProveedor, idProducto) => {
    try {
      // Intentar primero con la tabla CatalogoProveedores
      try {
        const catalogo = await query(
          `SELECT COUNT(*) as count FROM CatalogoProveedores WHERE IdProveedor = ? AND IdProducto = ?`,
          [idProveedor, idProducto],
        )

        if (catalogo[0].count > 0) {
          return true
        }
      } catch (error) {
        // Si la tabla no existe, ignorar el error
        if (error.code !== "ER_NO_SUCH_TABLE") {
          throw error
        }
      }

      // Método alternativo si no existe la tabla
      const productos = await query(
        `SELECT COUNT(*) as count FROM Productos WHERE IdProducto = ? AND Origen = 'Proveedor' AND IdProveedorPrincipal = ?`,
        [idProducto, idProveedor],
      )

      return productos[0].count > 0
    } catch (error) {
      console.error("Error al verificar producto en catálogo:", error)
      return false
    }
  },

  // Determinar si se debe usar la tabla CatalogoProveedores o el método alternativo
  shouldUseCatalogoTable: async () => {
    try {
      await query(`SELECT 1 FROM CatalogoProveedores LIMIT 1`)
      return true
    } catch (error) {
      if (error.code === "ER_NO_SUCH_TABLE") {
        return false
      }
      throw error
    }
  },

  // Verificar si una compra puede ser actualizada
  canUpdateCompra: async (idCompra, nuevosDetalles) => {
    try {
      // Obtener la compra actual
      const compras = await query(`SELECT * FROM Compras WHERE IdCompra = ?`, [idCompra])

      if (compras.length === 0) {
        return {
          canUpdate: false,
          message: "Compra no encontrada",
        }
      }

      const compra = compras[0]

      // Si la compra está cancelada, no se puede actualizar
      if (compra.Estado === "Cancelada") {
        return {
          canUpdate: false,
          message: "No se puede actualizar una compra cancelada",
        }
      }

      // Obtener los detalles actuales para verificar stock
      const detallesActuales = await query(
        `SELECT dc.*, p.Stock FROM DetalleCompras dc
                                          JOIN Productos p ON dc.IdProducto = p.IdProducto
                                          WHERE dc.IdCompra = ?`,
        [idCompra],
      )

      // Verificar si hay suficiente stock para revertir
      for (const detalleActual of detallesActuales) {
        // Buscar si el producto sigue en los nuevos detalles
        const nuevoDetalle = nuevosDetalles.find((d) => d.IdProducto === detalleActual.IdProducto)

        // Si el producto ya no está o la cantidad disminuyó
        if (!nuevoDetalle || nuevoDetalle.Cantidad < detalleActual.Cantidad) {
          const cantidadARevertir = !nuevoDetalle
            ? detalleActual.Cantidad
            : detalleActual.Cantidad - nuevoDetalle.Cantidad

          if (detalleActual.Stock < cantidadARevertir) {
            return {
              canUpdate: false,
              message: `No hay suficiente stock para actualizar la compra. Producto ID ${detalleActual.IdProducto} tiene ${detalleActual.Stock} unidades, pero se requieren ${cantidadARevertir}.`,
              producto: detalleActual.IdProducto,
              stockActual: detalleActual.Stock,
              cantidadRevertir: cantidadARevertir,
            }
          }
        }
      }

      return {
        canUpdate: true,
        detallesActuales,
      }
    } catch (error) {
      return {
        canUpdate: false,
        message: "Error al verificar actualización de la compra",
        error: error.message,
      }
    }
  },

  // Verificar si un detalle de compra puede ser actualizado
  canUpdateDetalleCompra: async (idDetalleCompra, nuevaCantidad) => {
    try {
      // Obtener el detalle actual
      const detalles = await query(
        `SELECT dc.*, p.Stock FROM DetalleCompras dc
                                  JOIN Productos p ON dc.IdProducto = p.IdProducto
                                  WHERE dc.IdDetalleCompras = ?`,
        [idDetalleCompra],
      )

      if (detalles.length === 0) {
        return {
          canUpdate: false,
          message: "Detalle de compra no encontrado",
        }
      }

      const detalle = detalles[0]

      // Obtener la compra para verificar estado
      const compras = await query(`SELECT * FROM Compras WHERE IdCompra = ?`, [detalle.IdCompra])

      if (compras.length === 0) {
        return {
          canUpdate: false,
          message: "Compra no encontrada",
        }
      }

      const compra = compras[0]

      // Si la compra está cancelada, no se puede actualizar
      if (compra.Estado === "Cancelada") {
        return {
          canUpdate: false,
          message: "No se puede actualizar un detalle de una compra cancelada",
        }
      }

      // Si la cantidad disminuye, verificar stock
      if (nuevaCantidad < detalle.Cantidad) {
        const cantidadARevertir = detalle.Cantidad - nuevaCantidad

        if (detalle.Stock < cantidadARevertir) {
          return {
            canUpdate: false,
            message: `No hay suficiente stock para actualizar el detalle. Producto ID ${detalle.IdProducto} tiene ${detalle.Stock} unidades, pero se requieren ${cantidadARevertir}.`,
            stockActual: detalle.Stock,
            cantidadRevertir: cantidadARevertir,
          }
        }
      }

      return {
        canUpdate: true,
        detalle,
        compra,
      }
    } catch (error) {
      return {
        canUpdate: false,
        message: "Error al verificar actualización del detalle de compra",
        error: error.message,
      }
    }
  },

  // Formatear fechas para consultas
  formatDateForQuery: (date) => {
    if (!date) return null

    const d = new Date(date)
    if (isNaN(d.getTime())) return null

    return d.toISOString().split('T')[0]
  }
}