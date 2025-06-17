import { reseñasProductosModel, reseñasServiciosModel, reseñasGeneralesModel } from '../../Models/ReviewService/reviews.model.js';
import { clientesModel } from '../../Models/CustomerService/customers.model.js';
import { productosModel } from '../../Models/ProductService/products.model.js';
import { serviciosModel } from '../../Models/ServiceManagement/service.model.js';
import { notificacionesModel } from '../../Models/NotificationService/notifications.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../Utils/Cloudinary.js';
import { query } from '../../Config/Database.js';


// Controlador para reseñas de productos
export const reseñasProductosController = {
  // Obtener todas las reseñas de productos
  getAll: async (req, res) => {
    try {
      // Solo reseñas aprobadas
      const reseñas = await reseñasProductosModel.getAllAprobadas();
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas de productos:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener una reseña de producto por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const reseña = await reseñasProductosModel.getById(id);
      
      if (!reseña) {
        return res.status(404).json({ message: 'Reseña de producto no encontrada' });
      }
      
      res.status(200).json(reseña);
    } catch (error) {
      console.error('Error al obtener reseña de producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear una nueva reseña de producto
  create: async (req, res) => {
    try {
      const reseñaData = req.body;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(reseñaData.IdCliente);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Verificar si el producto existe
      const producto = await productosModel.getById(reseñaData.IdProducto);
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      
      // Validar calificación (entre 1 y 5)
      if (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Validar longitud del comentario
      if (reseñaData.Comentario && reseñaData.Comentario.length > 1000) {
        return res.status(400).json({ message: 'El comentario no puede exceder los 1000 caracteres' });
      }
      
      // Validar si el cliente ya ha dejado una reseña para este producto
      const reseñasExistentes = await reseñasProductosModel.getByCliente(reseñaData.IdCliente);
      const yaHaReseñado = reseñasExistentes.some(r => r.IdProducto === reseñaData.IdProducto);
      
      if (yaHaReseñado) {
        return res.status(400).json({ message: 'Ya has dejado una reseña para este producto' });
      }
      
      // Procesar la imagen si existe
      if (req.file) {
        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ message: 'Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y GIF' });
        }
        
        // Validar tamaño de archivo (máximo 5MB)
        if (req.file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ message: 'El tamaño de la imagen no puede exceder los 5MB' });
        }
        
        const result = await uploadToCloudinary(req.file.path);
        reseñaData.Foto = result.secure_url;
      }
      
      // Crear la reseña
      reseñaData.Aprobado = false; // <--- Asegura que siempre sea false al crear
      const nuevaReseña = await reseñasProductosModel.create(reseñaData);
      
      // Crear notificación para administradores
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaProducto',
        Titulo: 'Nueva reseña de producto',
        Mensaje: `El cliente ${cliente.Nombre} ${cliente.Apellido} ha dejado una reseña para el producto ${producto.NombreProducto} con calificación ${reseñaData.Calificacion}`,
        TablaReferencia: 'ReseñasProductos',
        IdReferencia: nuevaReseña.id,
        Prioridad: 'Media',
        Estado: 'Activa'
      });
      
      res.status(201).json(nuevaReseña);
    } catch (error) {
      console.error('Error al crear reseña de producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar una reseña de producto
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const reseñaData = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasProductosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de producto no encontrada' });
      }
      
      // Si se está actualizando el cliente, verificar que exista
      if (reseñaData.IdCliente) {
        const cliente = await clientesModel.getById(reseñaData.IdCliente);
        if (!cliente) {
          return res.status(404).json({ message: 'Cliente no encontrado' });
        }
      }
      
      // Si se está actualizando el producto, verificar que exista
      if (reseñaData.IdProducto) {
        const producto = await productosModel.getById(reseñaData.IdProducto);
        if (!producto) {
          return res.status(404).json({ message: 'Producto no encontrado' });
        }
      }
      
      // Si se está actualizando la calificación, validar (entre 1 y 5)
      if (reseñaData.Calificacion !== undefined && (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5)) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Procesar la imagen si existe
      if (req.file) {
        // Eliminar imagen anterior si existe
        if (existingReseña.Foto) {
          try {
            const publicId = existingReseña.Foto.split('/').pop().split('.')[0];
            await deleteFromCloudinary(publicId);
          } catch (error) {
            console.error('Error al eliminar imagen anterior:', error);
          }
        }
        
        const result = await uploadToCloudinary(req.file.path);
        reseñaData.Foto = result.secure_url;
      }
      
      // Actualizar la reseña
      const updatedReseña = await reseñasProductosModel.update(id, reseñaData);
      
      // Si se está cambiando el estado de aprobación, crear notificación
      if (reseñaData.Aprobado !== undefined && reseñaData.Aprobado !== existingReseña.Aprobado) {
        const producto = await productosModel.getById(existingReseña.IdProducto);
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = reseñaData.Aprobado ? 'aprobada' : 'rechazada';
        const motivo = reseñaData.MotivoEliminacion ? ` Motivo: ${reseñaData.MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaProducto',
          Titulo: `Reseña de producto ${accion}`,
          Mensaje: `La reseña del producto ${producto.NombreProducto} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasProductos',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(updatedReseña);
    } catch (error) {
      console.error('Error al actualizar reseña de producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de una reseña de producto
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { Estado, Aprobado, MotivoEliminacion } = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasProductosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de producto no encontrada' });
      }
      
      // Actualizar datos
      const updateData = {};
      if (Estado !== undefined) updateData.Estado = Estado;
      if (Aprobado !== undefined) updateData.Aprobado = Aprobado;
      if (MotivoEliminacion) updateData.MotivoEliminacion = MotivoEliminacion;
      
      // Cambiar el estado
      const result = await reseñasProductosModel.update(id, updateData);
      
      // Crear notificación si se aprueba o rechaza
      if (Aprobado !== undefined && Aprobado !== existingReseña.Aprobado) {
        const producto = await productosModel.getById(existingReseña.IdProducto);
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = Aprobado ? 'aprobada' : 'rechazada';
        const motivo = MotivoEliminacion ? ` Motivo: ${MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaProducto',
          Titulo: `Reseña de producto ${accion}`,
          Mensaje: `La reseña del producto ${producto.NombreProducto} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasProductos',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al cambiar estado de reseña de producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Eliminar una reseña de producto
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasProductosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de producto no encontrada' });
      }
      
      // Eliminar la reseña
      await reseñasProductosModel.delete(id);
      
      // Crear notificación de eliminación
      const producto = await productosModel.getById(existingReseña.IdProducto);
      const cliente = await clientesModel.getById(existingReseña.IdCliente);
      
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaProducto',
        Titulo: 'Reseña de producto eliminada',
        Mensaje: `La reseña del producto ${producto.NombreProducto} del cliente ${cliente.Nombre} ${cliente.Apellido} ha sido eliminada.`,
        TablaReferencia: 'ReseñasProductos',
        IdReferencia: id,
        Prioridad: 'Baja',
        Estado: 'Activa'
      });
      
      res.status(200).json({ message: 'Reseña de producto eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar reseña de producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas de producto por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasProductosModel.getByCliente(id);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas de producto del cliente:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas de producto por cliente autenticado
  getByClienteAuth: async (req, res) => {
    try {
      // Supón que tienes el id del cliente autenticado en req.user.IdCliente
      const idCliente = req.user?.IdCliente || req.body.IdCliente || req.query.IdCliente;
      if (!idCliente) {
        return res.status(401).json({ message: 'No autenticado' });
      }
      const reseñas = await reseñasProductosModel.getByCliente(idCliente);
      res.status(200).json(reseñas);
    } catch (error) {
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por producto
  getByProducto: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el producto existe
      const producto = await productosModel.getById(id);
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasProductosModel.getByProducto(id);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas del producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (req, res) => {
    try {
      const { calificacion } = req.params;
      
      // Validar calificación (entre 1 y 5)
      const calificacionNum = parseInt(calificacion);
      if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasProductosModel.getByCalificacion(calificacionNum);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por calificación:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params;
      
      // Convertir a booleano
      let estadoBoolean;
      if (estado === 'true') {
        estadoBoolean = true;
      } else if (estado === 'false') {
        estadoBoolean = false;
      } else {
        return res.status(400).json({ message: 'El estado debe ser true o false' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasProductosModel.getByEstado(estadoBoolean);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por estado:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener promedio de calificaciones por producto
  getPromedioByProducto: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el producto existe
      const producto = await productosModel.getById(id);
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      
      // Obtener promedio
      const promedio = await reseñasProductosModel.getPromedioByProducto(id);
      
      res.status(200).json(promedio);
    } catch (error) {
      console.error('Error al obtener promedio de calificaciones del producto:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Aprobar o rechazar una reseña de producto
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { aprobado } = req.body;
      const reseña = await reseñasProductosModel.getById(id);
      if (!reseña) return res.status(404).json({ message: "Reseña no encontrada" });
      await reseñasProductosModel.update(id, { Aprobado: aprobado });
      res.status(200).json({ success: true, aprobado });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  }
};

// Controlador para reseñas de servicios
export const reseñasServiciosController = {
  // Obtener todas las reseñas de servicios
  getAll: async (req, res) => {
    try {
      const reseñas = await reseñasServiciosModel.getAll();
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas de servicios:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener una reseña de servicio por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const reseña = await reseñasServiciosModel.getById(id);
      
      if (!reseña) {
        return res.status(404).json({ message: 'Reseña de servicio no encontrada' });
      }
      
      res.status(200).json(reseña);
    } catch (error) {
      console.error('Error al obtener reseña de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear una nueva reseña de servicio
  create: async (req, res) => {
    try {
      const reseñaData = req.body;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(reseñaData.IdCliente);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(reseñaData.IdServicio);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Validar calificación (entre 1 y 5)
      if (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Crear la reseña
      const nuevaReseña = await reseñasServiciosModel.create(reseñaData);
      
      // Crear notificación para administradores
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaServicio',
        Titulo: 'Nueva reseña de servicio',
        Mensaje: `El cliente ${cliente.Nombre} ${cliente.Apellido} ha dejado una reseña para el servicio ${servicio.Nombre} con calificación ${reseñaData.Calificacion}`,
        TablaReferencia: 'ReseñasServicios',
        IdReferencia: nuevaReseña.id,
        Prioridad: 'Media',
        Estado: 'Activa'
      });
      
      res.status(201).json(nuevaReseña);
    } catch (error) {
      console.error('Error al crear reseña de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar una reseña de servicio
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const reseñaData = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasServiciosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de servicio no encontrada' });
      }
      
      // Si se está actualizando el cliente, verificar que exista
      if (reseñaData.IdCliente) {
        const cliente = await clientesModel.getById(reseñaData.IdCliente);
        if (!cliente) {
          return res.status(404).json({ message: 'Cliente no encontrado' });
        }
      }
      
      // Si se está actualizando el servicio, verificar que exista
      if (reseñaData.IdServicio) {
        const servicio = await serviciosModel.getById(reseñaData.IdServicio);
        if (!servicio) {
          return res.status(404).json({ message: 'Servicio no encontrado' });
        }
      }
      
      // Si se está actualizando la calificación, validar (entre 1 y 5)
      if (reseñaData.Calificacion !== undefined && (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5)) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Actualizar la reseña
      const updatedReseña = await reseñasServiciosModel.update(id, reseñaData);
      
      // Si se está cambiando el estado de aprobación, crear notificación
      if (reseñaData.Aprobado !== undefined && reseñaData.Aprobado !== existingReseña.Aprobado) {
        const servicio = await serviciosModel.getById(existingReseña.IdServicio);
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = reseñaData.Aprobado ? 'aprobada' : 'rechazada';
        const motivo = reseñaData.MotivoEliminacion ? ` Motivo: ${reseñaData.MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaServicio',
          Titulo: `Reseña de servicio ${accion}`,
          Mensaje: `La reseña del servicio ${servicio.Nombre} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasServicios',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(updatedReseña);
    } catch (error) {
      console.error('Error al actualizar reseña de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de una reseña de servicio
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { Estado, Aprobado, MotivoEliminacion } = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasServiciosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de servicio no encontrada' });
      }
      
      // Actualizar datos
      const updateData = {};
      if (Estado !== undefined) updateData.Estado = Estado;
      if (Aprobado !== undefined) updateData.Aprobado = Aprobado;
      if (MotivoEliminacion) updateData.MotivoEliminacion = MotivoEliminacion;
      
      // Cambiar el estado
      const result = await reseñasServiciosModel.update(id, updateData);
      
      // Crear notificación si se aprueba o rechaza
      if (Aprobado !== undefined && Aprobado !== existingReseña.Aprobado) {
        const servicio = await serviciosModel.getById(existingReseña.IdServicio);
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = Aprobado ? 'aprobada' : 'rechazada';
        const motivo = MotivoEliminacion ? ` Motivo: ${MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaServicio',
          Titulo: `Reseña de servicio ${accion}`,
          Mensaje: `La reseña del servicio ${servicio.Nombre} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasServicios',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al cambiar estado de reseña de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Eliminar una reseña de servicio
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasServiciosModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña de servicio no encontrada' });
      }
      
      // Eliminar la reseña
      await reseñasServiciosModel.delete(id);
      
      // Crear notificación de eliminación
      const servicio = await serviciosModel.getById(existingReseña.IdServicio);
      const cliente = await clientesModel.getById(existingReseña.IdCliente);
      
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaServicio',
        Titulo: 'Reseña de servicio eliminada',
        Mensaje: `La reseña del servicio ${servicio.Nombre} del cliente ${cliente.Nombre} ${cliente.Apellido} ha sido eliminada.`,
        TablaReferencia: 'ReseñasServicios',
        IdReferencia: id,
        Prioridad: 'Baja',
        Estado: 'Activa'
      });
      
      res.status(200).json({ message: 'Reseña de servicio eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar reseña de servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas de servicio por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasServiciosModel.getByCliente(id);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas de servicio del cliente:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por servicio
  getByServicio: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(id);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasServiciosModel.getByServicio(id);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas del servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (req, res) => {
    try {
      const { calificacion } = req.params;
      
      // Validar calificación (entre 1 y 5)
      const calificacionNum = parseInt(calificacion);
      if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasServiciosModel.getByCalificacion(calificacionNum);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por calificación:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params;
      
      // Convertir a booleano
      let estadoBoolean;
      if (estado === 'true') {
        estadoBoolean = true;
      } else if (estado === 'false') {
        estadoBoolean = false;
      } else {
        return res.status(400).json({ message: 'El estado debe ser true o false' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasServiciosModel.getByEstado(estadoBoolean);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por estado:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener promedio de calificaciones por servicio
  getPromedioByServicio: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(id);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Obtener promedio
      const promedio = await reseñasServiciosModel.getPromedioByServicio(id);
      
      res.status(200).json(promedio);
    } catch (error) {
      console.error('Error al obtener promedio de calificaciones del servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Aprobar o rechazar una reseña de servicio
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { aprobado } = req.body;
      const reseña = await reseñasServiciosModel.getById(id);
      if (!reseña) return res.status(404).json({ message: "Reseña no encontrada" });
      await reseñasServiciosModel.update(id, { Aprobado: aprobado });
      res.status(200).json({ success: true, aprobado });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  }
};

// Controlador para reseñas generales
export const reseñasGeneralesController = {
  // Obtener todas las reseñas generales
  getAll: async (req, res) => {
    try {
      const reseñas = await reseñasGeneralesModel.getAll();
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas generales:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener una reseña general por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const reseña = await reseñasGeneralesModel.getById(id);
      
      if (!reseña) {
        return res.status(404).json({ message: 'Reseña general no encontrada' });
      }
      
      res.status(200).json(reseña);
    } catch (error) {
      console.error('Error al obtener reseña general:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear una nueva reseña general
  create: async (req, res) => {
    try {
      const reseñaData = req.body;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(reseñaData.IdCliente);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Validar calificación (entre 1 y 5)
      if (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Crear la reseña
      const nuevaReseña = await reseñasGeneralesModel.create(reseñaData);
      
      // Crear notificación para administradores
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaGeneral',
        Titulo: 'Nueva reseña general',
        Mensaje: `El cliente ${cliente.Nombre} ${cliente.Apellido} ha dejado una reseña general con calificación ${reseñaData.Calificacion}`,
        TablaReferencia: 'ReseñasGenerales',
        IdReferencia: nuevaReseña.id,
        Prioridad: 'Media',
        Estado: 'Activa'
      });
      
      res.status(201).json(nuevaReseña);
    } catch (error) {
      console.error('Error al crear reseña general:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar una reseña general
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const reseñaData = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasGeneralesModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña general no encontrada' });
      }
      
      // Si se está actualizando el cliente, verificar que exista
      if (reseñaData.IdCliente) {
        const cliente = await clientesModel.getById(reseñaData.IdCliente);
        if (!cliente) {
          return res.status(404).json({ message: 'Cliente no encontrado' });
        }
      }
      
      // Si se está actualizando la calificación, validar (entre 1 y 5)
      if (reseñaData.Calificacion !== undefined && (reseñaData.Calificacion < 1 || reseñaData.Calificacion > 5)) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Actualizar la reseña
      const updatedReseña = await reseñasGeneralesModel.update(id, reseñaData);
      
      // Si se está cambiando el estado de aprobación, crear notificación
      if (reseñaData.Aprobado !== undefined && reseñaData.Aprobado !== existingReseña.Aprobado) {
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = reseñaData.Aprobado ? 'aprobada' : 'rechazada';
        const motivo = reseñaData.MotivoEliminacion ? ` Motivo: ${reseñaData.MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaGeneral',
          Titulo: `Reseña general ${accion}`,
          Mensaje: `La reseña general del cliente ${cliente.Nombre} ${cliente.Apellido} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasGenerales',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(updatedReseña);
    } catch (error) {
      console.error('Error al actualizar reseña general:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de una reseña general
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { Estado, Aprobado, MotivoEliminacion } = req.body;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasGeneralesModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña general no encontrada' });
      }
      
      // Actualizar datos
      const updateData = {};
      if (Estado !== undefined) updateData.Estado = Estado;
      if (Aprobado !== undefined) updateData.Aprobado = Aprobado;
      if (MotivoEliminacion) updateData.MotivoEliminacion = MotivoEliminacion;
      
      // Cambiar el estado
      const result = await reseñasGeneralesModel.update(id, updateData);
      
      // Crear notificación si se aprueba o rechaza
      if (Aprobado !== undefined && Aprobado !== existingReseña.Aprobado) {
        const cliente = await clientesModel.getById(existingReseña.IdCliente);
        
        const accion = Aprobado ? 'aprobada' : 'rechazada';
        const motivo = MotivoEliminacion ? ` Motivo: ${MotivoEliminacion}` : '';
        
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaGeneral',
          Titulo: `Reseña general ${accion}`,
          Mensaje: `La reseña general del cliente ${cliente.Nombre} ${cliente.Apellido} ha sido ${accion}.${motivo}`,
          TablaReferencia: 'ReseñasGenerales',
          IdReferencia: id,
          Prioridad: 'Baja',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al cambiar estado de reseña general:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Eliminar una reseña general
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la reseña existe
      const existingReseña = await reseñasGeneralesModel.getById(id);
      if (!existingReseña) {
        return res.status(404).json({ message: 'Reseña general no encontrada' });
      }
      
      // Eliminar la reseña
      await reseñasGeneralesModel.delete(id);
      
      // Crear notificación de eliminación
      const cliente = await clientesModel.getById(existingReseña.IdCliente);
      
      await notificacionesModel.create({
        TipoNotificacion: 'ReseñaGeneral',
        Titulo: 'Reseña general eliminada',
        Mensaje: `La reseña general del cliente ${cliente.Nombre} ${cliente.Apellido} ha sido eliminada.`,
        TablaReferencia: 'ReseñasGenerales',
        IdReferencia: id,
        Prioridad: 'Baja',
        Estado: 'Activa'
      });
      
      res.status(200).json({ message: 'Reseña general eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar reseña general:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas generales por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasGeneralesModel.getByCliente(id);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas generales del cliente:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por calificación
  getByCalificacion: async (req, res) => {
    try {
      const { calificacion } = req.params;
      
      // Validar calificación (entre 1 y 5)
      const calificacionNum = parseInt(calificacion);
      if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 5) {
        return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasGeneralesModel.getByCalificacion(calificacionNum);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por calificación:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener reseñas por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params;
      
      // Convertir a booleano
      let estadoBoolean;
      if (estado === 'true') {
        estadoBoolean = true;
      } else if (estado === 'false') {
        estadoBoolean = false;
      } else {
        return res.status(400).json({ message: 'El estado debe ser true o false' });
      }
      
      // Obtener reseñas
      const reseñas = await reseñasGeneralesModel.getByEstado(estadoBoolean);
      
      res.status(200).json(reseñas);
    } catch (error) {
      console.error('Error al obtener reseñas por estado:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener promedio general de calificaciones
  getPromedioGeneral: async (req, res) => {
    try {
      // Obtener promedio
      const promedio = await reseñasGeneralesModel.getPromedioGeneral();
      
      res.status(200).json(promedio);
    } catch (error) {
      console.error('Error al obtener promedio general de calificaciones:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Función para verificar reseñas pendientes de aprobación
  verificarReseñasPendientes: async (req, res) => {
    try {
      // Obtener reseñas de productos pendientes
      const reseñasProductosPendientes = await query(
        `SELECT rp.*, p.NombreProducto 
        FROM ReseñasProductos rp
        JOIN Productos p ON rp.IdProducto = p.IdProducto
        WHERE rp.Aprobado = FALSE AND rp.Estado = TRUE`
      );
      
      // Obtener reseñas de servicios pendientes
      const reseñasServiciosPendientes = await query(
        `SELECT rs.*, s.Nombre AS NombreServicio 
        FROM ReseñasServicios rs
        JOIN Servicios s ON rs.IdServicio = s.IdServicio
        WHERE rs.Aprobado = FALSE AND rs.Estado = TRUE`
      );
      
      // Obtener reseñas generales pendientes
      const reseñasGeneralesPendientes = await query(
        `SELECT rg.* 
         FROM ReseñasGenerales rg
         WHERE rg.Aprobado = FALSE AND rg.Estado = TRUE`
      );
      
      // Crear notificación si hay reseñas pendientes
      const totalPendientes = reseñasProductosPendientes.length + 
                             reseñasServiciosPendientes.length + 
                             reseñasGeneralesPendientes.length;
      
      if (totalPendientes > 0) {
        await notificacionesModel.create({
          TipoNotificacion: 'ReseñaGeneral',
          Titulo: 'Reseñas pendientes de aprobación',
          Mensaje: `Hay ${totalPendientes} reseñas pendientes de aprobación (${reseñasProductosPendientes.length} de productos, ${reseñasServiciosPendientes.length} de servicios, ${reseñasGeneralesPendientes.length} generales)`,
          TablaReferencia: 'ReseñasGenerales',
          IdReferencia: 0,
          Prioridad: totalPendientes > 10 ? 'Alta' : 'Media',
          Estado: 'Activa'
        });
      }
      
      res.status(200).json({
        totalPendientes,
        reseñasProductos: reseñasProductosPendientes.length,
        reseñasServicios: reseñasServiciosPendientes.length,
        reseñasGenerales: reseñasGeneralesPendientes.length
      });
    } catch (error) {
      console.error('Error al verificar reseñas pendientes:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Aprobar o rechazar una reseña general
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { aprobado } = req.body;
      const reseña = await reseñasGeneralesModel.getById(id);
      if (!reseña) return res.status(404).json({ message: "Reseña no encontrada" });
      await reseñasGeneralesModel.update(id, { Aprobado: aprobado });
      res.status(200).json({ success: true, aprobado });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
  }
};

