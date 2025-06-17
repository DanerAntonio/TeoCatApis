import { query } from "../../../Config/Database.js"

/**
 * Notificaciones para el módulo de ventas
 */
export const salesNotifications = {
  /**
   * Envía una notificación de venta completada
   * @param {Object} venta - Datos de la venta
   * @param {Array} detallesProductos - Detalles de productos
   * @param {Array} detallesServicios - Detalles de servicios
   * @returns {Promise<Object>} Resultado del envío de la notificación
   */
  notificarVentaCompletada: async (venta, detallesProductos = [], detallesServicios = []) => {
    try {
      // Obtener información del cliente si existe
      let clienteInfo = null
      if (venta.IdCliente) {
        const [cliente] = await query("SELECT Nombre, Apellido, Email, Telefono FROM Clientes WHERE IdCliente = ?", [
          venta.IdCliente,
        ])
        clienteInfo = cliente
      }

      // Crear mensaje de notificación
      const mensaje = {
        tipo: "venta_completada",
        idVenta: venta.IdVenta || venta.id,
        fecha: new Date().toISOString(),
        totalVenta: venta.TotalMonto,
        cantidadProductos: detallesProductos.length,
        cantidadServicios: detallesServicios.length,
        cliente: clienteInfo
          ? {
              id: venta.IdCliente,
              nombre: `${clienteInfo.Nombre} ${clienteInfo.Apellido}`,
              email: clienteInfo.Email,
              telefono: clienteInfo.Telefono,
            }
          : {
              nombre: venta.NombreClienteTemporal,
              documento: venta.DocumentoClienteTemporal,
            },
      }

      // Guardar la notificación en la base de datos
      await query(
        "INSERT INTO Notificaciones (Tipo, Mensaje, IdReferencia, FechaCreacion, Estado) VALUES (?, ?, ?, NOW(), 'Pendiente')",
        ["venta_completada", JSON.stringify(mensaje), venta.IdVenta || venta.id],
      )

      // Si el cliente tiene email, enviar notificación por correo
      if (clienteInfo && clienteInfo.Email) {
        // Aquí se implementaría el envío de correo electrónico
        console.log(`Notificación de venta enviada por correo a ${clienteInfo.Email}`)
      }

      return {
        success: true,
        message: "Notificación de venta completada enviada correctamente",
      }
    } catch (error) {
      console.error("Error al enviar notificación de venta:", error)
      return {
        success: false,
        message: "Error al enviar notificación de venta",
        error: error.message,
      }
    }
  },

  /**
   * Envía una notificación de devolución procesada
   * @param {Object} devolucion - Datos de la devolución
   * @param {Object} ventaOriginal - Datos de la venta original
   * @param {Array} detallesDevolucion - Detalles de la devolución
   * @returns {Promise<Object>} Resultado del envío de la notificación
   */
  notificarDevolucionProcesada: async (devolucion, ventaOriginal, detallesDevolucion = []) => {
    try {
      // Obtener información del cliente si existe
      let clienteInfo = null
      if (ventaOriginal.IdCliente) {
        const [cliente] = await query("SELECT Nombre, Apellido, Email, Telefono FROM Clientes WHERE IdCliente = ?", [
          ventaOriginal.IdCliente,
        ])
        clienteInfo = cliente
      }

      // Crear mensaje de notificación
      const mensaje = {
        tipo: "devolucion_procesada",
        idDevolucion: devolucion.IdVenta || devolucion.id,
        idVentaOriginal: ventaOriginal.IdVenta,
        fecha: new Date().toISOString(),
        totalDevolucion: devolucion.TotalMonto,
        cantidadProductos: detallesDevolucion.length,
        cliente: clienteInfo
          ? {
              id: ventaOriginal.IdCliente,
              nombre: `${clienteInfo.Nombre} ${clienteInfo.Apellido}`,
              email: clienteInfo.Email,
              telefono: clienteInfo.Telefono,
            }
          : {
              nombre: ventaOriginal.NombreClienteTemporal,
              documento: ventaOriginal.DocumentoClienteTemporal,
            },
      }

      // Guardar la notificación en la base de datos
      await query(
        "INSERT INTO Notificaciones (Tipo, Mensaje, IdReferencia, FechaCreacion, Estado) VALUES (?, ?, ?, NOW(), 'Pendiente')",
        ["devolucion_procesada", JSON.stringify(mensaje), devolucion.IdVenta || devolucion.id],
      )

      // Si el cliente tiene email, enviar notificación por correo
      if (clienteInfo && clienteInfo.Email) {
        // Aquí se implementaría el envío de correo electrónico
        console.log(`Notificación de devolución enviada por correo a ${clienteInfo.Email}`)
      }

      return {
        success: true,
        message: "Notificación de devolución procesada enviada correctamente",
      }
    } catch (error) {
      console.error("Error al enviar notificación de devolución:", error)
      return {
        success: false,
        message: "Error al enviar notificación de devolución",
        error: error.message,
      }
    }
  },

  /**
   * Envía una notificación de stock bajo
   * @param {Object} producto - Datos del producto con stock bajo
   * @returns {Promise<Object>} Resultado del envío de la notificación
   */
  notificarStockBajo: async (producto) => {
    try {
      // Crear mensaje de notificación
      const mensaje = {
        tipo: "stock_bajo",
        idProducto: producto.IdProducto,
        nombreProducto: producto.NombreProducto,
        stockActual: producto.Stock,
        stockMinimo: producto.StockMinimo,
        fecha: new Date().toISOString(),
      }

      // Guardar la notificación en la base de datos
      await query(
        "INSERT INTO Notificaciones (Tipo, Mensaje, IdReferencia, FechaCreacion, Estado) VALUES (?, ?, ?, NOW(), 'Pendiente')",
        ["stock_bajo", JSON.stringify(mensaje), producto.IdProducto],
      )

      // Notificar a los usuarios con permiso de inventario
      const usuariosInventario = await query(
        `SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Email
         FROM Usuarios u
         INNER JOIN RolesPermisos rp ON u.IdRol = rp.IdRol
         INNER JOIN Permisos p ON rp.IdPermiso = p.IdPermiso
         WHERE p.NombrePermiso = 'Gestionar Inventario'`,
      )

      // Aquí se implementaría el envío de notificaciones a los usuarios
      usuariosInventario.forEach((usuario) => {
        console.log(`Notificación de stock bajo enviada a ${usuario.Email}`)
      })

      return {
        success: true,
        message: "Notificación de stock bajo enviada correctamente",
      }
    } catch (error) {
      console.error("Error al enviar notificación de stock bajo:", error)
      return {
        success: false,
        message: "Error al enviar notificación de stock bajo",
        error: error.message,
      }
    }
  },

  /**
   * Envía una notificación de venta cancelada
   * @param {Object} venta - Datos de la venta cancelada
   * @param {string} motivo - Motivo de la cancelación
   * @returns {Promise<Object>} Resultado del envío de la notificación
   */
  notificarVentaCancelada: async (venta, motivo) => {
    try {
      // Obtener información del cliente si existe
      let clienteInfo = null
      if (venta.IdCliente) {
        const [cliente] = await query("SELECT Nombre, Apellido, Email, Telefono FROM Clientes WHERE IdCliente = ?", [
          venta.IdCliente,
        ])
        clienteInfo = cliente
      }

      // Crear mensaje de notificación
      const mensaje = {
        tipo: "venta_cancelada",
        idVenta: venta.IdVenta,
        fecha: new Date().toISOString(),
        totalVenta: venta.TotalMonto,
        motivo: motivo || "No especificado",
        cliente: clienteInfo
          ? {
              id: venta.IdCliente,
              nombre: `${clienteInfo.Nombre} ${clienteInfo.Apellido}`,
              email: clienteInfo.Email,
              telefono: clienteInfo.Telefono,
            }
          : {
              nombre: venta.NombreClienteTemporal,
              documento: venta.DocumentoClienteTemporal,
            },
      }

      // Guardar la notificación en la base de datos
      await query(
        "INSERT INTO Notificaciones (Tipo, Mensaje, IdReferencia, FechaCreacion, Estado) VALUES (?, ?, ?, NOW(), 'Pendiente')",
        ["venta_cancelada", JSON.stringify(mensaje), venta.IdVenta],
      )

      return {
        success: true,
        message: "Notificación de venta cancelada enviada correctamente",
      }
    } catch (error) {
      console.error("Error al enviar notificación de venta cancelada:", error)
      return {
        success: false,
        message: "Error al enviar notificación de venta cancelada",
        error: error.message,
      }
    }
  },

  /**
   * Envía una notificación de reporte de ventas generado
   * @param {Object} reporte - Datos del reporte generado
   * @param {number} idUsuario - ID del usuario que generó el reporte
   * @returns {Promise<Object>} Resultado del envío de la notificación
   */
  notificarReporteGenerado: async (reporte, idUsuario) => {
    try {
      // Obtener información del usuario
      const [usuario] = await query("SELECT Nombre, Apellido, Email FROM Usuarios WHERE IdUsuario = ?", [idUsuario])

      if (!usuario) {
        throw new Error("Usuario no encontrado")
      }

      // Crear mensaje de notificación
      const mensaje = {
        tipo: "reporte_ventas",
        fechaGeneracion: new Date().toISOString(),
        periodo: {
          fechaInicio: reporte.periodo.fechaInicio,
          fechaFin: reporte.periodo.fechaFin,
        },
        resumen: {
          totalVentas: reporte.resumen.totalVentas,
          ventasNetas: reporte.resumen.ventasNetas,
        },
        usuario: {
          id: idUsuario,
          nombre: `${usuario.Nombre} ${usuario.Apellido}`,
          email: usuario.Email,
        },
      }

      // Guardar la notificación en la base de datos
      const result = await query(
        "INSERT INTO Notificaciones (Tipo, Mensaje, IdReferencia, FechaCreacion, Estado) VALUES (?, ?, ?, NOW(), 'Pendiente')",
        ["reporte_ventas", JSON.stringify(mensaje), idUsuario],
      )

      return {
        success: true,
        message: "Notificación de reporte generado enviada correctamente",
        idNotificacion: result.insertId,
      }
    } catch (error) {
      console.error("Error al enviar notificación de reporte generado:", error)
      return {
        success: false,
        message: "Error al enviar notificación de reporte generado",
        error: error.message,
      }
    }
  },

  /**
   * Obtiene las notificaciones pendientes para un usuario
   * @param {number} idUsuario - ID del usuario
   * @returns {Promise<Array>} Lista de notificaciones pendientes
   */
  obtenerNotificacionesPendientes: async (idUsuario) => {
    try {
      // Obtener notificaciones generales (no específicas de un usuario)
      const notificacionesGenerales = await query(
        `SELECT n.* 
         FROM Notificaciones n
         WHERE n.Estado = 'Pendiente'
         AND n.Tipo IN ('stock_bajo', 'venta_completada', 'devolucion_procesada')
         ORDER BY n.FechaCreacion DESC
         LIMIT 50`,
      )

      // Obtener notificaciones específicas del usuario
      const notificacionesUsuario = await query(
        `SELECT n.* 
         FROM Notificaciones n
         WHERE n.Estado = 'Pendiente'
         AND n.IdReferencia = ?
         ORDER BY n.FechaCreacion DESC
         LIMIT 50`,
        [idUsuario],
      )

      // Combinar y ordenar notificaciones
      const todasNotificaciones = [...notificacionesGenerales, ...notificacionesUsuario].sort(
        (a, b) => new Date(b.FechaCreacion) - new Date(a.FechaCreacion),
      )

      return todasNotificaciones
    } catch (error) {
      console.error("Error al obtener notificaciones pendientes:", error)
      throw error
    }
  },

  /**
   * Marca una notificación como leída
   * @param {number} idNotificacion - ID de la notificación
   * @returns {Promise<Object>} Resultado de la operación
   */
  marcarNotificacionComoLeida: async (idNotificacion) => {
    try {
      await query("UPDATE Notificaciones SET Estado = 'Leida' WHERE IdNotificacion = ?", [idNotificacion])

      return {
        success: true,
        message: "Notificación marcada como leída correctamente",
      }
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error)
      return {
        success: false,
        message: "Error al marcar notificación como leída",
        error: error.message,
      }
    }
  },
}

export default salesNotifications
