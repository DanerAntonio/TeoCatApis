import { query } from "../../../Config/Database.js"

/**
 * Validaciones para el módulo de ventas - OPTIMIZADAS PARA CREACIÓN AUTOMÁTICA
 */
export const salesValidations = {
  /**
   * Valida los datos básicos de una venta (sin detalles)
   * @param {Object} ventaData - Datos de la venta a validar
   * @returns {Object} Resultado de la validación
   */
  validarVenta: (ventaData) => {
    const errores = []

    // Validar que se proporcione un usuario
    if (!ventaData.IdUsuario) {
      errores.push("El ID del usuario es obligatorio")
    }

    // Validar que si no hay cliente registrado, se proporcione un cliente temporal
    if (!ventaData.IdCliente && (!ventaData.NombreClienteTemporal || !ventaData.DocumentoClienteTemporal)) {
      errores.push("Debe proporcionar un cliente registrado o los datos temporales del cliente (nombre y documento)")
    }

    // Validar método de pago
    if (ventaData.MetodoPago) {
      const metodosValidos = ["Efectivo", "Transferencia", "CodigoQR"]
      if (!metodosValidos.includes(ventaData.MetodoPago)) {
        errores.push(`Método de pago inválido. Valores permitidos: ${metodosValidos.join(", ")}`)
      }

      // Si es transferencia o código QR, debe tener referencia de pago (excepto para ventas pendientes)
      if (
        (ventaData.MetodoPago === "Transferencia" || ventaData.MetodoPago === "CodigoQR") &&
        !ventaData.ReferenciaPago &&
        ventaData.Estado !== "Pendiente"
      ) {
        errores.push(`Para pagos con ${ventaData.MetodoPago} se requiere una referencia de pago`)
      }
    }

    // Validar estado
    if (ventaData.Estado) {
      const estadosValidos = ["Efectiva", "Pendiente", "Cancelada", "Devuelta"]
      if (!estadosValidos.includes(ventaData.Estado)) {
        errores.push(`Estado inválido. Valores permitidos: ${estadosValidos.join(", ")}`)
      }
    }

    // Validar tipo
    if (ventaData.Tipo) {
      const tiposValidos = ["Venta", "Devolucion"]
      if (!tiposValidos.includes(ventaData.Tipo)) {
        errores.push(`Tipo inválido. Valores permitidos: ${tiposValidos.join(", ")}`)
      }

      // Si es devolución, debe tener venta original
      if (ventaData.Tipo === "Devolucion" && !ventaData.IdVentaOriginal) {
        errores.push("Para devoluciones se requiere el ID de la venta original")
      }
    }

    // Validar montos (solo si se proporcionan)
    if (ventaData.MontoRecibido !== undefined && ventaData.MontoRecibido < 0) {
      errores.push("El monto recibido no puede ser negativo")
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida los datos simplificados de productos para venta automática
   * @param {Array} productos - Array de productos con {IdProducto, Cantidad}
   * @returns {Object} Resultado de la validación
   */
  validarProductosVenta: (productos) => {
    const errores = []

    if (!Array.isArray(productos)) {
      errores.push("Los productos deben ser un array")
      return { esValido: false, errores }
    }

    productos.forEach((producto, index) => {
      // Validar ID del producto
      if (!producto.IdProducto) {
        errores.push(`Producto ${index + 1}: El ID del producto es obligatorio`)
      }

      // Validar cantidad
      if (!producto.Cantidad) {
        errores.push(`Producto ${index + 1}: La cantidad es obligatoria`)
      } else if (producto.Cantidad <= 0) {
        errores.push(`Producto ${index + 1}: La cantidad debe ser mayor que cero`)
      }

      // Validar precio unitario personalizado (opcional)
      if (producto.PrecioUnitario !== undefined && producto.PrecioUnitario < 0) {
        errores.push(`Producto ${index + 1}: El precio unitario no puede ser negativo`)
      }
    })

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida los datos simplificados de servicios para venta automática
   * @param {Array} servicios - Array de servicios con {IdServicio, Cantidad, IdMascota o datos temporales}
   * @returns {Object} Resultado de la validación
   */
  validarServiciosVenta: (servicios) => {
    const errores = []

    if (!Array.isArray(servicios)) {
      errores.push("Los servicios deben ser un array")
      return { esValido: false, errores }
    }

    servicios.forEach((servicio, index) => {
      // Validar ID del servicio
      if (!servicio.IdServicio) {
        errores.push(`Servicio ${index + 1}: El ID del servicio es obligatorio`)
      }

      // Validar cantidad
      if (!servicio.Cantidad) {
        errores.push(`Servicio ${index + 1}: La cantidad es obligatoria`)
      } else if (servicio.Cantidad <= 0) {
        errores.push(`Servicio ${index + 1}: La cantidad debe ser mayor que cero`)
      }

      // Validar mascota (registrada o temporal)
      if (!servicio.IdMascota && !servicio.NombreMascotaTemporal) {
        errores.push(
          `Servicio ${index + 1}: Debe proporcionar una mascota registrada (IdMascota) o el nombre temporal de la mascota`,
        )
      }

      // Validar precio unitario personalizado (opcional)
      if (servicio.PrecioUnitario !== undefined && servicio.PrecioUnitario < 0) {
        errores.push(`Servicio ${index + 1}: El precio unitario no puede ser negativo`)
      }
    })

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida que una venta completa tenga al menos productos o servicios
   * @param {Array} productos - Array de productos
   * @param {Array} servicios - Array de servicios
   * @returns {Object} Resultado de la validación
   */
  validarVentaTieneItems: (productos = [], servicios = []) => {
    const errores = []

    if (productos.length === 0 && servicios.length === 0) {
      errores.push("La venta debe incluir al menos un producto o un servicio")
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida los datos de un detalle de venta (para casos excepcionales)
   * @param {Object} detalleData - Datos del detalle a validar
   * @returns {Object} Resultado de la validación
   */
  validarDetalleVenta: (detalleData) => {
    const errores = []

    // Validar campos obligatorios
    if (!detalleData.IdVenta) {
      errores.push("El ID de la venta es obligatorio")
    }

    if (!detalleData.IdProducto) {
      errores.push("El ID del producto es obligatorio")
    }

    if (!detalleData.Cantidad) {
      errores.push("La cantidad es obligatoria")
    } else if (detalleData.Cantidad <= 0) {
      errores.push("La cantidad debe ser mayor que cero")
    }

    if (!detalleData.PrecioUnitario && detalleData.PrecioUnitario !== 0) {
      errores.push("El precio unitario es obligatorio")
    } else if (detalleData.PrecioUnitario < 0) {
      errores.push("El precio unitario no puede ser negativo")
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida los datos de un detalle de servicio (para casos excepcionales)
   * @param {Object} detalleData - Datos del detalle a validar
   * @returns {Object} Resultado de la validación
   */
  validarDetalleServicio: (detalleData) => {
    const errores = []

    // Validar campos obligatorios
    if (!detalleData.IdVenta) {
      errores.push("El ID de la venta es obligatorio")
    }

    if (!detalleData.IdServicio) {
      errores.push("El ID del servicio es obligatorio")
    }

    // Validar que si no hay mascota registrada, se proporcione una mascota temporal
    if (!detalleData.IdMascota && !detalleData.NombreMascotaTemporal) {
      errores.push("Debe proporcionar una mascota registrada o el nombre temporal de la mascota")
    }

    if (!detalleData.Cantidad) {
      errores.push("La cantidad es obligatoria")
    } else if (detalleData.Cantidad <= 0) {
      errores.push("La cantidad debe ser mayor que cero")
    }

    if (!detalleData.PrecioUnitario && detalleData.PrecioUnitario !== 0) {
      errores.push("El precio unitario es obligatorio")
    } else if (detalleData.PrecioUnitario < 0) {
      errores.push("El precio unitario no puede ser negativo")
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida que exista un cliente
   * @param {number} idCliente - ID del cliente a validar
   * @returns {Promise<boolean>} True si el cliente existe, false en caso contrario
   */
  validarExistenciaCliente: async (idCliente) => {
    if (!idCliente) return false

    const [cliente] = await query("SELECT IdCliente FROM Clientes WHERE IdCliente = ?", [idCliente])
    return !!cliente
  },

  /**
   * Valida que exista un usuario
   * @param {number} idUsuario - ID del usuario a validar
   * @returns {Promise<boolean>} True si el usuario existe, false en caso contrario
   */
  validarExistenciaUsuario: async (idUsuario) => {
    if (!idUsuario) return false

    const [usuario] = await query("SELECT IdUsuario FROM Usuarios WHERE IdUsuario = ?", [idUsuario])
    return !!usuario
  },

  /**
   * Valida que exista un producto
   * @param {number} idProducto - ID del producto a validar
   * @returns {Promise<boolean>} True si el producto existe, false en caso contrario
   */
  validarExistenciaProducto: async (idProducto) => {
    if (!idProducto) return false

    const [producto] = await query("SELECT IdProducto FROM Productos WHERE IdProducto = ?", [idProducto])
    return !!producto
  },

  /**
   * Valida que exista un servicio
   * @param {number} idServicio - ID del servicio a validar
   * @returns {Promise<boolean>} True si el servicio existe, false en caso contrario
   */
  validarExistenciaServicio: async (idServicio) => {
    if (!idServicio) return false

    const [servicio] = await query("SELECT IdServicio FROM Servicios WHERE IdServicio = ?", [idServicio])
    return !!servicio
  },

  /**
   * Valida que exista una mascota
   * @param {number} idMascota - ID de la mascota a validar
   * @returns {Promise<boolean>} True si la mascota existe, false en caso contrario
   */
  validarExistenciaMascota: async (idMascota) => {
    if (!idMascota) return false

    const [mascota] = await query("SELECT IdMascota FROM Mascotas WHERE IdMascota = ?", [idMascota])
    return !!mascota
  },

  /**
   * Valida que exista una venta
   * @param {number} idVenta - ID de la venta a validar
   * @returns {Promise<boolean>} True si la venta existe, false en caso contrario
   */
  validarExistenciaVenta: async (idVenta) => {
    if (!idVenta) return false

    const [venta] = await query("SELECT IdVenta FROM Ventas WHERE IdVenta = ?", [idVenta])
    return !!venta
  },

  /**
   * Valida que todos los productos existan y tengan stock suficiente
   * @param {Array} productos - Array de productos con {IdProducto, Cantidad}
   * @returns {Promise<Object>} Resultado de la validación
   */
  validarProductosExistenciaYStock: async (productos) => {
    const errores = []

    for (const producto of productos) {
      // Verificar existencia del producto
      const [productoDb] = await query("SELECT IdProducto, NombreProducto, Stock FROM Productos WHERE IdProducto = ?", [
        producto.IdProducto,
      ])

      if (!productoDb) {
        errores.push(`El producto con ID ${producto.IdProducto} no existe`)
        continue
      }

      // Verificar stock suficiente
      if (productoDb.Stock < producto.Cantidad) {
        errores.push(
          `Stock insuficiente para ${productoDb.NombreProducto}. Stock disponible: ${productoDb.Stock}, cantidad solicitada: ${producto.Cantidad}`,
        )
      }
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida que todos los servicios existan
   * @param {Array} servicios - Array de servicios con {IdServicio}
   * @returns {Promise<Object>} Resultado de la validación
   */
  validarServiciosExistencia: async (servicios) => {
    const errores = []

    for (const servicio of servicios) {
      // Verificar existencia del servicio
      const [servicioDb] = await query("SELECT IdServicio, Nombre FROM Servicios WHERE IdServicio = ?", [
        servicio.IdServicio,
      ])

      if (!servicioDb) {
        errores.push(`El servicio con ID ${servicio.IdServicio} no existe`)
        continue
      }

      // Verificar existencia de mascota si se proporciona
      if (servicio.IdMascota) {
        const [mascotaDb] = await query("SELECT IdMascota, Nombre FROM Mascotas WHERE IdMascota = ?", [
          servicio.IdMascota,
        ])

        if (!mascotaDb) {
          errores.push(`La mascota con ID ${servicio.IdMascota} no existe`)
        }
      }
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },

  /**
   * Valida los datos para una devolución
   * @param {number} idVentaOriginal - ID de la venta original
   * @param {Array} detallesDevolucion - Detalles de productos a devolver
   * @returns {Promise<Object>} Resultado de la validación
   */
  validarDatosDevolucion: async (idVentaOriginal, detallesDevolucion) => {
    const errores = []

    // Validar que exista la venta original
    const ventaExiste = await salesValidations.validarExistenciaVenta(idVentaOriginal)
    if (!ventaExiste) {
      errores.push("La venta original no existe")
      return { esValido: false, errores }
    }

    // Obtener la venta original
    const [ventaOriginal] = await query("SELECT * FROM Ventas WHERE IdVenta = ?", [idVentaOriginal])

    // Validar que la venta original sea de tipo Venta
    if (ventaOriginal.Tipo !== "Venta") {
      errores.push("Solo se pueden procesar devoluciones de ventas, no de devoluciones")
    }

    // Validar que la venta original esté efectiva
    if (ventaOriginal.Estado !== "Efectiva") {
      errores.push("Solo se pueden procesar devoluciones de ventas efectivas")
    }

    // Validar que se proporcionen detalles para la devolución
    if (!detallesDevolucion || detallesDevolucion.length === 0) {
      errores.push("Debe proporcionar al menos un producto para la devolución")
      return { esValido: false, errores }
    }

    // Validar cada detalle de la devolución
    for (const detalle of detallesDevolucion) {
      // Validar que se proporcione el ID del producto
      if (!detalle.IdProducto) {
        errores.push("El ID del producto es obligatorio para cada detalle de devolución")
        continue
      }

      // Validar que se proporcione la cantidad
      if (!detalle.Cantidad || detalle.Cantidad <= 0) {
        errores.push(`La cantidad para el producto ${detalle.IdProducto} debe ser mayor que cero`)
        continue
      }

      // Verificar que el producto exista en la venta original
      const [detalleOriginal] = await query("SELECT * FROM DetalleVentas WHERE IdVenta = ? AND IdProducto = ?", [
        idVentaOriginal,
        detalle.IdProducto,
      ])

      if (!detalleOriginal) {
        errores.push(`El producto con ID ${detalle.IdProducto} no existe en la venta original`)
        continue
      }

      // Verificar que la cantidad a devolver no sea mayor que la original
      if (detalle.Cantidad > detalleOriginal.Cantidad) {
        errores.push(
          `La cantidad a devolver (${detalle.Cantidad}) es mayor que la cantidad original (${detalleOriginal.Cantidad}) para el producto ${detalle.IdProducto}`,
        )
      }
    }

    return {
      esValido: errores.length === 0,
      errores,
      ventaOriginal: ventaOriginal,
    }
  },

  /**
   * Valida los datos para un reporte de ventas
   * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
   * @returns {Object} Resultado de la validación
   */
  validarDatosReporte: (fechaInicio, fechaFin) => {
    const errores = []

    // Validar que se proporcionen ambas fechas
    if (!fechaInicio) {
      errores.push("La fecha de inicio es obligatoria")
    }

    if (!fechaFin) {
      errores.push("La fecha de fin es obligatoria")
    }

    // Validar formato de fechas
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/
    if (fechaInicio && !regexFecha.test(fechaInicio)) {
      errores.push("El formato de la fecha de inicio debe ser YYYY-MM-DD")
    }

    if (fechaFin && !regexFecha.test(fechaFin)) {
      errores.push("El formato de la fecha de fin debe ser YYYY-MM-DD")
    }

    // Validar que la fecha de inicio no sea posterior a la fecha de fin
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      errores.push("La fecha de inicio no puede ser posterior a la fecha de fin")
    }

    return {
      esValido: errores.length === 0,
      errores,
    }
  },
}

export default salesValidations
