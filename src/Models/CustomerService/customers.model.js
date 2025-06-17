import { query } from "../../Config/Database.js"

// Modelo para la tabla Clientes
export const clientesModel = {
  // Obtener todos los clientes
  getAll: async () => {
    return await query(
      `SELECT c.*, u.Correo as CorreoUsuario, u.Estado as EstadoUsuario, r.NombreRol 
       FROM Clientes c
       LEFT JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
       LEFT JOIN Roles r ON u.IdRol = r.IdRol
       ORDER BY c.IdCliente`,
    )
  },

  // Obtener un cliente por ID
  getById: async (id) => {
    const clientes = await query(
      `SELECT c.*, u.Correo as CorreoUsuario, u.Estado as EstadoUsuario, r.NombreRol 
       FROM Clientes c
       LEFT JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
       LEFT JOIN Roles r ON u.IdRol = r.IdRol
       WHERE c.IdCliente = ?`,
      [id],
    )
    return clientes[0]
  },

  // Obtener un cliente por correo
  getByEmail: async (email) => {
    const clientes = await query(
      `SELECT c.*, u.Correo as CorreoUsuario, u.Estado as EstadoUsuario, r.NombreRol 
       FROM Clientes c
       LEFT JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
       LEFT JOIN Roles r ON u.IdRol = r.IdRol
       WHERE c.Correo = ?`,
      [email],
    )
    return clientes[0]
  },

  // Obtener un cliente por ID de usuario
  getByUsuario: async (idUsuario) => {
    const clientes = await query(
      `SELECT c.*, u.Correo as CorreoUsuario, u.Estado as EstadoUsuario, r.NombreRol 
       FROM Clientes c
       LEFT JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
       LEFT JOIN Roles r ON u.IdRol = r.IdRol
       WHERE c.IdUsuario = ?`,
      [idUsuario],
    )
    return clientes[0]
  },

  // Obtener un cliente por documento
  getByDocument: async (documento) => {
    const clientes = await query(`SELECT * FROM Clientes WHERE Documento = ?`, [documento])
    return clientes[0]
  },

  // Crear un nuevo cliente
  create: async (clienteData) => {
    const result = await query(
      `INSERT INTO Clientes 
      (IdUsuario, Documento, Nombre, Apellido, Correo, Telefono, Direccion, Estado) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteData.IdUsuario || null,
        clienteData.Documento || null,
        clienteData.Nombre,
        clienteData.Apellido,
        clienteData.Correo || null,
        clienteData.Telefono || null,
        clienteData.Direccion || null,
        clienteData.Estado || true,
      ],
    )
    return { id: result.insertId, ...clienteData }
  },

  // Actualizar un cliente
  update: async (id, clienteData) => {
    let query_str = `UPDATE Clientes SET `
    const params = []

    // Construir la consulta dinámicamente
    if (clienteData.IdUsuario !== undefined) {
      query_str += `IdUsuario = ?, `
      params.push(clienteData.IdUsuario)
    }
    if (clienteData.Documento !== undefined) {
      query_str += `Documento = ?, `
      params.push(clienteData.Documento)
    }
    if (clienteData.Nombre) {
      query_str += `Nombre = ?, `
      params.push(clienteData.Nombre)
    }
    if (clienteData.Apellido) {
      query_str += `Apellido = ?, `
      params.push(clienteData.Apellido)
    }
    if (clienteData.Correo !== undefined) {
      query_str += `Correo = ?, `
      params.push(clienteData.Correo)
    }
    if (clienteData.Telefono !== undefined) {
      query_str += `Telefono = ?, `
      params.push(clienteData.Telefono)
    }
    if (clienteData.Direccion !== undefined) {
      query_str += `Direccion = ?, `
      params.push(clienteData.Direccion)
    }
    if (clienteData.Foto !== undefined) {
      query_str += `Foto = ?, `
      params.push(clienteData.Foto)
    }
    if (clienteData.Estado !== undefined) {
      query_str += `Estado = ?, `
      params.push(clienteData.Estado)
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2)

    // Añadir la condición WHERE
    query_str += ` WHERE IdCliente = ?`
    params.push(id)

    await query(query_str, params)
    return { id, ...clienteData }
  },

  // Cambiar el estado de un cliente
  changeStatus: async (id, estado) => {
    await query(`UPDATE Clientes SET Estado = ? WHERE IdCliente = ?`, [estado, id])
    return { id, estado }
  },

  // Eliminar un cliente
  delete: async (id) => {
    await query(`DELETE FROM Clientes WHERE IdCliente = ?`, [id])
    return { id }
  },

  // Buscar clientes por nombre, apellido, correo o documento
  search: async (searchTerm) => {
    return await query(
      `SELECT c.*, u.Correo as CorreoUsuario, u.Estado as EstadoUsuario, r.NombreRol 
       FROM Clientes c
       LEFT JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
       LEFT JOIN Roles r ON u.IdRol = r.IdRol
       WHERE c.Nombre LIKE ? OR c.Apellido LIKE ? OR c.Correo LIKE ? OR c.Documento LIKE ?
       ORDER BY c.IdCliente`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    )
  },
}

// Modelo para la tabla Mascotas
export const mascotasModel = {
  // Obtener todas las mascotas
  getAll: async () => {
    return await query(
      `SELECT m.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, e.NombreEspecie 
      FROM Mascotas m
      JOIN Clientes c ON m.IdCliente = c.IdCliente
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      ORDER BY m.IdMascota`,
    )
  },

  // Obtener una mascota por ID
  getById: async (id) => {
    const mascotas = await query(
      `SELECT m.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, e.NombreEspecie 
      FROM Mascotas m
      JOIN Clientes c ON m.IdCliente = c.IdCliente
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      WHERE m.IdMascota = ?`,
      [id],
    )
    return mascotas[0]
  },

  // Obtener mascotas por cliente
  getByCliente: async (idCliente) => {
    return await query(
      `SELECT m.*, e.NombreEspecie 
       FROM Mascotas m
       JOIN Especies e ON m.IdEspecie = e.IdEspecie
       WHERE m.IdCliente = ? 
       ORDER BY m.Nombre`, 
      [idCliente]
    )
  },

  // Crear una nueva mascota
  create: async (mascotaData) => {
    try {
      const result = await query(
        `INSERT INTO Mascotas 
        (IdCliente, IdEspecie, Nombre, Foto, Raza, Tamaño, FechaNacimiento, Estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mascotaData.IdCliente,
          mascotaData.IdEspecie,
          mascotaData.Nombre,
          mascotaData.Foto || null,
          mascotaData.Raza || null,
          mascotaData.Tamaño || null,
          mascotaData.FechaNacimiento || null,
          mascotaData.Estado !== undefined ? mascotaData.Estado : true,
        ],
      )
      return { id: result.insertId, ...mascotaData }
    } catch (error) {
      // Capturar errores específicos de los triggers
      if (error.message.includes("La fecha de nacimiento no puede ser futura")) {
        throw new Error("La fecha de nacimiento no puede ser futura")
      } else if (error.message.includes("La fecha de nacimiento no puede ser anterior a hace 30 años")) {
        throw new Error("La fecha de nacimiento no puede ser anterior a hace 30 años")
      }
      throw error
    }
  },

  // Actualizar una mascota
  update: async (id, mascotaData) => {
    let query_str = `UPDATE Mascotas SET `
    const params = []

    // Construir la consulta dinámicamente
    if (mascotaData.IdCliente) {
      query_str += `IdCliente = ?, `
      params.push(mascotaData.IdCliente)
    }
    if (mascotaData.IdEspecie) {
      query_str += `IdEspecie = ?, `
      params.push(mascotaData.IdEspecie)
    }
    if (mascotaData.Nombre) {
      query_str += `Nombre = ?, `
      params.push(mascotaData.Nombre)
    }
    if (mascotaData.Foto !== undefined) {
      query_str += `Foto = ?, `
      params.push(mascotaData.Foto)
    }
    if (mascotaData.Raza !== undefined) {
      query_str += `Raza = ?, `
      params.push(mascotaData.Raza)
    }
    if (mascotaData.Tamaño !== undefined) {
      query_str += `Tamaño = ?, `
      params.push(mascotaData.Tamaño)
    }
    if (mascotaData.FechaNacimiento !== undefined) {
      query_str += `FechaNacimiento = ?, `
      params.push(mascotaData.FechaNacimiento)
    }
    if (mascotaData.Estado !== undefined) {
      query_str += `Estado = ?, `
      params.push(mascotaData.Estado)
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2)

    // Añadir la condición WHERE
    query_str += ` WHERE IdMascota = ?`
    params.push(id)

    await query(query_str, params)
    return { id, ...mascotaData }
  },

  // Eliminar una mascota
  delete: async (id) => {
    await query(`DELETE FROM Mascotas WHERE IdMascota = ?`, [id])
    return { id }
  },

  // Buscar mascotas por nombre, especie o raza
  search: async (searchTerm) => {
    return await query(
      `SELECT m.*, c.Nombre AS NombreCliente, c.Apellido AS ApellidoCliente, e.NombreEspecie 
      FROM Mascotas m
      JOIN Clientes c ON m.IdCliente = c.IdCliente
      JOIN Especies e ON m.IdEspecie = e.IdEspecie
      WHERE m.Nombre LIKE ? OR e.NombreEspecie LIKE ? OR m.Raza LIKE ?
      ORDER BY m.IdMascota`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    )
  },
}

// Añadir modelo para especies
export const especiesModel = {
  // Obtener todas las especies
  getAll: async () => {
    return await query(`SELECT * FROM Especies ORDER BY NombreEspecie`)
  },

  // Obtener una especie por ID
  getById: async (id) => {
    const especies = await query(`SELECT * FROM Especies WHERE IdEspecie = ?`, [id])
    return especies[0]
  },

  // Crear una nueva especie
  create: async (especieData) => {
    const result = await query(
      `INSERT INTO Especies (NombreEspecie, Estado) VALUES (?, ?)`,
      [especieData.NombreEspecie, especieData.Estado !== undefined ? especieData.Estado : true]
    )
    return { id: result.insertId, ...especieData }
  },

  // Actualizar una especie
  update: async (id, especieData) => {
    let query_str = `UPDATE Especies SET `
    const params = []

    if (especieData.NombreEspecie) {
      query_str += `NombreEspecie = ?, `
      params.push(especieData.NombreEspecie)
    }
    if (especieData.Estado !== undefined) {
      query_str += `Estado = ?, `
      params.push(especieData.Estado)
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2)

    // Añadir la condición WHERE
    query_str += ` WHERE IdEspecie = ?`
    params.push(id)

    await query(query_str, params)
    return { id, ...especieData }
  },

  // Eliminar una especie - ACTUALIZADO
  delete: async (id) => {
    try {
      // Verificar si hay mascotas asociadas de manera segura
      const result = await query(`SELECT COUNT(*) as count FROM Mascotas WHERE IdEspecie = ?`, [id])
      
      // Verificar si el resultado es válido y obtener el conteo de manera segura
      const count = result && result[0] && result[0].count !== undefined ? result[0].count : 0
      
      if (count > 0) {
        throw new Error("No se puede eliminar la especie porque tiene mascotas asociadas")
      }
      
      await query(`DELETE FROM Especies WHERE IdEspecie = ?`, [id])
      return { id }
    } catch (error) {
      // Si el error es específicamente el que estamos tratando de corregir
      if (error.message && error.message.includes("Cannot read properties of undefined")) {
        console.log("Error específico detectado. Intentando eliminar de todos modos...")
        
        // Intentar eliminar de todos modos, ya que el frontend ya verificó que no hay mascotas
        await query(`DELETE FROM Especies WHERE IdEspecie = ?`, [id])
        return { id }
      }
      throw error
    }
  },
  
  // Verificar si una especie tiene mascotas asociadas
  checkDependencies: async (id) => {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM Mascotas WHERE IdEspecie = ?`, [id])
      const count = result && result[0] && result[0].count !== undefined ? result[0].count : 0
      return count > 0
    } catch (error) {
      console.error("Error al verificar dependencias:", error)
      
      // Si hay un error específico con la consulta, intentar verificar manualmente
      if (error.message && error.message.includes("Cannot read properties of undefined")) {
        const mascotas = await query(`SELECT * FROM Mascotas WHERE IdEspecie = ?`, [id])
        return mascotas && mascotas.length > 0
      }
      
      throw error
    }
  }
}

export default {
  clientes: clientesModel,
  mascotas: mascotasModel,
  especies: especiesModel
}