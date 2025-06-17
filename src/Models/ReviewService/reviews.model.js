import { query } from '../../Config/Database.js';
import { getConnection } from '../../Config/Database.js';



// Modelo para la tabla ReseñasProductos
export const reseñasProductosModel = {
  // Obtener todas las reseñas de productos
  getAll: async () => {
    return await query(
      `SELECT 
        rp.IdReseñaProducto, 
        rp.IdCliente, 
        rp.IdProducto, 
        rp.Calificacion, 
        rp.Comentario, 
        rp.Foto, 
        rp.FechaCreacion, 
        rp.Estado, 
        rp.MotivoEliminacion, 
        rp.Aprobado,
        p.NombreProducto, 
        c.Nombre AS NombreCliente, 
        c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      ORDER BY rp.FechaCreacion DESC`
    );
  },

  // Obtener una reseña de producto por ID
  getById: async (id) => {
    const reseñas = await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.IdReseñaProducto = ?`,
      [id]
    );
    return reseñas[0];
  },

  // Crear una nueva reseña de producto
  create: async (reseñaData) => {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        `INSERT INTO ReseñasProductos 
        (IdProducto, IdCliente, Calificacion, Comentario, Foto, Estado, Aprobado, FechaCreacion) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reseñaData.IdProducto,
          reseñaData.IdCliente,
          reseñaData.Calificacion,
          reseñaData.Comentario || '',
          reseñaData.Foto || null,
          reseñaData.Estado !== undefined ? reseñaData.Estado : true,
          reseñaData.Aprobado !== undefined ? reseñaData.Aprobado : false,
          reseñaData.FechaCreacion || new Date()
        ]
      );
      
      await connection.commit();
      return { id: result.insertId, ...reseñaData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Actualizar una reseña de producto
  update: async (id, reseñaData) => {
    let query_str = `UPDATE ReseñasProductos SET `;
    const params = [];
    
    // Construir la consulta dinámicamente
    if (reseñaData.IdProducto) {
      query_str += `IdProducto = ?, `;
      params.push(reseñaData.IdProducto);
    }
    if (reseñaData.IdCliente) {
      query_str += `IdCliente = ?, `;
      params.push(reseñaData.IdCliente);
    }
    if (reseñaData.Calificacion !== undefined) {
      query_str += `Calificacion = ?, `;
      params.push(reseñaData.Calificacion);
    }
    if (reseñaData.Comentario !== undefined) {
      query_str += `Comentario = ?, `;
      params.push(reseñaData.Comentario);
    }
    if (reseñaData.Foto !== undefined) {
      query_str += `Foto = ?, `;
      params.push(reseñaData.Foto);
    }
    if (reseñaData.Estado !== undefined) {
      query_str += `Estado = ?, `;
      params.push(reseñaData.Estado);
    }
    if (reseñaData.Aprobado !== undefined) {
      query_str += `Aprobado = ?, `;
      params.push(reseñaData.Aprobado);
    }
    if (reseñaData.MotivoEliminacion !== undefined) {
      query_str += `MotivoEliminacion = ?, `;
      params.push(reseñaData.MotivoEliminacion);
    }
    if (reseñaData.FechaCreacion) {
      query_str += `FechaCreacion = ?, `;
      params.push(reseñaData.FechaCreacion);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdReseñaProducto = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...reseñaData };
  },

  // Cambiar el estado de una reseña de producto
  changeStatus: async (id, estado) => {
    await query(
      `UPDATE ReseñasProductos SET Estado = ? WHERE IdReseñaProducto = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Cambiar el estado de aprobación de una reseña de producto
  changeApproval: async (id, aprobado, motivoEliminacion = null) => {
    await query(
      `UPDATE ReseñasProductos SET Aprobado = ?, MotivoEliminacion = ? WHERE IdReseñaProducto = ?`,
      [aprobado, motivoEliminacion, id]
    );
    return { id, aprobado, motivoEliminacion };
  },

  // Eliminar una reseña de producto
  delete: async (id) => {
    await query(
      `DELETE FROM ReseñasProductos WHERE IdReseñaProducto = ?`,
      [id]
    );
    return { id };
  },

  // Obtener reseñas de producto por cliente
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.IdCliente = ?
      ORDER BY rp.FechaCreacion DESC`,
      [idCliente]
    );
  },

  // Obtener reseñas por producto
  getByProducto: async (idProducto) => {
    return await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.IdProducto = ?
      ORDER BY rp.FechaCreacion DESC`,
      [idProducto]
    );
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (calificacion) => {
    return await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.Calificacion = ?
      ORDER BY rp.FechaCreacion DESC`,
      [calificacion]
    );
  },

  // Obtener reseñas por estado
  getByEstado: async (estado) => {
    return await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.Estado = ?
      ORDER BY rp.FechaCreacion DESC`,
      [estado]
    );
  },

  // Obtener reseñas por estado de aprobación
  getByApproval: async (aprobado) => {
    return await query(
      `SELECT rp.*, p.NombreProducto AS NombreProducto, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.Aprobado = ?
      ORDER BY rp.FechaCreacion DESC`,
      [aprobado]
    );
  },

  // Obtener promedio de calificaciones por producto
  getPromedioByProducto: async (idProducto) => {
    const result = await query(
      `SELECT AVG(Calificacion) AS Promedio, COUNT(*) AS Total
      FROM ReseñasProductos
      WHERE IdProducto = ? AND Estado = TRUE AND Aprobado = TRUE`,
      [idProducto]
    );
    return result[0];
  },

  // Obtener solo reseñas de productos aprobadas y activas
  getAllAprobadas: async () => {
    return await query(
      `SELECT 
        rp.IdReseñaProducto, 
        rp.IdCliente, 
        rp.IdProducto, 
        rp.Calificacion, 
        rp.Comentario, 
        rp.Foto, 
        rp.FechaCreacion, 
        rp.Estado, 
        rp.MotivoEliminacion, 
        rp.Aprobado,
        p.NombreProducto, 
        c.Nombre AS NombreCliente, 
        c.Apellido AS ApellidoCliente
      FROM ReseñasProductos rp
      JOIN Productos p ON rp.IdProducto = p.IdProducto
      JOIN Clientes c ON rp.IdCliente = c.IdCliente
      WHERE rp.Aprobado = TRUE AND rp.Estado = TRUE
      ORDER BY rp.FechaCreacion DESC`
    );
  }
};

// Modelo para la tabla ReseñasServicios
export const reseñasServiciosModel = {
  // Obtener todas las reseñas de servicios
  getAll: async () => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      ORDER BY rs.FechaCreacion DESC`
    );
  },

  // Obtener una reseña de servicio por ID
  getById: async (id) => {
    const reseñas = await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.IdReseñaServicio = ?`,
      [id]
    );
    return reseñas[0];
  },

  // Crear una nueva reseña de servicio
  create: async (reseñaData) => {
    const result = await query(
      `INSERT INTO ReseñasServicios 
      (IdServicio, IdCliente, Calificacion, Comentario, Foto, Estado, Aprobado, FechaCreacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reseñaData.IdServicio,
        reseñaData.IdCliente,
        reseñaData.Calificacion,
        reseñaData.Comentario || '',
        reseñaData.Foto || null,
        reseñaData.Estado !== undefined ? reseñaData.Estado : true,
        reseñaData.Aprobado !== undefined ? reseñaData.Aprobado : false,
        reseñaData.FechaCreacion || new Date()
      ]
    );
    return { id: result.insertId, ...reseñaData };
  },

  // Actualizar una reseña de servicio
  update: async (id, reseñaData) => {
    let query_str = `UPDATE ReseñasServicios SET `;
    const params = [];
    
    // Construir la consulta dinámicamente
    if (reseñaData.IdServicio) {
      query_str += `IdServicio = ?, `;
      params.push(reseñaData.IdServicio);
    }
    if (reseñaData.IdCliente) {
      query_str += `IdCliente = ?, `;
      params.push(reseñaData.IdCliente);
    }
    if (reseñaData.Calificacion !== undefined) {
      query_str += `Calificacion = ?, `;
      params.push(reseñaData.Calificacion);
    }
    if (reseñaData.Comentario !== undefined) {
      query_str += `Comentario = ?, `;
      params.push(reseñaData.Comentario);
    }
    if (reseñaData.Foto !== undefined) {
      query_str += `Foto = ?, `;
      params.push(reseñaData.Foto);
    }
    if (reseñaData.Estado !== undefined) {
      query_str += `Estado = ?, `;
      params.push(reseñaData.Estado);
    }
    if (reseñaData.Aprobado !== undefined) {
      query_str += `Aprobado = ?, `;
      params.push(reseñaData.Aprobado);
    }
    if (reseñaData.MotivoEliminacion !== undefined) {
      query_str += `MotivoEliminacion = ?, `;
      params.push(reseñaData.MotivoEliminacion);
    }
    if (reseñaData.FechaCreacion) {
      query_str += `FechaCreacion = ?, `;
      params.push(reseñaData.FechaCreacion);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdReseñaServicio = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...reseñaData };
  },

  // Cambiar el estado de una reseña de servicio
  changeStatus: async (id, estado) => {
    await query(
      `UPDATE ReseñasServicios SET Estado = ? WHERE IdReseñaServicio = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Cambiar el estado de aprobación de una reseña de servicio
  changeApproval: async (id, aprobado, motivoEliminacion = null) => {
    await query(
      `UPDATE ReseñasServicios SET Aprobado = ?, MotivoEliminacion = ? WHERE IdReseñaServicio = ?`,
      [aprobado, motivoEliminacion, id]
    );
    return { id, aprobado, motivoEliminacion };
  },

  // Eliminar una reseña de servicio
  delete: async (id) => {
    await query(
      `DELETE FROM ReseñasServicios WHERE IdReseñaServicio = ?`,
      [id]
    );
    return { id };
  },

  // Obtener reseñas de servicio por cliente
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.IdCliente = ?
      ORDER BY rs.FechaCreacion DESC`,
      [idCliente]
    );
  },

  // Obtener reseñas por servicio
  getByServicio: async (idServicio) => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.IdServicio = ?
      ORDER BY rs.FechaCreacion DESC`,
      [idServicio]
    );
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (calificacion) => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.Calificacion = ?
      ORDER BY rs.FechaCreacion DESC`,
      [calificacion]
    );
  },

  // Obtener reseñas por estado
  getByEstado: async (estado) => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.Estado = ?
      ORDER BY rs.FechaCreacion DESC`,
      [estado]
    );
  },

  // Obtener reseñas por estado de aprobación
  getByApproval: async (aprobado) => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.Aprobado = ?
      ORDER BY rs.FechaCreacion DESC`,
      [aprobado]
    );
  },

  // Obtener promedio de calificaciones por servicio
  getPromedioByServicio: async (idServicio) => {
    const result = await query(
      `SELECT AVG(Calificacion) AS Promedio, COUNT(*) AS Total
      FROM ReseñasServicios
      WHERE IdServicio = ? AND Estado = TRUE AND Aprobado = TRUE`,
      [idServicio]
    );
    return result[0];
  },

  // Obtener solo reseñas de servicios aprobadas y activas
  getAllAprobadas: async () => {
    return await query(
      `SELECT rs.*, s.Nombre AS NombreServicio, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasServicios rs
      JOIN Servicios s ON rs.IdServicio = s.IdServicio
      JOIN Clientes c ON rs.IdCliente = c.IdCliente
      WHERE rs.Aprobado = TRUE AND rs.Estado = TRUE
      ORDER BY rs.FechaCreacion DESC`
    );
  }
};

// Modelo para la tabla ReseñasGenerales
export const reseñasGeneralesModel = {
  // Obtener todas las reseñas generales
  getAll: async () => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      ORDER BY rg.FechaCreacion DESC`
    );
  },

  // Obtener una reseña general por ID
  getById: async (id) => {
    const reseñas = await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.IdReseñaGeneral = ?`,
      [id]
    );
    return reseñas[0];
  },

  // Crear una nueva reseña general
  create: async (reseñaData) => {
    const result = await query(
      `INSERT INTO ReseñasGenerales 
      (IdCliente, Calificacion, Comentario, Foto, Estado, Aprobado, FechaCreacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reseñaData.IdCliente,
        reseñaData.Calificacion,
        reseñaData.Comentario || '',
        reseñaData.Foto || null,
        reseñaData.Estado !== undefined ? reseñaData.Estado : true,
        reseñaData.Aprobado !== undefined ? reseñaData.Aprobado : false,
        reseñaData.FechaCreacion || new Date()
      ]
    );
    return { id: result.insertId, ...reseñaData };
  },

  // Actualizar una reseña general
  update: async (id, reseñaData) => {
    let query_str = `UPDATE ReseñasGenerales SET `;
    const params = [];
    
    // Construir la consulta dinámicamente
    if (reseñaData.IdCliente) {
      query_str += `IdCliente = ?, `;
      params.push(reseñaData.IdCliente);
    }
    if (reseñaData.Calificacion !== undefined) {
      query_str += `Calificacion = ?, `;
      params.push(reseñaData.Calificacion);
    }
    if (reseñaData.Comentario !== undefined) {
      query_str += `Comentario = ?, `;
      params.push(reseñaData.Comentario);
    }
    if (reseñaData.Foto !== undefined) {
      query_str += `Foto = ?, `;
      params.push(reseñaData.Foto);
    }
    if (reseñaData.Estado !== undefined) {
      query_str += `Estado = ?, `;
      params.push(reseñaData.Estado);
    }
    if (reseñaData.Aprobado !== undefined) {
      query_str += `Aprobado = ?, `;
      params.push(reseñaData.Aprobado);
    }
    if (reseñaData.MotivoEliminacion !== undefined) {
      query_str += `MotivoEliminacion = ?, `;
      params.push(reseñaData.MotivoEliminacion);
    }
    if (reseñaData.FechaCreacion) {
      query_str += `FechaCreacion = ?, `;
      params.push(reseñaData.FechaCreacion);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdReseñaGeneral = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...reseñaData };
  },

  // Cambiar el estado de una reseña general
  changeStatus: async (id, estado) => {
    await query(
      `UPDATE ReseñasGenerales SET Estado = ? WHERE IdReseñaGeneral = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Cambiar el estado de aprobación de una reseña general
  changeApproval: async (id, aprobado, motivoEliminacion = null) => {
    await query(
      `UPDATE ReseñasGenerales SET Aprobado = ?, MotivoEliminacion = ? WHERE IdReseñaGeneral = ?`,
      [aprobado, motivoEliminacion, id]
    );
    return { id, aprobado, motivoEliminacion };
  },

  // Eliminar una reseña general
  delete: async (id) => {
    await query(
      `DELETE FROM ReseñasGenerales WHERE IdReseñaGeneral = ?`,
      [id]
    );
    return { id };
  },

  // Obtener reseñas generales por cliente
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.IdCliente = ?
      ORDER BY rg.FechaCreacion DESC`,
      [idCliente]
    );
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (calificacion) => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.Calificacion = ?
      ORDER BY rg.FechaCreacion DESC`,
      [calificacion]
    );
  },

  // Obtener reseñas por estado
  getByEstado: async (estado) => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.Estado = ?
      ORDER BY rg.FechaCreacion DESC`,
      [estado]
    );
  },

  // Obtener reseñas por estado de aprobación
  getByApproval: async (aprobado) => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.Aprobado = ?
      ORDER BY rg.FechaCreacion DESC`,
      [aprobado]
    );
  },

  // Obtener promedio general de calificaciones
  getPromedioGeneral: async () => {
    const result = await query(
      `SELECT AVG(Calificacion) AS Promedio, COUNT(*) AS Total
      FROM ReseñasGenerales
      WHERE Estado = TRUE AND Aprobado = TRUE`
    );
    return result[0];
  },

  // Obtener solo reseñas generales aprobadas y activas
  getAllAprobadas: async () => {
    return await query(
      `SELECT rg.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente
      FROM ReseñasGenerales rg
      JOIN Clientes c ON rg.IdCliente = c.IdCliente
      WHERE rg.Aprobado = TRUE AND rg.Estado = TRUE
      ORDER BY rg.FechaCreacion DESC`
    );
  }
};

export default {
  reseñasProductos: reseñasProductosModel,
  reseñasServicios: reseñasServiciosModel,
  reseñasGenerales: reseñasGeneralesModel
};