import { transaction, query } from "../../../Config/Database.js"

/**
 * Helpers para el módulo de ventas - OPTIMIZADOS CON TRANSACCIONES CORREGIDAS
 */
export const salesHelpers = {
  /**
   * Calcula los totales de una venta basado en sus detalles
   * @param {Array} detallesProductos - Detalles de productos
   * @param {Array} detallesServicios - Detalles de servicios
   * @returns {Object} Totales calculados
   */
  calcularTotalesVenta: (detallesProductos = [], detallesServicios = []) => {
    let subtotal = 0
    let totalIva = 0
    let totalMonto = 0

    // Calcular totales de productos
    detallesProductos.forEach((detalle) => {
      subtotal += detalle.Subtotal || 0
      totalIva += detalle.IvaUnitario * detalle.Cantidad || 0
    })

    // Calcular totales de servicios
    detallesServicios.forEach((detalle) => {
      subtotal += detalle.Subtotal || 0
      // Los servicios no tienen IVA en este sistema
    })

    totalMonto = subtotal + totalIva

    return {
      Subtotal: Number.parseFloat(subtotal.toFixed(2)),
      TotalIva: Number.parseFloat(totalIva.toFixed(2)),
      TotalMonto: Number.parseFloat(totalMonto.toFixed(2)),
    }
  },

  /**
   * Calcula el cambio a devolver basado en el monto recibido y el total
   * @param {number} montoRecibido - Monto recibido del cliente
   * @param {number} totalMonto - Total de la venta
   * @returns {number} Cambio a devolver
   */
  calcularCambio: (montoRecibido, totalMonto) => {
    return Number.parseFloat((montoRecibido - totalMonto).toFixed(2))
  },

  /**
   * Obtiene los datos completos de un producto y calcula valores para el detalle
   * @param {number} idProducto - ID del producto
   * @param {number} cantidad - Cantidad del producto
   * @param {number} precioUnitario - Precio unitario personalizado (opcional)
   * @param {Function} queryFn - Función de consulta (para transacciones)
   * @returns {Object} Valores calculados del detalle
   */
  calcularValoresDetalleProducto: async (idProducto, cantidad, precioUnitario = null, queryFn = query) => {
    // Obtener información completa del producto
    const [producto] = await queryFn(
      "SELECT Precio, PorcentajeIva, NombreProducto FROM Productos WHERE IdProducto = ?",
      [idProducto],
    )
    if (!producto) {
      throw new Error(`Producto con ID ${idProducto} no encontrado`)
    }

    // Usar precio del producto si no se proporciona uno personalizado
    const precio = precioUnitario !== null ? precioUnitario : producto.Precio
    const porcentajeIva = producto.PorcentajeIva || 0

    // Calcular valores
    const ivaUnitario = Number.parseFloat((precio * (porcentajeIva / 100)).toFixed(2))
    const subtotal = Number.parseFloat((precio * cantidad).toFixed(2))
    const subtotalConIva = Number.parseFloat((subtotal + ivaUnitario * cantidad).toFixed(2))

    return {
      IdProducto: idProducto,
      Cantidad: cantidad,
      PrecioUnitario: precio,
      IvaUnitario: ivaUnitario,
      Subtotal: subtotal,
      SubtotalConIva: subtotalConIva,
    }
  },

  /**
   * Obtiene los datos completos de un servicio y calcula valores para el detalle
   * @param {number} idServicio - ID del servicio
   * @param {number} cantidad - Cantidad del servicio
   * @param {number} precioUnitario - Precio unitario personalizado (opcional)
   * @param {Function} queryFn - Función de consulta (para transacciones)
   * @returns {Object} Valores calculados del detalle
   */
  calcularValoresDetalleServicio: async (idServicio, cantidad, precioUnitario = null, queryFn = query) => {
    // Obtener información completa del servicio
    const [servicio] = await queryFn("SELECT Precio, Nombre FROM Servicios WHERE IdServicio = ?", [idServicio])
    if (!servicio) {
      throw new Error(`Servicio con ID ${idServicio} no encontrado`)
    }

    // Usar precio del servicio si no se proporciona uno personalizado
    const precio = precioUnitario !== null ? precioUnitario : servicio.Precio
    const subtotal = Number.parseFloat((precio * cantidad).toFixed(2))

    return {
      IdServicio: idServicio,
      Cantidad: cantidad,
      PrecioUnitario: precio,
      Subtotal: subtotal,
    }
  },

  /**
   * Procesa automáticamente una venta completa - FUNCIÓN PRINCIPAL CON TRANSACCIONES CORREGIDAS
   * @param {Object} ventaData - Datos básicos de la venta
   * @param {Array} productos - Array de productos: [{IdProducto, Cantidad, PrecioUnitario?}]
   * @param {Array} servicios - Array de servicios: [{IdServicio, Cantidad, IdMascota?, NombreMascotaTemporal?, TipoMascotaTemporal?, PrecioUnitario?}]
   * @returns {Object} Venta procesada con sus detalles
   */
  procesarVentaCompleta: async (ventaData, productos = [], servicios = []) => {
    return await transaction(async (queryFn) => {
      // 1. Procesar productos automáticamente
      const detallesProductosProcesados = []
      for (const producto of productos) {
        const valores = await salesHelpers.calcularValoresDetalleProducto(
          producto.IdProducto,
          producto.Cantidad,
          producto.PrecioUnitario,
          queryFn,
        )
        detallesProductosProcesados.push(valores)
      }

      // 2. Procesar servicios automáticamente
      const detallesServiciosProcesados = []
      for (const servicio of servicios) {
        const valores = await salesHelpers.calcularValoresDetalleServicio(
          servicio.IdServicio,
          servicio.Cantidad,
          servicio.PrecioUnitario,
          queryFn,
        )

        // Agregar datos de mascota
        const detalleCompleto = {
          ...valores,
          IdMascota: servicio.IdMascota || null,
          NombreClienteTemporal: servicio.NombreClienteTemporal || ventaData.NombreClienteTemporal || null,
          DocumentoClienteTemporal: servicio.DocumentoClienteTemporal || ventaData.DocumentoClienteTemporal || null,
          NombreMascotaTemporal: servicio.NombreMascotaTemporal || null,
          TipoMascotaTemporal: servicio.TipoMascotaTemporal || null,
        }

        detallesServiciosProcesados.push(detalleCompleto)
      }

      // 3. Calcular totales automáticamente
      const totales = salesHelpers.calcularTotalesVenta(detallesProductosProcesados, detallesServiciosProcesados)

      // 4. Calcular cambio automáticamente
      let cambio = 0
      if (ventaData.MontoRecibido) {
        cambio = salesHelpers.calcularCambio(ventaData.MontoRecibido, totales.TotalMonto)
      }

      // 5. Crear la venta con todos los valores calculados
      const ventaCompleta = {
        ...ventaData,
        ...totales,
        Cambio: cambio,
        FechaVenta: ventaData.FechaVenta || new Date(),
        Estado: ventaData.Estado || "Efectiva",
        Tipo: ventaData.Tipo || "Venta",
        MetodoPago: ventaData.MetodoPago || "Efectivo",
      }

      // 6. Guardar la venta en la base de datos usando la transacción
      const result = await queryFn(
        `INSERT INTO Ventas 
        (IdCliente, IdUsuario, NombreClienteTemporal, DocumentoClienteTemporal, 
         FechaVenta, Subtotal, TotalIva, TotalMonto, MontoRecibido, Cambio, 
         NotasAdicionales, ComprobantePago, MetodoPago, ReferenciaPago, 
         Estado, Tipo, IdVentaOriginal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaCompleta.IdCliente || null,
          ventaCompleta.IdUsuario,
          ventaCompleta.NombreClienteTemporal || null,
          ventaCompleta.DocumentoClienteTemporal || null,
          ventaCompleta.FechaVenta,
          ventaCompleta.Subtotal,
          ventaCompleta.TotalIva,
          ventaCompleta.TotalMonto,
          ventaCompleta.MontoRecibido || 0,
          ventaCompleta.Cambio,
          ventaCompleta.NotasAdicionales || null,
          ventaCompleta.ComprobantePago || null,
          ventaCompleta.MetodoPago,
          ventaCompleta.ReferenciaPago || null,
          ventaCompleta.Estado,
          ventaCompleta.Tipo,
          ventaCompleta.IdVentaOriginal || null,
        ],
      )

      const ventaId = result.insertId

      // 7. Guardar automáticamente los detalles de productos
      for (const detalle of detallesProductosProcesados) {
        await queryFn(
          `INSERT INTO DetalleVentas 
          (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            detalle.IdProducto,
            detalle.Cantidad,
            detalle.PrecioUnitario,
            detalle.Subtotal,
            detalle.IvaUnitario,
            detalle.SubtotalConIva,
          ],
        )

        // 8. Actualizar automáticamente el stock del producto
        await queryFn("UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?", [
          detalle.Cantidad,
          detalle.IdProducto,
        ])
      }

      // 9. Guardar automáticamente los detalles de servicios
      for (const detalle of detallesServiciosProcesados) {
        await queryFn(
          `INSERT INTO DetalleVentasServicios 
          (IdServicio, IdVenta, IdMascota, NombreClienteTemporal, DocumentoClienteTemporal, 
           Cantidad, PrecioUnitario, Subtotal, NombreMascotaTemporal, TipoMascotaTemporal) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.IdServicio,
            ventaId,
            detalle.IdMascota,
            detalle.NombreClienteTemporal,
            detalle.DocumentoClienteTemporal,
            detalle.Cantidad,
            detalle.PrecioUnitario,
            detalle.Subtotal,
            detalle.NombreMascotaTemporal,
            detalle.TipoMascotaTemporal,
          ],
        )
      }

      // 10. Obtener y retornar la venta completa con sus detalles
      return await salesHelpers.obtenerVentaCompleta(ventaId, queryFn)
    })
  },

  /**
   * Actualiza el stock de un producto
   * @param {number} idProducto - ID del producto
   * @param {number} cantidad - Cantidad vendida
   */
  actualizarStockProducto: async (idProducto, cantidad) => {
    await query("UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?", [cantidad, idProducto])

    // Verificar si el stock quedó bajo y enviar notificación si es necesario
    const [producto] = await query("SELECT Stock, StockMinimo, NombreProducto FROM Productos WHERE IdProducto = ?", [
      idProducto,
    ])

    if (producto && producto.Stock <= (producto.StockMinimo || 0)) {
      // Aquí se podría enviar una notificación de stock bajo
      console.log(`⚠️ ALERTA: Stock bajo para ${producto.NombreProducto}. Stock actual: ${producto.Stock}`)
    }
  },

  /**
   * Obtiene una venta completa con sus detalles
   * @param {number} idVenta - ID de la venta
   * @param {Function} queryFn - Función de consulta (para transacciones)
   * @returns {Object} Venta con sus detalles
   */
  obtenerVentaCompleta: async (idVenta, queryFn = query) => {
    // Obtener la venta principal
    const [venta] = await queryFn(
      `SELECT v.*, 
     c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
     u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
     FROM Ventas v
     LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
     LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
     WHERE v.IdVenta = ?`,
      [idVenta],
    )

    if (!venta) {
      throw new Error("Venta no encontrada")
    }

    // Obtener detalles de productos
    const detallesProductos = await queryFn(
      `SELECT dv.*, p.NombreProducto, p.CodigoBarras
     FROM DetalleVentas dv
     LEFT JOIN Productos p ON dv.IdProducto = p.IdProducto
     WHERE dv.IdVenta = ?
     ORDER BY dv.IdDetalleVentas`,
      [idVenta],
    )

    // Obtener detalles de servicios
    const detallesServicios = await queryFn(
      `SELECT dvs.*, s.Nombre AS NombreServicio,
     m.Nombre AS NombreMascota, e.NombreEspecie AS TipoMascota
     FROM DetalleVentasServicios dvs
     LEFT JOIN Servicios s ON dvs.IdServicio = s.IdServicio
     LEFT JOIN Mascotas m ON dvs.IdMascota = m.IdMascota
     LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
     WHERE dvs.IdVenta = ?
     ORDER BY dvs.IdDetalleVentasServicios`,
      [idVenta],
    )

    return {
      ...venta,
      detallesProductos,
      detallesServicios,
    }
  },

  /**
   * Procesa una devolución de venta
   * @param {number} idVentaOriginal - ID de la venta original
   * @param {Array} detallesDevolucion - Detalles de productos a devolver
   * @param {Object} datosAdicionales - Datos adicionales para la devolución
   * @returns {Object} Devolución procesada
   */
  procesarDevolucion: async (idVentaOriginal, detallesDevolucion, datosAdicionales = {}) => {
    return await transaction(async (queryFn) => {
      // Obtener la venta original
      const [ventaOriginal] = await queryFn("SELECT * FROM Ventas WHERE IdVenta = ?", [idVentaOriginal])
      if (!ventaOriginal) {
        throw new Error("Venta original no encontrada")
      }

      // Verificar que la venta original esté efectiva
      if (ventaOriginal.Estado !== "Efectiva") {
        throw new Error("Solo se pueden procesar devoluciones de ventas efectivas")
      }

      // Procesar detalles de devolución
      const detallesProcesados = []
      let subtotalDevolucion = 0
      let totalIvaDevolucion = 0

      for (const detalle of detallesDevolucion) {
        // Verificar que el detalle exista en la venta original
        const [detalleOriginal] = await queryFn("SELECT * FROM DetalleVentas WHERE IdVenta = ? AND IdProducto = ?", [
          idVentaOriginal,
          detalle.IdProducto,
        ])

        if (!detalleOriginal) {
          throw new Error(`El producto con ID ${detalle.IdProducto} no existe en la venta original`)
        }

        // Verificar que la cantidad a devolver no sea mayor que la original
        if (detalle.Cantidad > detalleOriginal.Cantidad) {
          throw new Error(
            `La cantidad a devolver (${detalle.Cantidad}) es mayor que la cantidad original (${detalleOriginal.Cantidad})`,
          )
        }

        // Calcular valores para el detalle de devolución
        const subtotal = Number.parseFloat((detalleOriginal.PrecioUnitario * detalle.Cantidad).toFixed(2))
        const ivaTotal = Number.parseFloat((detalleOriginal.IvaUnitario * detalle.Cantidad).toFixed(2))

        subtotalDevolucion += subtotal
        totalIvaDevolucion += ivaTotal

        detallesProcesados.push({
          IdProducto: detalle.IdProducto,
          Cantidad: detalle.Cantidad,
          PrecioUnitario: detalleOriginal.PrecioUnitario,
          Subtotal: subtotal,
          IvaUnitario: detalleOriginal.IvaUnitario,
          SubtotalConIva: Number.parseFloat((subtotal + ivaTotal).toFixed(2)),
        })
      }

      // Crear la venta de devolución
      const totalMontoDevolucion = Number.parseFloat((subtotalDevolucion + totalIvaDevolucion).toFixed(2))

      const devolucionData = {
        IdCliente: ventaOriginal.IdCliente,
        IdUsuario: datosAdicionales.IdUsuario || ventaOriginal.IdUsuario,
        NombreClienteTemporal: ventaOriginal.NombreClienteTemporal,
        DocumentoClienteTemporal: ventaOriginal.DocumentoClienteTemporal,
        Subtotal: subtotalDevolucion,
        TotalIva: totalIvaDevolucion,
        TotalMonto: totalMontoDevolucion,
        MontoRecibido: 0,
        Cambio: 0,
        NotasAdicionales: datosAdicionales.NotasAdicionales || `Devolución de venta #${idVentaOriginal}`,
        MetodoPago: ventaOriginal.MetodoPago,
        Estado: "Efectiva",
        Tipo: "Devolucion",
        IdVentaOriginal: idVentaOriginal,
      }

      // Guardar la devolución en la base de datos
      const result = await queryFn(
        `INSERT INTO Ventas 
        (IdCliente, IdUsuario, NombreClienteTemporal, DocumentoClienteTemporal, 
         FechaVenta, Subtotal, TotalIva, TotalMonto, MontoRecibido, Cambio, 
         NotasAdicionales, ComprobantePago, MetodoPago, ReferenciaPago, 
         Estado, Tipo, IdVentaOriginal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          devolucionData.IdCliente,
          devolucionData.IdUsuario,
          devolucionData.NombreClienteTemporal,
          devolucionData.DocumentoClienteTemporal,
          new Date(),
          devolucionData.Subtotal,
          devolucionData.TotalIva,
          devolucionData.TotalMonto,
          devolucionData.MontoRecibido,
          devolucionData.Cambio,
          devolucionData.NotasAdicionales,
          null,
          devolucionData.MetodoPago,
          null,
          devolucionData.Estado,
          devolucionData.Tipo,
          devolucionData.IdVentaOriginal,
        ],
      )

      const devolucionId = result.insertId

      // Guardar los detalles de la devolución
      for (const detalle of detallesProcesados) {
        await queryFn(
          `INSERT INTO DetalleVentas 
          (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            devolucionId,
            detalle.IdProducto,
            detalle.Cantidad,
            detalle.PrecioUnitario,
            detalle.Subtotal,
            detalle.IvaUnitario,
            detalle.SubtotalConIva,
          ],
        )

        // Actualizar el stock del producto (sumar la cantidad devuelta)
        await queryFn("UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?", [
          detalle.Cantidad,
          detalle.IdProducto,
        ])
      }

      // Obtener la devolución completa con sus detalles
      return await salesHelpers.obtenerVentaCompleta(devolucionId, queryFn)
    })
  },

  /**
   * Genera un reporte de ventas por período
   * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
   * @returns {Object} Reporte de ventas
   */
  generarReporteVentas: async (fechaInicio, fechaFin) => {
    // Obtener ventas en el período
    const ventas = await query(
      `SELECT v.*, 
       c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
       u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
       FROM Ventas v
       LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
       LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
       WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
       AND v.Tipo = 'Venta'
       ORDER BY v.FechaVenta DESC`,
      [fechaInicio, fechaFin],
    )

    // Obtener devoluciones en el período
    const devoluciones = await query(
      `SELECT v.*, 
       c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
       u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
       FROM Ventas v
       LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
       LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
       WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
       AND v.Tipo = 'Devolucion'
       ORDER BY v.FechaVenta DESC`,
      [fechaInicio, fechaFin],
    )

    // Calcular totales
    let totalVentas = 0
    let totalIvaVentas = 0
    let totalDevoluciones = 0
    let totalIvaDevoluciones = 0

    ventas.forEach((venta) => {
      if (venta.Estado === "Efectiva") {
        totalVentas += venta.TotalMonto
        totalIvaVentas += venta.TotalIva
      }
    })

    devoluciones.forEach((devolucion) => {
      if (devolucion.Estado === "Efectiva") {
        totalDevoluciones += devolucion.TotalMonto
        totalIvaDevoluciones += devolucion.TotalIva
      }
    })

    // Calcular ventas netas
    const ventasNetas = Number.parseFloat((totalVentas - totalDevoluciones).toFixed(2))
    const ivaNeto = Number.parseFloat((totalIvaVentas - totalIvaDevoluciones).toFixed(2))

    // Obtener productos más vendidos
    const productosMasVendidos = await query(
      `SELECT p.IdProducto, p.NombreProducto, p.CodigoBarras, 
       SUM(dv.Cantidad) AS TotalVendido, 
       SUM(dv.Subtotal) AS TotalVentas
       FROM DetalleVentas dv
       INNER JOIN Productos p ON dv.IdProducto = p.IdProducto
       INNER JOIN Ventas v ON dv.IdVenta = v.IdVenta
       WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
       AND v.Tipo = 'Venta'
       AND v.Estado = 'Efectiva'
       GROUP BY p.IdProducto
       ORDER BY TotalVendido DESC
       LIMIT 10`,
      [fechaInicio, fechaFin],
    )

    // Obtener servicios más vendidos
    const serviciosMasVendidos = await query(
      `SELECT s.IdServicio, s.Nombre AS NombreServicio, 
       SUM(dvs.Cantidad) AS TotalVendido, 
       SUM(dvs.Subtotal) AS TotalVentas
       FROM DetalleVentasServicios dvs
       INNER JOIN Servicios s ON dvs.IdServicio = s.IdServicio
       INNER JOIN Ventas v ON dvs.IdVenta = v.IdVenta
       WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
       AND v.Tipo = 'Venta'
       AND v.Estado = 'Efectiva'
       GROUP BY s.IdServicio
       ORDER BY TotalVendido DESC
       LIMIT 10`,
      [fechaInicio, fechaFin],
    )

    // Obtener ventas por método de pago
    const ventasPorMetodoPago = await query(
      `SELECT MetodoPago, 
       COUNT(*) AS CantidadVentas, 
       SUM(TotalMonto) AS TotalVentas
       FROM Ventas
       WHERE DATE(FechaVenta) BETWEEN ? AND ?
       AND Tipo = 'Venta'
       AND Estado = 'Efectiva'
       GROUP BY MetodoPago`,
      [fechaInicio, fechaFin],
    )

    return {
      periodo: {
        fechaInicio,
        fechaFin,
      },
      resumen: {
        totalVentas: Number.parseFloat(totalVentas.toFixed(2)),
        totalIvaVentas: Number.parseFloat(totalIvaVentas.toFixed(2)),
        totalDevoluciones: Number.parseFloat(totalDevoluciones.toFixed(2)),
        totalIvaDevoluciones: Number.parseFloat(totalIvaDevoluciones.toFixed(2)),
        ventasNetas,
        ivaNeto,
      },
      cantidades: {
        totalVentas: ventas.filter((v) => v.Estado === "Efectiva").length,
        totalDevoluciones: devoluciones.filter((d) => d.Estado === "Efectiva").length,
      },
      productosMasVendidos,
      serviciosMasVendidos,
      ventasPorMetodoPago,
      ventas,
      devoluciones,
    }
  },

  /**
   * Verifica si hay suficiente stock para una lista de productos
   * @param {Array} productos - Array de productos con {IdProducto, Cantidad}
   * @returns {Object} Resultado de la verificación
   */
  verificarStockSuficiente: async (productos) => {
    for (const producto of productos) {
      const [productoDb] = await query("SELECT Stock, NombreProducto FROM Productos WHERE IdProducto = ?", [
        producto.IdProducto,
      ])

      if (!productoDb) {
        throw new Error(`Producto con ID ${producto.IdProducto} no encontrado`)
      }

      if (productoDb.Stock < producto.Cantidad) {
        return {
          suficiente: false,
          producto: {
            IdProducto: producto.IdProducto,
            NombreProducto: productoDb.NombreProducto,
            stockDisponible: productoDb.Stock,
            cantidadSolicitada: producto.Cantidad,
          },
        }
      }
    }

    return { suficiente: true }
  },
}

export default salesHelpers
