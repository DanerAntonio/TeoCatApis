// Importar la conexión a la base de datos
import { query } from "../../Config/Database.js"

// Modelo para proveedores
export const proveedoresModel = {
  // Obtener todos los proveedores
  getAll: async () => {
    try {
      const proveedores = await query(`SELECT * FROM Proveedores ORDER BY NombreEmpresa`)

      // Convertir el estado booleano a string para la API
      return proveedores.map((p) => ({
        ...p,
        Estado: p.Estado ? "Activo" : "Inactivo",
      }))
    } catch (error) {
      console.error("Error en proveedoresModel.getAll:", error)
      throw error
    }
  },

  // Obtener un proveedor por ID
  getById: async (id) => {
    try {
      const proveedores = await query(`SELECT * FROM Proveedores WHERE IdProveedor = ?`, [id])
      if (proveedores.length === 0) return null

      // Convertir el estado booleano a string para la API
      return {
        ...proveedores[0],
        Estado: proveedores[0].Estado ? "Activo" : "Inactivo",
      }
    } catch (error) {
      console.error(`Error en proveedoresModel.getById(${id}):`, error)
      throw error
    }
  },

  // Obtener un proveedor por documento
  getByDocumento: async (documento) => {
    try {
      const proveedores = await query(`SELECT * FROM Proveedores WHERE Documento = ?`, [documento])
      if (proveedores.length === 0) return null

      // Convertir el estado booleano a string para la API
      return {
        ...proveedores[0],
        Estado: proveedores[0].Estado ? "Activo" : "Inactivo",
      }
    } catch (error) {
      console.error(`Error en proveedoresModel.getByDocumento(${documento}):`, error)
      throw error
    }
  },

  // Crear un nuevo proveedor
  create: async (proveedorData) => {
    try {
      // Convertir el estado de string a booleano para la BD
      let estadoBooleano = true // Valor por defecto

      if (proveedorData.Estado !== undefined) {
        if (typeof proveedorData.Estado === "string") {
          estadoBooleano = proveedorData.Estado.toLowerCase() === "activo"
        } else {
          estadoBooleano = Boolean(proveedorData.Estado)
        }
      }

      console.log("Datos del proveedor a crear:", {
        ...proveedorData,
        Estado: estadoBooleano,
      })

      const result = await query(
        `INSERT INTO Proveedores 
        (NombreEmpresa, Documento, Direccion, Telefono, Correo, PersonaDeContacto, Estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          proveedorData.NombreEmpresa,
          proveedorData.Documento,
          proveedorData.Direccion,
          proveedorData.Telefono,
          proveedorData.Correo || proveedorData.Email, // Aceptar ambos nombres de campo
          proveedorData.PersonaDeContacto,
          estadoBooleano, // Usar el valor booleano convertido
        ],
      )

      // Obtener el proveedor recién creado
      const newProveedor = await proveedoresModel.getById(result.insertId)
      return newProveedor
    } catch (error) {
      console.error("Error en proveedoresModel.create:", error)
      throw error
    }
  },

  // Actualizar un proveedor
  update: async (id, proveedorData) => {
    try {
      // Convertir el estado a booleano si está presente
      let estadoBooleano = undefined

      if (proveedorData.Estado !== undefined) {
        if (typeof proveedorData.Estado === "string") {
          estadoBooleano = proveedorData.Estado.toLowerCase() === "activo"
        } else {
          estadoBooleano = Boolean(proveedorData.Estado)
        }
      }

      await query(
        `UPDATE Proveedores SET 
        NombreEmpresa = COALESCE(?, NombreEmpresa),
        Documento = COALESCE(?, Documento),
        Direccion = COALESCE(?, Direccion),
        Telefono = COALESCE(?, Telefono),
        Correo = COALESCE(?, Correo),
        PersonaDeContacto = COALESCE(?, PersonaDeContacto),
        Estado = COALESCE(?, Estado)
        WHERE IdProveedor = ?`,
        [
          proveedorData.NombreEmpresa,
          proveedorData.Documento,
          proveedorData.Direccion,
          proveedorData.Telefono,
          proveedorData.Correo || proveedorData.Email, // Aceptar ambos nombres de campo
          proveedorData.PersonaDeContacto,
          estadoBooleano, // Usar el valor booleano convertido
          id,
        ],
      )

      // Obtener el proveedor actualizado
      const updatedProveedor = await proveedoresModel.getById(id)
      return updatedProveedor
    } catch (error) {
      console.error(`Error en proveedoresModel.update(${id}):`, error)
      throw error
    }
  },

  // Cambiar el estado de un proveedor
  changeStatus: async (id, estado) => {
    try {
      // Convertir el estado a booleano
      let estadoBooleano = true

      if (typeof estado === "string") {
        estadoBooleano = estado.toLowerCase() === "activo"
      } else {
        estadoBooleano = Boolean(estado)
      }

      await query(`UPDATE Proveedores SET Estado = ? WHERE IdProveedor = ?`, [estadoBooleano, id])

      // Obtener el proveedor actualizado
      const updatedProveedor = await proveedoresModel.getById(id)
      return updatedProveedor
    } catch (error) {
      console.error(`Error en proveedoresModel.changeStatus(${id}, ${estado}):`, error)
      throw error
    }
  },

  // Eliminar un proveedor
  delete: async (id) => {
    try {
      await query(`DELETE FROM Proveedores WHERE IdProveedor = ?`, [id])
      return { id, deleted: true }
    } catch (error) {
      console.error(`Error en proveedoresModel.delete(${id}):`, error)
      throw error
    }
  },

  // Buscar proveedores
  search: async (term) => {
    try {
      const proveedores = await query(
        `SELECT * FROM Proveedores 
        WHERE NombreEmpresa LIKE ? OR Documento LIKE ? OR PersonaDeContacto LIKE ?
        ORDER BY NombreEmpresa`,
        [`%${term}%`, `%${term}%`, `%${term}%`],
      )

      // Convertir el estado booleano a string para la API
      return proveedores.map((p) => ({
        ...p,
        Estado: p.Estado ? "Activo" : "Inactivo",
      }))
    } catch (error) {
      console.error(`Error en proveedoresModel.search(${term}):`, error)
      throw error
    }
  },
}

// Modelo para compras
export const comprasModel = {
  // Obtener todas las compras
  getAll: async () => {
    try {
      // Consulta para obtener todas las compras con información del proveedor
      const compras = await query(`
        SELECT c.*, p.NombreEmpresa as nombreEmpresa, p.Documento as documento
        FROM Compras c
        LEFT JOIN Proveedores p ON c.IdProveedor = p.IdProveedor
        ORDER BY c.FechaCompra DESC
      `)

      // Formatear los datos para la API
      return compras.map((compra) => ({
        ...compra,
        proveedor: {
          IdProveedor: compra.IdProveedor,
          nombreEmpresa: compra.nombreEmpresa,
          documento: compra.documento,
        },
      }))
    } catch (error) {
      console.error("Error en comprasModel.getAll:", error)
      throw error
    }
  },

  // Obtener una compra por ID con sus detalles
  getById: async (id) => {
    try {
      // Obtener la compra
      const compras = await query(
        `
        SELECT c.*, p.NombreEmpresa as nombreEmpresa, p.Documento as documento, 
               p.Telefono as telefono, p.PersonaDeContacto as personaDeContacto
        FROM Compras c
        LEFT JOIN Proveedores p ON c.IdProveedor = p.IdProveedor
        WHERE c.IdCompra = ?
      `,
        [id],
      )

      if (compras.length === 0) return null

      // Formatear la compra
      const compra = {
        ...compras[0],
        proveedor: {
          IdProveedor: compras[0].IdProveedor,
          nombreEmpresa: compras[0].nombreEmpresa,
          documento: compras[0].documento,
          telefono: compras[0].telefono,
          personaDeContacto: compras[0].personaDeContacto,
        },
      }

      // Obtener los detalles de la compra
      const detalles = await detalleComprasModel.getByCompraId(id)
      compra.detalles = detalles

      return compra
    } catch (error) {
      console.error(`Error en comprasModel.getById(${id}):`, error)
      throw error
    }
  },

  // Crear una nueva compra con sus detalles
  create: async (compraData) => {
    try {
      // Iniciar transacción
      await query("START TRANSACTION")

      // Insertar la compra
      const result = await query(
        `INSERT INTO Compras 
        (IdProveedor, FechaCompra, TotalMonto, TotalIva, TotalMontoConIva, Estado) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          compraData.compra.IdProveedor,
          compraData.compra.FechaCompra,
          compraData.compra.TotalMonto,
          compraData.compra.TotalIva,
          compraData.compra.TotalMontoConIva,
          compraData.compra.Estado || "Efectiva",
        ],
      )

      const compraId = result.insertId

      // Insertar los detalles de la compra
      for (const detalle of compraData.detalles) {
        await detalleComprasModel.create(compraId, detalle)
      }

      // Confirmar transacción
      await query("COMMIT")

      // Obtener la compra recién creada con sus detalles
      const newCompra = await comprasModel.getById(compraId)
      return newCompra
    } catch (error) {
      // Revertir transacción en caso de error
      await query("ROLLBACK")
      console.error("Error en comprasModel.create:", error)
      throw error
    }
  },

  // Actualizar una compra y sus detalles
  update: async (id, compraData) => {
    try {
      // Iniciar transacción
      await query("START TRANSACTION")

      // Actualizar la compra
      await query(
        `UPDATE Compras SET 
        IdProveedor = ?, 
        FechaCompra = ?, 
        TotalMonto = ?, 
        TotalIva = ?, 
        TotalMontoConIva = ?, 
        Estado = ?
        WHERE IdCompra = ?`,
        [
          compraData.IdProveedor,
          compraData.FechaCompra,
          compraData.TotalMonto,
          compraData.TotalIva,
          compraData.TotalMontoConIva,
          compraData.Estado || "Efectiva",
          id,
        ],
      )

      // Eliminar los detalles existentes
      await detalleComprasModel.deleteByCompraId(id)

      // Insertar los nuevos detalles
      for (const detalle of compraData.detalles) {
        await detalleComprasModel.create(id, detalle)
      }

      // Confirmar transacción
      await query("COMMIT")

      // Obtener la compra actualizada con sus detalles
      const updatedCompra = await comprasModel.getById(id)
      return updatedCompra
    } catch (error) {
      // Revertir transacción en caso de error
      await query("ROLLBACK")
      console.error(`Error en comprasModel.update(${id}):`, error)
      throw error
    }
  },

  // Cambiar el estado de una compra
  updateStatus: async (id, estado) => {
    try {
      await query(`UPDATE Compras SET Estado = ? WHERE IdCompra = ?`, [estado, id])

      // Obtener la compra actualizada
      const updatedCompra = await comprasModel.getById(id)
      return updatedCompra
    } catch (error) {
      console.error(`Error en comprasModel.updateStatus(${id}, ${estado}):`, error)
      throw error
    }
  },

  // Eliminar una compra y sus detalles
  delete: async (id) => {
    try {
      // Iniciar transacción
      await query("START TRANSACTION")

      // Eliminar los detalles
      await detalleComprasModel.deleteByCompraId(id)

      // Eliminar la compra
      await query(`DELETE FROM Compras WHERE IdCompra = ?`, [id])

      // Confirmar transacción
      await query("COMMIT")

      return { id, deleted: true }
    } catch (error) {
      // Revertir transacción en caso de error
      await query("ROLLBACK")
      console.error(`Error en comprasModel.delete(${id}):`, error)
      throw error
    }
  },

  // Buscar compras
  search: async (term) => {
    try {
      const compras = await query(
        `SELECT c.*, p.NombreEmpresa as nombreEmpresa, p.Documento as documento
        FROM Compras c
        LEFT JOIN Proveedores p ON c.IdProveedor = p.IdProveedor
        WHERE p.NombreEmpresa LIKE ? OR p.Documento LIKE ? OR c.Estado LIKE ?
        ORDER BY c.FechaCompra DESC`,
        [`%${term}%`, `%${term}%`, `%${term}%`],
      )

      // Formatear los datos para la API
      return compras.map((compra) => ({
        ...compra,
        proveedor: {
          IdProveedor: compra.IdProveedor,
          nombreEmpresa: compra.nombreEmpresa,
          documento: compra.documento,
        },
      }))
    } catch (error) {
      console.error(`Error en comprasModel.search(${term}):`, error)
      throw error
    }
  },

  // Añadir esta función
  getByProveedor: async (idProveedor) => {
    try {
      const compras = await query(
        `
        SELECT c.*, p.NombreEmpresa as nombreEmpresa, p.Documento as documento
        FROM Compras c
        LEFT JOIN Proveedores p ON c.IdProveedor = p.IdProveedor
        WHERE c.IdProveedor = ?
        ORDER BY c.FechaCompra DESC
      `,
        [idProveedor],
      )

      // Formatear los datos para la API
      return compras.map((compra) => ({
        ...compra,
        proveedor: {
          IdProveedor: compra.IdProveedor,
          nombreEmpresa: compra.nombreEmpresa,
          documento: compra.documento,
        },
      }))
    } catch (error) {
      console.error(`Error en comprasModel.getByProveedor(${idProveedor}):`, error)
      throw error
    }
  },
}

// Modelo para detalles de compras
export const detalleComprasModel = {
  // Obtener todos los detalles de una compra
  getByCompraId: async (compraId) => {
    try {
      const detalles = await query(
        `
        SELECT dc.*, p.NombreProducto as nombre, p.CodigoBarras as codigoBarras
        FROM DetalleCompras dc
        LEFT JOIN Productos p ON dc.IdProducto = p.IdProducto
        WHERE dc.IdCompra = ?
      `,
        [compraId],
      )

      return detalles
    } catch (error) {
      console.error(`Error en detalleComprasModel.getByCompraId(${compraId}):`, error)
      throw error
    }
  },

  // Crear un nuevo detalle de compra
create: async (compraId, detalleData) => {
  try {
    const result = await query(
      `INSERT INTO DetalleCompras 
      (IdCompra, IdProducto, Cantidad, PrecioUnitario, Subtotal, IvaUnitario, SubtotalConIva, UnidadMedida, FactorConversion, CantidadConvertida, PrecioVentaSugerido) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        compraId,
        detalleData.IdProducto,
        detalleData.Cantidad,
        detalleData.PrecioUnitario,
        detalleData.Subtotal,
        detalleData.IvaUnitario || 0,
        detalleData.SubtotalConIva || detalleData.Subtotal,
        detalleData.UnidadMedida || 'Unidad',
        detalleData.FactorConversion || 1,
        detalleData.CantidadConvertida || detalleData.Cantidad,
        detalleData.PrecioVentaSugerido || 0
      ],
    )

    return { id: result.insertId, ...detalleData }
  } catch (error) {
    console.error(`Error en detalleComprasModel.create(${compraId}):`, error)
    throw error
  }
},

  // Eliminar todos los detalles de una compra
  deleteByCompraId: async (compraId) => {
    try {
      await query(`DELETE FROM DetalleCompras WHERE IdCompra = ?`, [compraId])
      return { compraId, deleted: true }
    } catch (error) {
      console.error(`Error en detalleComprasModel.deleteByCompraId(${compraId}):`, error)
      throw error
    }
  },
}

export default {
  proveedores: proveedoresModel,
  compras: comprasModel,
  detalleCompras: detalleComprasModel,
}
