import { query, getConnection } from '../../Config/Database.js';

// Modelo para la tabla Tipo_Servicio
export const tipoServicioModel = {
  // Obtener todos los tipos de servicio
  getAll: async () => {
    return await query(
      `SELECT * FROM Tipo_Servicio ORDER BY Nombre`
    );
  },

  // Obtener un tipo de servicio por ID
  getById: async (id) => {
    const tipos = await query(
      `SELECT * FROM Tipo_Servicio WHERE IdTipoServicio = ?`,
      [id]
    );
    return tipos[0];
  },

  // Obtener un tipo de servicio por nombre
  getByName: async (nombre) => {
    const tipos = await query(
      `SELECT * FROM Tipo_Servicio WHERE Nombre = ?`,
      [nombre]
    );
    return tipos[0];
  },

  // Crear un nuevo tipo de servicio
create: async (tipoData) => {
  const result = await query(
    `INSERT INTO Tipo_Servicio (Nombre, Estado) VALUES (?, ?)`,
    [tipoData.Nombre, tipoData.Estado || true]
  );
  return { id: result.insertId, ...tipoData };
},

  // Actualizar un tipo de servicio
update: async (id, tipoData) => {
  let query_str = `UPDATE Tipo_Servicio SET `;
  const params = [];
  
  // Construir la consulta dinámicamente
  if (tipoData.Nombre) {
    query_str += `Nombre = ?, `;
    params.push(tipoData.Nombre);
  }
  if (tipoData.Estado !== undefined) {
    query_str += `Estado = ?, `;
    params.push(tipoData.Estado);
  }

  // Eliminar la última coma y espacio
  query_str = query_str.slice(0, -2);
  
  // Añadir la condición WHERE
  query_str += ` WHERE IdTipoServicio = ?`;
  params.push(id);

  await query(query_str, params);
  return { id, ...tipoData };
},

  // Cambiar el estado de un tipo de servicio
  changeStatus: async (id, estado) => {
    await query(
      `UPDATE Tipo_Servicio SET Estado = ? WHERE IdTipoServicio = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Eliminar un tipo de servicio
  delete: async (id) => {
    await query(
      `DELETE FROM Tipo_Servicio WHERE IdTipoServicio = ?`,
      [id]
    );
    return { id };
  },

  // Obtener servicios de un tipo
  getServices: async (id) => {
    return await query(
      `SELECT * FROM Servicios WHERE IdTipoServicio = ? ORDER BY Nombre`,
      [id]
    );
  }
};

// Modelo para la tabla Servicios (actualizado)
export const serviciosModel = {
  // Obtener todos los servicios
  getAll: async (page = 1, limit = 10) => {
    try {
      // Convertir page y limit a números enteros
      const pageNum = Number.parseInt(page, 10)
      const limitNum = Number.parseInt(limit, 10)

      // Obtener todos los servicios sin paginación
      const servicios = await query(
        `SELECT s.*, t.Nombre AS NombreTipoServicio 
        FROM Servicios s
        JOIN Tipo_Servicio t ON s.IdTipoServicio = t.IdTipoServicio
        ORDER BY s.Nombre`,
      )

      return servicios
    } catch (error) {
      console.error("Error en serviciosModel.getAll:", error)
      throw error
    }
  },

  // Obtener un servicio por ID
  getById: async (id) => {
    const servicios = await query(
      `SELECT s.*, t.Nombre AS NombreTipoServicio 
      FROM Servicios s
      JOIN Tipo_Servicio t ON s.IdTipoServicio = t.IdTipoServicio
      WHERE s.IdServicio = ?`,
      [id],
    )
    return servicios[0]
  },

  // Crear un nuevo servicio (actualizado)
  create: async (servicioData) => {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      
      // Actualizado para eliminar el campo Beneficios
      const [result] = await connection.query(
        `INSERT INTO Servicios 
        (IdTipoServicio, Nombre, Foto, Descripcion, Que_incluye, Precio, Duracion, Estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          servicioData.IdTipoServicio,
          servicioData.Nombre,
          servicioData.Foto || null,
          servicioData.Descripcion || null,
          servicioData.Que_incluye || '',
          servicioData.Precio,
          servicioData.Duracion,
          servicioData.Estado || true
        ]
      );
      
      await connection.commit();
      return { id: result.insertId, ...servicioData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Actualizar un servicio (actualizado)
  update: async (id, servicioData) => {
    let query_str = `UPDATE Servicios SET `;
    const params = [];
    
    // Construir la consulta dinámicamente (eliminado Beneficios)
    if (servicioData.IdTipoServicio) {
      query_str += `IdTipoServicio = ?, `;
      params.push(servicioData.IdTipoServicio);
    }
    if (servicioData.Nombre) {
      query_str += `Nombre = ?, `;
      params.push(servicioData.Nombre);
    }
    if (servicioData.Foto !== undefined) {
      query_str += `Foto = ?, `;
      params.push(servicioData.Foto);
    }
    if (servicioData.Descripcion !== undefined) {
      query_str += `Descripcion = ?, `;
      params.push(servicioData.Descripcion);
    }
    if (servicioData.Que_incluye !== undefined) {
      query_str += `Que_incluye = ?, `;
      params.push(servicioData.Que_incluye);
    }
    if (servicioData.Precio !== undefined) {
      query_str += `Precio = ?, `;
      params.push(servicioData.Precio);
    }
    if (servicioData.Duracion !== undefined) {
      query_str += `Duracion = ?, `;
      params.push(servicioData.Duracion);
    }
    if (servicioData.Estado !== undefined) {
      query_str += `Estado = ?, `;
      params.push(servicioData.Estado);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdServicio = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...servicioData };
  },

  // Cambiar el estado de un servicio - CORREGIDO
  changeStatus: async (id, estado) => {
    try {
      await query(`UPDATE Servicios SET Estado = ? WHERE IdServicio = ?`, [estado, id])
      return { id, estado }
    } catch (error) {
      console.error("Error en serviciosModel.changeStatus:", error)
      throw error
    }
  },

  // Eliminar un servicio
  delete: async (id) => {
    await query(`DELETE FROM Servicios WHERE IdServicio = ?`, [id])
    return { id }
  },

  // Buscar servicios por nombre o descripción - CORREGIDO
  search: async (searchTerm, page = 1, limit = 10) => {
    try {
      // Convertir page y limit a números enteros
      const pageNum = Number.parseInt(page, 10)
      const limitNum = Number.parseInt(limit, 10)

      const servicios = await query(
        `SELECT s.*, t.Nombre AS NombreTipoServicio 
        FROM Servicios s
        JOIN Tipo_Servicio t ON s.IdTipoServicio = t.IdTipoServicio
        WHERE s.Nombre LIKE ? OR s.Descripcion LIKE ?
        ORDER BY s.Nombre`,
        [`%${searchTerm}%`, `%${searchTerm}%`],
      )

      return servicios
    } catch (error) {
      console.error("Error en serviciosModel.search:", error)
      throw error
    }
  },
}

export default {
  tipoServicio: tipoServicioModel,
  servicios: serviciosModel,
}