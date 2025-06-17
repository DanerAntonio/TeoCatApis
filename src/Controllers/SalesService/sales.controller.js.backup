import { ventasModel, detalleVentasModel, detalleVentasServiciosModel } from "../../Models/SalesService/sales.model.js"
import { query, getConnection } from "../../Config/Database.js"

// Controlador para ventas
export const ventasController = {
  // Obtener todas las ventas
  getAll: async (req, res) => {
    try {
      const ventas = await ventasModel.getAll()
      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener una venta por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params

      // Validar que el ID sea un número
      const ventaId = Number.parseInt(id, 10)
      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      // Obtener la venta directamente de la base de datos para evitar problemas con el modelo
      const [ventas] = await query(
        `
      SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
      FROM Ventas v
      LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
      LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
      WHERE v.IdVenta = ?
    `,
        [ventaId],
      )

      if (ventas.length === 0) {
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const venta = ventas[0]
      
      // Determinar si es consumidor final - Manejo seguro de propiedades
      const esConsumidorFinal = venta.IdCliente === 3 || 
                             (venta.DocumentoCliente && venta.DocumentoCliente === "0000000000");

      // Obtener detalles de productos
      let detallesProductos = []
      try {
        const [productos] = await query(
          `
        SELECT dp.*, p.NombreProducto, p.CodigoBarras
        FROM DetalleVentas dp
        LEFT JOIN Productos p ON dp.IdProducto = p.IdProducto
        WHERE dp.IdVenta = ?
      `,
          [ventaId],
        )

        detallesProductos = productos
      } catch (detailError) {
        console.error(`Error al obtener detalles de productos para venta ${ventaId}:`, detailError)
        // Continuar con un array vacío si hay error
      }

      // Obtener detalles de servicios
let detallesServicios = []
try {
  const [servicios] = await query(
    `
  SELECT ds.*, s.Nombre AS NombreServicio, 
  m.Nombre AS NombreMascota, e.NombreEspecie AS TipoMascota,
  ds.NombreMascotaTemporal, ds.TipoMascotaTemporal
  FROM DetalleVentasServicios ds
  LEFT JOIN Servicios s ON ds.IdServicio = s.IdServicio
  LEFT JOIN Mascotas m ON ds.IdMascota = m.IdMascota
  LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
  WHERE ds.IdVenta = ?
`,
    [ventaId],
  )

  // Procesar los detalles de servicios para incluir información de mascota temporal
  detallesServicios = servicios.map(servicio => {
    // Si hay información de mascota temporal, usarla en lugar de la mascota registrada
    if (servicio.NombreMascotaTemporal) {
      return {
        ...servicio,
        NombreMascota: servicio.NombreMascotaTemporal,
        TipoMascota: servicio.TipoMascotaTemporal,
        esMascotaTemporal: true
      };
    }
    return servicio;
  });
} catch (serviceError) {
  console.error(`Error al obtener detalles de servicios para venta ${ventaId}:`, serviceError)
  // Continuar con un array vacío si hay error
}

      // Preparar datos del cliente de manera segura
      const clienteData = {
        IdCliente: venta.IdCliente,
        nombre: venta.NombreCliente || "Consumidor Final",
        apellido: venta.ApellidoCliente || "",
        documento: venta.DocumentoCliente || "0000000000",
        esConsumidorFinal: esConsumidorFinal
      };

      // Combinar todo en un solo objeto
      const ventaCompleta = {
        ...venta,
        cliente: clienteData,
        usuario: {
          nombre: venta.NombreUsuario || "",
          apellido: venta.ApellidoUsuario || "",
        },
        detallesProductos,
        detallesServicios,
        productos: detallesProductos, // Para compatibilidad con el frontend
        servicios: detallesServicios, // Añadir esta línea para incluir servicios
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado"
      }

      res.status(200).json(ventaCompleta)
    } catch (error) {
      console.error("Error al obtener venta:", error)
      res.status(500).json({
        message: "Error en el servidor",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    }
  },

  // Obtener el consumidor final
  getConsumidorFinal: async (req, res) => {
    try {
      const idConsumidorFinal = await ventasModel.getConsumidorFinalId();
      
      if (idConsumidorFinal) {
        // Obtener los datos completos del consumidor final
        const [clientes] = await query(`SELECT * FROM Clientes WHERE IdCliente = ?`, [idConsumidorFinal]);
        
        if (clientes.length > 0) {
          res.status(200).json({
            success: true,
            consumidorFinal: {
              IdCliente: clientes[0].IdCliente,
              Documento: clientes[0].Documento,
              Nombre: clientes[0].Nombre,
              Apellido: clientes[0].Apellido,
              esConsumidorFinal: true
            }
          });
        } else {
          res.status(404).json({ message: "Consumidor Final no encontrado" });
        }
      } else {
        res.status(404).json({ message: "Consumidor Final no configurado en el sistema" });
      }
    } catch (error) {
      console.error("Error al obtener Consumidor Final:", error);
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  },

  // NUEVO: Obtener la mascota genérica
getMascotaGenerica: async (req, res) => {
  try {
    const idMascotaGenerica = await ventasModel.getMascotaGenericaId();
    
    if (idMascotaGenerica) {
      // Obtener los datos completos de la mascota genérica
      const [mascotas] = await query(`
        SELECT m.*, e.NombreEspecie 
        FROM Mascotas m
        LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
        WHERE m.IdMascota = ?`, [idMascotaGenerica]);
      
      if (mascotas.length > 0) {
        res.status(200).json({
          success: true,
          mascotaGenerica: {
            IdMascota: mascotas[0].IdMascota,
            Nombre: mascotas[0].Nombre,
            Especie: mascotas[0].NombreEspecie,
            esMascotaGenerica: true
          }
        });
      } else {
        res.status(404).json({ message: "Mascota Genérica no encontrada" });
      }
    } else {
      res.status(404).json({ message: "Mascota Genérica no configurada en el sistema" });
    }
  } catch (error) {
    console.error("Error al obtener Mascota Genérica:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
},

  // Crear una nueva venta
  create: async (req, res) => {
    let connection
    try {
      // Validar que el cuerpo de la solicitud tenga la estructura correcta
      const { venta, detallesProductos, detallesServicios } = req.body

      console.log("Datos recibidos en el controlador:", JSON.stringify(req.body, null, 2))

      if (!venta) {
        return res.status(400).json({ message: "Datos de venta no proporcionados" })
      }

      // Validamos que detallesProductos sea un array (puede estar vacío)
      if (detallesProductos !== undefined && !Array.isArray(detallesProductos)) {
        return res.status(400).json({ message: "Formato inválido para detallesProductos, debe ser un array" })
      }

      // Validamos que detallesServicios sea un array (puede estar vacío)
      if (detallesServicios !== undefined && !Array.isArray(detallesServicios)) {
        return res.status(400).json({ message: "Formato inválido para detallesServicios, debe ser un array" })
      }

      connection = await getConnection()
      await connection.beginTransaction()

      // Verificar si se proporcionó un IdCliente
      if (!venta.IdCliente) {
        // Si no se proporcionó, intentar usar el consumidor final
        const idConsumidorFinal = await ventasModel.getConsumidorFinalId();
        if (idConsumidorFinal) {
          venta.IdCliente = idConsumidorFinal;
          console.log("Usando cliente Consumidor Final (ID:", idConsumidorFinal, ")");
        } else {
          await connection.rollback();
          return res.status(400).json({ message: "Se requiere un cliente para la venta" });
        }
      }

      // Verificar si el cliente existe
      const [clientes] = await connection.query(`SELECT * FROM Clientes WHERE IdCliente = ?`, [venta.IdCliente])

      if (clientes.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      // Verificar si es Consumidor Final
      const esConsumidorFinal = clientes[0].Documento === "0000000000";
      if (esConsumidorFinal) {
        console.log("Venta para Consumidor Final detectada");
      } else {
        console.log("Venta para Cliente Registrado detectada");
      }

      // Verificar si el usuario existe
      if (venta.IdUsuario) {
        const [usuarios] = await connection.query(`SELECT * FROM Usuarios WHERE IdUsuario = ?`, [venta.IdUsuario])

        if (usuarios.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Usuario no encontrado" })
        }
      }

      // Primero, verificar la estructura de la tabla Ventas
      const [tableInfo] = await connection.query(`DESCRIBE Ventas`)
      const columnNames = tableInfo.map((col) => col.Field)

      console.log("Columnas disponibles en la tabla Ventas:", columnNames)

      // Construir la consulta dinámicamente basada en las columnas disponibles
      const fields = []
      const placeholders = []
      const values = []

      if (columnNames.includes("IdCliente")) {
        fields.push("IdCliente")
        placeholders.push("?")
        values.push(venta.IdCliente)
      }

      if (columnNames.includes("IdUsuario")) {
        fields.push("IdUsuario")
        placeholders.push("?")
        values.push(venta.IdUsuario || null)
      }

      if (columnNames.includes("FechaVenta")) {
        fields.push("FechaVenta")
        placeholders.push("?")
        values.push(venta.FechaVenta || new Date())
      }

      if (columnNames.includes("Subtotal")) {
        fields.push("Subtotal")
        placeholders.push("?")
        values.push(venta.Subtotal || 0)
      }

      if (columnNames.includes("TotalIva")) {
        fields.push("TotalIva")
        placeholders.push("?")
        values.push(venta.TotalIva || 0)
      }

      if (columnNames.includes("TotalMonto")) {
        fields.push("TotalMonto")
        placeholders.push("?")
        values.push(venta.TotalMonto || 0)
      }

      if (columnNames.includes("Estado")) {
        fields.push("Estado")
        placeholders.push("?")
        values.push(venta.Estado || "Efectiva")
      }

      // Añadir estos campos que ahora pueden ser NULL
      if (columnNames.includes("NotasAdicionales")) {
        fields.push("NotasAdicionales")
        placeholders.push("?")
        // Si es Consumidor Final, usar valor predeterminado
        values.push(esConsumidorFinal ? "Venta presencial" : venta.NotasAdicionales || null)
      }

      if (columnNames.includes("ComprobantePago")) {
        fields.push("ComprobantePago")
        placeholders.push("?")
        // Si es Consumidor Final, usar valor predeterminado
        values.push(esConsumidorFinal ? "Pago en efectivo" : venta.ComprobantePago || null)
      }

      // Verificar si existen las columnas adicionales
      if (columnNames.includes("MetodoPago")) {
        fields.push("MetodoPago")
        placeholders.push("?")
        values.push(venta.MetodoPago || "efectivo")
      }

      if (columnNames.includes("MontoRecibido")) {
        fields.push("MontoRecibido")
        placeholders.push("?")
        values.push(venta.MontoRecibido || 0)
      }

      if (columnNames.includes("Cambio")) {
        fields.push("Cambio")
        placeholders.push("?")

        // Calcular el cambio si el método de pago es efectivo
        let cambio = 0
        if ((venta.MetodoPago || "efectivo") === "efectivo" && venta.MontoRecibido > 0) {
          cambio = venta.MontoRecibido - venta.TotalMonto
          cambio = cambio > 0 ? cambio : 0
        }

        values.push(cambio)
      }

      if (columnNames.includes("CodigoQR")) {
        fields.push("CodigoQR")
        placeholders.push("?")
        values.push(venta.CodigoQR || null)
      }

      if (columnNames.includes("ReferenciaPago")) {
        fields.push("ReferenciaPago")
        placeholders.push("?")
        values.push(venta.ReferenciaPago || null)
      }

      // Crear la venta con los campos disponibles
      const querySQL = `INSERT INTO Ventas (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`
      console.log("Query a ejecutar:", querySQL)
      console.log("Valores:", values)

      const [resultVenta] = await connection.query(querySQL, values)
      const idVenta = resultVenta.insertId

      // Crear detalles de productos
      const detallesProductosCreados = []
      let subtotalProductos = 0
      let totalIvaProductos = 0

      if (detallesProductos && detallesProductos.length > 0) {
        for (const detalle of detallesProductos) {
          // Verificar si el producto existe
          const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])

          if (productos.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` })
          }

          const producto = productos[0]

          // Verificar stock disponible
          if (producto.Stock < detalle.Cantidad) {
            await connection.rollback()
            return res.status(400).json({
              message: `Stock insuficiente para el producto ${producto.NombreProducto}`,
              stockDisponible: producto.Stock,
              cantidadSolicitada: detalle.Cantidad,
            })
          }

          // Calcular subtotal e IVA
          const precioUnitario = detalle.PrecioUnitario || producto.PrecioVenta
          const subtotalDetalle = precioUnitario * detalle.Cantidad
          let ivaUnitario = 0

          if (producto.AplicaIVA) {
            ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * detalle.Cantidad

          // Crear detalle
          const [resultDetalle] = await connection.query(
            `INSERT INTO DetalleVentas 
            (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              idVenta,
              detalle.IdProducto,
              detalle.Cantidad,
              precioUnitario,
              subtotalDetalle,
              ivaUnitario,
              subtotalConIva,
            ],
          )

          detallesProductosCreados.push({
            id: resultDetalle.insertId,
            IdVenta: idVenta,
            IdProducto: detalle.IdProducto,
            NombreProducto: producto.NombreProducto,
            Cantidad: detalle.Cantidad,
            PrecioUnitario: precioUnitario,
            Subtotal: subtotalDetalle,
            IvaUnitario: ivaUnitario,
            SubtotalConIva: subtotalConIva,
          })

          // Actualizar stock del producto
          await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])

          // Acumular totales
          subtotalProductos += subtotalDetalle
          totalIvaProductos += ivaUnitario * detalle.Cantidad
        }
      }

      // Crear detalles de servicios
      const detallesServiciosCreados = []
      let subtotalServicios = 0
      let totalIvaServicios = 0

      if (detallesServicios && detallesServicios.length > 0) {
        console.log("Procesando detalles de servicios:", detallesServicios)

        // Obtener el ID de la mascota genérica si es necesario
        let idMascotaGenerica = null;
        if (esConsumidorFinal) {
          idMascotaGenerica = await ventasModel.getMascotaGenericaId();
          console.log("ID de mascota genérica obtenido:", idMascotaGenerica);
        }

        for (const detalle of detallesServicios) {
          // Asegurar que IdServicio sea un número
          const idServicio = Number.parseInt(detalle.IdServicio, 10)
          if (isNaN(idServicio)) {
            await connection.rollback()
            return res.status(400).json({ message: `ID de servicio inválido: ${detalle.IdServicio}` })
          }

          // Verificar si el servicio existe
          const [servicios] = await connection.query(`SELECT * FROM Servicios WHERE IdServicio = ?`, [idServicio])

          if (servicios.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Servicio con ID ${idServicio} no encontrado` })
          }

          const servicio = servicios[0]

          // Manejar IdMascota correctamente (puede ser null para servicios sin mascota)
          let idMascota = null;
          let nombreMascotaTemporal = null;
          let tipoMascotaTemporal = null;

          // Procesar información de mascota temporal si existe
          if (detalle.MascotaTemporal) {
            nombreMascotaTemporal = detalle.MascotaTemporal.Nombre;
            tipoMascotaTemporal = detalle.MascotaTemporal.Tipo;
            
            // Si es Consumidor Final, usar la mascota genérica
            if (esConsumidorFinal && idMascotaGenerica) {
              idMascota = idMascotaGenerica;
              console.log("Usando mascota genérica para servicio:", idMascotaGenerica);
            }
          } 
          // Si no hay mascota temporal pero hay un IdMascota, verificar que sea válido
else if (detalle.IdMascota !== undefined && detalle.IdMascota !== null && detalle.IdMascota !== -1) {
  idMascota = Number.parseInt(detalle.IdMascota, 10)

  // Si es un número válido y positivo, verificamos que exista la mascota
  if (!isNaN(idMascota) && idMascota > 0) {
    // Verificar si la mascota existe y obtener su especie
    const [mascotas] = await connection.query(`
      SELECT m.*, e.NombreEspecie 
      FROM Mascotas m
      LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
      WHERE m.IdMascota = ?`, [idMascota])
    
    if (mascotas.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: `Mascota con ID ${idMascota} no encontrada` })
    }
    
    // Si es cliente registrado (no consumidor final), verificar que la mascota pertenezca al cliente
    if (!esConsumidorFinal) {
      const [mascotasCliente] = await connection.query(
        `SELECT * FROM Mascotas WHERE IdMascota = ? AND IdCliente = ?`, 
        [idMascota, venta.IdCliente]
      );
      
      if (mascotasCliente.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: `La mascota con ID ${idMascota} no pertenece al cliente con ID ${venta.IdCliente}` 
        });
                }
              }
            } else {
              // Si no es un número válido o es negativo, lo dejamos como null
              idMascota = null;
            }
          } 
          // Si no hay IdMascota ni MascotaTemporal pero es Consumidor Final, usar mascota genérica
          else if (esConsumidorFinal && idMascotaGenerica) {
            idMascota = idMascotaGenerica;
            console.log("Usando mascota genérica por defecto:", idMascotaGenerica);
          }

          // Asegurar que la cantidad sea un número
          const cantidad = Number.parseInt(detalle.Cantidad, 10) || 1

          // Calcular subtotal e IVA
          // Asegurar que el precio unitario sea un número
          const precioUnitario = Number.parseFloat(detalle.PrecioUnitario) || servicio.Precio || 0
          const subtotalDetalle = precioUnitario * cantidad
          let ivaUnitario = 0

          if (servicio.AplicaIVA) {
            ivaUnitario = precioUnitario * (Number.parseFloat(servicio.PorcentajeIVA || 0) / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * cantidad

          console.log("Insertando detalle de servicio:", {
            IdVenta: idVenta,
            IdServicio: idServicio,
            IdMascota: idMascota,
            Cantidad: cantidad,
            PrecioUnitario: precioUnitario,
            Subtotal: subtotalDetalle,
            IvaUnitario: ivaUnitario,
            SubtotalConIva: subtotalConIva,
            NombreMascotaTemporal: nombreMascotaTemporal,
            TipoMascotaTemporal: tipoMascotaTemporal
          })

          // Verificar la estructura de la tabla DetalleVentasServicios
          try {
            const [tableInfoServicios] = await connection.query(`DESCRIBE DetalleVentasServicios`)
            const columnNamesServicios = tableInfoServicios.map((col) => col.Field)
            console.log("Columnas disponibles en la tabla DetalleVentasServicios:", columnNamesServicios)
          } catch (error) {
            console.error("Error al verificar estructura de tabla DetalleVentasServicios:", error)
          }

          // Crear detalle
          try {
            const [resultDetalle] = await connection.query(
              `INSERT INTO DetalleVentasServicios 
              (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, NombreMascotaTemporal, TipoMascotaTemporal) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                idVenta, 
                idServicio, 
                idMascota, 
                cantidad, 
                precioUnitario, 
                subtotalDetalle, 
                ivaUnitario, 
                subtotalConIva,
                nombreMascotaTemporal,
                tipoMascotaTemporal
              ],
            )

            detallesServiciosCreados.push({
              id: resultDetalle.insertId,
              IdVenta: idVenta,
              IdServicio: idServicio,
              IdMascota: idMascota,
              NombreServicio: servicio.Nombre,
              Cantidad: cantidad,
              PrecioUnitario: precioUnitario,
              Subtotal: subtotalDetalle,
              IvaUnitario: ivaUnitario,
              SubtotalConIva: subtotalConIva,
              NombreMascotaTemporal: nombreMascotaTemporal,
              TipoMascotaTemporal: tipoMascotaTemporal,
              esMascotaTemporal: nombreMascotaTemporal !== null
            })
          } catch (insertError) {
            console.error("Error al insertar detalle de servicio:", insertError)
            await connection.rollback()
            return res.status(500).json({
              message: "Error al insertar detalle de servicio",
              error: insertError.message,
              detalle: {
                IdVenta: idVenta,
                IdServicio: idServicio,
                IdMascota: idMascota,
                Cantidad: cantidad,
                PrecioUnitario: precioUnitario,
                Subtotal: subtotalDetalle,
                IvaUnitario: ivaUnitario,
                SubtotalConIva: subtotalConIva,
                NombreMascotaTemporal: nombreMascotaTemporal,
                TipoMascotaTemporal: tipoMascotaTemporal
              },
            })
          }

          // Acumular totales
          subtotalServicios += subtotalDetalle
          totalIvaServicios += ivaUnitario * cantidad
        }
      }

      // Calcular totales generales
      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos + totalIvaServicios
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar totales de la venta
      // Verificar qué campos podemos actualizar
      const updateFields = []
      const updateValues = []

      if (columnNames.includes("Subtotal")) {
        updateFields.push("Subtotal = ?")
        updateValues.push(subtotalTotal)
      }

      if (columnNames.includes("TotalIva")) {
        updateFields.push("TotalIva = ?")
        updateValues.push(totalIvaTotal)
      }

      if (columnNames.includes("TotalMonto")) {
        updateFields.push("TotalMonto = ?")
        updateValues.push(totalMontoTotal)
      }

      if (updateFields.length > 0) {
        updateValues.push(idVenta)
        await connection.query(`UPDATE Ventas SET ${updateFields.join(", ")} WHERE IdVenta = ?`, updateValues)
      }

      // Obtener la venta completa actualizada
      const [ventasActualizadas] = await connection.query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.IdVenta = ?`,
        [idVenta],
      )

      await connection.commit()

      // Responder con la venta completa
      res.status(201).json({
        venta: {
          ...ventasActualizadas[0],
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado"
        },
        detallesProductos: detallesProductosCreados,
        detallesServicios: detallesServiciosCreados,
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado"
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error("Error al hacer rollback:", rollbackError)
        }
      }
      console.error("Error al crear venta:", error)
      res.status(500).json({
        message: "Error en el servidor",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // Actualizar una venta
  update: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const {
        IdCliente,
        IdUsuario,
        FechaVenta,
        Subtotal,
        TotalIva,
        TotalMonto,
        Estado,
        MetodoPago,
        MontoRecibido,
        Cambio,
        CodigoQR,
        ReferenciaPago,
        NotasAdicionales,
        ComprobantePago,
        detallesProductos,
        detallesServicios,
      } = req.body

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Si se está actualizando el cliente, verificar que exista
      if (IdCliente) {
        const [clientes] = await connection.query(`SELECT * FROM Clientes WHERE IdCliente = ?`, [IdCliente])

        if (clientes.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Cliente no encontrado" })
        }
      }

      // Si se está actualizando el usuario, verificar que exista
      if (IdUsuario) {
        const [usuarios] = await connection.query(`SELECT * FROM Usuarios WHERE IdUsuario = ?`, [IdUsuario])

        if (usuarios.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Usuario no encontrado" })
        }
      }

      // Actualizar la venta
      await connection.query(
        `UPDATE Ventas SET 
        IdCliente = COALESCE(?, IdCliente),
        IdUsuario = COALESCE(?, IdUsuario),
        FechaVenta = COALESCE(?, FechaVenta),
        Subtotal = COALESCE(?, Subtotal),
        TotalIva = COALESCE(?, TotalIva),
        TotalMonto = COALESCE(?, TotalMonto),
        Estado = COALESCE(?, Estado),
        MetodoPago = COALESCE(?, MetodoPago),
        MontoRecibido = COALESCE(?, MontoRecibido),
        Cambio = COALESCE(?, Cambio),
        CodigoQR = COALESCE(?, CodigoQR),
        ReferenciaPago = COALESCE(?, ReferenciaPago),
        NotasAdicionales = ?,
        ComprobantePago = ?
        WHERE IdVenta = ?`,
        [
          IdCliente,
          IdUsuario,
          FechaVenta,
          Subtotal,
          TotalIva,
          TotalMonto,
          Estado,
          MetodoPago,
          MontoRecibido,
          Cambio,
          CodigoQR,
          ReferenciaPago,
          NotasAdicionales,
          ComprobantePago,
          id,
        ],
      )

      // Si se proporcionan detalles de productos, actualizar
      if (detallesProductos) {
        // Obtener detalles actuales para devolver stock
        const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // Devolver stock de productos
        for (const detalle of detallesActuales) {
          await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])
        }

        // Eliminar detalles actuales
        await connection.query(`DELETE FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // Insertar nuevos detalles
        let subtotalProductos = 0
        let totalIvaProductos = 0

        for (const detalle of detallesProductos) {
          // Verificar si el producto existe
          const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])

          if (productos.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` })
          }

          const producto = productos[0]

          // Verificar stock disponible
          if (producto.Stock < detalle.Cantidad) {
            await connection.rollback()
            return res.status(400).json({
              message: `Stock insuficiente para el producto ${producto.NombreProducto}`,
              stockDisponible: producto.Stock,
              cantidadSolicitada: detalle.Cantidad,
            })
          }

          // Calcular subtotal e IVA
          const precioUnitario = detalle.PrecioUnitario || producto.PrecioVenta
          const subtotalDetalle = precioUnitario * detalle.Cantidad
          let ivaUnitario = 0

          if (producto.AplicaIVA) {
            ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * detalle.Cantidad

          // Insertar detalle
          await connection.query(
            `INSERT INTO DetalleVentas 
            (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, detalle.IdProducto, detalle.Cantidad, precioUnitario, subtotalDetalle, ivaUnitario, subtotalConIva],
          )

          // Actualizar stock del producto
          await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])

          // Acumular totales
          subtotalProductos += subtotalDetalle
          totalIvaProductos += ivaUnitario * detalle.Cantidad
        }

        // Si se proporcionan detalles de servicios, actualizar
        if (detallesServicios) {
          // Eliminar detalles actuales
          await connection.query(`DELETE FROM DetalleVentasServicios WHERE IdVenta = ?`, [id])

          // Obtener el ID de la mascota genérica si es necesario
          let idMascotaGenerica = null;
          const [cliente] = await connection.query(`SELECT c.Documento FROM Ventas v JOIN Clientes c ON v.IdCliente = c.IdCliente WHERE v.IdVenta = ?`, [id]);
          const esConsumidorFinal = cliente.length > 0 && cliente[0].Documento === "0000000000";
          
          if (esConsumidorFinal) {
            idMascotaGenerica = await ventasModel.getMascotaGenericaId();
          }

          // Insertar nuevos detalles
          let subtotalServicios = 0
          let totalIvaServicios = 0

          for (const detalle of detallesServicios) {
            // Verificar si el servicio existe
            const [servicios] = await connection.query(`SELECT * FROM Servicios WHERE IdServicio = ?`, [
              detalle.IdServicio,
            ])

            if (servicios.length === 0) {
              await connection.rollback()
              return res.status(404).json({ message: `Servicio con ID ${detalle.IdServicio} no encontrado` })
            }

            const servicio = servicios[0]

            // Manejar IdMascota correctamente
            let idMascota = null;
            let nombreMascotaTemporal = null;
            let tipoMascotaTemporal = null;

            // Procesar información de mascota temporal si existe
            if (detalle.MascotaTemporal) {
              nombreMascotaTemporal = detalle.MascotaTemporal.Nombre;
              tipoMascotaTemporal = detalle.MascotaTemporal.Tipo;
              
              // Si es Consumidor Final, usar la mascota genérica
              if (esConsumidorFinal && idMascotaGenerica) {
                idMascota = idMascotaGenerica;
              }
            } 
            // Si no hay mascota temporal pero hay un IdMascota, verificar que sea válido
            else if (detalle.IdMascota) {
              // Verificar si la mascota existe
              const [mascotas] = await connection.query(`SELECT * FROM Mascotas WHERE IdMascota = ?`, [
                detalle.IdMascota,
              ])

              if (mascotas.length === 0) {
                await connection.rollback()
                return res.status(404).json({ message: `Mascota con ID ${detalle.IdMascota} no encontrada` })
              }
              
              idMascota = detalle.IdMascota;
            }
            // Si no hay IdMascota ni MascotaTemporal pero es Consumidor Final, usar mascota genérica
            else if (esConsumidorFinal && idMascotaGenerica) {
              idMascota = idMascotaGenerica;
            }

            // Calcular subtotal e IVA
            const precioUnitario = detalle.PrecioUnitario || servicio.Precio
            const subtotalDetalle = precioUnitario * detalle.Cantidad
            let ivaUnitario = 0

            if (servicio.AplicaIVA) {
              ivaUnitario = precioUnitario * (servicio.PorcentajeIVA / 100)
            }

            const subtotalConIva = subtotalDetalle + ivaUnitario * detalle.Cantidad

            // Insertar detalle
            await connection.query(
              `INSERT INTO DetalleVentasServicios 
              (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, NombreMascotaTemporal, TipoMascotaTemporal) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                detalle.IdServicio,
                idMascota,
                detalle.Cantidad,
                precioUnitario,
                subtotalDetalle,
                ivaUnitario,
                subtotalConIva,
                nombreMascotaTemporal,
                tipoMascotaTemporal
              ],
            )

            // Acumular totales
            subtotalServicios += subtotalDetalle
            totalIvaServicios += ivaUnitario * detalle.Cantidad
          }

          // Calcular totales generales
          const subtotalTotal = subtotalProductos + subtotalServicios
          const totalIvaTotal = totalIvaProductos + totalIvaServicios
          const totalMontoTotal = subtotalTotal + totalIvaTotal

          // Actualizar totales de la venta
          await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
            subtotalTotal,
            totalIvaTotal,
            totalMontoTotal,
            id,
          ])
        }
      }

      await connection.commit()

      // Obtener la venta actualizada con sus detalles
      const ventaActualizada = await ventasModel.getById(id)
      const detallesProductosActualizados = await detalleVentasModel.getByVenta(id)
      const detallesServiciosActualizados = await detalleVentasServiciosModel.getByVenta(id)

      res.status(200).json({
        venta: ventaActualizada,
        detallesProductos: detallesProductosActualizados,
        detallesServicios: detallesServiciosActualizados,
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error("Error al hacer rollback:", rollbackError)
        }
      }
      console.error("Error al actualizar venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // Cambiar el estado de una venta
  changeStatus: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const { Estado } = req.body

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const ventaActual = ventas[0]

      // Validar estado
      if (Estado !== "Efectiva" && Estado !== "Cancelada" && Estado !== "Devuelta") {
        await connection.rollback()
        return res.status(400).json({ message: 'Estado no válido. Debe ser "Efectiva", "Cancelada" o "Devuelta"' })
      }

      // Si se está cancelando una venta que estaba efectiva, devolver el stock
      if ((Estado === "Cancelada" || Estado === "Devuelta") && ventaActual.Estado === "Efectiva") {
        // Obtener detalles de productos de la venta
        const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // Devolver stock de cada producto
        for (const detalle of detallesProductos) {
          await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])
        }
      }

      // Cambiar el estado
      await connection.query(`UPDATE Ventas SET Estado = ? WHERE IdVenta = ?`, [Estado, id])

      await connection.commit()

      // Obtener la venta actualizada
      const ventaActualizada = await ventasModel.getById(id)

      res.status(200).json(ventaActualizada)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error("Error al hacer rollback:", rollbackError)
        }
      }
      console.error("Error al cambiar estado de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // Eliminar una venta
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const ventaActual = ventas[0]

      // Si la venta está efectiva, devolver el stock
      if (ventaActual.Estado === "Efectiva") {
        // Obtener detalles de productos de la venta
        const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // Devolver stock de cada producto
        for (const detalle of detallesProductos) {
          await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])
        }
      }

      // Eliminar detalles de servicios
      await connection.query(`DELETE FROM DetalleVentasServicios WHERE IdVenta = ?`, [id])

      // Eliminar detalles de productos
      await connection.query(`DELETE FROM DetalleVentas WHERE IdVenta = ?`, [id])

      // Eliminar la venta
      await connection.query(`DELETE FROM Ventas WHERE IdVenta = ?`, [id])

      await connection.commit()

      res.status(200).json({ message: "Venta eliminada correctamente", id })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          console.error("Error al hacer rollback:", rollbackError)
        }
      }
      console.error("Error al eliminar venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // Obtener ventas por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el cliente existe
      const [clientes] = await query(`SELECT * FROM Clientes WHERE IdCliente = ?`, [id])
      if (clientes.length === 0) {
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByCliente(id)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas del cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener ventas por usuario
  getByUsuario: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el usuario existe
      const [usuarios] = await query(`SELECT * FROM Usuarios WHERE IdUsuario = ?`, [id])
      if (usuarios.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByUsuario(id)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas del usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener ventas por fecha
  getByFecha: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.query

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Se requieren fechaInicio y fechaFin" })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByFecha(fechaInicio, fechaFin)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas por fecha:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener ventas por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params

      // Validar estado
      if (estado !== "Efectiva" && estado !== "Cancelada" && estado !== "Devuelta") {
        return res.status(400).json({ message: 'Estado no válido. Debe ser "Efectiva", "Cancelada" o "Devuelta"' })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByEstado(estado)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas por estado:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener ventas por tipo
  getByTipo: async (req, res) => {
    try {
      const { tipo } = req.params

      // Validar tipo
      if (tipo !== "Venta" && tipo !== "Devolucion") {
        return res.status(400).json({ message: 'Tipo no válido. Debe ser "Venta" o "Devolucion"' })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByTipo(tipo)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas por tipo:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Endpoint para consultas SQL directas (para depuración y solución de problemas)
  directQuery: async (req, res) => {
    try {
      const { query: sql, params } = req.body

      // Validar que se proporcione una consulta SQL
      if (!sql) {
        return res.status(400).json({ message: "Se requiere una consulta SQL" })
      }

      // Validar que la consulta sea de tipo SELECT para evitar modificaciones no deseadas
      if (!sql.trim().toLowerCase().startsWith("select")) {
        return res.status(403).json({ message: "Solo se permiten consultas SELECT" })
      }

      // Ejecutar la consulta
      const result = await query(sql, params || [])

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al ejecutar consulta directa:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Generar código QR para pagos
  generarCodigoQR: async (req, res) => {
    try {
      const { monto, referencia } = req.body

      if (!monto || monto <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor a cero" })
      }

      if (!referencia) {
        return res.status(400).json({ message: "Se requiere una referencia" })
      }

      // En un entorno real, aquí se conectaría con un servicio de pagos o banco
      // para generar un código QR real. Para este ejemplo, simulamos la respuesta.

      // Generar una URL para un código QR (usando un servicio público para este ejemplo)
      const codigoQR = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TRANSFERENCIA:${monto}:${referencia}:${Date.now()}`

      // Generar una referencia única
      const referenciaUnica = `REF-${Date.now().toString().substring(6)}`

      // Fecha de expiración (30 minutos desde ahora)
      const expiracion = new Date(Date.now() + 30 * 60000).toISOString()

      res.status(200).json({
        codigoQR,
        referencia: referenciaUnica,
        expiracion,
        monto,
      })
    } catch (error) {
      console.error("Error al generar código QR:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Registrar una devolución de venta
  registrarDevolucion: async (req, res) => {
    let connection;
    try {
      connection = await getConnection();
      await connection.beginTransaction();

      const { venta, detallesProductos, productosCambio } = req.body;

      console.log("Datos de devolución recibidos:", JSON.stringify(req.body, null, 2));

      if (!venta) {
        await connection.rollback();
        return res.status(400).json({ message: "Datos de venta no proporcionados" });
      }

      if (!venta.IdVentaOriginal) {
        await connection.rollback();
        return res.status(400).json({ message: "ID de venta original no proporcionado" });
      }

      // Verificar que la venta original exista
      const [ventasOriginales] = await connection.query(
        `SELECT * FROM Ventas WHERE IdVenta = ?`,
        [venta.IdVentaOriginal]
      );

      if (ventasOriginales.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Venta original no encontrada" });
      }

      const ventaOriginal = ventasOriginales[0];

      // Crear la venta de devolución
      const [resultVenta] = await connection.query(
        `INSERT INTO Ventas 
        (IdCliente, IdUsuario, FechaVenta, Subtotal, TotalIva, TotalMonto, Estado, NotasAdicionales, Tipo, IdVentaOriginal, MetodoPago) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venta.IdCliente || ventaOriginal.IdCliente,
          venta.IdUsuario || ventaOriginal.IdUsuario,
          venta.FechaVenta || new Date(),
          venta.Subtotal || 0,
          venta.TotalIva || 0,
          venta.TotalMonto || 0,
          venta.Estado || "Pendiente",
          venta.NotasAdicionales || `Devolución de venta #${venta.IdVentaOriginal}`,
          "Devolucion",
          venta.IdVentaOriginal,
          venta.MetodoPago || "efectivo"
        ]
      );

      const idDevolucion = resultVenta.insertId;

      // Procesar productos a devolver
      if (detallesProductos && detallesProductos.length > 0) {
        for (const detalle of detallesProductos) {
          // Verificar si el producto existe
          const [productos] = await connection.query(
            `SELECT * FROM Productos WHERE IdProducto = ?`,
            [detalle.IdProducto]
          );

          if (productos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` });
          }

          // Insertar detalle de devolución
          await connection.query(
            `INSERT INTO DetalleVentas 
            (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              idDevolucion,
              detalle.IdProducto,
              detalle.Cantidad,
              detalle.PrecioUnitario,
              detalle.PrecioUnitario * detalle.Cantidad,
              detalle.IvaUnitario || 0,
              (detalle.PrecioUnitario * detalle.Cantidad) + ((detalle.IvaUnitario || 0) * detalle.Cantidad)
            ]
          );

          // Devolver stock al inventario
          await connection.query(
            `UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`,
            [detalle.Cantidad, detalle.IdProducto]
          );
        }
      }

      // Procesar productos de cambio (si existen)
      if (productosCambio && productosCambio.length > 0) {
        for (const detalle of productosCambio) {
          // Verificar si el producto existe
          const [productos] = await connection.query(
            `SELECT * FROM Productos WHERE IdProducto = ?`,
            [detalle.IdProducto]
          );

          if (productos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` });
          }

          const producto = productos[0];

          // Verificar stock disponible
          if (producto.Stock < detalle.Cantidad) {
            await connection.rollback();
            return res.status(400).json({
              message: `Stock insuficiente para el producto ${producto.NombreProducto}`,
              stockDisponible: producto.Stock,
              cantidadSolicitada: detalle.Cantidad
            });
          }

          // Crear una nueva venta para los productos de cambio
          await connection.query(
            `INSERT INTO DetalleVentas 
            (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, EsCambio) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              idDevolucion,
              detalle.IdProducto,
              -detalle.Cantidad, // Cantidad negativa para indicar que es un cambio
              detalle.PrecioUnitario,
              detalle.PrecioUnitario * detalle.Cantidad,
              detalle.IvaUnitario || 0,
              (detalle.PrecioUnitario * detalle.Cantidad) + ((detalle.IvaUnitario || 0) * detalle.Cantidad),
              1 // Marcar como cambio
            ]
          );

          // Reducir stock de los productos de cambio
          await connection.query(
            `UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`,
            [detalle.Cantidad, detalle.IdProducto]
          );
        }
      }

      await connection.commit();

      // Obtener la devolución completa
      const [devolucionCompleta] = await connection.query(
        `SELECT v.*, 
          c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
          u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        WHERE v.IdVenta = ?`,
        [idDevolucion]
      );

      // Obtener detalles de productos
      const [detallesDevolucion] = await connection.query(
        `SELECT dp.*, p.NombreProducto, p.CodigoBarras
        FROM DetalleVentas dp
        LEFT JOIN Productos p ON dp.IdProducto = p.IdProducto
        WHERE dp.IdVenta = ?`,
        [idDevolucion]
      );

      res.status(201).json({
        message: "Devolución registrada correctamente",
        venta: devolucionCompleta[0],
        detalles: detallesDevolucion
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Error al hacer rollback:", rollbackError);
        }
      }
      console.error("Error al registrar devolución:", error);
      res.status(500).json({ 
        message: "Error en el servidor al registrar devolución", 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          console.error("Error al liberar conexión:", releaseError);
        }
      }
    }
  }
}

// Controlador para detalles de ventas
export const detalleVentasController = {
  // Obtener detalles de una venta
  getByVenta: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar que el ID sea un número válido
      const ventaId = Number.parseInt(id, 10)
      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      // Verificar si la venta existe directamente con una consulta
      const [ventas] = await query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [ventaId])
      if (ventas.length === 0) {
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Obtener detalles directamente con una consulta
      const [detalles] = await query(`
        SELECT dp.*, p.NombreProducto, p.CodigoBarras
        FROM DetalleVentas dp
        LEFT JOIN Productos p ON dp.IdProducto = p.IdProducto
        WHERE dp.IdVenta = ?
      `, [ventaId])

      res.status(200).json(detalles)
    } catch (error) {
      console.error("Error al obtener detalles de venta:", error)
      res.status(500).json({ 
        message: "Error en el servidor al obtener detalles de venta", 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      })
    }
  },

  // Crear un nuevo detalle de venta
  create: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const detalleData = req.body

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [detalleData.IdVenta])
      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Verificar si el producto existe
      const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
        detalleData.IdProducto,
      ])
      if (productos.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = productos[0]

      // Verificar stock disponible
      if (producto.Stock < detalleData.Cantidad) {
        await connection.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para el producto ${producto.NombreProducto}`,
          stockDisponible: producto.Stock,
          cantidadSolicitada: detalleData.Cantidad,
        })
      }

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario || producto.PrecioVenta
      const subtotalDetalle = precioUnitario * detalleData.Cantidad
      let ivaUnitario = 0

      if (producto.AplicaIVA) {
        ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotalDetalle + ivaUnitario * detalleData.Cantidad

      // Crear detalle
      const [resultDetalle] = await connection.query(
        `INSERT INTO DetalleVentas 
        (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdVenta,
          detalleData.IdProducto,
          detalleData.Cantidad,
          precioUnitario,
          subtotalDetalle,
          ivaUnitario,
          subtotalConIva,
        ],
      )

      // Actualizar stock del producto
      await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
        detalleData.Cantidad,
        detalleData.IdProducto,
      ])

      // Actualizar totales de la venta
      const [detallesActualizados] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleData.IdVenta,
      ])

      let subtotalVenta = 0
      let totalIvaVenta = 0

      // Sumar totales de detalles
      for (const detalle of detallesActualizados) {
        subtotalVenta += detalle.Subtotal
        totalIvaVenta += detalle.IvaUnitario * detalle.Cantidad
      }

      const totalMontoVenta = subtotalVenta + totalIvaVenta

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalVenta,
        totalIvaVenta,
        totalMontoVenta,
        detalleData.IdVenta,
      ])

      await connection.commit()

      // Obtener el detalle creado
      const detalleCreado = await detalleVentasModel.getById(resultDetalle.insertId)

      res.status(201).json(detalleCreado)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al crear detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Actualizar un detalle de venta
  update: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const detalleData = req.body

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de venta no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // Verificar si el producto existe
      const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
        detalleData.IdProducto || detalleActual.IdProducto,
      ])

      if (productos.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = productos[0]

      // Calcular diferencia de cantidad para actualizar stock
      const diferenciaCantidad = (detalleData.Cantidad || detalleActual.Cantidad) - detalleActual.Cantidad

      // Verificar stock disponible si se está aumentando la cantidad
      if (diferenciaCantidad > 0 && producto.Stock < diferenciaCantidad) {
        await connection.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para el producto ${producto.NombreProducto}`,
          stockDisponible: producto.Stock,
          cantidadSolicitada: diferenciaCantidad,
        })
      }

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario || detalleActual.PrecioUnitario
      const cantidad = detalleData.Cantidad || detalleActual.Cantidad
      const subtotal = precioUnitario * cantidad
      let ivaUnitario = 0

      if (producto.AplicaIVA) {
        ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotal + ivaUnitario * cantidad

      // Actualizar detalle
      await connection.query(
        `UPDATE DetalleVentas SET 
        IdProducto = ?, Cantidad = ?, PrecioUnitario = ?, Subtotal = ?, IvaUnitario = ?, SubtotalConIva = ? 
        WHERE IdDetalleVenta = ?`,
        [
          detalleData.IdProducto || detalleActual.IdProducto,
          cantidad,
          precioUnitario,
          subtotal,
          ivaUnitario,
          subtotalConIva,
          id,
        ],
      )

      // Actualizar stock del producto
      if (diferenciaCantidad !== 0) {
        await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
          diferenciaCantidad,
          detalleActual.IdProducto,
        ])
      }

      // Actualizar totales de la venta
      const [detallesActualizados] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      let subtotalVenta = 0
      let totalIvaVenta = 0

      // Sumar totales de detalles
      for (const detalle of detallesActualizados) {
        subtotalVenta += detalle.Subtotal
        totalIvaVenta += detalle.IvaUnitario * detalle.Cantidad
      }

      const totalMontoVenta = subtotalVenta + totalIvaVenta

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalVenta,
        totalIvaVenta,
        totalMontoVenta,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      // Obtener el detalle actualizado
      const detalleActualizado = await detalleVentasModel.getById(id)

      res.status(200).json(detalleActualizado)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al actualizar detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Eliminar un detalle de venta
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de venta no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // Devolver stock del producto
      await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
        detalleActual.Cantidad,
        detalleActual.IdProducto,
      ])

      // Eliminar el detalle
      await connection.query(`DELETE FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      // Actualizar totales de la venta
      const [detallesActualizados] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      let subtotalVenta = 0
      let totalIvaVenta = 0

      // Sumar totales de detalles
      for (const detalle of detallesActualizados) {
        subtotalVenta += detalle.Subtotal
        totalIvaVenta += detalle.IvaUnitario * detalle.Cantidad
      }

      const totalMontoVenta = subtotalVenta + totalIvaVenta

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalVenta,
        totalIvaVenta,
        totalMontoVenta,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      res.status(200).json({ message: "Detalle de venta eliminado correctamente", id })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al eliminar detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },
}

// Controlador para detalles de servicios en ventas
export const detalleVentasServiciosController = {
  // Obtener detalles de servicios de una venta
  getByVenta: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar que el ID sea un número válido
      const ventaId = Number.parseInt(id, 10)
      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      // Verificar si la venta existe directamente con una consulta
      const [ventas] = await query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [ventaId])
      if (ventas.length === 0) {
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Obtener detalles directamente con una consulta
      const [detalles] = await query(`
      SELECT ds.*, s.Nombre AS NombreServicio, 
      m.Nombre AS NombreMascota, e.NombreEspecie AS TipoMascota,
      ds.NombreMascotaTemporal, ds.TipoMascotaTemporal
      FROM DetalleVentasServicios ds
      LEFT JOIN Servicios s ON ds.IdServicio = s.IdServicio
      LEFT JOIN Mascotas m ON ds.IdMascota = m.IdMascota
      LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
      WHERE ds.IdVenta = ?
      `, [ventaId])

      res.status(200).json(detalles)
    } catch (error) {
      console.error("Error al obtener detalles de servicios de venta:", error)
      res.status(500).json({ 
        message: "Error en el servidor al obtener detalles de servicios", 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      })
    }
  },

  // Crear un nuevo detalle de servicio
  create: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const detalleData = req.body

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [detalleData.IdVenta])
      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Verificar si el servicio existe
      const [servicios] = await connection.query(`SELECT * FROM Servicios WHERE IdServicio = ?`, [
        detalleData.IdServicio,
      ])
      if (servicios.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Servicio no encontrado" })
      }

      const servicio = servicios[0]

      // Verificar si la venta tiene un cliente asociado
      const venta = ventas[0];
      const esConsumidorFinal = await ventasModel.isConsumidorFinal(venta.IdCliente);
      
      // Obtener el ID de la mascota genérica si es necesario
      let idMascota = detalleData.IdMascota;
      let nombreMascotaTemporal = null;
      let tipoMascotaTemporal = null;
      
      // Procesar información de mascota temporal si existe
      if (detalleData.MascotaTemporal) {
        nombreMascotaTemporal = detalleData.MascotaTemporal.Nombre;
        tipoMascotaTemporal = detalleData.MascotaTemporal.Tipo;
        
        // Si es Consumidor Final, usar la mascota genérica
        if (esConsumidorFinal) {
          const idMascotaGenerica = await ventasModel.getMascotaGenericaId();
          if (idMascotaGenerica) {
            idMascota = idMascotaGenerica;
          }
        }
      } 
      // Verificar si la mascota existe (si se proporciona)
      else if (idMascota) {
        const [mascotas] = await connection.query(`SELECT * FROM Mascotas WHERE IdMascota = ?`, [idMascota])
        if (mascotas.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Mascota no encontrada" })
        }
        
        // Si no es consumidor final, validar que la mascota pertenezca al cliente
        if (!esConsumidorFinal) {
          const [mascotasCliente] = await connection.query(
            `SELECT * FROM Mascotas WHERE IdMascota = ? AND IdCliente = ?`, 
            [idMascota, venta.IdCliente]
          );
          
          if (mascotasCliente.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
              message: `La mascota con ID ${idMascota} no pertenece al cliente de la venta` 
            });
          }
        }
      }
      // Si no hay IdMascota ni MascotaTemporal pero es Consumidor Final, usar mascota genérica
      else if (esConsumidorFinal) {
        const idMascotaGenerica = await ventasModel.getMascotaGenericaId();
        if (idMascotaGenerica) {
          idMascota = idMascotaGenerica;
        }
      }

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario || servicio.Precio
      const subtotalDetalle = precioUnitario * detalleData.Cantidad
      let ivaUnitario = 0

      if (servicio.AplicaIVA) {
        ivaUnitario = precioUnitario * (servicio.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotalDetalle + ivaUnitario * detalleData.Cantidad

      // Crear detalle
      const [resultDetalle] = await connection.query(
        `INSERT INTO DetalleVentasServicios 
        (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, NombreMascotaTemporal, TipoMascotaTemporal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdVenta,
          detalleData.IdServicio,
          idMascota,
          detalleData.Cantidad,
          precioUnitario,
          subtotalDetalle,
          ivaUnitario,
          subtotalConIva,
          nombreMascotaTemporal,
          tipoMascotaTemporal
        ],
      )

      // Actualizar totales de la venta
      // Primero obtener todos los detalles de productos
      const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleData.IdVenta,
      ])

      // Luego obtener todos los detalles de servicios
      const [detallesServicios] = await connection.query(`SELECT * FROM DetalleVentasServicios WHERE IdVenta = ?`, [
        detalleData.IdVenta,
      ])

      let subtotalProductos = 0
      let totalIvaProductos = 0
      let subtotalServicios = 0
      let totalIvaServicios = 0

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
        totalIvaServicios += detalle.IvaUnitario * detalle.Cantidad
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos + totalIvaServicios
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleData.IdVenta,
      ])

      await connection.commit()

      // Obtener el detalle creado
      const detalleCreado = await detalleVentasServiciosModel.getById(resultDetalle.insertId)

      res.status(201).json(detalleCreado)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al crear detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Actualizar un detalle de servicio
  update: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const detalleData = req.body

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(
        `SELECT * FROM DetalleVentasServicios WHERE IdDetalleVentasServicios = ?`,
        [id],
      )

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de servicio no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // Verificar si el servicio existe
      const [servicios] = await connection.query(`SELECT * FROM Servicios WHERE IdServicio = ?`, [
        detalleData.IdServicio || detalleActual.IdServicio,
      ])

      if (servicios.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Servicio no encontrado" })
      }

      const servicio = servicios[0]

      // Verificar si la venta tiene un cliente asociado
      const [ventas] = await connection.query(`SELECT IdCliente FROM Ventas WHERE IdVenta = ?`, [detalleActual.IdVenta]);
      const esConsumidorFinal = ventas.length > 0 ? await ventasModel.isConsumidorFinal(ventas[0].IdCliente) : false;
      
      // Manejar IdMascota y datos de mascota temporal
      let idMascota = detalleData.IdMascota || detalleActual.IdMascota;
      let nombreMascotaTemporal = detalleData.NombreMascotaTemporal || detalleActual.NombreMascotaTemporal;
      let tipoMascotaTemporal = detalleData.TipoMascotaTemporal || detalleActual.TipoMascotaTemporal;
      
      // Procesar información de mascota temporal si existe
      if (detalleData.MascotaTemporal) {
        nombreMascotaTemporal = detalleData.MascotaTemporal.Nombre;
        tipoMascotaTemporal = detalleData.MascotaTemporal.Tipo;
        
        // Si es Consumidor Final, usar la mascota genérica
        if (esConsumidorFinal) {
          const idMascotaGenerica = await ventasModel.getMascotaGenericaId();
          if (idMascotaGenerica) {
            idMascota = idMascotaGenerica;
          }
        }
      } 
      // Verificar si la mascota existe (si se proporciona)
      else if (detalleData.IdMascota && detalleData.IdMascota !== detalleActual.IdMascota) {
        const [mascotas] = await connection.query(`SELECT * FROM Mascotas WHERE IdMascota = ?`, [detalleData.IdMascota])
        if (mascotas.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Mascota no encontrada" })
        }
        
        // Si no es consumidor final, validar que la mascota pertenezca al cliente
        if (!esConsumidorFinal && ventas.length > 0) {
          const [mascotasCliente] = await connection.query(
            `SELECT * FROM Mascotas WHERE IdMascota = ? AND IdCliente = ?`, 
            [detalleData.IdMascota, ventas[0].IdCliente]
          );
          
          if (mascotasCliente.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
              message: `La mascota con ID ${detalleData.IdMascota} no pertenece al cliente de la venta` 
            });
          }
        }
      }

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario || detalleActual.PrecioUnitario
      const cantidad = detalleData.Cantidad || detalleActual.Cantidad
      const subtotal = precioUnitario * cantidad
      let ivaUnitario = 0

      if (servicio.AplicaIVA) {
        ivaUnitario = precioUnitario * (servicio.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotal + ivaUnitario * cantidad

      // Actualizar detalle
      await connection.query(
        `UPDATE DetalleVentasServicios SET 
        IdServicio = ?, IdMascota = ?, Cantidad = ?, PrecioUnitario = ?, Subtotal = ?, IvaUnitario = ?, SubtotalConIva = ?, NombreMascotaTemporal = ?, TipoMascotaTemporal = ? 
        WHERE IdDetalleVentasServicios = ?`,
        [
          detalleData.IdServicio || detalleActual.IdServicio,
          idMascota,
          cantidad,
          precioUnitario,
          subtotal,
          ivaUnitario,
          subtotalConIva,
          nombreMascotaTemporal,
          tipoMascotaTemporal,
          id,
        ],
      )

      // Actualizar totales de la venta
      // Primero obtener todos los detalles de productos
      const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      // Luego obtener todos los detalles de servicios
      const [detallesServicios] = await connection.query(`SELECT * FROM DetalleVentasServicios WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      let subtotalProductos = 0
      let totalIvaProductos = 0
      let subtotalServicios = 0
      let totalIvaServicios = 0

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
        totalIvaServicios += detalle.IvaUnitario * detalle.Cantidad
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos + totalIvaServicios
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      // Obtener el detalle actualizado
      const detalleActualizado = await detalleVentasServiciosModel.getById(id)

      res.status(200).json(detalleActualizado)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al actualizar detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Eliminar un detalle de servicio
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(
        `SELECT * FROM DetalleVentasServicios WHERE IdDetalleVentasServicios = ?`,
        [id],
      )

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de servicio no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // Eliminar el detalle
      await connection.query(`DELETE FROM DetalleVentasServicios WHERE IdDetalleVentasServicios = ?`, [id])

      // Actualizar totales de la venta
      // Primero obtener todos los detalles de productos
      const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      // Luego obtener todos los detalles de servicios
      const [detallesServicios] = await connection.query(`SELECT * FROM DetalleVentasServicios WHERE IdVenta = ?`, [
        detalleActual.IdVenta,
      ])

      let subtotalProductos = 0
      let totalIvaProductos = 0
      let subtotalServicios = 0
      let totalIvaServicios = 0

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
        totalIvaServicios += detalle.IvaUnitario * detalle.Cantidad
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos + totalIvaServicios
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      res.status(200).json({ message: "Detalle de servicio eliminado correctamente", id })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al eliminar detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },
}

export default {
  ventas: ventasController,
  detalleVentas: detalleVentasController,
  detalleVentasServicios: detalleVentasServiciosController,
}
