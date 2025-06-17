import { tipoServicioModel, serviciosModel } from '../../Models/ServiceManagement/service.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../Utils/Cloudinary.js';
import { query } from '../../Config/Database.js';


// Controlador para tipos de servicio
export const tipoServicioController = {
  // Obtener todos los tipos de servicio
  getAll: async (req, res) => {
    try {
      const tipos = await tipoServicioModel.getAll();
      res.status(200).json(tipos);
    } catch (error) {
      console.error('Error al obtener tipos de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener un tipo de servicio por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const tipo = await tipoServicioModel.getById(id);
      
      if (!tipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      res.status(200).json(tipo);
    } catch (error) {
      console.error('Error al obtener tipo de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear un nuevo tipo de servicio
  create: async (req, res) => {
    try {
      const tipoData = req.body;
      
      // Verificar si el nombre ya existe
      const existingName = await tipoServicioModel.getByName(tipoData.Nombre);
      if (existingName) {
        return res.status(400).json({ message: 'Ya existe un tipo de servicio con ese nombre' });
      }
      
      // Crear el tipo de servicio
      const newTipo = await tipoServicioModel.create(tipoData);
      
      res.status(201).json(newTipo);
    } catch (error) {
      console.error('Error al crear tipo de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar un tipo de servicio
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const tipoData = req.body;
      
      // Verificar si el tipo de servicio existe
      const existingTipo = await tipoServicioModel.getById(id);
      if (!existingTipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      // Si se está actualizando el nombre, verificar que no exista
      if (tipoData.Nombre && tipoData.Nombre !== existingTipo.Nombre) {
        const tipoWithName = await tipoServicioModel.getByName(tipoData.Nombre);
        if (tipoWithName) {
          return res.status(400).json({ message: 'Ya existe un tipo de servicio con ese nombre' });
        }
      }
      
      // Actualizar el tipo de servicio
      const updatedTipo = await tipoServicioModel.update(id, tipoData);
      
      res.status(200).json(updatedTipo);
    } catch (error) {
      console.error('Error al actualizar tipo de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de un tipo de servicio
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { Estado } = req.body;
      
      // Verificar si el tipo de servicio existe
      const existingTipo = await tipoServicioModel.getById(id);
      if (!existingTipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      // Cambiar el estado
      const result = await tipoServicioModel.changeStatus(id, Estado);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al cambiar estado de tipo de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Eliminar un tipo de servicio
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el tipo de servicio existe
      const existingTipo = await tipoServicioModel.getById(id);
      if (!existingTipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      // Verificar si hay servicios asociados
      const servicios = await tipoServicioModel.getServices(id);
      if (servicios.length > 0) {
        return res.status(400).json({ 
          message: 'No se puede eliminar el tipo de servicio porque tiene servicios asociados',
          servicios
        });
      }
      
      // Eliminar el tipo de servicio
      await tipoServicioModel.delete(id);
      
      res.status(200).json({ message: 'Tipo de servicio eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar tipo de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener servicios de un tipo
  getServices: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el tipo de servicio existe
      const existingTipo = await tipoServicioModel.getById(id);
      if (!existingTipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      // Obtener servicios
      const servicios = await tipoServicioModel.getServices(id);
      
      res.status(200).json(servicios);
    } catch (error) {
      console.error('Error al obtener servicios del tipo:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  }
};

// Controlador para servicios
export const serviciosController = {
  // Obtener todos los servicios - CORREGIDO
  getAll: async (req, res) => {
    try {
      // Obtener servicios sin paginación
      const servicios = await serviciosModel.getAll()
      res.status(200).json(servicios)
    } catch (error) {
      console.error("Error al obtener servicios:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un servicio por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const servicio = await serviciosModel.getById(id);
      
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      res.status(200).json(servicio);
    } catch (error) {
      console.error('Error al obtener servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear un nuevo servicio (actualizado)
  create: async (req, res) => {
    try {
      let servicioData = req.body;
      
      // Validar datos básicos
      if (!servicioData.Nombre || !servicioData.IdTipoServicio || !servicioData.Precio || !servicioData.Duracion) {
        return res.status(400).json({ 
          message: "Nombre, tipo de servicio, precio y duración son campos obligatorios" 
        });
      }
      
      // Verificar si el tipo de servicio existe
      const tipo = await tipoServicioModel.getById(servicioData.IdTipoServicio);
      if (!tipo) {
        return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
      }
      
      // Procesar la imagen si existe
      if (req.file) {
        const result = await uploadToCloudinary(req.file.path);
        servicioData.Foto = result.secure_url;
      }
      
      // Crear el servicio
      const newServicio = await serviciosModel.create(servicioData);
      
      res.status(201).json(newServicio);
    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar un servicio (actualizado)
  update: async (req, res) => {
    try {
      const { id } = req.params;
      let servicioData = req.body;
      
      // Verificar si el servicio existe
      const existingServicio = await serviciosModel.getById(id);
      if (!existingServicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Si se está actualizando el tipo de servicio, verificar que exista
      if (servicioData.IdTipoServicio) {
        const tipo = await tipoServicioModel.getById(servicioData.IdTipoServicio);
        if (!tipo) {
          return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
        }
      }
      
      // Procesar la imagen si existe
      if (req.file) {
        // Eliminar imagen anterior si existe
        if (existingServicio.Foto) {
          try {
            const publicId = existingServicio.Foto.split('/').pop().split('.')[0];
            await deleteFromCloudinary(publicId);
          } catch (error) {
            console.error('Error al eliminar imagen anterior:', error);
          }
        }
        
        const result = await uploadToCloudinary(req.file.path);
        servicioData.Foto = result.secure_url;
      }
      
      // Actualizar el servicio
      const updatedServicio = await serviciosModel.update(id, servicioData);
      
      res.status(200).json(updatedServicio);
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de un servicio - CORREGIDO
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params
      const { Estado } = req.body

      // Verificar si el servicio existe
      const existingServicio = await serviciosModel.getById(id)
      if (!existingServicio) {
        return res.status(404).json({ message: "Servicio no encontrado" })
      }

      // Cambiar el estado
      const result = await serviciosModel.changeStatus(id, Estado)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al cambiar estado de servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un servicio - CORREGIDO
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(id)
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" })
      }

      // Verificar si hay citas o ventas asociadas usando query directly
      // en lugar de getConnection
      const citas = await query(`SELECT * FROM Cita_Servicio WHERE IdServicio = ?`, [id])
      if (citas.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar el servicio porque tiene citas asociadas",
          citas: citas.length,
        })
      }

      // Verificar si hay ventas asociadas al servicio
      const ventas = await query(`SELECT * FROM DetalleVentasServicios WHERE IdServicio = ?`, [id])
      if (ventas.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar el servicio porque tiene ventas asociadas",
          ventas: ventas.length,
        })
      }

      // Eliminar el servicio
      await serviciosModel.delete(id)

      res.status(200).json({ message: "Servicio eliminado correctamente" })
    } catch (error) {
      console.error("Error al eliminar servicio:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

   // Buscar servicios - CORREGIDO
   search: async (req, res) => {
    try {
      const { term, page = 1, limit = 10 } = req.query

      if (!term) {
        return res.status(400).json({ message: "Término de búsqueda no proporcionado" })
      }

      const servicios = await serviciosModel.search(term, Number.parseInt(page), Number.parseInt(limit))

      res.status(200).json(servicios)
    } catch (error) {
      console.error("Error al buscar servicios:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

export default {
  tipoServicio: tipoServicioController,
  servicios: serviciosController,
}