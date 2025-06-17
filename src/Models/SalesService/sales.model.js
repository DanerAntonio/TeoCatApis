// Importar la conexión a la base de datos
import { query } from "../../Config/Database.js"

// Modelo para ventas
export const ventasModel = {
  // Obtener todas las ventas
  getAll: async () => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        ORDER BY v.FechaVenta DESC`,
      )

      // Convertir los clientes y usuarios a objetos para facilitar su uso en el frontend
      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error("Error en ventasModel.getAll:", error)
      throw error
    }
  },

  // Obtener una venta por ID
  getById: async (id) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        c.Direccion AS DireccionCliente, c.Telefono AS TelefonoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.IdVenta = ?`,
        [id],
      )

      if (ventas.length === 0) {
        return null
      }

      const venta = ventas[0]

      // Determinar si es consumidor final
      const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

      // Convertir el cliente y usuario a objetos para facilitar su uso en el frontend
      return {
        ...venta,
        cliente: {
          IdCliente: venta.IdCliente,
          Nombre: venta.NombreCliente,
          Apellido: venta.ApellidoCliente,
          Documento: venta.DocumentoCliente,
          Direccion: venta.DireccionCliente,
          Telefono: venta.TelefonoCliente,
          Email: venta.EmailCliente,
          esConsumidorFinal: esConsumidorFinal,
        },
        usuario: {
          IdUsuario: venta.IdUsuario,
          Nombre: venta.NombreUsuario,
          Apellido: venta.ApellidoUsuario,
        },
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
      }
    } catch (error) {
      console.error(`Error en ventasModel.getById(${id}):`, error)
      throw error
    }
  },

  // Crear una nueva venta
  create: async (ventaData) => {
    try {
      console.log("Datos recibidos en el modelo:", JSON.stringify(ventaData, null, 2))

      // Verificar si es consumidor final
      let esConsumidorFinal = false
      if (ventaData.IdCliente) {
        const clientes = await query(`SELECT Documento FROM Clientes WHERE IdCliente = ?`, [ventaData.IdCliente])
        if (clientes.length > 0) {
          esConsumidorFinal = clientes[0].Documento === "0000000000"
        }
      }

      // Valores predeterminados para consumidor final
      const notasAdicionales = esConsumidorFinal ? "Venta presencial" : ventaData.NotasAdicionales || null
      const comprobantePago = esConsumidorFinal ? "Pago en efectivo" : ventaData.ComprobantePago || null

      const result = await query(
        `INSERT INTO Ventas 
        (IdCliente, IdUsuario, FechaVenta, Subtotal, TotalIva, TotalMonto, Estado, MetodoPago, MontoRecibido, Cambio, CodigoQR, ReferenciaPago, NotasAdicionales, ComprobantePago) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaData.IdCliente,
          ventaData.IdUsuario,
          ventaData.FechaVenta || new Date(),
          ventaData.Subtotal || 0,
          ventaData.TotalIva || 0,
          ventaData.TotalMonto || 0,
          ventaData.Estado || "Efectiva",
          ventaData.MetodoPago || "efectivo",
          ventaData.MontoRecibido || 0,
          ventaData.Cambio || 0,
          ventaData.CodigoQR || null,
          ventaData.ReferenciaPago || null,
          notasAdicionales,
          comprobantePago,
        ],
      )

      const newVenta = await ventasModel.getById(result.insertId)
      return newVenta
    } catch (error) {
      console.error("Error en ventasModel.create:", error)
      throw error
    }
  },

  // Actualizar una venta
  update: async (id, ventaData) => {
    try {
      console.log(`Actualizando venta ${id} con datos:`, ventaData)

      // Construir la consulta dinámicamente
      let query_str = `UPDATE Ventas SET `
      const params = []

      // Construir la consulta dinámicamente
      if (ventaData.IdCliente !== undefined) {
        query_str += `IdCliente = ?, `
        params.push(ventaData.IdCliente)
      }
      if (ventaData.IdUsuario !== undefined) {
        query_str += `IdUsuario = ?, `
        params.push(ventaData.IdUsuario)
      }
      if (ventaData.FechaVenta !== undefined) {
        query_str += `FechaVenta = ?, `
        params.push(ventaData.FechaVenta)
      }
      if (ventaData.Subtotal !== undefined) {
        query_str += `Subtotal = ?, `
        params.push(ventaData.Subtotal)
      }
      if (ventaData.TotalIva !== undefined) {
        query_str += `TotalIva = ?, `
        params.push(ventaData.TotalIva)
      }
      if (ventaData.TotalMonto !== undefined) {
        query_str += `TotalMonto = ?, `
        params.push(ventaData.TotalMonto)
      }
      if (ventaData.Estado !== undefined) {
        query_str += `Estado = ?, `
        params.push(ventaData.Estado)
      }
      if (ventaData.MetodoPago !== undefined) {
        query_str += `MetodoPago = ?, `
        params.push(ventaData.MetodoPago)
      }
      if (ventaData.MontoRecibido !== undefined) {
        query_str += `MontoRecibido = ?, `
        params.push(ventaData.MontoRecibido)
      }
      if (ventaData.Cambio !== undefined) {
        query_str += `Cambio = ?, `
        params.push(ventaData.Cambio)
      }
      if (ventaData.CodigoQR !== undefined) {
        query_str += `CodigoQR = ?, `
        params.push(ventaData.CodigoQR)
      }
      if (ventaData.ReferenciaPago !== undefined) {
        query_str += `ReferenciaPago = ?, `
        params.push(ventaData.ReferenciaPago)
      }
      if (ventaData.NotasAdicionales !== undefined) {
        query_str += `NotasAdicionales = ?, `
        params.push(ventaData.NotasAdicionales)
      }
      if (ventaData.ComprobantePago !== undefined) {
        query_str += `ComprobantePago = ?, `
        params.push(ventaData.ComprobantePago)
      }

      // Eliminar la última coma y espacio
      query_str = query_str.slice(0, -2)

      // Añadir la condición WHERE
      query_str += ` WHERE IdVenta = ?`
      params.push(id)

      console.log("Consulta SQL:", query_str)
      console.log("Parámetros:", params)

      await query(query_str, params)
      return { id, ...ventaData }
    } catch (error) {
      console.error(`Error en ventasModel.update(${id}):`, error)
      throw error
    }
  },

  // Cambiar el estado de una venta
  changeStatus: async (id, estado) => {
    try {
      await query(`UPDATE Ventas SET Estado = ? WHERE IdVenta = ?`, [estado, id])

      const updatedVenta = await ventasModel.getById(id)
      return updatedVenta
    } catch (error) {
      console.error(`Error en ventasModel.changeStatus(${id}, ${estado}):`, error)
      throw error
    }
  },

  // Eliminar una venta
  delete: async (id) => {
    try {
      // Primero eliminar los detalles (si no hay restricción de clave foránea con ON DELETE CASCADE)
      await query(`DELETE FROM DetalleVentas WHERE IdVenta = ?`, [id])

      // Luego eliminar la venta
      await query(`DELETE FROM Ventas WHERE IdVenta = ?`, [id])

      return { id, deleted: true }
    } catch (error) {
      console.error(`Error en ventasModel.delete(${id}):`, error)
      throw error
    }
  },

  // Obtener ventas por cliente
  getByCliente: async (idCliente) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.IdCliente = ?
        ORDER BY v.FechaVenta DESC`,
        [idCliente],
      )

      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error(`Error en ventasModel.getByCliente(${idCliente}):`, error)
      throw error
    }
  },

  // Obtener ventas por usuario
  getByUsuario: async (idUsuario) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.IdUsuario = ?
        ORDER BY v.FechaVenta DESC`,
        [idUsuario],
      )

      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error(`Error en ventasModel.getByUsuario(${idUsuario}):`, error)
      throw error
    }
  },

  // Obtener ventas por fecha
  getByFecha: async (fechaInicio, fechaFin) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.FechaVenta BETWEEN ? AND ?
        ORDER BY v.FechaVenta DESC`,
        [fechaInicio, fechaFin],
      )

      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error(`Error en ventasModel.getByFecha(${fechaInicio}, ${fechaFin}):`, error)
      throw error
    }
  },

  // Obtener ventas por estado
  getByEstado: async (estado) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.Estado = ?
        ORDER BY v.FechaVenta DESC`,
        [estado],
      )

      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error(`Error en ventasModel.getByEstado(${estado}):`, error)
      throw error
    }
  },

  // Obtener ventas por tipo
  getByTipo: async (tipo) => {
    try {
      const ventas = await query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.Tipo = ?
        ORDER BY v.FechaVenta DESC`,
        [tipo],
      )

      return ventas.map((venta) => {
        const esConsumidorFinal = venta.DocumentoCliente === "0000000000"

        return {
          ...venta,
          cliente: {
            IdCliente: venta.IdCliente,
            Nombre: venta.NombreCliente,
            Apellido: venta.ApellidoCliente,
            Documento: venta.DocumentoCliente,
            esConsumidorFinal: esConsumidorFinal,
          },
          usuario: {
            IdUsuario: venta.IdUsuario,
            Nombre: venta.NombreUsuario,
            Apellido: venta.ApellidoUsuario,
          },
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        }
      })
    } catch (error) {
      console.error(`Error en ventasModel.getByTipo(${tipo}):`, error)
      throw error
    }
  },

  // Obtener el ID del cliente "Consumidor Final"
  getConsumidorFinalId: async () => {
    try {
      const clientes = await query(`SELECT IdCliente FROM Clientes WHERE Documento = '0000000000' LIMIT 1`)

      if (clientes.length > 0) {
        return clientes[0].IdCliente
      }

      return null // No se encontró el Consumidor Final
    } catch (error) {
      console.error("Error en ventasModel.getConsumidorFinalId:", error)
      throw error
    }
  },

  // Verificar si un cliente es consumidor final
  isConsumidorFinal: async (idCliente) => {
    try {
      if (!idCliente) return false

      const clientes = await query(`SELECT Documento FROM Clientes WHERE IdCliente = ?`, [idCliente])

      if (clientes.length > 0) {
        return clientes[0].Documento === "0000000000"
      }

      return false
    } catch (error) {
      console.error("Error en ventasModel.isConsumidorFinal:", error)
      throw error
    }
  },

  // NUEVO: Obtener el ID de la mascota genérica
  getMascotaGenericaId: async () => {
    try {
      const mascotas = await query(`
      SELECT m.IdMascota 
      FROM Mascotas m
      WHERE m.Nombre = 'Mascota Genérica' AND m.IdCliente = 3 
      LIMIT 1`)

      if (mascotas.length > 0) {
        return mascotas[0].IdMascota
      }

      return null // No se encontró la Mascota Genérica
    } catch (error) {
      console.error("Error en ventasModel.getMascotaGenericaId:", error)
      throw error
    }
  },
  // Obtener todos los usuarios con rol cliente
  getClientesUsuarios: async () => {
    try {
      // Consulta para obtener todos los usuarios con rol cliente (IdRol = 2)
      const [usuarios] = await query(`
        SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Documento, u.Correo, u.Telefono, u.Direccion, u.Estado,
               c.IdCliente, r.NombreRol
        FROM Usuarios u
        LEFT JOIN Clientes c ON u.IdUsuario = c.IdUsuario
        JOIN Roles r ON u.IdRol = r.IdRol
        WHERE u.IdRol = 2 AND u.Estado = 1
        ORDER BY u.Nombre, u.Apellido
      `)

      // Formatear los resultados para que sean compatibles con el frontend
      return usuarios.map((usuario) => ({
        IdCliente: usuario.IdCliente || usuario.IdUsuario, // Usar IdUsuario como fallback si no hay IdCliente
        idCliente: usuario.IdCliente || usuario.IdUsuario, // Para compatibilidad
        Nombre: usuario.Nombre,
        nombre: usuario.Nombre, // Para compatibilidad
        Apellido: usuario.Apellido,
        apellido: usuario.Apellido, // Para compatibilidad
        Documento: usuario.Documento,
        documento: usuario.Documento, // Para compatibilidad
        Correo: usuario.Correo,
        correo: usuario.Correo, // Para compatibilidad
        Telefono: usuario.Telefono,
        telefono: usuario.Telefono, // Para compatibilidad
        Direccion: usuario.Direccion,
        direccion: usuario.Direccion, // Para compatibilidad
        Estado: usuario.Estado,
        estado: usuario.Estado, // Para compatibilidad
        IdUsuario: usuario.IdUsuario,
        idUsuario: usuario.IdUsuario, // Para compatibilidad
        NombreRol: usuario.NombreRol,
        nombreRol: usuario.NombreRol, // Para compatibilidad
        esUsuarioCliente: true, // Indicador para saber que es un usuario con rol cliente
      }))
    } catch (error) {
      console.error("Error en ventasModel.getClientesUsuarios:", error)
      throw error
    }
  },
}

// Modelo para detalles de ventas
export const detalleVentasModel = {
  // Obtener detalles de una venta
  getByVenta: async (idVenta) => {
    try {
      return await query(
        `SELECT dv.*, p.NombreProducto, p.CodigoBarras, p.PorcentajeIVA
         FROM DetalleVentas dv
         LEFT JOIN Productos p ON dv.IdProducto = p.IdProducto
         WHERE dv.IdVenta = ?`,
        [idVenta],
      )
    } catch (error) {
      console.error(`Error en detalleVentasModel.getByVenta(${idVenta}):`, error)
      throw error
    }
  },

  // Obtener un detalle por ID
  getById: async (id) => {
    try {
      const detalles = await query(
        `SELECT dv.*, p.NombreProducto, p.CodigoBarras, p.PorcentajeIVA
         FROM DetalleVentas dv
         LEFT JOIN Productos p ON dv.IdProducto = p.IdProducto
         WHERE dv.IdDetalleVenta = ?`,
        [id],
      )

      return detalles.length > 0 ? detalles[0] : null
    } catch (error) {
      console.error(`Error en detalleVentasModel.getById(${id}):`, error)
      throw error
    }
  },

  // Crear un nuevo detalle de venta
  create: async (detalleData) => {
    try {
      const result = await query(
        `INSERT INTO DetalleVentas 
        (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdVenta,
          detalleData.IdProducto,
          detalleData.Cantidad,
          detalleData.PrecioUnitario,
          detalleData.Subtotal,
          detalleData.IvaUnitario,
          detalleData.SubtotalConIva,
        ],
      )

      const newDetalle = await detalleVentasModel.getById(result.insertId)
      return newDetalle
    } catch (error) {
      console.error("Error en detalleVentasModel.create:", error)
      throw error
    }
  },

  // Actualizar un detalle de venta
  update: async (id, detalleData) => {
    try {
      await query(
        `UPDATE DetalleVentas SET 
        IdProducto = COALESCE(?, IdProducto),
        Cantidad = COALESCE(?, Cantidad),
        PrecioUnitario = COALESCE(?, PrecioUnitario),
        Subtotal = COALESCE(?, Subtotal),
        IvaUnitario = COALESCE(?, IvaUnitario),
        SubtotalConIva = COALESCE(?, SubtotalConIva)
        WHERE IdDetalleVenta = ?`,
        [
          detalleData.IdProducto,
          detalleData.Cantidad,
          detalleData.PrecioUnitario,
          detalleData.Subtotal,
          detalleData.IvaUnitario,
          detalleData.SubtotalConIva,
          id,
        ],
      )

      const updatedDetalle = await detalleVentasModel.getById(id)
      return updatedDetalle
    } catch (error) {
      console.error(`Error en detalleVentasModel.update(${id}):`, error)
      throw error
    }
  },

  // Eliminar un detalle de venta
  delete: async (id) => {
    try {
      await query(`DELETE FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      return { id, deleted: true }
    } catch (error) {
      console.error(`Error en detalleVentasModel.delete(${id}):`, error)
      throw error
    }
  },
}

// Modelo para detalles de servicios en ventas
export const detalleVentasServiciosModel = {
  // Obtener detalles de servicios de una venta
  getByVenta: async (idVenta) => {
    try {
      return await query(
        `SELECT dvs.*, s.Nombre AS NombreServicio, st.Nombre AS TipoServicio,
       m.Nombre AS NombreMascota, e.NombreEspecie AS TipoMascota,
       dvs.NombreMascotaTemporal, dvs.TipoMascotaTemporal
       FROM DetalleVentasServicios dvs
       LEFT JOIN Servicios s ON dvs.IdServicio = s.IdServicio
       LEFT JOIN Tipo_Servicio st ON s.IdTipoServicio = st.IdTipoServicio
       LEFT JOIN Mascotas m ON dvs.IdMascota = m.IdMascota
       LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
       WHERE dvs.IdVenta = ?`,
        [idVenta],
      )
    } catch (error) {
      console.error(`Error en detalleVentasServiciosModel.getByVenta(${idVenta}):`, error)
      throw error
    }
  },

  // Obtener un detalle de servicio por ID
  getById: async (id) => {
    try {
      const detalles = await query(
        `SELECT dvs.*, s.Nombre AS NombreServicio, st.Nombre AS TipoServicio,
       m.Nombre AS NombreMascota, e.NombreEspecie AS TipoMascota,
       dvs.NombreMascotaTemporal, dvs.TipoMascotaTemporal
       FROM DetalleVentasServicios dvs
       LEFT JOIN Servicios s ON dvs.IdServicio = s.IdServicio
       LEFT JOIN Tipo_Servicio st ON s.IdTipoServicio = st.IdTipoServicio
       LEFT JOIN Mascotas m ON dvs.IdMascota = m.IdMascota
       LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
       WHERE dvs.IdDetalleVentasServicios = ?`,
        [id],
      )

      return detalles.length > 0 ? detalles[0] : null
    } catch (error) {
      console.error(`Error en detalleVentasServiciosModel.getById(${id}):`, error)
      throw error
    }
  },

  // Crear un nuevo detalle de servicio
  create: async (detalleData) => {
    try {
      const result = await query(
        `INSERT INTO DetalleVentasServicios 
        (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, NombreMascotaTemporal, TipoMascotaTemporal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdVenta,
          detalleData.IdServicio,
          detalleData.IdMascota,
          detalleData.Cantidad,
          detalleData.PrecioUnitario,
          detalleData.Subtotal,
          detalleData.IvaUnitario,
          detalleData.SubtotalConIva,
          detalleData.NombreMascotaTemporal || null,
          detalleData.TipoMascotaTemporal || null,
        ],
      )

      const newDetalle = await detalleVentasServiciosModel.getById(result.insertId)
      return newDetalle
    } catch (error) {
      console.error("Error en detalleVentasServiciosModel.create:", error)
      throw error
    }
  },

  // Actualizar un detalle de servicio
  update: async (id, detalleData) => {
    try {
      await query(
        `UPDATE DetalleVentasServicios SET 
        IdServicio = COALESCE(?, IdServicio),
        IdMascota = COALESCE(?, IdMascota),
        Cantidad = COALESCE(?, Cantidad),
        PrecioUnitario = COALESCE(?, PrecioUnitario),
        Subtotal = COALESCE(?, Subtotal),
        IvaUnitario = COALESCE(?, IvaUnitario),
        SubtotalConIva = COALESCE(?, SubtotalConIva),
        NombreMascotaTemporal = ?,
        TipoMascotaTemporal = ?
        WHERE IdDetalleVentasServicios = ?`,
        [
          detalleData.IdServicio,
          detalleData.IdMascota,
          detalleData.Cantidad,
          detalleData.PrecioUnitario,
          detalleData.Subtotal,
          detalleData.IvaUnitario,
          detalleData.SubtotalConIva,
          detalleData.NombreMascotaTemporal || null,
          detalleData.TipoMascotaTemporal || null,
          id,
        ],
      )

      const updatedDetalle = await detalleVentasServiciosModel.getById(id)
      return updatedDetalle
    } catch (error) {
      console.error(`Error en detalleVentasServiciosModel.update(${id}):`, error)
      throw error
    }
  },

  // Eliminar un detalle de servicio
  delete: async (id) => {
    try {
      await query(`DELETE FROM DetalleVentasServicios WHERE IdDetalleVentasServicios = ?`, [id])

      return { id, deleted: true }
    } catch (error) {
      console.error(`Error en detalleVentasServiciosModel.delete(${id}):`, error)
      throw error
    }
  },
}

export default {
  ventas: ventasModel,
  detalleVentas: detalleVentasModel,
  detalleVentasServicios: detalleVentasServiciosModel,
}