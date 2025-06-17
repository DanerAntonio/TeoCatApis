import { query } from '../../Config/Database.js';

// Modelo para la tabla AgendamientoDeCitas
export const citasModel = {
  // Obtener todas las citas
  getAll: async () => {
    try {
      // Modificamos la consulta para incluir la suma de precios de los servicios
      const sql = `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha DESC`;
      
      const result = await query(sql);
      return result;
    } catch (error) {
      console.error('Error en la consulta SQL:', error);
      throw error;
    }
  },

  // Obtener una cita por ID
  getById: async (id) => {
    const citas = await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE c.IdCita = ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza`,
      [id]
    );
    return citas[0];
  },

  // Crear una nueva cita
  create: async (citaData) => {
    // No necesitamos validar que la fecha sea futura, el trigger lo hace
    const result = await query(
      `INSERT INTO AgendamientoDeCitas 
      (IdCliente, IdMascota, Fecha, NotasAdicionales) 
      VALUES (?, ?, ?, ?)`,
      [
        citaData.IdCliente,
        citaData.IdMascota,
        citaData.Fecha,
        citaData.NotasAdicionales || null
      ]
    );
    
    // El trigger establece el estado como "Programada" por defecto
    return { id: result.insertId, ...citaData, Estado: 'Programada' };
  },

  // Actualizar una cita
  update: async (id, citaData) => {
    let query_str = `UPDATE AgendamientoDeCitas SET `;
    const params = [];
    
    // Construir la consulta dinámicamente
    if (citaData.IdCliente) {
      query_str += `IdCliente = ?, `;
      params.push(citaData.IdCliente);
    }
    if (citaData.IdMascota) {
      query_str += `IdMascota = ?, `;
      params.push(citaData.IdMascota);
    }
    if (citaData.Fecha) {
      query_str += `Fecha = ?, `;
      params.push(citaData.Fecha);
    }
    if (citaData.NotasAdicionales !== undefined) {
      query_str += `NotasAdicionales = ?, `;
      params.push(citaData.NotasAdicionales);
    }
    if (citaData.Estado) {
      // Validar que el estado sea uno de los permitidos en la BD
      const estadosValidos = ['Programada', 'Completada', 'Cancelada'];
      if (!estadosValidos.includes(citaData.Estado)) {
        throw new Error(`Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`);
      }
      query_str += `Estado = ?, `;
      params.push(citaData.Estado);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdCita = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...citaData };
  },

  // Cambiar el estado de una cita
  changeStatus: async (id, estado) => {
    // Validar que el estado sea uno de los permitidos en la BD
    const estadosValidos = ['Programada', 'Completada', 'Cancelada'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`);
    }
    
    await query(
      `UPDATE AgendamientoDeCitas SET Estado = ? WHERE IdCita = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Eliminar una cita
  delete: async (id) => {
    await query(
      `DELETE FROM AgendamientoDeCitas WHERE IdCita = ?`,
      [id]
    );
    return { id };
  },

  // Obtener citas por cliente
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE c.IdCliente = ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha DESC`,
      [idCliente]
    );
  },

  // Obtener citas por mascota
  getByMascota: async (idMascota) => {
    return await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE c.IdMascota = ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha DESC`,
      [idMascota]
    );
  },

  // Obtener citas por fecha
  getByFecha: async (fecha) => {
    return await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE DATE(c.Fecha) = ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha ASC`,
      [fecha]
    );
  },

  // Obtener citas por rango de fechas
  getByRangoFechas: async (fechaInicio, fechaFin) => {
    return await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE DATE(c.Fecha) BETWEEN ? AND ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha ASC`,
      [fechaInicio, fechaFin]
    );
  },

  // Obtener citas por estado
  getByEstado: async (estado) => {
    return await query(
      `SELECT c.*, 
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, e.NombreEspecie AS Especie, m.Raza,
      COALESCE(SUM(s.Precio), 0) AS PrecioTotal
      FROM AgendamientoDeCitas c
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
      LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE c.Estado = ?
      GROUP BY c.IdCita, c.Fecha, c.Estado, c.IdCliente, c.IdMascota, c.NotasAdicionales,
      cl.Nombre, cl.Apellido, m.Nombre, e.NombreEspecie, m.Raza
      ORDER BY c.Fecha ASC`,
      [estado]
    );
  },

  // MEJORADO: Verificar disponibilidad de horario considerando la duración real de los servicios
  checkDisponibilidad: async (fecha, hora, duracion) => {
    // Crear un objeto de fecha completo combinando fecha y hora
    const fechaHora = `${fecha} ${hora}:00`;
    
    // Calcular la fecha de fin sumando la duración en minutos
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000);
    
    // Formatear las fechas para la consulta
    const fechaInicioStr = fechaInicio.toISOString().slice(0, 19).replace('T', ' ');
    const fechaFinStr = fechaFin.toISOString().slice(0, 19).replace('T', ' ');
    
    // Obtener todas las citas para ese día con sus servicios
    const citas = await query(
      `SELECT c.IdCita, c.Fecha, c.Estado, 
       COALESCE(SUM(s.Duracion), 60) as DuracionTotal
       FROM AgendamientoDeCitas c
       LEFT JOIN Cita_Servicio cs ON c.IdCita = cs.IdCita
       LEFT JOIN Servicios s ON cs.IdServicio = s.IdServicio
       WHERE DATE(c.Fecha) = DATE(?) AND c.Estado != 'Cancelada'
       GROUP BY c.IdCita, c.Fecha, c.Estado`,
      [fechaHora]
    );
    
    // Verificar si hay conflictos
    for (const cita of citas) {
      const citaInicio = new Date(cita.Fecha);
      // Usar la duración real de los servicios o 60 minutos por defecto
      const citaFin = new Date(citaInicio.getTime() + (cita.DuracionTotal || 60) * 60000);
      
      // Verificar si hay solapamiento
      if ((fechaInicio >= citaInicio && fechaInicio < citaFin) || 
          (fechaFin > citaInicio && fechaFin <= citaFin) ||
          (fechaInicio <= citaInicio && fechaFin >= citaFin)) {
        return false; // Hay conflicto
      }
    }
    
    return true; // No hay conflicto y está dentro del horario de atención
  }
};

// Modelo para la tabla Cita_Servicio
export const citaServicioModel = {
  // Obtener todos los servicios de una cita
  getByCita: async (idCita) => {
    return await query(
      `SELECT cs.*, s.Nombre AS NombreServicio, s.Descripcion, s.Precio, s.Duracion
      FROM Cita_Servicio cs
      JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE cs.IdCita = ?`,
      [idCita]
    );
  },

  // Obtener todas las citas de un servicio
  getByServicio: async (idServicio) => {
    return await query(
      `SELECT cs.*, c.Fecha, c.Estado,
      cl.Nombre AS NombreCliente, cl.Apellido AS ApellidoCliente,
      m.Nombre AS NombreMascota, s.Precio
      FROM Cita_Servicio cs
      JOIN AgendamientoDeCitas c ON cs.IdCita = c.IdCita
      JOIN Clientes cl ON c.IdCliente = cl.IdCliente
      JOIN Mascotas m ON c.IdMascota = m.IdMascota
      JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE cs.IdServicio = ?
      ORDER BY c.Fecha DESC`,
      [idServicio]
    );
  },

  // Obtener un registro específico
  getById: async (idCita, idServicio) => {
    const registros = await query(
      `SELECT cs.*, s.Nombre AS NombreServicio, s.Descripcion, s.Precio, s.Duracion
      FROM Cita_Servicio cs
      JOIN Servicios s ON cs.IdServicio = s.IdServicio
      WHERE cs.IdCita = ? AND cs.IdServicio = ?`,
      [idCita, idServicio]
    );
    return registros[0];
  },

  // Crear un nuevo registro
  create: async (citaServicioData) => {
    await query(
      `INSERT INTO Cita_Servicio (IdCita, IdServicio)
      VALUES (?, ?)`,
      [
        citaServicioData.IdCita,
        citaServicioData.IdServicio
      ]
    );
    return {
      IdCita: citaServicioData.IdCita,
      IdServicio: citaServicioData.IdServicio
    };
  },

  // AGREGADO: Actualizar un registro
  update: async (idCita, idServicio, data) => {
    // En la tabla Cita_Servicio no hay campos adicionales para actualizar
    // Esta función se mantiene por consistencia con la API
    return {
      IdCita: idCita,
      IdServicio: idServicio
    };
  },

  // Eliminar un registro
  delete: async (idCita, idServicio) => {
    await query(
      `DELETE FROM Cita_Servicio WHERE IdCita = ? AND IdServicio = ?`,
      [idCita, idServicio]
    );
    return { IdCita: idCita, IdServicio: idServicio };
  },

  // Eliminar todos los servicios de una cita
  deleteByCita: async (idCita) => {
    await query(
      `DELETE FROM Cita_Servicio WHERE IdCita = ?`,
      [idCita]
    );
    return { IdCita: idCita };
  }
};

export default {
  citas: citasModel,
  citaServicio: citaServicioModel
};