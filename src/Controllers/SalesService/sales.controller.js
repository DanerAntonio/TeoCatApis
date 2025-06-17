import { ventasModel, detalleVentasModel, detalleVentasServiciosModel } from "../../Models/SalesService/sales.model.js"
import { query, getConnection } from "../../Config/Database.js"
import moment from "moment-timezone";
import { notificacionesModel } from "../../Models/NotificationService/notifications.model.js";
import cloudinary from "../../Config/cloudinary.js";

// Función para convertir fecha JS a formato MySQL
function toMySQLDateTime(dateString) {
  const date = new Date(dateString)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// Función para parsear números desde el frontend
function parseNumber(value) {
  if (typeof value === "number") return value
  if (!value) return 0
  // Si el valor tiene más de un punto, los primeros son miles, el último es decimal
  let stringValue = String(value).replace(/,/g, '.').trim()
  const parts = stringValue.split('.')
  if (parts.length > 2) {
    // Ejemplo: "7.500.00" => ["7", "500", "00"]
    // Unir todos menos el último como miles, el último como decimal
    const decimal = parts.pop()
    stringValue = parts.join('') + '.' + decimal
  }
  return Number(stringValue) || 0
}

// ✅ FUNCIONES AUXILIARES PARA MANEJO DE STOCK
const debeActualizarStock = (producto) => {
  return true; // Siempre actualiza el stock, sin importar el estado
}

const actualizarStockProducto = async (connection, idProducto, cantidad, operacion = "venta") => {
  try {
    console.log(
      `🔄 Iniciando actualización de stock - Producto: ${idProducto}, Cantidad: ${cantidad}, Operación: ${operacion}`,
    )

    // Obtener información actual del producto
    const [productos] = await connection.query(
      `SELECT IdProducto, NombreProducto, Stock, Origen, Estado FROM Productos WHERE IdProducto = ?`,
      [idProducto],
    )

    if (productos.length === 0) {
      console.error(`❌ Producto ${idProducto} no encontrado`)
      throw new Error(`Producto con ID ${idProducto} no encontrado`)
    }

    const producto = productos[0]
    // Asegúrate de que el stock sea un número
    let stockActual = Number(producto.Stock)
    let cantidadNum = Number(cantidad)

    // Calcular nuevo stock según la operación
    let nuevoStock
    if (operacion === "venta" || operacion === "salida") {
      nuevoStock = stockActual - cantidadNum
    } else if (operacion === "devolucion" || operacion === "entrada") {
      nuevoStock = stockActual + cantidadNum
    } else {
      console.error(`❌ Operación no válida: ${operacion}`)
      throw new Error(`Operación no válida: ${operacion}`)
    }

    // Si tu stock debe ser entero:
    nuevoStock = Math.round(nuevoStock)
    // Si tu stock puede ser decimal, usa:
    // nuevoStock = Number(nuevoStock.toFixed(2))

    // Verificar que el stock no quede negativo en ventas
    if ((operacion === "venta" || operacion === "salida") && nuevoStock < 0) {
      console.error(
        `❌ Stock insuficiente para ${producto.NombreProducto}. Stock actual: ${producto.Stock}, Cantidad solicitada: ${cantidad}`,
      )
      throw new Error(
        `Stock insuficiente para ${producto.NombreProducto}. Disponible: ${producto.Stock}, Solicitado: ${cantidad}`,
      )
    }

    // Actualizar stock en la base de datos
    const [resultado] = await connection.query(`UPDATE Productos SET Stock = ? WHERE IdProducto = ?`, [
      nuevoStock,
      idProducto,
    ])

    if (resultado.affectedRows === 0) {
      console.error(`❌ No se pudo actualizar el stock del producto ${idProducto}`)
      throw new Error(`No se pudo actualizar el stock del producto ${idProducto}`)
    }

    console.log(`✅ Stock actualizado exitosamente:`, {
      producto: producto.NombreProducto,
      stockAnterior: producto.Stock,
      stockNuevo: nuevoStock,
      diferencia: operacion === "venta" ? -cantidad : +cantidad,
      operacion: operacion,
    })

    return true
  } catch (error) {
    console.error(`❌ Error al actualizar stock del producto ${idProducto}:`, error)
    throw error
  }
}

const verificarStockProducto = async (connection, idProducto) => {
  try {
    const [productos] = await connection.query(
      `SELECT IdProducto, NombreProducto, Stock, Origen, Estado FROM Productos WHERE IdProducto = ?`,
      [idProducto],
    )

    if (productos.length === 0) {
      return { existe: false, mensaje: "Producto no encontrado" }
    }

    const producto = productos[0]

    return {
      existe: true,
      producto: {
        id: producto.IdProducto,
        nombre: producto.NombreProducto,
        stock: producto.Stock,
        origen: producto.Origen,
        estado: producto.Estado,
        manejaStock: debeActualizarStock(producto),
      },
    }
  } catch (error) {
    console.error(`Error al verificar stock del producto ${idProducto}:`, error)
    return { existe: false, mensaje: "Error al verificar producto" }
  }
}

// ✅ CONTROLADOR DE VENTAS ACTUALIZADO CON MANEJO COMPLETO DE STOCK
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

  // ✅ NUEVO: Obtener clientes para ventas (usuarios con rol cliente sincronizados)
  getClientesParaVentas: async (req, res) => {
    try {
      console.log("🔍 Obteniendo clientes para ventas...")

      const [clientes] = await query(`
        SELECT 
          c.IdCliente,
          c.IdUsuario,
          c.Documento,
          CONCAT(c.Nombre, ' ', IFNULL(c.Apellido, '')) as NombreCompleto,
          c.Nombre,
          c.Apellido,
          c.Correo,
          c.Telefono,
          c.Direccion,
          c.Estado,
          r.NombreRol,
          CASE 
            WHEN c.Documento = '0000000000' THEN 'Consumidor Final'
            ELSE 'Cliente Registrado'
          END as TipoCliente,
          CASE 
            WHEN c.Documento = '0000000000' THEN CONCAT(c.Nombre, ' ', IFNULL(c.Apellido, ''))
            ELSE CONCAT(c.Nombre, ' ', IFNULL(c.Apellido, ''), ' - ', c.Documento)
          END as TextoSelect,
          -- Contar mascotas asociadas
          (SELECT COUNT(*) FROM Mascotas m WHERE m.IdCliente = c.IdCliente AND m.Estado = TRUE) as TotalMascotas,
          CASE 
            WHEN c.Documento = '0000000000' OR c.IdCliente = 3 THEN 1 
            ELSE 0 
          END as esConsumidorFinal
        FROM Clientes c
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE c.Estado = TRUE 
        AND u.Estado = TRUE
        ORDER BY 
          CASE WHEN c.Documento = '0000000000' THEN 1 ELSE 0 END,
          c.Nombre, c.Apellido
      `)

      console.log("✅ Clientes para ventas obtenidos:", clientes.length)
      res.status(200).json(clientes)
    } catch (error) {
      console.error("❌ Error al obtener clientes para ventas:", error)
      res.status(500).json({
        message: "Error al obtener clientes para ventas",
        error: error.message,
      })
    }
  },

  // ✅ NUEVO: Obtener mascotas de un cliente específico
  getMascotasCliente: async (req, res) => {
    try {
      const { idCliente } = req.params

      console.log(`🐾 Obteniendo mascotas para cliente ID: ${idCliente}`)

      const [mascotas] = await query(
        `
        SELECT 
          m.IdMascota,
          m.IdCliente,
          m.Nombre as NombreMascota,
          m.Raza,
          m.Tamaño,
          e.NombreEspecie,
          CONCAT(m.Nombre, ' (', e.NombreEspecie, ' - ', m.Raza, ')') as TextoCompletoMascota,
          m.Estado,
          FALSE as esMascotaGenerica
        FROM Mascotas m
        INNER JOIN Especies e ON m.IdEspecie = e.IdEspecie
        WHERE m.IdCliente = ? 
        AND m.Estado = TRUE
        ORDER BY m.Nombre
      `,
        [idCliente],
      )

      console.log(`✅ Mascotas encontradas: ${mascotas.length}`)
      res.status(200).json(mascotas)
    } catch (error) {
      console.error("❌ Error al obtener mascotas:", error)
      res.status(500).json({
        message: "Error al obtener mascotas",
        error: error.message,
      })
    }
  },

  // ✅ MÉTODO GETBYID COMPLETAMENTE CORREGIDO
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const ventaId = Number.parseInt(id, 10)
      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      console.log(`Buscando venta con ID: ${ventaId}`)

      const ventas = await query(
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

      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const venta = ventas[0]

      // ✅ MANEJO MEJORADO DE CLIENTE CON SINCRONIZACIÓN
      const idCliente = venta.IdCliente || null
      const documentoCliente = venta.DocumentoCliente || null

      // Usar el campo calculado de la consulta
      const esConsumidorFinal = Boolean(venta.esConsumidorFinal)

      console.log("Análisis de cliente:", {
        idCliente,
        documentoCliente,
        esConsumidorFinal,
        nombreRol: venta.NombreRol,
      })

      // Obtener detalles de productos con manejo de errores
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
        detallesProductos = productos || []
      } catch (detailError) {
        console.error(`Error al obtener detalles de productos para venta ${ventaId}:`, detailError)
        detallesProductos = []
      }

      // Obtener detalles de servicios con manejo de errores
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
        detallesServicios = Array.isArray(servicios)
          ? servicios.map((servicio) => {
              // Si hay información de mascota temporal, usarla en lugar de la mascota registrada
              if (servicio.NombreMascotaTemporal) {
                return {
                  ...servicio,
                  NombreMascota: servicio.NombreMascotaTemporal,
                  TipoMascota: servicio.TipoMascotaTemporal,
                  esMascotaTemporal: true,
                }
              }
              return servicio
            })
          : []
      } catch (serviceError) {
        console.error(`Error al obtener detalles de servicios para venta ${ventaId}:`, serviceError)
        detallesServicios = []
      }

      // ✅ PREPARAR DATOS DEL CLIENTE DE MANERA SEGURA
      const clienteData = {
        IdCliente: idCliente,
        nombre: venta.NombreCliente || (esConsumidorFinal ? "Consumidor" : "Cliente"),
        apellido: venta.ApellidoCliente || (esConsumidorFinal ? "Final" : ""),
        documento: documentoCliente || "0000000000",
        esConsumidorFinal: esConsumidorFinal,
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        rol: venta.NombreRol || "Cliente",
      }

      // ✅ PREPARAR DATOS DEL USUARIO DE MANERA SEGURA
      const usuarioData = {
        nombre: venta.NombreUsuario || "",
        apellido: venta.ApellidoUsuario || "",
      }

      // Combinar todo en un solo objeto
      const ventaCompleta = {
        ...venta,
        cliente: clienteData,
        usuario: usuarioData,
        detallesProductos,
        detallesServicios,
        productos: detallesProductos, // Para compatibilidad con el frontend
        servicios: detallesServicios, // Para compatibilidad con el frontend
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        productosCount: Array.isArray(detallesProductos) ? detallesProductos.length : 0,
        serviciosCount: Array.isArray(detallesServicios) ? detallesServicios.length : 0,
      }

      console.log("Venta completa preparada:", {
        IdVenta: ventaCompleta.IdVenta,
        cliente: ventaCompleta.cliente,
        productosCount: detallesProductos.length,
        serviciosCount: detallesServicios.length,
      })

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

  // ✅ NUEVO ENDPOINT PARA OBTENER DETALLES DE SERVICIOS
  getDetallesServicios: async (req, res) => {
    try {
      const { id } = req.params

      // Validar que el ID sea un número
      const ventaId = Number.parseInt(id, 10)
      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      console.log(`Obteniendo detalles de servicios para venta ID: ${ventaId}`)

      // Verificar si la venta existe
      const [ventas] = await query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [ventaId])
      if (ventas.length === 0) {
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // Obtener detalles de servicios
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

      // Procesar los detalles de servicios
      const detallesServicios = Array.isArray(servicios)
        ? servicios.map((servicio) => {
            // Si hay información de mascota temporal, usarla en lugar de la mascota registrada
            if (servicio.NombreMascotaTemporal) {
              return {
                ...servicio,
                NombreMascota: servicio.NombreMascotaTemporal,
                TipoMascota: servicio.TipoMascotaTemporal,
                esMascotaTemporal: true,
              }
            }
            return servicio
          })
        : []

      res.status(200).json(detallesServicios)
    } catch (error) {
      console.error("Error al obtener detalles de servicios:", error)
      res.status(500).json({
        message: "Error en el servidor",
        error: error.message,
      })
    }
  },

  // ✅ MÉTODO ACTUALIZADO: Obtener el consumidor final
  getConsumidorFinal: async (req, res) => {
    try {
      // Buscar el consumidor final en la tabla de clientes sincronizada
      const [clientes] = await query(`
        SELECT c.*, u.IdUsuario, r.NombreRol
        FROM Clientes c
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE c.Documento = '0000000000' 
        AND c.Estado = TRUE
        AND u.Estado = TRUE
        AND r.NombreRol = 'Cliente'
        LIMIT 1
      `)

      if (clientes.length > 0) {
        const consumidorFinal = clientes[0]
        res.status(200).json({
          success: true,
          consumidorFinal: {
            IdCliente: consumidorFinal.IdCliente,
            IdUsuario: consumidorFinal.IdUsuario,
            Documento: consumidorFinal.Documento,
            Nombre: consumidorFinal.Nombre,
            Apellido: consumidorFinal.Apellido,
            esConsumidorFinal: true,
            tipoCliente: "consumidor_final",
          },
        })
      } else {
        res.status(404).json({ message: "Consumidor Final no encontrado en el sistema sincronizado" })
      }
    } catch (error) {
      console.error("Error al obtener Consumidor Final:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // NUEVO: Obtener la mascota genérica
  getMascotaGenerica: async (req, res) => {
    try {
      const idMascotaGenerica = await ventasModel.getMascotaGenericaId()

      if (idMascotaGenerica) {
        // Obtener los datos completos de la mascota genérica
        const [mascotas] = await query(
          `
          SELECT m.*, e.NombreEspecie 
          FROM Mascotas m
          LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie
          WHERE m.IdMascota = ?`,
          [idMascotaGenerica],
        )

        if (mascotas.length > 0) {
          res.status(200).json({
            success: true,
            mascotaGenerica: {
              IdMascota: mascotas[0].IdMascota,
              Nombre: mascotas[0].Nombre,
              Especie: mascotas[0].NombreEspecie,
              esMascotaGenerica: true,
            },
          })
        } else {
          res.status(404).json({ message: "Mascota Genérica no encontrada" })
        }
      } else {
        res.status(404).json({ message: "Mascota Genérica no configurada en el sistema" })
      }
    } catch (error) {
      console.error("Error al obtener Mascota Genérica:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ MÉTODO CREATE CON MANEJO COMPLETO DE STOCK
  create: async (req, res) => {
    let connection;
    try {
      const venta = req.body.venta || req.body;
      const detallesProductos = req.body.detallesProductos || [];
      const detallesServicios = req.body.detallesServicios || [];

      // --- VALIDACIONES INICIALES AGREGADAS ---
      // 1. Validar cliente obligatorio
      if (!venta.IdCliente) {
        return res.status(400).json({ message: "Debe seleccionar un cliente para la venta" });
      }

      // 2. Validar al menos un producto o servicio
      if ((!Array.isArray(detallesProductos) || detallesProductos.length === 0) &&
          (!Array.isArray(detallesServicios) || detallesServicios.length === 0)) {
        return res.status(400).json({ message: "Debe agregar al menos un producto o servicio a la venta" });
      }

      // 3. Validar productos vendidos
      if (Array.isArray(detallesProductos) && detallesProductos.length > 0) {
        const ids = new Set();
        for (const item of detallesProductos) {
          if (!item.IdProducto) {
            return res.status(400).json({ message: "Todos los productos deben tener IdProducto" });
          }
          if (ids.has(item.IdProducto)) {
            return res.status(400).json({ message: `Producto duplicado en la venta (ID: ${item.IdProducto})` });
          }
          ids.add(item.IdProducto);
          if (!Number.isInteger(item.Cantidad) || item.Cantidad <= 0) {
            return res.status(400).json({ message: `Cantidad inválida para el producto ID ${item.IdProducto}` });
          }
          if (parseNumber(item.PrecioUnitario) <= 0) {
            return res.status(400).json({ message: `Precio unitario inválido para el producto ID ${item.IdProducto}` });
          }
        }
      }

      // 4. Validar servicios vendidos
      if (Array.isArray(detallesServicios) && detallesServicios.length > 0) {
        for (const item of detallesServicios) {
          if (!item.IdServicio) {
            return res.status(400).json({ message: "Todos los servicios deben tener IdServicio" });
          }
          if (!Number.isInteger(item.Cantidad) || item.Cantidad <= 0) {
            return res.status(400).json({ message: `Cantidad inválida para el servicio ID ${item.IdServicio}` });
          }
          if (parseNumber(item.PrecioUnitario) <= 0) {
            return res.status(400).json({ message: `Precio unitario inválido para el servicio ID ${item.IdServicio}` });
          }
        }
      }

      // 5. Validar método de pago
      const metodosPermitidos = ["efectivo", "qr", "transferencia"];
      if (!venta.MetodoPago || !metodosPermitidos.includes(venta.MetodoPago.toLowerCase())) {
        return res.status(400).json({ message: "Método de pago inválido" });
      }

      // 6. Si es efectivo, monto recibido suficiente
      if (venta.MetodoPago && venta.MetodoPago.toLowerCase() === "efectivo") {
        if (parseNumber(venta.MontoRecibido) < parseNumber(venta.TotalMonto || 0)) {
          return res.status(400).json({ message: "El monto recibido es insuficiente para el pago en efectivo" });
        }
      }

      // 7. Validar fecha de venta
      if (!venta.FechaVenta || isNaN(Date.parse(venta.FechaVenta))) {
        return res.status(400).json({ message: "Fecha de venta inválida" });
      }
      if (new Date(venta.FechaVenta) > new Date()) {
        return res.status(400).json({ message: "La fecha de venta no puede ser futura" });
      }

      // 8. Validar totales (opcional, pero recomendado)
      // Puedes recalcular subtotal, iva y total aquí y comparar con los enviados
      // Si quieres forzar coherencia, descomenta:
      /*
      let subtotalCalc = 0, ivaCalc = 0;
      if (Array.isArray(detallesProductos)) {
        for (const item of detallesProductos) {
          subtotalCalc += parseNumber(item.PrecioUnitario) * item.Cantidad;
        }
      }
      if (Array.isArray(detallesServicios)) {
        for (const item of detallesServicios) {
          subtotalCalc += parseNumber(item.PrecioUnitario) * item.Cantidad;
        }
      }
      if (parseNumber(venta.Subtotal) !== subtotalCalc) {
        return res.status(400).json({ message: "El subtotal no coincide con el detalle de la venta" });
      }
      */
      // --- FIN VALIDACIONES INICIALES AGREGADAS ---

      // Comprobante de pago (archivo)
      let comprobantePago = null;
      let comprobantePagoUrl = null;
      if (req.file) {
        // Sube el archivo a Cloudinary
        const uploadResult = await cloudinary.uploader.upload_stream(
          { folder: "comprobantes" },
          (error, result) => {
            if (error) throw error;
            comprobantePagoUrl = result.secure_url;
          }
        );
        // Necesitas convertir el buffer a stream:
        const streamifier = await import("streamifier");
        streamifier.createReadStream(req.file.buffer).pipe(uploadResult);
      }

      // Generar referencia automática si es transferencia
      if (venta.MetodoPago === 'transferencia' && !venta.ReferenciaPago) {
        venta.ReferenciaPago = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      // Limpiar campos si es efectivo
      if (venta.MetodoPago === 'efectivo') {
        venta.ReferenciaPago = null;
        venta.CodigoQR = null;
      }

      // Generar QR si es venta presencial con QR
      if (venta.MetodoPago === 'qr' && venta.Estado !== 'Pendiente' && !venta.CodigoQR) {
        venta.CodigoQR = `QR-${Date.now()}`;
      }
      // --- FIN LÓGICA DE MÉTODO DE PAGO ---

      console.log("🛒 Iniciando creación de venta:", JSON.stringify(req.body, null, 2))

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

      connection = await getConnection();
      await connection.beginTransaction();

      // ✅ VERIFICACIÓN MEJORADA DE CLIENTE CON SINCRONIZACIÓN
      if (!venta.IdCliente) {
        // Si no se proporcionó, intentar usar el consumidor final
        const [consumidorFinal] = await connection.query(`
          SELECT c.IdCliente
          FROM Clientes c
          INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
          INNER JOIN Roles r ON u.IdRol = r.IdRol
          WHERE c.Documento = '0000000000' 
          AND c.Estado = TRUE
          AND u.Estado = TRUE
          AND r.NombreRol = 'Cliente'
          LIMIT 1
        `)

        if (consumidorFinal.length > 0) {
          venta.IdCliente = consumidorFinal[0].IdCliente
          console.log("Usando cliente Consumidor Final (ID:", consumidorFinal[0].IdCliente, ")")
        } else {
          await connection.rollback()
          return res.status(400).json({ message: "Se requiere un cliente para la venta" })
        }
      }

      // ✅ VERIFICACIÓN MEJORADA DE CLIENTE EXISTENTE CON SINCRONIZACIÓN
      const [clientes] = await connection.query(
        `
        SELECT c.*, u.IdUsuario, r.NombreRol,
        CASE 
          WHEN c.Documento = '0000000000' OR c.IdCliente = 3 THEN 1 
          ELSE 0 
        END as esConsumidorFinal
        FROM Clientes c
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE c.IdCliente = ?
        AND c.Estado = TRUE
        AND u.Estado = TRUE
      `,
        [venta.IdCliente],
      )

      if (clientes.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Cliente no encontrado o no está sincronizado correctamente" })
      }

      const clienteSeleccionado = clientes[0]
      const esConsumidorFinal = Boolean(clienteSeleccionado.esConsumidorFinal)

      console.log("Cliente seleccionado:", {
        IdCliente: clienteSeleccionado.IdCliente,
        Documento: clienteSeleccionado.Documento,
        Nombre: clienteSeleccionado.Nombre,
        esConsumidorFinal: esConsumidorFinal,
        rol: clienteSeleccionado.NombreRol,
      })

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

      // Construir la consulta dinámica basada en las columnas disponibles
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
        const fechaVenta = toMySQLDateTime(venta.FechaVenta || new Date());
        values.push(fechaVenta)
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
        fields.push("Estado");
        placeholders.push("?");
        // Si es transferencia, debe ser Pendiente
        values.push(venta.MetodoPago === "Transferencia" ? "Pendiente" : (venta.Estado || "Efectiva"));
      }

      // Añadir estos campos que ahora pueden ser NULL
      if (columnNames.includes("NotasAdicionales")) {
        fields.push("NotasAdicionales")
        placeholders.push("?")
        values.push(esConsumidorFinal ? "Venta presencial" : venta.NotasAdicionales || null)
      }

      if (columnNames.includes("ComprobantePago")) {
        fields.push("ComprobantePago")
        placeholders.push("?")
        values.push(comprobantePago);
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

      console.log(`✅ Venta creada con ID: ${idVenta}`)

      // ✅ PROCESAR PRODUCTOS CON MANEJO COMPLETO DE STOCK
      const detallesProductosCreados = []
      let subtotalProductos = 0
      let totalIvaProductos = 0

      if (detallesProductos && detallesProductos.length > 0) {
        console.log(`📦 Procesando ${detallesProductos.length} productos...`)

        for (const detalle of detallesProductos) {
          // Verificar que el producto existe
          const verificacionStock = await verificarStockProducto(connection, detalle.IdProducto)

          if (!verificacionStock.existe) {
            await connection.rollback()
            return res.status(404).json({
              message: `Producto con ID ${detalle.IdProducto} no encontrado`,
            })
          }

          const producto = verificacionStock.producto

          // ✅ VERIFICAR STOCK ANTES DE CREAR EL DETALLE
          if (producto.manejaStock) {
            if (producto.stock < detalle.Cantidad) {
              await connection.rollback()
              return res.status(400).json({
                message: `Stock insuficiente para ${producto.nombre}`,
                stockDisponible: producto.stock,
                cantidadSolicitada: detalle.Cantidad,
              })
            }
          }

          // Obtener datos completos del producto
          const [productosCompletos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])
          const productoCompleto = productosCompletos[0]

          // Calcular subtotal e IVA
          const precioUnitario = parseNumber(detalle.PrecioUnitario) || parseNumber(productoCompleto.PrecioVenta) || 0
          const cantidad = parseNumber(detalle.Cantidad) || 1
          const subtotalDetalle = precioUnitario * cantidad
          let ivaUnitario = 0

          if (productoCompleto.AplicaIVA) {
            ivaUnitario = precioUnitario * (parseNumber(productoCompleto.PorcentajeIVA) / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * cantidad

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

          console.log(`📝 Detalle creado para producto ${producto.nombre} (ID: ${resultDetalle.insertId})`)

          detallesProductosCreados.push({
            id: resultDetalle.insertId,
            IdVenta: idVenta,
            IdProducto: detalle.IdProducto,
            NombreProducto: producto.nombre,
            Cantidad: detalle.Cantidad,
            PrecioUnitario: precioUnitario,
            Subtotal: subtotalDetalle,
            IvaUnitario: ivaUnitario,
            SubtotalConIva: subtotalConIva,
          })

          // ✅ ACTUALIZAR STOCK DEL PRODUCTO
          const stockActualizado = await actualizarStockProducto(
            connection,
            detalle.IdProducto,
            detalle.Cantidad,
            "venta",
          )

          if (!stockActualizado) {
            await connection.rollback()
            return res.status(500).json({
              message: `Error al actualizar stock del producto ${producto.nombre}`,
            })
          }

          // Acumular totales
          subtotalProductos += subtotalDetalle
          totalIvaProductos += ivaUnitario * detalle.Cantidad
        }
      }

      // ✅ SECCIÓN DE SERVICIOS ACTUALIZADA PARA USUARIOS-CLIENTES SINCRONIZADOS
      const detallesServiciosCreados = []
      let subtotalServicios = 0

      if (detallesServicios && detallesServicios.length > 0) {
        console.log("Procesando detalles de servicios:", detallesServicios)

        // Obtener el ID de la mascota genérica si es necesario
        let idMascotaGenerica = null
        if (esConsumidorFinal) {
          idMascotaGenerica = await ventasModel.getMascotaGenericaId()
          console.log("ID de mascota genérica obtenido:", idMascotaGenerica)
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

          // ✅ LÓGICA MEJORADA PARA MASCOTAS CON USUARIOS-CLIENTES SINCRONIZADOS
          let idMascota = null
          let nombreMascotaTemporal = null
          let tipoMascotaTemporal = null

          // Si es Consumidor Final, SIEMPRE usar mascota genérica
          if (esConsumidorFinal) {
            idMascota = idMascotaGenerica || 1 // Fallback a ID 1
            nombreMascotaTemporal = detalle.NombreMascotaTemporal || ""
            tipoMascotaTemporal = detalle.TipoMascotaTemporal || "Genérica"
            console.log("Consumidor Final: usando mascota genérica ID:", idMascota)
          }
          // Si es cliente registrado (usuario con rol Cliente), usar sus mascotas
          else {
            console.log("Cliente registrado detectado, buscando mascotas del cliente...")

            // Si se proporciona IdMascota específica, validar que pertenezca al cliente
            if (detalle.IdMascota && detalle.IdMascota > 0) {
              const [mascotasCliente] = await connection.query(
                `SELECT m.*, e.NombreEspecie 
                 FROM Mascotas m 
                 LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
                 WHERE m.IdMascota = ? AND m.IdCliente = ?`,
                [detalle.IdMascota, venta.IdCliente],
              )

              if (mascotasCliente.length > 0) {
                idMascota = detalle.IdMascota
                nombreMascotaTemporal = mascotasCliente[0].Nombre
                tipoMascotaTemporal = mascotasCliente[0].NombreEspecie
                console.log("Mascota específica encontrada:", mascotasCliente[0])
              } else {
                await connection.rollback()
                return res.status(400).json({
                  message: `La mascota con ID ${detalle.IdMascota} no pertenece al cliente ${clienteSeleccionado.Nombre}`,
                })
              }
            }
            // Si no se proporciona IdMascota, usar la primera mascota del cliente
            else {
              const [mascotasCliente] = await connection.query(
                `SELECT m.*, e.NombreEspecie 
                 FROM Mascotas m 
                 LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
                 WHERE m.IdCliente = ? AND m.Estado = TRUE 
                 ORDER BY m.IdMascota ASC
                 LIMIT 1`,
                [venta.IdCliente],
              )

              if (mascotasCliente.length > 0) {
                idMascota = mascotasCliente[0].IdMascota
                nombreMascotaTemporal = mascotasCliente[0].Nombre
                tipoMascotaTemporal = mascotasCliente[0].NombreEspecie
                console.log("Primera mascota del cliente encontrada:", mascotasCliente[0])
              } else {
                await connection.rollback()
                return res.status(400).json({
                  message: `El cliente ${clienteSeleccionado.Nombre} no tiene mascotas registradas. Debe registrar una mascota antes de solicitar servicios.`,
                })
              }
            }
          }

          // Validación final
          if (!idMascota) {
            await connection.rollback()
            return res.status(400).json({
              message: "No se pudo determinar la mascota para el servicio",
            })
          }

          console.log("Mascota final asignada:", {
            idMascota,
            nombreMascotaTemporal,
            tipoMascotaTemporal,
            esConsumidorFinal,
          })

          // Asegurar que la cantidad sea un número
          const cantidad = Number.parseInt(detalle.Cantidad, 10) || 1

          // ✅ CÁLCULO SIN IVA PARA SERVICIOS
          const precioUnitario = Number.parseFloat(detalle.PrecioUnitario) || servicio.Precio || 0
          const subtotalDetalle = precioUnitario * cantidad

          // ✅ INSERCIÓN CORREGIDA SIN CAMPOS IVA
          try {
            const [resultDetalle] = await connection.query(
              `INSERT INTO DetalleVentasServicios 
              (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, NombreMascotaTemporal, TipoMascotaTemporal) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                idVenta,
                idServicio,
                idMascota,
                cantidad,
                precioUnitario,
                subtotalDetalle,
                nombreMascotaTemporal,
                tipoMascotaTemporal,
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
              NombreMascotaTemporal: nombreMascotaTemporal,
              TipoMascotaTemporal: tipoMascotaTemporal,
              esMascotaTemporal: nombreMascotaTemporal !== null,
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
                NombreMascotaTemporal: nombreMascotaTemporal,
                TipoMascotaTemporal: tipoMascotaTemporal,
              },
            })
          }

          // Acumular totales (SIN IVA)
          subtotalServicios += subtotalDetalle
        }
      }

      // ✅ CÁLCULO DE TOTALES CORREGIDO
      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos // Solo productos tienen IVA
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

      // ✅ OBTENER LA VENTA COMPLETA ACTUALIZADA CON SINCRONIZACIÓN
      const [ventasActualizadas] = await connection.query(
        `SELECT v.*, 
        c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, c.Documento AS DocumentoCliente,
        u.Nombre AS NombreUsuario, u.Apellido AS ApellidoUsuario, r.NombreRol
        FROM Ventas v
        LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente
        LEFT JOIN Usuarios u ON v.IdUsuario = u.IdUsuario
        LEFT JOIN Roles r ON u.IdRol = r.IdRol
        WHERE v.IdVenta = ?`,
        [idVenta],
      )

     // ...existing code...

// NUEVO: Crear notificación de comprobante SOLO para ventas de carrito
// ...código existente...

// ...código existente...
const comprobanteUrl = req.body.comprobanteUrl || req.body.comprobantePago || venta.ComprobantePago || null;

// NUEVO: Crear notificación de comprobante SOLO para ventas de carrito
if (
  venta.origen === "carrito" && // SOLO si viene del carrito
  venta.MetodoPago &&
  ["transferencia", "qr"].includes(venta.MetodoPago.toLowerCase())
) {
  try {
    await notificacionesModel.create({
      Titulo: "Comprobante recibido",
      Mensaje: `Se recibió un comprobante de pago para la venta #${idVenta}`,
      TipoNotificacion: "Comprobante",
      TablaReferencia: "Ventas",
      IdReferencia: idVenta,
      Imagen: comprobanteUrl, // <--- ¡AQUÍ!
      ParaAdmins: true,
      Prioridad: "Alta"
    });
  } catch (error) {
    console.error("Error al crear la notificación de comprobante:", error);
    // No interrumpimos el flujo principal si falla la notificación
  }
}

// ...código existente...
// ...existing code...

      await connection.commit();

      console.log(`✅ Venta ${idVenta} creada exitosamente con stock actualizado`);

      res.status(201).json({
        success: true,
        venta: {
          ...ventasActualizadas[0],
          tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
        },
        detallesProductos: detallesProductosCreados,
        detallesServicios: detallesServiciosCreados,
        tipoCliente: esConsumidorFinal ? "consumidor_final" : "cliente_registrado",
      })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log("⛔ Rollback ejecutado - no se guardaron cambios");
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al crear venta:", error)
      res.status(500).json({
        message: "Error en el servidor",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    } finally {
      if (connection) { connection.release(); }
    }
  },

  // ✅ MÉTODO UPDATE CON MANEJO COMPLETO DE STOCK
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

      console.log(`🔄 Actualizando venta ${id}`)

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // ✅ Si se está actualizando el cliente, verificar que exista en el sistema sincronizado
      if (IdCliente) {
        const [clientes] = await connection.query(
          `
          SELECT c.*, u.IdUsuario, r.NombreRol
          FROM Clientes c
          INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
          INNER JOIN Roles r ON u.IdRol = r.IdRol
          WHERE c.IdCliente = ?
          AND c.Estado = TRUE
          AND u.Estado = TRUE
        `,
          [IdCliente],
        )

        if (clientes.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Cliente no encontrado en el sistema sincronizado" })
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

      // ✅ SI SE PROPORCIONAN DETALLES DE PRODUCTOS, ACTUALIZAR CON MANEJO DE STOCK
      if (detallesProductos) {
        console.log(`📦 Actualizando productos para venta ${id}`)

        // Obtener detalles actuales para devolver stock
        const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // ✅ DEVOLVER STOCK DE PRODUCTOS ACTUALES
        for (const detalle of detallesActuales) {
          await actualizarStockProducto(connection, detalle.IdProducto, detalle.Cantidad, "devolucion")
        }

        // Eliminar detalles actuales
        await connection.query(`DELETE FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // ✅ INSERTAR NUEVOS DETALLES CON VERIFICACIÓN DE STOCK
        let subtotalProductos = 0
        let totalIvaProductos = 0

        for (const detalle of detallesProductos) {
          // Verificar stock antes de insertar
          const verificacionStock = await verificarStockProducto(connection, detalle.IdProducto)

          if (!verificacionStock.existe) {
            await connection.rollback()
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` })
          }

          const producto = verificacionStock.producto

          // Verificar stock disponible
          if (producto.manejaStock && producto.stock < detalle.Cantidad) {
            await connection.rollback()
            return res.status(400).json({
              message: `Stock insuficiente para el producto ${producto.nombre}`,
              stockDisponible: producto.stock,
              cantidadSolicitada: detalle.Cantidad,
            })
          }

          // Obtener datos completos del producto
          const [productosCompletos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])
          const productoCompleto = productosCompletos[0]

          // Calcular subtotal e IVA
          const precioUnitario = parseNumber(detalle.PrecioUnitario) || parseNumber(productoCompleto.PrecioVenta) || 0
          const cantidad = parseNumber(detalle.Cantidad) || 1
          const subtotalDetalle = precioUnitario * cantidad
          let ivaUnitario = 0

          if (productoCompleto.AplicaIVA) {
            ivaUnitario = precioUnitario * (parseNumber(productoCompleto.PorcentajeIVA) / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * cantidad

          // Insertar detalle
          await connection.query(
            `INSERT INTO DetalleVentas 
            (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, detalle.IdProducto, detalle.Cantidad, precioUnitario, subtotalDetalle, ivaUnitario, subtotalConIva],

          )

          // ✅ ACTUALIZAR STOCK DEL PRODUCTO
          await actualizarStockProducto(connection, detalle.IdProducto, detalle.Cantidad, "venta")

          console.log("Detalle actualizado:", {
            IdVenta: id,
            IdProducto: detalle.IdProducto,
            Cantidad: detalle.Cantidad,
            PrecioUnitario: detalle.PrecioUnitario,
          })

          // Acumular totales
          subtotalProductos += subtotalDetalle
          totalIvaProductos += ivaUnitario * detalle.Cantidad
        }
      }

      // ✅ SI SE PROPORCIONAN DETALLES DE SERVICIOS, ACTUALIZAR CON CORRECCIÓN
      if (detallesServicios) {
        // Eliminar detalles actuales
        await connection.query(`DELETE FROM DetalleVentasServicios WHERE IdVenta = ?`, [id])

        // ✅ OBTENER INFORMACIÓN DEL CLIENTE CON SINCRONIZACIÓN
        let idMascotaGenerica = null
        const [cliente] = await connection.query(
          `SELECT c.Documento, c.IdCliente,
           CASE 
             WHEN c.Documento = '0000000000' OR c.IdCliente = 3 THEN 1 
             ELSE 0 
           END as esConsumidorFinal
           FROM Ventas v 
           JOIN Clientes c ON v.IdCliente = c.IdCliente 
           WHERE v.IdVenta = ?`,
          [id],
        )
        const esConsumidorFinal = cliente.length > 0 && Boolean(cliente[0].esConsumidorFinal)

        if (esConsumidorFinal) {
          idMascotaGenerica = await ventasModel.getMascotaGenericaId()
        }

        // Insertar nuevos detalles
        let subtotalServicios = 0

        for (const detalle of detallesServicios) {
          // Verificar si el servicio existe
          const [servicios] = await connection.query(`SELECT * FROM Servicios WHERE IdServicio = ?`, [
            detalle.IdServicio,
          ])

          if (servicios.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Servicio con ID ${idServicio} no encontrado` })
          }

          const servicio = servicios[0]

          // ✅ LÓGICA CORREGIDA PARA MASCOTAS EN UPDATE
          let idMascota = detalle.IdMascota || null
          let nombreMascotaTemporal = detalle.NombreMascotaTemporal || null
          let tipoMascotaTemporal = detalle.TipoMascotaTemporal || null

          // Si es Consumidor Final, usar mascota genérica
          if (esConsumidorFinal) {
            idMascota = idMascotaGenerica || 1
            nombreMascotaTemporal = detalle.NombreMascotaTemporal || ""
            tipoMascotaTemporal = detalle.TipoMascotaTemporal || "Genérica"
          }
          // Si es cliente registrado
          else {
            if (detalle.IdMascota && detalle.IdMascota > 0) {
              // Verificar si la mascota existe y pertenece al cliente
              const [mascotasCliente] = await connection.query(
                `SELECT m.*, e.NombreEspecie 
                 FROM Mascotas m 
                 LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
                 WHERE m.IdMascota = ? AND m.IdCliente = (SELECT IdCliente FROM Ventas WHERE IdVenta = ?)`,
                [detalle.IdMascota, id],
              )

              if (mascotasCliente.length > 0) {
                idMascota = detalle.IdMascota
                nombreMascotaTemporal = mascotasCliente[0].Nombre
                tipoMascotaTemporal = mascotasCliente[0].NombreEspecie
              } else {
                await connection.rollback()
                return res.status(400).json({
                  message: `La mascota con ID ${detalle.IdMascota} no pertenece al cliente`,
                })
              }
            } else {
              // Usar primera mascota del cliente
              const [mascotasCliente] = await connection.query(
                `SELECT m.*, e.NombreEspecie 
                 FROM Mascotas m 
                 LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
                 WHERE m.IdCliente = (SELECT IdCliente FROM Ventas WHERE IdVenta = ?) AND m.Estado = TRUE 
                 LIMIT 1`,
                [id],
              )

              if (mascotasCliente.length > 0) {
                idMascota = mascotasCliente[0].IdMascota
                nombreMascotaTemporal = mascotasCliente[0].Nombre
                tipoMascotaTemporal = mascotasCliente[0].NombreEspecie
                console.log("Primera mascota del cliente encontrada:", mascotasCliente[0])
              } else {
                idMascota = idMascotaGenerica || 1
                nombreMascotaTemporal = detalle.NombreMascotaTemporal || "Sin mascota"
                tipoMascotaTemporal = detalle.TipoMascotaTemporal || "Genérica"
              }
            }
          }

          // Validación final
          if (!idMascota) {
            await connection.rollback()
            return res.status(400).json({
              message: "No se pudo determinar la mascota para el servicio",
            })
          }

          console.log("Mascota final asignada:", {
            idMascota,
            nombreMascotaTemporal,
            tipoMascotaTemporal,
            esConsumidorFinal,
          })

          // Asegurar que la cantidad sea un número
          const cantidad = Number.parseInt(detalle.Cantidad, 10) || 1

          // ✅ CÁLCULO SIN IVA PARA SERVICIOS
          const precioUnitario = Number.parseFloat(detalle.PrecioUnitario) || servicio.Precio || 0
          const subtotalDetalle = precioUnitario * cantidad

          // ✅ INSERCIÓN CORREGIDA SIN CAMPOS IVA
          await connection.query(
            `INSERT INTO DetalleVentasServicios 
            (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, NombreMascotaTemporal, TipoMascotaTemporal) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              detalle.IdServicio,
              idMascota,
              cantidad,
              precioUnitario,
              subtotalDetalle,
              nombreMascotaTemporal,
              tipoMascotaTemporal,
            ],
          )

          // Acumular totales (SIN IVA)
          subtotalServicios += subtotalDetalle
        }
      }
      await connection.commit()

      console.log(`✅ Venta ${id} actualizada exitosamente`)

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
          console.log("⛔ Rollback ejecutado - no se guardaron cambios");
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al actualizar venta:", error)
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
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ CAMBIAR ESTADO CON MANEJO COMPLETO DE STOCK
  changeStatus: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const { Estado, skipStockReturn } = req.body // <--- Nuevo parámetro

      console.log(`🔄 Cambiando estado de venta ${id} a "${Estado}"`)

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const ventaActual = ventas[0]

      // Validar estado
      const estadosValidos = [
        "Efectiva",
        "Pendiente",
        "Cancelada",
        "Devuelta",
        "Parcialmente Devuelta"
      ];
      if (!estadosValidos.includes(Estado)) {
        await connection.rollback();
        return res.status(400).json({ message: 'Estado no válido.' });
      }

      // ✅ Si se está cancelando o devolviendo una venta efectiva, devolver el stock
      if (
        (Estado === "Cancelada" || Estado === "Devuelta") &&
        ventaActual.Estado === "Efectiva" &&
        !skipStockReturn // <--- Solo si no se pide saltar
      ) {
        console.log(`📦 Devolviendo stock para venta cancelada/devuelta ${id}`)

        // Obtener detalles de productos de la venta
        const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // ✅ DEVOLVER STOCK DE CADA PRODUCTO
        for (const detalle of detallesProductos) {
          const stockDevuelto = await actualizarStockProducto(
            connection,
            detalle.IdProducto,
            detalle.Cantidad,
            "devolucion",
          )

          if (!stockDevuelto) {
            await connection.rollback()
            return res.status(500).json({
              message: `Error al devolver stock del producto ID ${detalle.IdProducto}`,
            })
          }
        }
      }

      // Cambiar el estado
      await connection.query(`UPDATE Ventas SET Estado = ? WHERE IdVenta = ?`, [Estado, id])

      await connection.commit()

      console.log(`✅ Estado de venta ${id} cambiado exitosamente a "${Estado}"`)

      // Obtener la venta actualizada
      const ventaActualizada = await ventasModel.getById(id)

      res.status(200).json(ventaActualizada)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log(`🔄 Rollback ejecutado en cambio de estado: ${error.message}`)
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al cambiar estado de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ELIMINAR VENTA CON MANEJO COMPLETO DE STOCK
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      console.log(`🗑️ Eliminando venta ${id}`)

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [id])

      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      const ventaActual = ventas[0]

      // ✅ Si la venta está efectiva, devolver el stock
      if (ventaActual.Estado === "Efectiva") {
        console.log(`📦 Devolviendo stock para venta eliminada ${id}`)

        // Obtener detalles de productos de la venta
        const [detallesProductos] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdVenta = ?`, [id])

        // ✅ DEVOLVER STOCK DE CADA PRODUCTO
        for (const detalle of detallesProductos) {
          await actualizarStockProducto(connection, detalle.IdProducto, detalle.Cantidad, "devolucion")
        }
      }

      // Eliminar detalles de servicios
      await connection.query(`DELETE FROM DetalleVentasServicios WHERE IdVenta = ?`, [id])

      // Eliminar detalles de productos
      await connection.query(`DELETE FROM DetalleVentas WHERE IdVenta = ?`, [id])

      // Eliminar la venta
      await connection.query(`DELETE FROM Ventas WHERE IdVenta = ?`, [id])

      await connection.commit()

      console.log(`✅ Venta ${id} eliminada exitosamente`)

      res.status(200).json({ message: "Venta eliminada correctamente", id })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log(`🔄 Rollback ejecutado en eliminación: ${error.message}`)
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al eliminar venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ REGISTRAR DEVOLUCIÓN CON MANEJO COMPLETO DE STOCK
  registrarDevolucion: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { venta, detallesProductos = [], productosCambio = [], metadatos = {} } = req.body
      const {
        tipoDevolucion,
        motivoOriginal = '',
        usuarioProcesa = 'Usuario',
        productosDevueltosTotales = 0,
        productosOriginalesTotales = 0,
        saldoCliente = 0
      } = metadatos

      const clienteNombre = venta?.ClienteNombre || venta?.cliente?.nombre || 'Cliente'
      const fechaOriginal = venta?.FechaOriginal || venta?.FechaVenta || new Date().toISOString().split('T')[0]
      const productosCambioDescripcion = productosCambio.map(p => `${p.Cantidad} x ${p.NombreProducto}`).join(', ')

      // Genera la fecha y hora actual de Colombia
      const fechaVentaDevolucion = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

      // Crear nueva factura de devolución (ahora con MontoRecibido)
      const [resultVenta] = await connection.query(`
        INSERT INTO Ventas (IdCliente, IdUsuario, FechaVenta, Subtotal, TotalIva, TotalMonto, Estado, MetodoPago, NotasAdicionales, IdVentaOriginal, MontoRecibido)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        venta.IdCliente,
        venta.IdUsuario,
        fechaVentaDevolucion, // <-- Usa la variable aquí
        venta.Subtotal,
        venta.TotalIva,
        venta.TotalMonto,
        'Efectiva',
        'efectivo',
        '',
        venta.IdVentaOriginal || venta.IdVenta || null,
        venta.MontoRecibido || 0
      ])
      const nuevaVentaId = resultVenta.insertId

      // Productos devueltos (aumentar stock)
      for (const producto of detallesProductos) {
        const subtotalDetalle = Number(producto.PrecioUnitario) * Number(producto.Cantidad);
        const ivaUnitario = Number(producto.IvaUnitario) || 0;
        const subtotalConIva = subtotalDetalle + ivaUnitario * Number(producto.Cantidad);

        await connection.query(`
          INSERT INTO DetalleVentas (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nuevaVentaId, producto.IdProducto, producto.Cantidad, producto.PrecioUnitario, subtotalDetalle, ivaUnitario, subtotalConIva]
        );
        await connection.query(
          `UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`,
          [producto.Cantidad, producto.IdProducto]
        );
      }

      // Productos por cambio (disminuir stock)
      for (const producto of productosCambio) {
        const subtotalDetalle = Number(producto.PrecioUnitario) * Number(producto.Cantidad);
        const ivaUnitario = Number(producto.IvaUnitario) || 0;
        const subtotalConIva = subtotalDetalle + ivaUnitario * Number(producto.Cantidad);

        await connection.query(`
          INSERT INTO DetalleVentas (IdVenta, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nuevaVentaId, producto.IdProducto, producto.Cantidad, producto.PrecioUnitario, subtotalDetalle, ivaUnitario, subtotalConIva]
        );
        await connection.query(
          `UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`,
          [producto.Cantidad, producto.IdProducto]
        );
      }

      // Obtener todos los detalles de la nueva devolución
      const [detallesNuevos] = await connection.query(
        `SELECT * FROM DetalleVentas WHERE IdVenta = ?`,
        [nuevaVentaId]
      );

      let subtotal = 0;
      let totalIva = 0;

      for (const det of detallesNuevos) {
        subtotal += Number(det.Subtotal || 0);
        totalIva += Number(det.IvaUnitario || 0) * Number(det.Cantidad || 1);
      }
      const total = subtotal + totalIva;

      // Actualizar la venta de devolución con los totales correctos
      await connection.query(
        `UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`,
        [subtotal, totalIva, total, nuevaVentaId]
      );

      // Obtener la suma real de cantidades de productos de la venta original
      const [productosOriginales] = await connection.query(
        `SELECT SUM(Cantidad) as total FROM DetalleVentas WHERE IdVenta = ?`,
        [venta.IdVentaOriginal || venta.IdVenta]
      );
      const totalProductosOriginales = productosOriginales[0]?.total || 0;

      // Suma de cantidades devueltas en esta devolución
      const productosDevueltosTotalesEnEstaDevolucion = detallesProductos.reduce((sum, p) => sum + Number(p.Cantidad), 0);

      // Determinar tipo de devolución real
      let tipoDevolucionReal = 'completa';
      if (productosCambio && productosCambio.length > 0) {
        tipoDevolucionReal = 'cambio';
      } else if (
        productosDevueltosTotalesEnEstaDevolucion < totalProductosOriginales &&
        productosDevueltosTotalesEnEstaDevolucion > 0
      ) {
        tipoDevolucionReal = 'parcial';
      }

      // Estado y tipo de la venta original
      let nuevoEstado = 'Devuelta';
      let nuevoTipo = 'Devolucion';
      if (tipoDevolucionReal === 'parcial') {
        nuevoEstado = 'Parcialmente Devuelta';
      }
      if (tipoDevolucionReal === 'cambio') {
        nuevoTipo = 'Cambio';
      }

      // Actualizar estado y tipo en la venta original
      await connection.query(
        `UPDATE Ventas SET Estado = ?, Tipo = ? WHERE IdVenta = ?`,
        [
          nuevoEstado,
          nuevoTipo,
          venta.IdVentaOriginal || venta.IdVenta
        ]
      );

      // Nota automática mejorada
      const nota = `Devolución de venta #${venta.IdVentaOriginal || venta.IdVenta} para ${clienteNombre}.
Fecha original: ${fechaOriginal}.
Motivo: ${motivoOriginal}.
Tipo de devolución: ${tipoDevolucionReal === 'completa' ? 'Completa' : tipoDevolucionReal === 'parcial' ? 'Parcial' : tipoDevolucionReal === 'cambio' ? 'Cambio de producto' : 'No especificado'}.
Procesado por: ${usuarioProcesa}.
Productos devueltos: ${productosDevueltosTotalesEnEstaDevolucion} de ${totalProductosOriginales}.
${(venta.MontoRecibido || 0) > 0 ? `El cliente pagó la diferencia: $${Number(venta.MontoRecibido || 0).toLocaleString('es-CO')}` : `Saldo a favor del cliente: $${Number(saldoCliente).toLocaleString('es-CO')}.`}
${productosCambio.length > 0 ? 'Productos para cambio: ' + productosCambioDescripcion : ''}`

      await connection.query(
        `UPDATE Ventas SET NotasAdicionales = ? WHERE IdVenta = ?`,
        [nota, nuevaVentaId]
      )

      await connection.commit()
      res.status(200).json({ success: true, nuevaFacturaDevolucion: { IdVenta: nuevaVentaId } })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("❌ Error en registrarDevolucion:", error)
      res.status(500).json({ success: false, message: "Error al registrar devolución", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ENDPOINT PARA DEBUGGING DE STOCK
  debugStock: async (req, res) => {
    try {
      const { idProducto } = req.params

      const verificacion = await verificarStockProducto(null, idProducto)

      if (!verificacion.existe) {
        return res.status(404).json(verificacion)
      }

      // Obtener historial de movimientos (si existe tabla de movimientos)
      const [movimientos] = await query(
        `SELECT 
          v.IdVenta, 
          v.FechaVenta, 
          v.Estado, 
          dv.Cantidad,
          'Venta' as TipoMovimiento
        FROM DetalleVentas dv
        JOIN Ventas v ON dv.IdVenta = v.IdVenta
        WHERE dv.IdProducto = ?
        ORDER BY v.FechaVenta DESC
        LIMIT 10`,
        [idProducto],
      )

      res.json({
        producto: verificacion.producto,
        ultimosMovimientos: movimientos,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error en debug de stock:", error)
      res.status(500).json({ error: error.message })
    }
  },

  // Resto de métodos sin cambios...
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params

      // ✅ Verificar si el cliente existe en el sistema sincronizado
      const [clientes] = await query(
        `
        SELECT c.*, u.IdUsuario, r.NombreRol
        FROM Clientes c
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE c.IdCliente = ?
        AND c.Estado = TRUE
        AND u.Estado = TRUE
      `,
        [id],
      )

      if (clientes.length === 0) {
        return res.status(404).json({ message: "Cliente no encontrado en el sistema sincronizado" })
      }

      // Obtener ventas
      const ventas = await ventasModel.getByCliente(id)

      res.status(200).json(ventas)
    } catch (error) {
      console.error("Error al obtener ventas del cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

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

  directQuery: async (req, res) => {
    try {
      const { query: sql, params } = req.body

      // Validar que se proporcione una consulta SQL
      if (!sql) {
        return res.status(400).json({ message: "Se requiere una consulta SQL" })
      }

      // Validar que la consulta sea de tipo SELECT para evitar modificaciones no deseadas
      if (!sql.trim().toLowerCase().startsWith("select")) {
        return res.status(400).json({ message: "Solo se permiten consultas SELECT" })
      }

      const [result] = await query(sql, params || [])
      res.status(200).json(result)
    } catch (error) {
      console.error("Error en directQuery:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // NUEVO: Generar código QR para transferencia
  generarQrTransferencia: async (req, res) => {
   
   
    try {

      const { monto, referencia } = req.body

      // Validar monto
      if (!monto || isNaN(monto)) {
        return res.status(400).json({ message: "Se requiere un monto válido" })
      }

      // Validar referencia
      if (!referencia) {
        return res.status(400).json({ message: "Se requiere una referencia" })
      }

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

  // NUEVO: Devolver productos y actualizar stock
  devolverProductos: async (req, res) => {
    const { productosDevolver } = req.body

    if (! Array.isArray(productosDevolver) || productosDevolver.length === 0) {
      return res.status(400).json({ message: "No se enviaron productos para devolución" })
    }

    const connection = await getConnection()
    try {
      await connection.beginTransaction()

      for (const prod of productosDevolver) {
        await actualizarStockProducto(connection, prod.IdProducto, prod.Cantidad, "devolucion")
      }

      await connection.commit()
      res.status(200).json({ message: "Stock actualizado para productos devueltos" })
       } catch (err) {
      await connection.rollback()
      console.error("Error al devolver productos:", err)
      res.status(500).json({ message: "Error al procesar devolución", error: err.message })
    } finally {
      connection.release()
    }
  },

  // NUEVO: Aprobar venta QR
  aprobarVentaQR: async (req, res) => {
    const { id } = req.params;
    const connection = await getConnection();
    try {
      const [venta] = await connection.query('SELECT Estado FROM Ventas WHERE IdVenta = ?', [id]);
      if (!venta.length) return res.status(404).json({ message: "Venta no encontrada" });
      if (venta[0].Estado !== 'Pendiente') return res.status(400).json({ message: "Solo se puede aprobar ventas pendientes" });
      await connection.query('UPDATE Ventas SET Estado = "Efectiva" WHERE IdVenta = ?', [id]);
      res.status(200).json({ message: 'Venta aprobada con éxito' });
    } catch (err) {
      res.status(500).json({ message: 'Error al aprobar venta' });
    } finally {
      connection.release();
    }
  },

  aprobarVenta: async (req, res) => {
    const { id } = req.params;
    const connection = await getConnection();
    try {
      const [venta] = await connection.query('SELECT Estado FROM Ventas WHERE IdVenta = ?', [id]);
      if (!venta.length) return res.status(404).json({ message: "Venta no encontrada" });
      if (venta[0].Estado !== 'Pendiente') return res.status(400).json({ message: "Solo se puede aprobar ventas pendientes" });
      await connection.query('UPDATE Ventas SET Estado = "Efectiva" WHERE IdVenta = ?', [id]);
      
      // Dentro de aprobarVenta y rechazarVenta, después de actualizar el estado:
const [ventaInfo] = await connection.query(
  'SELECT v.IdUsuario, c.Nombre FROM Ventas v LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente WHERE v.IdVenta = ?',
  [id]
);
if (ventaInfo.length > 0) {
  await notificacionesModel.create({
    Titulo: "Tu pedido ha sido aprobado",
    Mensaje: "¡Tu pago fue validado y tu pedido está en proceso!",
    TipoNotificacion: "Comprobante",
    IdUsuario: ventaInfo[0].IdUsuario,
    EnviarCorreo: true,
    IdVenta: id,
  });
}

      res.status(200).json({ message: 'Venta aprobada con éxito' });
    } catch (err) {
      res.status(500).json({ message: 'Error al aprobar venta' });
    } finally {
      connection.release();
    }
  },

  rechazarVenta: async (req, res) => {
    const { id } = req.params;
    const connection = await getConnection();
    try {
      const [venta] = await connection.query('SELECT Estado FROM Ventas WHERE IdVenta = ?', [id]);
      if (!venta.length) return res.status(404).json({ message: "Venta no encontrada" });
      if (venta[0].Estado !== 'Pendiente') return res.status(400).json({ message: "Solo se puede rechazar ventas pendientes" });
      await connection.query('UPDATE Ventas SET Estado = "Cancelada" WHERE IdVenta = ?', [id]);
      
      // Dentro de aprobarVenta y rechazarVenta, después de actualizar el estado:
const [ventaInfo] = await connection.query(
  'SELECT v.IdUsuario, c.Nombre FROM Ventas v LEFT JOIN Clientes c ON v.IdCliente = c.IdCliente WHERE v.IdVenta = ?',
  [id]
);
if (ventaInfo.length > 0) {
  await notificacionesModel.create({
    Titulo: "Tu pedido fue rechazado",
    Mensaje: "El comprobante de pago no fue válido. Por favor revisa y vuelve a intentarlo.",
    TipoNotificacion: "Comprobante",
    IdUsuario: ventaInfo[0].IdUsuario,
    EnviarCorreo: true,
    IdVenta: id,
  });
}

      res.status(200).json({ message: 'Venta cancelada con éxito' });
    } catch (err) {
      res.status(500).json({ message: 'Error al cancelar venta' });
    } finally {
      connection.release();
    }
  },

  // ...otros métodos...
}

// ✅ CONTROLADOR PARA DETALLES DE VENTAS CON MANEJO COMPLETO DE STOCK
export const detalleVentasController = {

  // Obtener detalles de una venta
  getByVenta: async (req, res) => {
    try {
      const { id } = req.params
      const ventaId = Number.parseInt(id, 10)

      if (isNaN(ventaId)) {
        return res.status(400).json({ message: "ID de venta inválido" })
      }

      const detalles = await query(
        `SELECT dp.*, p.NombreProducto, p.CodigoBarras
         FROM DetalleVentas dp
         LEFT JOIN Productos p ON dp.IdProducto = p.IdProducto
         WHERE dp.IdVenta = ?`,
        [ventaId],
      )

      res.json(detalles)
    } catch (error) {
      console.error("Error al obtener detalles de productos:", error)
     
      res.status(500).json({ message: "Error al obtener detalles de productos" })
    }
  },

  // ✅ CREAR DETALLE CON MANEJO COMPLETO DE STOCK
  create: async (req, res) => {
    let connection;

    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const detalleData = req.body

      console.log(`📝 Creando detalle de venta:`, detalleData)

      // Verificar si la venta existe
      const [ventas] = await connection.query(`SELECT * FROM Ventas WHERE IdVenta = ?`, [detalleData.IdVenta])
      if (ventas.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Venta no encontrada" })
      }

      // ✅ VERIFICAR STOCK DEL PRODUCTO
      const verificacionStock = await verificarStockProducto(connection, detalleData.IdProducto)

      if (!verificacionStock.existe) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = verificacionStock.producto

      // ✅ VERIFICAR STOCK DISPONIBLE
      if (producto.manejaStock && producto.stock < detalleData.Cantidad) {
        await connection.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para el producto ${producto.nombre}`,
          stockDisponible: producto.stock,
          cantidadSolicitada: detalleData.Cantidad,
        })
      }

      // Obtener datos completos del producto
      const [productosCompletos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
        detalleData.IdProducto,
      ])
      const productoCompleto = productosCompletos[0]

      // Calcular subtotal e IVA
      const precioUnitario = parseNumber(detalleData.PrecioUnitario) || parseNumber(productoCompleto.PrecioVenta) || 0
      const cantidad = parseNumber(detalleData.Cantidad) || 1
      const subtotalDetalle = precioUnitario * cantidad
      let ivaUnitario = 0

      if (productoCompleto.AplicaIVA) {
        ivaUnitario = precioUnitario * (parseNumber(productoCompleto.PorcentajeIVA) / 100)
      }

      const subtotalConIva = subtotalDetalle + ivaUnitario * cantidad

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

      console.log(`📝 Detalle creado con ID: ${resultDetalle.insertId}`)

      // ✅ ACTUALIZAR STOCK DEL PRODUCTO
      const stockActualizado = await actualizarStockProducto(
        connection,
        detalleData.IdProducto,
        detalleData.Cantidad,
        "venta",
      )

      if (!stockActualizado) {
        await connection.rollback()
        return res.status(500).json({
          message: `Error al actualizar stock del producto ${producto.nombre}`,
        })
      }

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

      console.log(`✅ Detalle creado y stock actualizado exitosamente`)

      // Obtener el detalle creado
      const detalleCreado = await detalleVentasModel.getById(resultDetalle.insertId)

      res.status(201).json(detalleCreado)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log("⛔ Rollback ejecutado - no se guardaron cambios");
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al crear detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ACTUALIZAR DETALLE CON MANEJO COMPLETO DE STOCK
  update: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const {
        IdProducto,
        Cantidad,
        PrecioUnitario,
        Subtotal,
        IvaUnitario,
        SubtotalConIva,
      } = req.body

      console.log(`🔄 Actualizando detalle ${id}:`, req.body)

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de venta no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // ✅ DEVOLVER STOCK DEL PRODUCTO ACTUAL
      await actualizarStockProducto(connection, detalleActual.IdProducto, detalleActual.Cantidad, "devolucion")

      // ✅ VERIFICAR NUEVO PRODUCTO
      const idProductoNuevo = IdProducto || detalleActual.IdProducto
      const verificacionStock = await verificarStockProducto(connection, idProductoNuevo)

      if (!verificacionStock.existe) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = verificacionStock.producto

      // Calcular diferencia de cantidad para actualizar stock
      const cantidadNueva = Cantidad || detalleActual.Cantidad

      // ✅ VERIFICAR STOCK DISPONIBLE PARA LA NUEVA CANTIDAD
      if (producto.manejaStock && producto.stock < cantidadNueva) {
        // Devolver el stock que acabamos de quitar
        await actualizarStockProducto(connection, detalleActual.IdProducto, detalleActual.Cantidad, "venta")

        await connection.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para el producto ${producto.nombre}`,
          stockDisponible: producto.stock,
          cantidadSolicitada: cantidadNueva,
        })
      }

      // Obtener datos completos del producto
      const [productosCompletos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [
        idProductoNuevo,
      ])
      const productoCompleto = productosCompletos[0]

      // Calcular subtotal e IVA
      const precioUnitario = PrecioUnitario || detalleActual.PrecioUnitario
      const cantidad = cantidadNueva
      const subtotal = precioUnitario * cantidad
      let ivaUnitario = 0

      if (productoCompleto.AplicaIVA) {
        ivaUnitario = precioUnitario * (Number(productoCompleto.PorcentajeIVA) / 100)
      }

      const subtotalConIva = subtotal + ivaUnitario * cantidad

      // Actualizar detalle
      await connection.query(
        `UPDATE DetalleVentas SET 
        IdProducto = ?, Cantidad = ?, PrecioUnitario = ?, Subtotal = ?, IvaUnitario = ?, SubtotalConIva = ? 
        WHERE IdDetalleVenta = ?`,
        [idProductoNuevo, cantidad, precioUnitario, subtotal, ivaUnitario, subtotalConIva, id],
      )

      // ✅ ACTUALIZAR STOCK DEL NUEVO PRODUCTO
      await actualizarStockProducto(connection, idProductoNuevo, cantidad, "venta")

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

      console.log(`✅ Detalle ${id} actualizado y stock ajustado exitosamente`)

      // Obtener el detalle actualizado
      const detalleActualizado = await detalleVentasModel.getById(id)

      res.status(200).json(detalleActualizado)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log("⛔ Rollback ejecutado - no se guardaron cambios");
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al actualizar detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ELIMINAR DETALLE CON MANEJO COMPLETO DE STOCK
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      console.log(`🗑️ Eliminando detalle ${id}`)

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(`SELECT * FROM DetalleVentas WHERE IdDetalleVenta = ?`, [id])

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de venta no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // ✅ DEVOLVER STOCK DEL PRODUCTO
      await actualizarStockProducto(connection, detalleActual.IdProducto, detalleActual.Cantidad, "devolucion")

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

      console.log(`✅ Detalle ${id} eliminado y stock devuelto exitosamente`)

      res.status(200).json({ message: "Detalle de venta eliminado correctamente", id })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log(`🔄 Rollback ejecutado en eliminación de detalle: ${error.message}`)
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al eliminar detalle de venta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },
}

// ✅ CONTROLADOR PARA DETALLES DE SERVICIOS COMPLETAMENTE ACTUALIZADO
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
      const [detalles] = await query(
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

      res.status(200).json(detalles)
    } catch (error) {
      console.error("Error al obtener detalles de servicios de venta:", error)
      res.status(500).json({
        message: "Error en el servidor al obtener detalles de servicios",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    }
  },

  // ✅ CREAR DETALLE DE SERVICIO ACTUALIZADO PARA USUARIOS-CLIENTES SINCRONIZADOS
  create: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const detalleData = req.body

      console.log(`📝 Creando detalle de servicio:`, detalleData)

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

      // ✅ VERIFICAR SI LA VENTA TIENE UN CLIENTE ASOCIADO CON SINCRONIZACIÓN
      const venta = ventas[0]
      const [clienteInfo] = await connection.query(
        `
        SELECT c.*, u.IdUsuario, r.NombreRol,
        CASE 
          WHEN c.Documento = '0000000000' OR c.IdCliente = 3 THEN 1 
          ELSE 0 
        END as esConsumidorFinal
        FROM Clientes c
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE c.IdCliente = ?
      `,
        [venta.IdCliente],
      )

      const esConsumidorFinal = clienteInfo.length > 0 ? Boolean(clienteInfo[0].esConsumidorFinal) : false

      // ✅ LÓGICA MEJORADA PARA MASCOTAS CON USUARIOS-CLIENTES SINCRONIZADOS
      let idMascota = detalleData.IdMascota || null
      let nombreMascotaTemporal = detalleData.NombreMascotaTemporal || null
      let tipoMascotaTemporal = detalleData.TipoMascotaTemporal || null

      if (esConsumidorFinal) {
        const idMascotaGenerica = await ventasModel.getMascotaGenericaId()
        idMascota = idMascotaGenerica || 1
        nombreMascotaTemporal = detalleData.NombreMascotaTemporal || nombreMascotaTemporal || ""
        tipoMascotaTemporal = detalleData.TipoMascotaTemporal || tipoMascotaTemporal || "Genérica"
      } else {
        // Siempre obtener los datos reales de la mascota registrada
        const [mascotasCliente] = await connection.query(
          `SELECT m.*, e.NombreEspecie 
           FROM Mascotas m 
           LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
           WHERE m.IdMascota = ?`,
          [idMascota]
        );
        if (mascotasCliente.length === 0) {
          await connection.rollback();
          return res.status(404).json({ message: "Mascota no encontrada" });
        }
        nombreMascotaTemporal = mascotasCliente[0].Nombre;
        tipoMascotaTemporal = mascotasCliente[0].NombreEspecie;
      }

      // ✅ CÁLCULO SIN IVA PARA SERVICIOS
      const precioUnitario = detalleData.PrecioUnitario || servicio.Precio
      const cantidad = detalleData.Cantidad || 1
      const subtotal = precioUnitario * cantidad

      // ✅ CREAR DETALLE SIN CAMPOS IVA
      const [resultDetalle] = await connection.query(
        `INSERT INTO DetalleVentasServicios 
        (IdVenta, IdServicio, IdMascota, Cantidad, PrecioUnitario, Subtotal, NombreMascotaTemporal, TipoMascotaTemporal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdVenta,
          detalleData.IdServicio,
          idMascota,
          cantidad,
          precioUnitario,
          subtotal,
          nombreMascotaTemporal,
          tipoMascotaTemporal,
        ],
      )

      console.log(`📝 Detalle de servicio creado con ID: ${resultDetalle.insertId}`)

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

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios (SIN IVA)
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos // Solo productos tienen IVA
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleData.IdVenta,
      ])

      await connection.commit()

      console.log(`✅ Detalle de servicio creado exitosamente`)

      // Obtener el detalle creado
      const detalleCreado = await detalleVentasServiciosModel.getById(resultDetalle.insertId)

      res.status(201).json(detalleCreado)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log(`🔄 Rollback ejecutado en creación de detalle de servicio: ${error.message}`)
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al crear detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ACTUALIZAR DETALLE DE SERVICIO ACTUALIZADO PARA USUARIOS-CLIENTES SINCRONIZADOS
  update: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const detalleData = req.body

      console.log(`🔄 Actualizando detalle de servicio ${id}:`, detalleData)

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

      // ✅ VERIFICAR SI LA VENTA TIENE UN CLIENTE ASOCIADO CON SINCRONIZACIÓN
      const [clienteInfo] = await connection.query(
        `
        SELECT c.*, u.IdUsuario, r.NombreRol,
        CASE 
          WHEN c.Documento = '0000000000' OR c.IdCliente = 3 THEN 1 
          ELSE 0 
        END as esConsumidorFinal
        FROM Ventas v
        JOIN Clientes c ON v.IdCliente = c.IdCliente
        INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
        INNER JOIN Roles r ON u.IdRol = r.IdRol
        WHERE v.IdVenta = ?
      `,
        [detalleActual.IdVenta],
      )

      const esConsumidorFinal = clienteInfo.length > 0 ? Boolean(clienteInfo[0].esConsumidorFinal) : false

      // ✅ LÓGICA MEJORADA PARA MASCOTAS EN UPDATE CON USUARIOS-CLIENTES SINCRONIZADOS
     let idMascota = detalleData.IdMascota || detalleActual.IdMascota
let nombreMascotaTemporal = detalleData.NombreMascotaTemporal || detalleActual.NombreMascotaTemporal
let tipoMascotaTemporal = detalleData.TipoMascotaTemporal || detalleActual.TipoMascotaTemporal

if (esConsumidorFinal) {
  const idMascotaGenerica = await ventasModel.getMascotaGenericaId()
  idMascota = idMascotaGenerica || 1
  nombreMascotaTemporal = detalleData.NombreMascotaTemporal || nombreMascotaTemporal || ""
  tipoMascotaTemporal = detalleData.TipoMascotaTemporal || tipoMascotaTemporal || "Genérica"
} else {
  // Siempre obtener los datos reales de la mascota registrada
  const [mascotasCliente] = await connection.query(
    `SELECT m.*, e.NombreEspecie 
     FROM Mascotas m 
     LEFT JOIN Especies e ON m.IdEspecie = e.IdEspecie 
     WHERE m.IdMascota = ?`,
    [idMascota]
  );
  if (mascotasCliente.length === 0) {
    await connection.rollback();
    return res.status(404).json({ message: "Mascota no encontrada" });
  }
  nombreMascotaTemporal = mascotasCliente[0].Nombre;
  tipoMascotaTemporal = mascotasCliente[0].NombreEspecie;
}

      // ✅ CÁLCULO SIN IVA PARA SERVICIOS
      const precioUnitario = detalleData.PrecioUnitario || servicio.Precio
      const cantidad = detalleData.Cantidad || detalleActual.Cantidad
      const subtotal = precioUnitario * cantidad

      // ✅ ACTUALIZAR DETALLE SIN CAMPOS IVA
      await connection.query(
        `UPDATE DetalleVentasServicios SET 
        IdServicio = ?, IdMascota = ?, Cantidad = ?, PrecioUnitario = ?, Subtotal = ?, NombreMascotaTemporal = ?, TipoMascotaTemporal = ? 
        WHERE IdDetalleVentasServicios = ?`,
        [
          detalleData.IdServicio || detalleActual.IdServicio,
          idMascota,
          cantidad,
          precioUnitario,
          subtotal,
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

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios (SIN IVA)
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos // Solo productos tienen IVA
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      console.log(`✅ Detalle de servicio ${id} actualizado exitosamente`)

      // Obtener el detalle actualizado
      const detalleActualizado = await detalleVentasServiciosModel.getById(id)

      res.status(200).json(detalleActualizado)
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log("⛔ Rollback ejecutado - no se guardaron cambios");
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al actualizar detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },

  // ✅ ELIMINAR DETALLE DE SERVICIO
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      console.log(`🗑️ Eliminando detalle de servicio ${id}`)

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

      // Sumar totales de detalles de productos
      for (const detalle of detallesProductos) {
        subtotalProductos += detalle.Subtotal
        totalIvaProductos += detalle.IvaUnitario * detalle.Cantidad
      }

      // Sumar totales de detalles de servicios (SIN IVA)
      for (const detalle of detallesServicios) {
        subtotalServicios += detalle.Subtotal
      }

      const subtotalTotal = subtotalProductos + subtotalServicios
      const totalIvaTotal = totalIvaProductos // Solo productos tienen IVA
      const totalMontoTotal = subtotalTotal + totalIvaTotal

      // Actualizar venta
      await connection.query(`UPDATE Ventas SET Subtotal = ?, TotalIva = ?, TotalMonto = ? WHERE IdVenta = ?`, [
        subtotalTotal,
        totalIvaTotal,
        totalMontoTotal,
        detalleActual.IdVenta,
      ])

      await connection.commit()

      console.log(`✅ Detalle de servicio ${id} eliminado exitosamente`)

      res.status(200).json({ message: "Detalle de servicio eliminado correctamente", id })
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback()
          console.log(`🔄 Rollback ejecutado en eliminación de detalle de servicio: ${error.message}`)
        } catch (rollbackError) {
          console.error("❌ Error al hacer rollback:", rollbackError)
        }
      }
      console.error("❌ Error al eliminar detalle de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) {
        try {
          connection.release()
        } catch (releaseError) {
          console.error("❌ Error al liberar conexión:", releaseError)
        }
      }
    }
  },
}