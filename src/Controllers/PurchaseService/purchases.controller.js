// Importar los modelos
import { proveedoresModel, comprasModel, detalleComprasModel } from "../../Models/PurchaseService/purchases.model.js"
import { query, getConnection } from "../../Config/Database.js" // Añadida la importación de getConnection

// Controlador para proveedores
export const proveedoresController = {
  // Obtener todos los proveedores
  getAll: async (req, res) => {
    try {
      const proveedores = await proveedoresModel.getAll()
      res.status(200).json(proveedores)
    } catch (error) {
      console.error("Error al obtener proveedores:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un proveedor por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const proveedor = await proveedoresModel.getById(id)

      if (!proveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      res.status(200).json(proveedor)
    } catch (error) {
      console.error("Error al obtener proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo proveedor
  create: async (req, res) => {
    try {
      const proveedorData = req.body

      // Verificar si el Documento ya existe en lugar de NIT
      if (proveedorData.Documento) {
        const existingDocumento = await proveedoresModel.getByDocumento(proveedorData.Documento)
        if (existingDocumento) {
          return res.status(400).json({ message: "Ya existe un proveedor con ese Documento" })
        }
      }

      // Crear el proveedor
      const newProveedor = await proveedoresModel.create(proveedorData)

      res.status(201).json(newProveedor)
    } catch (error) {
      console.error("Error al crear proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar un proveedor
  update: async (req, res) => {
    try {
      const { id } = req.params
      const proveedorData = req.body

      // Verificar si el proveedor existe
      const existingProveedor = await proveedoresModel.getById(id)
      if (!existingProveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Verificar si el Documento ya existe en lugar de NIT
      if (proveedorData.Documento && proveedorData.Documento !== existingProveedor.Documento) {
        const proveedorWithDocumento = await proveedoresModel.getByDocumento(proveedorData.Documento)
        if (proveedorWithDocumento) {
          return res.status(400).json({ message: "Ya existe un proveedor con ese Documento" })
        }
      }

      // Actualizar el proveedor
      const updatedProveedor = await proveedoresModel.update(id, proveedorData)

      res.status(200).json(updatedProveedor)
    } catch (error) {
      console.error("Error al actualizar proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Cambiar el estado de un proveedor
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params
      const { Estado } = req.body

      // Verificar si el proveedor existe
      const existingProveedor = await proveedoresModel.getById(id)
      if (!existingProveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Cambiar el estado
      const result = await proveedoresModel.changeStatus(id, Estado)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al cambiar estado de proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un proveedor
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el proveedor existe
      const existingProveedor = await proveedoresModel.getById(id)
      if (!existingProveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Verificar si hay compras asociadas
      const compras = await comprasModel.getByProveedor(id)
      if (compras.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar el proveedor porque tiene compras asociadas",
          compras,
        })
      }

      // Eliminar el proveedor
      await proveedoresModel.delete(id)

      res.status(200).json({ message: "Proveedor eliminado correctamente" })
    } catch (error) {
      console.error("Error al eliminar proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Buscar proveedores
  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "Término de búsqueda no proporcionado" })
      }

      const proveedores = await proveedoresModel.search(term)

      res.status(200).json(proveedores)
    } catch (error) {
      console.error("Error al buscar proveedores:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // NUEVAS FUNCIONES PARA CATÁLOGO DE PROVEEDORES

  // Obtener catálogo de un proveedor
  getCatalogo: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el proveedor existe
      const proveedor = await proveedoresModel.getById(id)
      if (!proveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Consultar el catálogo del proveedor
      // Asumiendo que existe una tabla CatalogoProveedores o similar
      const [catalogo] = await query(
        `
        SELECT cp.*, p.NombreProducto, p.Descripcion, p.CodigoBarras, p.Stock, 
               p.PrecioVenta, p.Imagen, c.NombreCategoria
        FROM CatalogoProveedores cp
        JOIN Productos p ON cp.IdProducto = p.IdProducto
        LEFT JOIN CategoriasDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProducto
        WHERE cp.IdProveedor = ?
        AND cp.Estado = 1
      `,
        [id],
      )

      // Si no existe la tabla, intentar con una consulta alternativa
      if (catalogo === undefined) {
        // Consulta alternativa: productos que han sido comprados a este proveedor
        const [productosComprados] = await query(
          `
          SELECT DISTINCT p.*, c.NombreCategoria,
                 MAX(dc.PrecioUnitario) as UltimoPrecioCompra
          FROM DetalleCompras dc
          JOIN Compras co ON dc.IdCompra = co.IdCompra
          JOIN Productos p ON dc.IdProducto = p.IdProducto
          LEFT JOIN CategoriasDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProducto
          WHERE co.IdProveedor = ?
          GROUP BY p.IdProducto, p.Estado, p.NombreProducto, p.Descripcion, p.CodigoBarras, 
                   p.Stock, p.PrecioVenta, p.Imagen, c.NombreCategoria
        `,
          [id],
        )

        return res.status(200).json({
          proveedor: proveedor,
          productos: productosComprados || [],
          mensaje: "Catálogo generado a partir del historial de compras",
        })
      }

      res.status(200).json({
        proveedor: proveedor,
        productos: catalogo,
      })
    } catch (error) {
      console.error("Error al obtener catálogo del proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Agregar producto al catálogo de un proveedor
  addToCatalogo: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const { IdProducto, PrecioReferencia, Notas } = req.body

      // Verificar si el proveedor existe
      const [proveedores] = await connection.query(`SELECT * FROM Proveedores WHERE IdProveedor = ?`, [id])
      if (proveedores.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Verificar si el producto existe
      const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [IdProducto])
      if (productos.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      // Verificar si ya existe en el catálogo
      const [catalogoExistente] = await connection.query(
        `
        SELECT * FROM CatalogoProveedores 
        WHERE IdProveedor = ? AND IdProducto = ?
      `,
        [id, IdProducto],
      )

      let resultado

      if (catalogoExistente.length > 0) {
        // Actualizar entrada existente
        await connection.query(
          `
          UPDATE CatalogoProveedores 
          SET PrecioReferencia = ?, Notas = ?, Estado = 1, FechaActualizacion = NOW()
          WHERE IdProveedor = ? AND IdProducto = ?
        `,
          [PrecioReferencia, Notas, id, IdProducto],
        )

        resultado = {
          message: "Producto actualizado en el catálogo",
          IdProveedor: id,
          IdProducto: IdProducto,
          PrecioReferencia,
          Notas,
        }
      } else {
        // Crear nueva entrada
        // Primero verificar si existe la tabla
        try {
          await connection.query(
            `
            INSERT INTO CatalogoProveedores 
            (IdProveedor, IdProducto, PrecioReferencia, Notas, Estado, FechaCreacion, FechaActualizacion)
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
          `,
            [id, IdProducto, PrecioReferencia, Notas],
          )

          resultado = {
            message: "Producto agregado al catálogo",
            IdProveedor: id,
            IdProducto: IdProducto,
            PrecioReferencia,
            Notas,
          }
        } catch (error) {
          // Si la tabla no existe, crear una relación alternativa
          if (error.code === "ER_NO_SUCH_TABLE") {
            // Actualizar el producto para indicar que este proveedor lo suministra
            await connection.query(
              `
              UPDATE Productos 
              SET Origen = 'Proveedor', IdProveedorPrincipal = ?
              WHERE IdProducto = ?
            `,
              [id, IdProducto],
            )

            resultado = {
              message: "Producto asociado al proveedor (método alternativo)",
              IdProveedor: id,
              IdProducto: IdProducto,
              PrecioReferencia,
              Notas,
            }
          } else {
            throw error
          }
        }
      }

      await connection.commit()
      res.status(200).json(resultado)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al agregar producto al catálogo:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Eliminar producto del catálogo
  removeFromCatalogo: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id, productoId } = req.params

      // Verificar si el proveedor existe
      const [proveedores] = await connection.query(`SELECT * FROM Proveedores WHERE IdProveedor = ?`, [id])
      if (proveedores.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Verificar si el producto existe
      const [productos] = await connection.query(`SELECT * FROM Productos WHERE IdProducto = ?`, [productoId])
      if (productos.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      // Intentar eliminar de la tabla de catálogo
      try {
        await connection.query(
          `
          UPDATE CatalogoProveedores 
          SET Estado = 0, FechaActualizacion = NOW()
          WHERE IdProveedor = ? AND IdProducto = ?
        `,
          [id, productoId],
        )
      } catch (error) {
        // Si la tabla no existe, usar método alternativo
        if (error.code === "ER_NO_SUCH_TABLE") {
          // Verificar si este proveedor es el principal para este producto
          const [producto] = await connection.query(
            `
            SELECT * FROM Productos 
            WHERE IdProducto = ? AND IdProveedorPrincipal = ?
          `,
            [productoId, id],
          )

          if (producto.length > 0) {
            // Quitar la asociación
            await connection.query(
              `
              UPDATE Productos 
              SET IdProveedorPrincipal = NULL
              WHERE IdProducto = ? AND IdProveedorPrincipal = ?
            `,
              [productoId, id],
            )
          }
        } else {
          throw error
        }
      }

      await connection.commit()
      res.status(200).json({
        message: "Producto eliminado del catálogo",
        IdProveedor: id,
        IdProducto: productoId,
      })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al eliminar producto del catálogo:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },
}

// Controlador para compras
export const comprasController = {
  // Obtener todas las compras
  getAll: async (req, res) => {
    try {
      const compras = await comprasModel.getAll()
      res.status(200).json(compras)
    } catch (error) {
      console.error("Error al obtener compras:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener una compra por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const compra = await comprasModel.getById(id)

      if (!compra) {
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      // Obtener detalles de la compra
      const detalles = await detalleComprasModel.getByCompraId(id)

      // Combinar todo en un solo objeto
      const compraCompleta = {
        ...compra,
        detalles,
      }

      res.status(200).json(compraCompleta)
    } catch (error) {
      console.error("Error al obtener compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear una nueva compra
  create: async (req, res) => {
    let connection // Declarar la conexión fuera del try para poder acceder en catch/finally
    try {
      // Primero, desactivar temporalmente el modo only_full_group_by
      await query(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)

      connection = await getConnection() // Usar la función importada
      await connection.beginTransaction()

      const { compra, detalles } = req.body

      // Verificar si el proveedor existe
      const [proveedores] = await connection.query(`SELECT * FROM Proveedores WHERE IdProveedor = ?`, [
        compra.IdProveedor,
      ])

      if (proveedores.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Crear la compra
      const [resultCompra] = await connection.query(
        `INSERT INTO Compras 
        (IdProveedor, FechaCompra, TotalMonto, TotalIva, TotalMontoConIva, Estado) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          compra.IdProveedor,
          compra.FechaCompra || new Date(),
          compra.TotalMonto || 0,
          compra.TotalIva || 0,
          compra.TotalMontoConIva || 0,
          compra.Estado || "Efectiva",
        ],
      )

      const idCompra = resultCompra.insertId

      // Crear detalles de la compra
      const detallesCreados = []
      let subtotal = 0
      let totalIva = 0

      if (detalles && detalles.length > 0) {
        for (const detalle of detalles) {
          // ✅ CORREGIDO: Consulta sin FactorConversion
          const [productosResult] = await connection.query(
            `
            SELECT p.*, 
                  COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
                  COALESCE(p.ValorUnidad, 1) as ValorUnidad,
                  COALESCE(p.MargenGanancia, 30) as MargenGanancia,
                  COALESCE(p.PorcentajeIVA, 19) as PorcentajeIVA,
                  COALESCE(p.AplicaIVA, 1) as AplicaIVA
            FROM Productos p
            WHERE p.IdProducto = ?
          `,
            [detalle.IdProducto],
          )

          if (productosResult.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` })
          }

          const producto = productosResult[0]

          // Calcular subtotal e IVA
          const precioUnitario = detalle.PrecioUnitario
          const subtotalDetalle = precioUnitario * detalle.Cantidad
          let ivaUnitario = 0

          if (producto.AplicaIVA) {
            ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
          }

          const subtotalConIva = subtotalDetalle + ivaUnitario * detalle.Cantidad

          // ✅ CORREGIDO: Usar ValorUnidad en lugar de FactorConversion
          const factorConversion = producto.ValorUnidad || 1

          // 🔧 NUEVO: Calcular precio de venta sugerido
          const margenGanancia = producto.MargenGanancia || 30
          const precioVentaSugerido = detalle.PrecioVentaSugerido || precioUnitario * (1 + margenGanancia / 100)

          // Crear detalle
          const [resultDetalle] = await connection.query(
            `INSERT INTO DetalleCompras 
            (IdCompra, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, UnidadMedida, FactorConversion, CantidadConvertida, PrecioVentaSugerido) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              idCompra,
              detalle.IdProducto,
              detalle.Cantidad,
              precioUnitario,
              subtotalDetalle,
              ivaUnitario,
              subtotalConIva,
              producto.UnidadMedida,
              factorConversion,
              detalle.Cantidad * factorConversion,
              precioVentaSugerido,
            ],
          )

          detallesCreados.push({
            id: resultDetalle.insertId,
            IdCompra: idCompra,
            IdProducto: detalle.IdProducto,
            Cantidad: detalle.Cantidad,
            PrecioUnitario: precioUnitario,
            Subtotal: subtotalDetalle,
            IvaUnitario: ivaUnitario,
            SubtotalConIva: subtotalConIva,
            PrecioVentaSugerido: precioVentaSugerido,
          })

          // 🔧 MEJORADO: Actualizar stock del producto usando la misma conexión
          console.log(`📦 Actualizando stock del producto ${detalle.IdProducto}: +${detalle.Cantidad}`)

          // Verificar stock actual antes de actualizar
          const [stockActual] = await connection.query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])
          console.log(`📊 Stock actual del producto ${detalle.IdProducto}: ${stockActual[0]?.Stock || 0}`)

          const [updateResult] = await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])

          console.log(`✅ Filas afectadas en actualización de stock: ${updateResult.affectedRows}`)

          // 🔧 NUEVO: Solo actualizar precio de venta si el usuario lo indica
          if (detalle.actualizarPrecioVenta && detalle.PrecioVentaSugerido > 0) {
            console.log(
              `💰 Actualizando precio de venta del producto ${detalle.IdProducto}: $${detalle.PrecioVentaSugerido}`,
            )
            await connection.query(
              `
              UPDATE Productos 
              SET PrecioVenta = ? 
              WHERE IdProducto = ?`,
              [detalle.PrecioVentaSugerido, detalle.IdProducto],
            )
          } else {
            console.log(`💰 Manteniendo precio de venta actual del producto ${detalle.IdProducto}`)
          }

          // Verificar stock después de actualizar
          const [stockNuevo] = await connection.query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])
          console.log(`📈 Nuevo stock del producto ${detalle.IdProducto}: ${stockNuevo[0]?.Stock || 0}`)

          // Acumular totales
          subtotal += subtotalDetalle
          totalIva += ivaUnitario * detalle.Cantidad
        }
      }

      const totalMonto = subtotal + totalIva

      // Actualizar totales de la compra
      await connection.query(
        `UPDATE Compras SET TotalMonto = ?, TotalIva = ?, TotalMontoConIva = ? WHERE IdCompra = ?`,
        [subtotal, totalIva, totalMonto, idCompra],
      )

      // Obtener la compra completa actualizada
      const [comprasActualizadas] = await connection.query(
        `SELECT c.*, p.NombreEmpresa
        FROM Compras c
        JOIN Proveedores p ON c.IdProveedor = p.IdProveedor
        WHERE c.IdCompra = ?`,
        [idCompra],
      )

      await connection.commit()
      console.log(`🎉 Compra ${idCompra} creada exitosamente con stock actualizado`)

      // Responder con la compra completa
      res.status(201).json({
        compra: comprasActualizadas[0],
        detalles: detallesCreados,
      })
    } catch (error) {
      if (connection) await connection.rollback() // Verificar que connection existe antes de hacer rollback
      console.error("❌ Error al crear compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release() // Verificar que connection existe antes de liberarla

      // Restaurar el modo SQL original
      try {
        await query(`SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ONLY_FULL_GROUP_BY'))`)
      } catch (error) {
        console.error("Error al restaurar el modo SQL:", error)
      }
    }
  },

  // Actualizar una compra
  update: async (req, res) => {
    let connection
    try {
      // Desactivar temporalmente el modo only_full_group_by
      await query(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)

      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const { compra, detalles } = req.body

      // Verificar si la compra existe
      const [compras] = await connection.query(`SELECT * FROM Compras WHERE IdCompra = ?`, [id])

      if (compras.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      // Si se está actualizando el proveedor, verificar que exista
      if (compra.IdProveedor) {
        const [proveedores] = await connection.query(`SELECT * FROM Proveedores WHERE IdProveedor = ?`, [
          compra.IdProveedor,
        ])

        if (proveedores.length === 0) {
          await connection.rollback()
          return res.status(404).json({ message: "Proveedor no encontrado" })
        }
      }

      // 🔧 MEJORADO: Revertir stock de los detalles anteriores con validación
      const [detallesAnteriores] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [id])

      for (const detalleAnterior of detallesAnteriores) {
        // Verificar stock actual antes de revertir
        const [stockActual] = await connection.query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [
          detalleAnterior.IdProducto,
        ])

        const stockDisponible = stockActual[0]?.Stock || 0
        const cantidadARevertir = detalleAnterior.Cantidad

        console.log(
          `📦 Producto ${detalleAnterior.IdProducto}: Stock actual=${stockDisponible}, Cantidad a revertir=${cantidadARevertir}`,
        )

        if (stockDisponible >= cantidadARevertir) {
          // Hay suficiente stock para revertir
          console.log(`✅ Revirtiendo stock del producto ${detalleAnterior.IdProducto}: -${cantidadARevertir}`)
          await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
            cantidadARevertir,
            detalleAnterior.IdProducto,
          ])
        } else {
          // No hay suficiente stock, ajustar solo lo disponible
          console.log(
            `⚠️ Stock insuficiente para revertir completamente. Ajustando stock a 0 para producto ${detalleAnterior.IdProducto}`,
          )
          await connection.query(`UPDATE Productos SET Stock = 0 WHERE IdProducto = ?`, [detalleAnterior.IdProducto])

          // Log de advertencia para auditoría
          console.warn(
            `🚨 ADVERTENCIA: No se pudo revertir completamente el stock del producto ${detalleAnterior.IdProducto}. Stock disponible: ${stockDisponible}, Cantidad requerida: ${cantidadARevertir}`,
          )
        }
      }

      // Actualizar la compra
      await connection.query(
        `UPDATE Compras SET 
        IdProveedor = COALESCE(?, IdProveedor),
        FechaCompra = COALESCE(?, FechaCompra),
        TotalMonto = COALESCE(?, TotalMonto),
        TotalIva = COALESCE(?, TotalIva),
        TotalMontoConIva = COALESCE(?, TotalMontoConIva),
        Estado = COALESCE(?, Estado)
        WHERE IdCompra = ?`,
        [
          compra.IdProveedor,
          compra.FechaCompra,
          compra.TotalMonto,
          compra.TotalIva,
          compra.TotalMontoConIva,
          compra.Estado,
          id,
        ],
      )

      // Eliminar los detalles existentes
      await connection.query(`DELETE FROM DetalleCompras WHERE IdCompra = ?`, [id])

      // Insertar los nuevos detalles
      if (detalles && detalles.length > 0) {
        for (const detalle of detalles) {
          // ✅ CORREGIDO: Consulta sin FactorConversion
          const [productosResult] = await connection.query(
            `
            SELECT p.*, 
                  COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
                  COALESCE(p.ValorUnidad, 1) as ValorUnidad,
                  COALESCE(p.MargenGanancia, 30) as MargenGanancia,
                  COALESCE(p.PorcentajeIVA, 19) as PorcentajeIVA,
                  COALESCE(p.AplicaIVA, 1) as AplicaIVA
            FROM Productos p
            WHERE p.IdProducto = ?
          `,
            [detalle.IdProducto],
          )

          if (productosResult.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: `Producto con ID ${detalle.IdProducto} no encontrado` })
          }

          const producto = productosResult[0]

          // Calcular IVA y subtotal con IVA
          const precioUnitario = detalle.PrecioUnitario
          const subtotal = precioUnitario * detalle.Cantidad
          let ivaUnitario = 0

          if (producto.AplicaIVA || detalle.iva > 0) {
            const porcentajeIva = detalle.iva !== undefined ? detalle.iva : producto.PorcentajeIVA
            ivaUnitario = precioUnitario * (porcentajeIva / 100)
          }

          const subtotalConIva = subtotal + ivaUnitario * detalle.Cantidad

          // ✅ CORREGIDO: Usar ValorUnidad en lugar de FactorConversion
          const factorConversion = producto.ValorUnidad || 1

          // 🔧 NUEVO: Calcular precio de venta sugerido
          const margenGanancia = producto.MargenGanancia || 30
          const precioVentaSugerido = detalle.PrecioVentaSugerido || precioUnitario * (1 + margenGanancia / 100)

          // Insertar el detalle
          await connection.query(
            `INSERT INTO DetalleCompras 
            (IdCompra, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, UnidadMedida, FactorConversion, CantidadConvertida, PrecioVentaSugerido) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              detalle.IdProducto,
              detalle.Cantidad,
              precioUnitario,
              subtotal,
              ivaUnitario,
              subtotalConIva,
              producto.UnidadMedida,
              factorConversion,
              detalle.Cantidad * factorConversion,
              precioVentaSugerido,
            ],
          )

          // 🔧 MEJORADO: Actualizar stock del producto con los nuevos valores
          console.log(`📦 Actualizando stock del producto ${detalle.IdProducto}: +${detalle.Cantidad}`)
          await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])

          // 🔧 NUEVO: Solo actualizar precio de venta si el usuario lo indica
          if (detalle.actualizarPrecioVenta && detalle.PrecioVentaSugerido > 0) {
            console.log(
              `💰 Actualizando precio de venta del producto ${detalle.IdProducto}: $${detalle.PrecioVentaSugerido}`,
            )
            await connection.query(
              `
              UPDATE Productos 
              SET PrecioVenta = ? 
              WHERE IdProducto = ?`,
              [detalle.PrecioVentaSugerido, detalle.IdProducto],
            )
          } else {
            console.log(`💰 Manteniendo precio de venta actual del producto ${detalle.IdProducto}`)
          }
        }
      }

      await connection.commit()

      // Obtener la compra actualizada con sus detalles
      const compraActualizada = await comprasModel.getById(id)

      res.status(200).json(compraActualizada)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al actualizar compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()

      // Restaurar el modo SQL original
      try {
        await query(`SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ONLY_FULL_GROUP_BY'))`)
      } catch (error) {
        console.error("Error al restaurar el modo SQL:", error)
      }
    }
  },

  // Cambiar el estado de una compra
  changeStatus: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params
      const { Estado } = req.body

      // Verificar si la compra existe
      const [compras] = await connection.query(`SELECT * FROM Compras WHERE IdCompra = ?`, [id])
      if (compras.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      const existingCompra = compras[0]

      // Validar estado
      if (Estado !== "Efectiva" && Estado !== "Cancelada") {
        await connection.rollback()
        return res.status(400).json({ message: 'Estado no válido. Debe ser "Efectiva" o "Cancelada"' })
      }

      // 🔧 MEJORADO: Manejar cambios de estado con actualización de stock
      if (Estado === "Cancelada" && existingCompra.Estado === "Efectiva") {
        // Obtener detalles de la compra
        const [detalles] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [id])

        // Revertir stock de cada producto con validación
        for (const detalle of detalles) {
          // Verificar stock actual
          const [stockActual] = await connection.query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])

          const stockDisponible = stockActual[0]?.Stock || 0
          const cantidadARevertir = detalle.Cantidad

          if (stockDisponible >= cantidadARevertir) {
            console.log(
              `📦 Revirtiendo stock por cancelación del producto ${detalle.IdProducto}: -${cantidadARevertir}`,
            )
            await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
              cantidadARevertir,
              detalle.IdProducto,
            ])
          } else {
            console.log(
              `⚠️ Stock insuficiente para cancelación. Ajustando stock a 0 para producto ${detalle.IdProducto}`,
            )
            await connection.query(`UPDATE Productos SET Stock = 0 WHERE IdProducto = ?`, [detalle.IdProducto])

            console.warn(
              `🚨 ADVERTENCIA: Cancelación parcial del stock del producto ${detalle.IdProducto}. Stock disponible: ${stockDisponible}, Cantidad requerida: ${cantidadARevertir}`,
            )
          }
        }
      } else if (Estado === "Efectiva" && existingCompra.Estado === "Cancelada") {
        // Obtener detalles de la compra
        const [detalles] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [id])

        // Restaurar stock de cada producto
        for (const detalle of detalles) {
          console.log(`📦 Restaurando stock por reactivación del producto ${detalle.IdProducto}: +${detalle.Cantidad}`)
          await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
            detalle.Cantidad,
            detalle.IdProducto,
          ])
        }
      }

      // Cambiar el estado
      await connection.query(`UPDATE Compras SET Estado = ? WHERE IdCompra = ?`, [Estado, id])

      await connection.commit()

      res.status(200).json({
        message: `Estado de compra cambiado a ${Estado}`,
        IdCompra: id,
        EstadoAnterior: existingCompra.Estado,
        EstadoNuevo: Estado,
      })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al cambiar estado de compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Eliminar una compra
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      // Verificar si la compra existe
      const [compras] = await connection.query(`SELECT * FROM Compras WHERE IdCompra = ?`, [id])
      if (compras.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      const existingCompra = compras[0]

      // 🔧 MEJORADO: Si la compra está efectiva, revertir el stock con validación
      if (existingCompra.Estado === "Efectiva") {
        // Obtener detalles de la compra
        const [detalles] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [id])

        // Revertir stock de cada producto con validación
        for (const detalle of detalles) {
          // Verificar stock actual
          const [stockActual] = await connection.query(`SELECT Stock FROM Productos WHERE IdProducto = ?`, [
            detalle.IdProducto,
          ])

          const stockDisponible = stockActual[0]?.Stock || 0
          const cantidadARevertir = detalle.Cantidad

          if (stockDisponible >= cantidadARevertir) {
            console.log(
              `📦 Revirtiendo stock por eliminación del producto ${detalle.IdProducto}: -${cantidadARevertir}`,
            )
            await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
              cantidadARevertir,
              detalle.IdProducto,
            ])
          } else {
            console.log(
              `⚠️ Stock insuficiente para eliminación. Ajustando stock a 0 para producto ${detalle.IdProducto}`,
            )
            await connection.query(`UPDATE Productos SET Stock = 0 WHERE IdProducto = ?`, [detalle.IdProducto])

            console.warn(
              `🚨 ADVERTENCIA: Eliminación parcial del stock del producto ${detalle.IdProducto}. Stock disponible: ${stockDisponible}, Cantidad requerida: ${cantidadARevertir}`,
            )
          }
        }
      }

      // Eliminar los detalles primero
      await connection.query(`DELETE FROM DetalleCompras WHERE IdCompra = ?`, [id])

      // Eliminar la compra
      await connection.query(`DELETE FROM Compras WHERE IdCompra = ?`, [id])

      await connection.commit()

      res.status(200).json({ message: "Compra eliminada correctamente" })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al eliminar compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Obtener compras por proveedor
  getByProveedor: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el proveedor existe
      const proveedor = await proveedoresModel.getById(id)
      if (!proveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" })
      }

      // Obtener compras
      const compras = await comprasModel.getByProveedor(id)

      res.status(200).json(compras)
    } catch (error) {
      console.error("Error al obtener compras del proveedor:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener compras por usuario (modificada para evitar errores)
  getByUsuario: async (req, res) => {
    try {
      const { id } = req.params

      // CORREGIDO: Eliminar la validación de usuario

      // Obtener todas las compras (ya que no hay relación con usuarios)
      const compras = await comprasModel.getByUsuario(id)

      res.status(200).json(compras)
    } catch (error) {
      console.error("Error al obtener compras del usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener compras por fecha
  getByFecha: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.query

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Se requieren fechaInicio y fechaFin" })
      }

      // Obtener compras
      const compras = await comprasModel.getByFecha(fechaInicio, fechaFin)

      res.status(200).json(compras)
    } catch (error) {
      console.error("Error al obtener compras por fecha:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener compras por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params

      // Validar estado
      if (estado !== "Efectiva" && estado !== "Cancelada") {
        return res.status(400).json({ message: 'Estado no válido. Debe ser "Efectiva" o "Cancelada"' })
      }

      // Obtener compras
      const compras = await comprasModel.getByEstado(estado)

      res.status(200).json(compras)
    } catch (error) {
      console.error("Error al obtener compras por estado:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para detalles de compras
export const detalleComprasController = {
  // Obtener detalles de una compra
  getByCompra: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si la compra existe
      const compra = await comprasModel.getById(id)
      if (!compra) {
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      // Obtener detalles
      const detalles = await detalleComprasModel.getByCompraId(id)

      res.status(200).json(detalles)
    } catch (error) {
      console.error("Error al obtener detalles de compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo detalle de compra
  create: async (req, res) => {
    let connection
    try {
      // Desactivar temporalmente el modo only_full_group_by
      await query(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)

      connection = await getConnection()
      await connection.beginTransaction()

      const detalleData = req.body

      // Verificar si la compra existe
      const [compras] = await connection.query(`SELECT * FROM Compras WHERE IdCompra = ?`, [detalleData.IdCompra])
      if (compras.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Compra no encontrada" })
      }

      // ✅ CORREGIDO: Consulta sin FactorConversion
      const [productosResult] = await connection.query(
        `
        SELECT p.*, 
              COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
              COALESCE(p.ValorUnidad, 1) as ValorUnidad,
              COALESCE(p.MargenGanancia, 30) as MargenGanancia,
              COALESCE(p.PorcentajeIVA, 19) as PorcentajeIVA,
              COALESCE(p.AplicaIVA, 1) as AplicaIVA
        FROM Productos p
        WHERE p.IdProducto = ?
      `,
        [detalleData.IdProducto],
      )

      if (productosResult.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = productosResult[0]

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario
      const subtotal = precioUnitario * detalleData.Cantidad
      let ivaUnitario = 0

      if (producto.AplicaIVA) {
        ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotal + ivaUnitario * detalleData.Cantidad
      const factorConversion = producto.ValorUnidad || 1
      const cantidadConvertida = detalleData.Cantidad * factorConversion
      const precioVentaSugerido =
        detalleData.PrecioVentaSugerido || precioUnitario * (1 + (producto.MargenGanancia || 30) / 100)

      // Crear detalle
      const [resultDetalle] = await connection.query(
        `INSERT INTO DetalleCompras 
        (IdCompra, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, UnidadMedida, FactorConversion, CantidadConvertida, PrecioVentaSugerido) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleData.IdCompra,
          detalleData.IdProducto,
          detalleData.Cantidad,
          precioUnitario,
          subtotal,
          ivaUnitario,
          subtotalConIva,
          producto.UnidadMedida || "Unidad",
          factorConversion,
          cantidadConvertida,
          precioVentaSugerido,
        ],
      )

      // 🔧 MEJORADO: Actualizar stock del producto usando la misma conexión
      console.log(`📦 Actualizando stock del producto ${detalleData.IdProducto}: +${detalleData.Cantidad}`)
      await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
        detalleData.Cantidad,
        detalleData.IdProducto,
      ])

      // 🔧 NUEVO: Solo actualizar precio de venta si se indica
      if (detalleData.actualizarPrecioVenta && precioVentaSugerido > 0) {
        console.log(`💰 Actualizando precio de venta del producto ${detalleData.IdProducto}: $${precioVentaSugerido}`)
        await connection.query(
          `
          UPDATE Productos 
          SET PrecioVenta = ? 
          WHERE IdProducto = ?`,
          [precioVentaSugerido, detalleData.IdProducto],
        )
      }

      // Actualizar totales de la compra
      const [detalles] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [
        detalleData.IdCompra,
      ])

      let subtotalCompra = 0
      let totalIva = 0

      // Sumar totales de detalles
      for (const detalle of detalles) {
        subtotalCompra += detalle.Subtotal || 0
        totalIva += (detalle.IvaUnitario || 0) * detalle.Cantidad
      }

      const totalMontoConIva = subtotalCompra + totalIva

      // Actualizar compra
      await connection.query(
        `UPDATE Compras SET TotalMonto = ?, TotalIva = ?, TotalMontoConIva = ? WHERE IdCompra = ?`,
        [subtotalCompra, totalIva, totalMontoConIva, detalleData.IdCompra],
      )

      await connection.commit()

      const detalleCreado = {
        id: resultDetalle.insertId,
        IdCompra: detalleData.IdCompra,
        IdProducto: detalleData.IdProducto,
        Cantidad: detalleData.Cantidad,
        PrecioUnitario: precioUnitario,
        Subtotal: subtotal,
        IvaUnitario: ivaUnitario,
        SubtotalConIva: subtotalConIva,
        UnidadMedida: producto.UnidadMedida || "Unidad",
        FactorConversion: factorConversion,
        CantidadConvertida: cantidadConvertida,
        PrecioVentaSugerido: precioVentaSugerido,
      }

      res.status(201).json(detalleCreado)

      // Restaurar el modo SQL original
      await query(`SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ONLY_FULL_GROUP_BY'))`)
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al crear detalle de compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },

  // Actualizar un detalle de compra
  update: async (req, res) => {
    let connection // Declarar la conexión fuera del try para poder acceder en catch/finally
    try {
      // Desactivar temporalmente el modo only_full_group_by
      await query(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)

      connection = await getConnection() // Usar la función importada
      await connection.beginTransaction()

      const { id } = req.params
      const detalleData = req.body

      // Obtener el detalle actual
      const [detallesActuales] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdDetalleCompras = ?`, [id])

      if (detallesActuales.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de compra no encontrado" })
      }

      const detalleActual = detallesActuales[0]

      // ✅ CORREGIDO: Consulta sin FactorConversion
      const [productosResult] = await connection.query(
        `
        SELECT p.*, 
              COALESCE(p.UnidadMedida, 'Unidad') as UnidadMedida,
              COALESCE(p.ValorUnidad, 1) as ValorUnidad,
              COALESCE(p.MargenGanancia, 30) as MargenGanancia,
              COALESCE(p.PorcentajeIVA, 19) as PorcentajeIVA,
              COALESCE(p.AplicaIVA, 1) as AplicaIVA
        FROM Productos p
        WHERE p.IdProducto = ?
      `,
        [detalleData.IdProducto || detalleActual.IdProducto],
      )

      if (productosResult.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const producto = productosResult[0]

      // 🔧 MEJORADO: Calcular diferencia de cantidad para actualizar stock
      const cantidadAnterior = detalleActual.Cantidad
      const cantidadNueva = detalleData.Cantidad || detalleActual.Cantidad
      const diferenciaCantidad = cantidadNueva - cantidadAnterior

      // Calcular subtotal e IVA
      const precioUnitario = detalleData.PrecioUnitario || detalleActual.PrecioUnitario
      const cantidad = cantidadNueva
      const subtotal = precioUnitario * cantidad
      let ivaUnitario = 0

      if (producto.AplicaIVA) {
        ivaUnitario = precioUnitario * (producto.PorcentajeIVA / 100)
      }

      const subtotalConIva = subtotal + ivaUnitario * cantidad

      // ✅ CORREGIDO: Usar ValorUnidad en lugar de FactorConversion
      const factorConversion = producto.ValorUnidad || 1
      const precioVentaSugerido =
        detalleData.PrecioVentaSugerido || precioUnitario * (1 + producto.MargenGanancia / 100)

      // Actualizar detalle
      await connection.query(
        `UPDATE DetalleCompras SET 
        IdProducto = ?, Cantidad = ?, PrecioUnitario = ?, Subtotal = ?, IvaUnitario = ?, SubtotalConIva = ?,
        UnidadMedida = ?, FactorConversion = ?, CantidadConvertida = ?, PrecioVentaSugerido = ?
        WHERE IdDetalleCompras = ?`,
        [
          detalleData.IdProducto || detalleActual.IdProducto,
          cantidad,
          precioUnitario,
          subtotal,
          ivaUnitario,
          subtotalConIva,
          producto.UnidadMedida,
          factorConversion,
          cantidad * factorConversion,
          precioVentaSugerido,
          id,
        ],
      )

      // 🔧 MEJORADO: Actualizar stock del producto solo si hay diferencia
      if (diferenciaCantidad !== 0) {
        console.log(
          `📦 Actualizando stock del producto ${detalleActual.IdProducto}: ${diferenciaCantidad > 0 ? "+" : ""}${diferenciaCantidad}`,
        )
        await connection.query(`UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`, [
          diferenciaCantidad,
          detalleActual.IdProducto,
        ])
      }

      // 🔧 NUEVO: Solo actualizar precio de venta si se indica
      if (detalleData.actualizarPrecioVenta && precioVentaSugerido > 0) {
        console.log(`💰 Actualizando precio de venta del producto ${detalleActual.IdProducto}: $${precioVentaSugerido}`)
        await connection.query(
          `
          UPDATE Productos 
          SET PrecioVenta = ? 
          WHERE IdProducto = ?`,
          [precioVentaSugerido, detalleActual.IdProducto],
        )
      }

      // Actualizar totales de la compra
      const [detallesActualizados] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [
        detalleActual.IdCompra,
      ])

      let subtotalCompra = 0
      let totalIva = 0

      // Sumar totales de detalles
      for (const detalle of detallesActualizados) {
        subtotalCompra += detalle.Subtotal || 0
        totalIva += (detalle.IvaUnitario || 0) * detalle.Cantidad
      }

      const totalMontoConIva = subtotalCompra + totalIva

      // Actualizar compra
      await connection.query(
        `UPDATE Compras SET TotalMonto = ?, TotalIva = ?, TotalMontoConIva = ? WHERE IdCompra = ?`,
        [subtotalCompra, totalIva, totalMontoConIva, detalleActual.IdCompra],
      )

      await connection.commit()

      res.status(200).json({
        id,
        IdCompra: detalleActual.IdCompra,
        IdProducto: detalleData.IdProducto || detalleActual.IdProducto,
        Cantidad: cantidad,
        PrecioUnitario: precioUnitario,
        Subtotal: subtotal,
        IvaUnitario: ivaUnitario,
        SubtotalConIva: subtotalConIva,
        UnidadMedida: producto.UnidadMedida,
        FactorConversion: factorConversion,
        CantidadConvertida: cantidad * factorConversion,
        PrecioVentaSugerido: precioVentaSugerido,
      })
    } catch (error) {
      if (connection) await connection.rollback() // Verificar que connection existe antes de hacer rollback
      console.error("Error al actualizar detalle de compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release() // Verificar que connection existe antes de liberarla

      // Restaurar el modo SQL original
      try {
        await query(`SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ONLY_FULL_GROUP_BY'))`)
      } catch (error) {
        console.error("Error al restaurar el modo SQL:", error)
      }
    }
  },

  // Eliminar un detalle de compra
  delete: async (req, res) => {
    let connection
    try {
      connection = await getConnection()
      await connection.beginTransaction()

      const { id } = req.params

      // Obtener el detalle actual
      const [detalles] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdDetalleCompras = ?`, [id])

      if (detalles.length === 0) {
        await connection.rollback()
        return res.status(404).json({ message: "Detalle de compra no encontrado" })
      }

      const detalleActual = detalles[0]

      // 🔧 MEJORADO: Actualizar stock del producto (restar) usando la misma conexión
      console.log(`📦 Revirtiendo stock del producto ${detalleActual.IdProducto}: -${detalleActual.Cantidad}`)
      await connection.query(`UPDATE Productos SET Stock = Stock - ? WHERE IdProducto = ?`, [
        detalleActual.Cantidad,
        detalleActual.IdProducto,
      ])

      // Eliminar el detalle
      await connection.query(`DELETE FROM DetalleCompras WHERE IdDetalleCompras = ?`, [id])

      // Actualizar totales de la compra
      const [detallesActualizados] = await connection.query(`SELECT * FROM DetalleCompras WHERE IdCompra = ?`, [
        detalleActual.IdCompra,
      ])

      let subtotalCompra = 0
      let totalIva = 0

      // Sumar totales de detalles
      for (const detalle of detallesActualizados) {
        subtotalCompra += detalle.Subtotal || 0
        totalIva += (detalle.IvaUnitario || 0) * detalle.Cantidad
      }

      const totalMontoConIva = subtotalCompra + totalIva

      // Actualizar compra
      await connection.query(
        `UPDATE Compras SET TotalMonto = ?, TotalIva = ?, TotalMontoConIva = ? WHERE IdCompra = ?`,
        [subtotalCompra, totalIva, totalMontoConIva, detalleActual.IdCompra],
      )

      await connection.commit()

      res.status(200).json({ message: "Detalle de compra eliminado correctamente" })
    } catch (error) {
      if (connection) await connection.rollback()
      console.error("Error al eliminar detalle de compra:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    } finally {
      if (connection) connection.release()
    }
  },
}

export default {
  proveedores: proveedoresController,
  compras: comprasController,
  detalleCompras: detalleComprasController,
}
