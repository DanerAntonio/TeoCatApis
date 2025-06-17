import { query } from "../../../Config/Database.js"

// Funciones auxiliares para el módulo de compras
export const purchasesHelpers = {
  // Procesar datos de proveedor para base de datos
  processProveedorDataForDB: (data) => {
    // Convertir estado de string a booleano si es necesario
    let estadoBooleano = data.Estado
    if (typeof data.Estado === "string") {
      estadoBooleano = data.Estado.toLowerCase() === "activo"
    }

    return {
      NombreEmpresa: data.NombreEmpresa?.trim(),
      Direccion: data.Direccion?.trim(),
      Documento: data.Documento?.trim(),
      Telefono: data.Telefono?.trim(),
      Correo: data.Correo?.trim(),
      PersonaDeContacto: data.PersonaDeContacto?.trim(),
      Estado: estadoBooleano !== undefined ? estadoBooleano : true,
    }
  },

  // Formatear respuesta de proveedor
  formatProveedorResponse: (proveedor) => {
    if (!proveedor) return null

    // Asegurar que el estado se maneje correctamente
    let estadoFormateado = "Inactivo" // valor por defecto

    if (typeof proveedor.Estado === "boolean") {
      estadoFormateado = proveedor.Estado ? "Activo" : "Inactivo"
    } else if (typeof proveedor.Estado === "string") {
      estadoFormateado = proveedor.Estado.toLowerCase() === "activo" ? "Activo" : "Inactivo"
    } else if (proveedor.Estado === 1) {
      estadoFormateado = "Activo"
    } else if (proveedor.Estado === 0) {
      estadoFormateado = "Inactivo"
    }

    return {
      id: proveedor.IdProveedor,
      IdProveedor: proveedor.IdProveedor,
      nombreEmpresa: proveedor.NombreEmpresa,
      NombreEmpresa: proveedor.NombreEmpresa,
      direccion: proveedor.Direccion,
      Direccion: proveedor.Direccion,
      documento: proveedor.Documento,
      Documento: proveedor.Documento,
      telefono: proveedor.Telefono,
      Telefono: proveedor.Telefono,
      correo: proveedor.Correo,
      Correo: proveedor.Correo,
      personaDeContacto: proveedor.PersonaDeContacto,
      PersonaDeContacto: proveedor.PersonaDeContacto,
      estado: estadoFormateado,
      Estado: estadoFormateado,
    }
  },

  // Formatear lista de proveedores
  formatProveedoresResponse: (proveedores) => {
    if (!Array.isArray(proveedores)) return []
    return proveedores.map(purchasesHelpers.formatProveedorResponse)
  },

  // Procesar datos de compra para base de datos
  processCompraDataForDB: (data) => {
    return {
      IdProveedor: data.IdProveedor,
      FechaCompra: data.FechaCompra || new Date(),
      TotalMonto: data.TotalMonto || 0,
      TotalIva: data.TotalIva || 0,
      TotalMontoConIva: data.TotalMontoConIva || 0,
      Estado: data.Estado || "Efectiva",
    }
  },

  // Formatear respuesta de compra
  formatCompraResponse: (compra) => {
    if (!compra) return null

    return {
      id: compra.IdCompra,
      proveedor: {
        id: compra.IdProveedor,
        nombreEmpresa: compra.nombreEmpresa || compra.NombreEmpresa,
        documento: compra.documento || compra.Documento,
        telefono: compra.telefono || compra.Telefono,
        personaDeContacto: compra.personaDeContacto || compra.PersonaDeContacto,
      },
      fechaCompra: compra.FechaCompra,
      totalMonto: compra.TotalMonto,
      totalIva: compra.TotalIva,
      totalMontoConIva: compra.TotalMontoConIva,
      estado: compra.Estado,
    }
  },

  // Formatear lista de compras
  formatComprasResponse: (compras) => {
    if (!Array.isArray(compras)) return []
    return compras.map(purchasesHelpers.formatCompraResponse)
  },

  // Procesar datos de detalle de compra para base de datos
  processDetalleCompraDataForDB: async (data, producto) => {
    // Usar ValorUnidad del producto en lugar de FactorConversion
    const valorUnidad = producto.ValorUnidad || 1
    const cantidadConvertida = data.Cantidad * valorUnidad

    // Calcular subtotal
    const precioUnitario = data.PrecioUnitario
    const subtotal = precioUnitario * data.Cantidad

    // Calcular IVA si aplica
    let ivaUnitario = 0
    if (producto.AplicaIVA) {
      ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
    }

    const subtotalConIva = subtotal + ivaUnitario * data.Cantidad

    // Calcular precio de venta sugerido si no se proporciona
    const margenGanancia = producto.MargenGanancia || 30
    const precioVentaSugerido = data.PrecioVentaSugerido || precioUnitario * (1 + margenGanancia / 100)

    return {
      IdProducto: data.IdProducto,
      IdCompra: data.IdCompra,
      Cantidad: data.Cantidad,
      UnidadMedida: producto.UnidadMedida || "Unidad",
      FactorConversion: valorUnidad, // Guardar ValorUnidad en FactorConversion
      CantidadConvertida: cantidadConvertida,
      PrecioUnitario: precioUnitario,
      Subtotal: subtotal,
      IvaUnitario: ivaUnitario,
      SubtotalConIva: subtotalConIva,
      PrecioVentaSugerido: precioVentaSugerido,
    }
  },

  // Formatear respuesta de detalle de compra
  formatDetalleCompraResponse: (detalle) => {
    if (!detalle) return null

    return {
      id: detalle.IdDetalleCompras,
      producto: {
        id: detalle.IdProducto,
        nombre: detalle.nombre || detalle.NombreProducto,
        codigoBarras: detalle.codigoBarras || detalle.CodigoBarras,
      },
      compra: {
        id: detalle.IdCompra,
      },
      cantidad: detalle.Cantidad,
      unidadMedida: detalle.UnidadMedida,
      factorConversion: detalle.FactorConversion,
      cantidadConvertida: detalle.CantidadConvertida,
      precioUnitario: detalle.PrecioUnitario,
      subtotal: detalle.Subtotal,
      ivaUnitario: detalle.IvaUnitario,
      subtotalConIva: detalle.SubtotalConIva,
      precioVentaSugerido: detalle.PrecioVentaSugerido,
    }
  },

  // Formatear lista de detalles de compra
  formatDetallesCompraResponse: (detalles) => {
    if (!Array.isArray(detalles)) return []
    return detalles.map(purchasesHelpers.formatDetalleCompraResponse)
  },

  // Calcular totales de una compra a partir de sus detalles
  calcularTotalesCompra: (detalles) => {
    let totalMonto = 0
    let totalIva = 0
    let totalMontoConIva = 0

    detalles.forEach((detalle) => {
      totalMonto += detalle.Subtotal || 0
      totalIva += (detalle.IvaUnitario || 0) * detalle.Cantidad
    })

    totalMontoConIva = totalMonto + totalIva

    return {
      TotalMonto: totalMonto,
      TotalIva: totalIva,
      TotalMontoConIva: totalMontoConIva,
    }
  },

  // Obtener datos completos de un producto
  getProductoCompleto: async (idProducto) => {
    try {
      const productos = await query(
        `SELECT p.*, 
          COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
          COALESCE(p.ValorUnidad, 1) as ValorUnidad,
          COALESCE(p.MargenGanancia, 30) as MargenGanancia,
          COALESCE(p.PorcentajeIVA, 19) as PorcentajeIVA,
          COALESCE(p.AplicaIVA, 1) as AplicaIVA
        FROM Productos p
        WHERE p.IdProducto = ?`,
        [idProducto],
      )

      if (productos.length === 0) {
        throw new Error(`Producto con ID ${idProducto} no encontrado`)
      }

      return productos[0]
    } catch (error) {
      console.error(`Error al obtener producto ${idProducto}:`, error)
      throw error
    }
  },

  // Actualizar stock de un producto
  updateProductStock: async (idProducto, cantidad, connection) => {
    try {
      const queryFunc = connection ? connection.query.bind(connection) : query

      console.log(`📦 Actualizando stock del producto ${idProducto}: ${cantidad > 0 ? "+" : ""}${cantidad}`)

      const [updateResult] = await queryFunc(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
        cantidad,
        idProducto,
      ])

      return updateResult
    } catch (error) {
      console.error(`Error al actualizar stock del producto ${idProducto}:`, error)
      throw error
    }
  },

  // Actualizar precio de venta de un producto
  updateProductPrecioVenta: async (idProducto, precioVenta, connection) => {
    try {
      const queryFunc = connection ? connection.query.bind(connection) : query

      console.log(`💰 Actualizando precio de venta del producto ${idProducto}: ${precioVenta}`)

      const [updateResult] = await queryFunc(`UPDATE Productos SET PrecioVenta = ? WHERE IdProducto = ?`, [
        precioVenta,
        idProducto,
      ])

      return updateResult
    } catch (error) {
      console.error(`Error al actualizar precio de venta del producto ${idProducto}:`, error)
      throw error
    }
  },

  // Obtener detalles de una compra
  getDetallesCompra: async (idCompra) => {
    try {
      const detalles = await query(
        `SELECT dc.*, p.NombreProducto as nombre, p.CodigoBarras as codigoBarras
        FROM DetalleCompras dc
        LEFT JOIN Productos p ON dc.IdProducto = p.IdProducto
        WHERE dc.IdCompra = ?`,
        [idCompra],
      )

      return detalles
    } catch (error) {
      console.error(`Error al obtener detalles de la compra ${idCompra}:`, error)
      throw error
    }
  },

  // Formatear datos para catálogo de proveedor
  formatCatalogoResponse: (catalogo) => {
    if (!Array.isArray(catalogo)) return []

    return catalogo.map((item) => ({
      producto: {
        id: item.IdProducto,
        nombre: item.NombreProducto,
        descripcion: item.Descripcion,
        codigoBarras: item.CodigoBarras,
        precio: item.Precio,
      },
      precioReferencia: item.PrecioReferencia,
      notas: item.Notas,
      estado: item.Estado ? "Activo" : "Inactivo",
      fechaActualizacion: item.FechaActualizacion,
    }))
  },

  // Procesar datos para catálogo de proveedor
  processCatalogoDataForDB: (data) => {
    return {
      IdProducto: data.IdProducto,
      PrecioReferencia: data.PrecioReferencia || 0,
      Notas: data.Notas || null,
      Estado: data.Estado !== undefined ? data.Estado : true,
    }
  },

  // Verificar si existe la tabla CatalogoProveedores
  checkCatalogoProveedoresTable: async () => {
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

  // Formatear fechas para consultas
  formatDateForQuery: (date) => {
    if (!date) return null

    const d = new Date(date)
    if (isNaN(d.getTime())) return null

    return d.toISOString().split("T")[0]
  },
}
