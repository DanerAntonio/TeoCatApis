import { citasModel, citaServicioModel } from '../../Models/AppointmentService/appointment.model.js';
import { clientesModel, mascotasModel } from '../../Models/CustomerService/customers.model.js';
import { serviciosModel } from '../../Models/ServiceManagement/service.model.js';
import { sendEmail } from '../../Utils/Email.js';
// AGREGAR: Importar el modelo de notificaciones
import { notificacionesModel } from '../../Models/NotificationService/notifications.model.js';

// Controlador para citas
export const citasController = {
  // Obtener todas las citas
  getAll: async (req, res) => {
    try {
      const citas = await citasModel.getAll();
      res.status(200).json(citas);
    } catch (error) {
      console.error('Error al obtener citas:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener una cita por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const cita = await citasModel.getById(id);
      
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // Obtener los servicios asociados a la cita
      const servicios = await citaServicioModel.getByCita(id);
      
      res.status(200).json({
        ...cita,
        servicios
      });
    } catch (error) {
      console.error('Error al obtener cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Crear una nueva cita
  create: async (req, res) => {
    try {
      // Verificar si req.body existe y tiene la estructura esperada
      if (!req.body) {
        return res.status(400).json({ 
          message: 'El cuerpo de la solicitud está vacío',
          error: 'Se requiere un objeto con propiedades "cita" y "servicios"'
        });
      }
      
      // Verificar si la propiedad cita existe
      const { cita, servicios } = req.body || {};
      
      if (!cita) {
        return res.status(400).json({ 
          message: 'Datos de cita no proporcionados',
          error: 'Se requiere un objeto "cita" con la información de la cita'
        });
      }
      
      // Verificar campos obligatorios en el objeto cita
      if (!cita.IdCliente || !cita.IdMascota || !cita.Fecha) {
        return res.status(400).json({ 
          message: 'Datos de cita incompletos',
          error: 'Se requieren los campos IdCliente, IdMascota y Fecha'
        });
      }
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(cita.IdCliente);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Verificar si la mascota existe
      const mascota = await mascotasModel.getById(cita.IdMascota);
      if (!mascota) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      // Verificar que la mascota pertenezca al cliente
      if (mascota.IdCliente !== cita.IdCliente) {
        return res.status(400).json({ 
          message: 'La mascota no pertenece al cliente seleccionado'
        });
      }
      
      // Verificar formato de fecha
      if (!cita.Fecha.includes(' ')) {
        return res.status(400).json({ 
          message: 'Formato de fecha incorrecto',
          error: 'El formato debe ser "YYYY-MM-DD HH:MM:SS"'
        });
      }
      
      // Extraer fecha y hora de la solicitud
      const fechaPartes = cita.Fecha.split(' ');
      const fecha = fechaPartes[0]; // YYYY-MM-DD
      const hora = fechaPartes[1].substring(0, 5); // HH:MM
      
      // Calcular duración total de los servicios o usar 60 minutos por defecto
      let duracionTotal = 60;
      if (servicios && servicios.length > 0) {
        duracionTotal = 0;
        for (const servicio of servicios) {
          const servicioInfo = await serviciosModel.getById(servicio.IdServicio);
          if (servicioInfo) {
            duracionTotal += servicioInfo.Duracion || 60;
          }
        }
      }
      
      // Verificar disponibilidad de horario con la duración calculada
      const disponible = await citasModel.checkDisponibilidad(
        fecha, 
        hora, 
        duracionTotal
      );

      if (!disponible) {
        return res.status(400).json({ 
          message: 'El horario seleccionado no está disponible debido a un conflicto con otra cita'
        });
      }
      
      // Crear la cita
      const nuevaCita = await citasModel.create(cita);
      
      // Agregar servicios a la cita
      const serviciosAgregados = [];
      if (servicios && servicios.length > 0) {
        for (const servicio of servicios) {
          // Verificar si el servicio existe
          const servicioInfo = await serviciosModel.getById(servicio.IdServicio);
          if (!servicioInfo) {
            return res.status(404).json({ message: `Servicio con ID ${servicio.IdServicio} no encontrado` });
          }
          
          // Crear registro en Cita_Servicio
          const citaServicio = await citaServicioModel.create({
            IdCita: nuevaCita.id,
            IdServicio: servicio.IdServicio
          });
          
          serviciosAgregados.push({
            ...citaServicio,
            NombreServicio: servicioInfo.Nombre,
            Precio: servicioInfo.Precio,
            Duracion: servicioInfo.Duracion
          });
        }
      }
      
      // AGREGAR: Crear notificación de nueva cita
      try {
        await notificacionesModel.create({
          TipoNotificacion: "Cita",
          Titulo: "Nueva cita agendada",
          Mensaje: `Se ha agendado una nueva cita para ${mascota.Nombre} el ${fecha} a las ${hora}`,
          TablaReferencia: "AgendamientoDeCitas",
          IdReferencia: nuevaCita.id,
          Prioridad: "Media",
          IdUsuario: cita.IdCliente, // Notificar al cliente
          ParaAdmins: true, // También notificar a los administradores
          EnviarCorreo: true,
          fechaCita: cita.Fecha, // <--- AGREGA ESTA LÍNEA
        });
      } catch (notifError) {
        console.error("Error al crear notificación de cita:", notifError);
        // No interrumpir el flujo si falla la creación de la notificación
      }
      
      // Enviar correo de confirmación
      try {
        await sendEmail({
          to: cliente.Correo,
          subject: 'Confirmación de Cita - TeoCat',
          text: `Hola ${cliente.Nombre},\n\nTu cita para ${mascota.Nombre} ha sido programada para el ${fecha} a las ${hora}.\n\nGracias por confiar en TeoCat.`,
          html: `
            <h2>Confirmación de Cita - TeoCat</h2>
            <p>Hola ${cliente.Nombre},</p>
            <p>Tu cita para <strong>${mascota.Nombre}</strong> ha sido programada para el <strong>${fecha}</strong> a las <strong>${hora}</strong>.</p>
            <p>Servicios:</p>
            <ul>
              ${serviciosAgregados.map(s => `<li>${s.NombreServicio}</li>`).join('')}
            </ul>
            <p>Gracias por confiar en TeoCat.</p>
          `
        });
      } catch (emailError) {
        console.error('Error al enviar correo de confirmación:', emailError);
        // No interrumpir el flujo si falla el envío de correo
      }
      
      res.status(201).json({
        cita: nuevaCita,
        servicios: serviciosAgregados
      });
    } catch (error) {
      console.error('Error al crear cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Actualizar una cita
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { cita, servicios } = req.body;
      
      // Verificar si la cita existe
      const existingCita = await citasModel.getById(id);
      if (!existingCita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // Si se está actualizando el cliente, verificar que exista
      if (cita.IdCliente) {
        const cliente = await clientesModel.getById(cita.IdCliente);
        if (!cliente) {
          return res.status(404).json({ message: 'Cliente no encontrado' });
        }
      }
      
      // Si se está actualizando la mascota, verificar que exista
      if (cita.IdMascota) {
        const mascota = await mascotasModel.getById(cita.IdMascota);
        if (!mascota) {
          return res.status(404).json({ message: 'Mascota no encontrada' });
        }
        
        // Verificar que la mascota pertenezca al cliente
        const idCliente = cita.IdCliente || existingCita.IdCliente;
        if (mascota.IdCliente !== idCliente) {
          return res.status(400).json({ 
            message: 'La mascota no pertenece al cliente seleccionado'
          });
        }
      }
      
      // Si se está actualizando la fecha, verificar disponibilidad
      if (cita.Fecha) {
        // Extraer fecha y hora
        const fechaPartes = cita.Fecha.split(' ');
        const fecha = fechaPartes[0]; // YYYY-MM-DD
        const hora = fechaPartes[1].substring(0, 5); // HH:MM
        
        // Calcular duración total de los servicios o usar 60 minutos por defecto
        let duracionTotal = 60;
        if (servicios && servicios.length > 0) {
          duracionTotal = 0;
          for (const servicio of servicios) {
            const servicioInfo = await serviciosModel.getById(servicio.IdServicio);
            if (servicioInfo) {
              duracionTotal += servicioInfo.Duracion || 60;
            }
          }
        }
        
        // Verificar disponibilidad de horario (excluyendo la cita actual)
        const disponible = await citasModel.checkDisponibilidad(fecha, hora, duracionTotal);

        if (!disponible) {
          return res.status(400).json({ 
            message: 'El horario seleccionado no está disponible debido a un conflicto con otra cita'
          });
        }
      }
      
      // Actualizar la cita
      const updatedCita = await citasModel.update(id, cita);
      
      // Si se proporcionaron servicios, actualizar los servicios de la cita
      if (servicios) {
        // Eliminar los servicios actuales
        await citaServicioModel.deleteByCita(id);
        
        // Agregar los nuevos servicios
        const serviciosAgregados = [];
        for (const servicio of servicios) {
          // Verificar si el servicio existe
          const servicioInfo = await serviciosModel.getById(servicio.IdServicio);
          if (!servicioInfo) {
            return res.status(404).json({ message: `Servicio con ID ${servicio.IdServicio} no encontrado` });
          }
          
          // Crear registro en Cita_Servicio
          const citaServicio = await citaServicioModel.create({
            IdCita: id,
            IdServicio: servicio.IdServicio
          });
          
          serviciosAgregados.push({
            ...citaServicio,
            NombreServicio: servicioInfo.Nombre,
            Precio: servicioInfo.Precio,
            Duracion: servicioInfo.Duracion
          });
        }
        
        // AGREGAR: Crear notificación de actualización de cita
        try {
          // Obtener datos actualizados
          const citaActualizada = await citasModel.getById(id);
          const cliente = await clientesModel.getById(citaActualizada.IdCliente);
          const mascota = await mascotasModel.getById(citaActualizada.IdMascota);
          
          // Extraer fecha y hora
          const fechaPartes = citaActualizada.Fecha.split(' ');
          const fecha = fechaPartes[0]; // YYYY-MM-DD
          const hora = fechaPartes[1].substring(0, 5); // HH:MM
          
          await notificacionesModel.create({
            TipoNotificacion: "Cita",
            Titulo: "Cita actualizada",
            Mensaje: `La cita para ${mascota.Nombre} ha sido actualizada para el ${fecha} a las ${hora}`,
            TablaReferencia: "AgendamientoDeCitas",
            IdReferencia: id,
            Prioridad: "Media",
            IdUsuario: citaActualizada.IdCliente,
            ParaAdmins: true,
            EnviarCorreo: true,
            fechaCita: citaActualizada.Fecha, // o existingCita.Fecha
          });
        } catch (notifError) {
          console.error("Error al crear notificación de actualización de cita:", notifError);
          // No interrumpir el flujo si falla la creación de la notificación
        }
        
        // Si se cambió la fecha, enviar correo de actualización
        if (cita.Fecha) {
          try {
            // Obtener datos actualizados
            const citaActualizada = await citasModel.getById(id);
            const cliente = await clientesModel.getById(citaActualizada.IdCliente);
            const mascota = await mascotasModel.getById(citaActualizada.IdMascota);
            
            // Extraer fecha y hora
            const fechaPartes = citaActualizada.Fecha.split(' ');
            const fecha = fechaPartes[0]; // YYYY-MM-DD
            const hora = fechaPartes[1].substring(0, 5); // HH:MM
            
            await sendEmail({
              to: cliente.Correo,
              subject: 'Actualización de Cita - TeoCat',
              text: `Hola ${cliente.Nombre},\n\nTu cita para ${mascota.Nombre} ha sido actualizada para el ${fecha} a las ${hora}.\n\nGracias por confiar en TeoCat.`,
              html: `
                <h2>Actualización de Cita - TeoCat</h2>
                <p>Hola ${cliente.Nombre},</p>
                <p>Tu cita para <strong>${mascota.Nombre}</strong> ha sido actualizada para el <strong>${fecha}</strong> a las <strong>${hora}</strong>.</p>
                <p>Servicios:</p>
                <ul>
                  ${serviciosAgregados.map(s => `<li>${s.NombreServicio}</li>`).join('')}
                </ul>
                <p>Gracias por confiar en TeoCat.</p>
              `
            });
          } catch (emailError) {
            console.error('Error al enviar correo de actualización:', emailError);
            // No interrumpir el flujo si falla el envío de correo
          }
        }
        
        return res.status(200).json({
          cita: updatedCita,
          servicios: serviciosAgregados
        });
      }
      
      // Si no se proporcionaron servicios, obtener los servicios actuales
      const serviciosActuales = await citaServicioModel.getByCita(id);
      
      res.status(200).json({
        cita: updatedCita,
        servicios: serviciosActuales
      });
    } catch (error) {
      console.error('Error al actualizar cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Cambiar el estado de una cita
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { Estado } = req.body;
      
      // Verificar si la cita existe
      const existingCita = await citasModel.getById(id);
      if (!existingCita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // Validar el estado
      const estadosValidos = ['Programada', 'Completada', 'Cancelada'];
      if (!estadosValidos.includes(Estado)) {
        return res.status(400).json({ 
          message: 'Estado no válido',
          estadosValidos
        });
      }
      
      // Cambiar el estado
      const result = await citasModel.changeStatus(id, Estado);
      
      // AGREGAR: Crear notificación de cambio de estado
      try {
        const cliente = await clientesModel.getById(existingCita.IdCliente);
        const mascota = await mascotasModel.getById(existingCita.IdMascota);
        
        // Extraer fecha y hora
        const fechaPartes = existingCita.Fecha.split(' ');
        const fecha = fechaPartes[0]; // YYYY-MM-DD
        const hora = fechaPartes[1].substring(0, 5); // HH:MM
        
        await notificacionesModel.create({
          TipoNotificacion: "Cita",
          Titulo: `Cita ${Estado.toLowerCase()}`,
          Mensaje: `La cita para ${mascota.Nombre} programada para el ${fecha} a las ${hora} ha sido ${Estado.toLowerCase()}`,
          TablaReferencia: "AgendamientoDeCitas",
          IdReferencia: id,
          Prioridad: Estado === 'Cancelada' ? 'Alta' : 'Media',
          IdUsuario: existingCita.IdCliente,
          ParaAdmins: true,
          EnviarCorreo: true,
        });
      } catch (notifError) {
        console.error(`Error al crear notificación de cita ${Estado.toLowerCase()}:`, notifError);
        // No interrumpir el flujo si falla la creación de la notificación
      }
      
      // Si se canceló la cita, enviar correo de cancelación
      if (Estado === 'Cancelada') {
        try {
          const cliente = await clientesModel.getById(existingCita.IdCliente);
          const mascota = await mascotasModel.getById(existingCita.IdMascota);
          
          // Extraer fecha y hora
          const fechaPartes = existingCita.Fecha.split(' ');
          const fecha = fechaPartes[0]; // YYYY-MM-DD
          const hora = fechaPartes[1].substring(0, 5); // HH:MM
          
          await sendEmail({
            to: cliente.Correo,
            subject: 'Cancelación de Cita - TeoCat',
            text: `Hola ${cliente.Nombre},\n\nTu cita para ${mascota.Nombre} programada para el ${fecha} a las ${hora} ha sido cancelada.\n\nSi necesitas reprogramar, por favor contáctanos.\n\nGracias por confiar en TeoCat.`,
            html: `
              <h2>Cancelación de Cita - TeoCat</h2>
              <p>Hola ${cliente.Nombre},</p>
              <p>Tu cita para <strong>${mascota.Nombre}</strong> programada para el <strong>${fecha}</strong> a las <strong>${hora}</strong> ha sido cancelada.</p>
              <p>Si necesitas reprogramar, por favor contáctanos.</p>
              <p>Gracias por confiar en TeoCat.</p>
            `
          });
        } catch (emailError) {
          console.error('Error al enviar correo de cancelación:', emailError);
          // No interrumpir el flujo si falla el envío de correo
        }
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error al cambiar estado de cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Eliminar una cita
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la cita existe
      const existingCita = await citasModel.getById(id);
      if (!existingCita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // AGREGAR: Crear notificación de eliminación de cita
      try {
        const cliente = await clientesModel.getById(existingCita.IdCliente);
        const mascota = await mascotasModel.getById(existingCita.IdMascota);
        
        // Extraer fecha y hora
        const fechaPartes = existingCita.Fecha.split(' ');
        const fecha = fechaPartes[0]; // YYYY-MM-DD
        const hora = fechaPartes[1].substring(0, 5); // HH:MM
        
        await notificacionesModel.create({
          TipoNotificacion: "Cita",
          Titulo: "Cita eliminada",
          Mensaje: `La cita para ${mascota.Nombre} programada para el ${fecha} a las ${hora} ha sido eliminada del sistema`,
          TablaReferencia: "AgendamientoDeCitas",
          IdReferencia: id,
          Prioridad: "Alta",
          ParaAdmins: true,
          EnviarCorreo: true,
        });
      } catch (notifError) {
        console.error("Error al crear notificación de eliminación de cita:", notifError);
        // No interrumpir el flujo si falla la creación de la notificación
      }
      
      // Eliminar los servicios asociados a la cita
      await citaServicioModel.deleteByCita(id);
      
      // Eliminar la cita
      await citasModel.delete(id);
      
      res.status(200).json({ message: 'Cita eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener citas por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      
      // Obtener citas
      const citas = await citasModel.getByCliente(id);
      
      // Obtener servicios para cada cita
      const citasConServicios = await Promise.all(citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita);
        return { ...cita, servicios };
      }));
      
      res.status(200).json(citasConServicios);
    } catch (error) {
      console.error('Error al obtener citas del cliente:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener citas por mascota
  getByMascota: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la mascota existe
      const mascota = await mascotasModel.getById(id);
      if (!mascota) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      // Obtener citas
      const citas = await citasModel.getByMascota(id);
      
      // Obtener servicios para cada cita
      const citasConServicios = await Promise.all(citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita);
        return { ...cita, servicios };
      }));
      
      res.status(200).json(citasConServicios);
    } catch (error) {
      console.error('Error al obtener citas de la mascota:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener citas por fecha
  getByFecha: async (req, res) => {
    try {
      const { fecha } = req.params;
      
      // Validar formato de fecha (YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fecha)) {
        return res.status(400).json({ 
          message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD'
        });
      }
      
      // Obtener citas
      const citas = await citasModel.getByFecha(fecha);
      
      // Obtener servicios para cada cita
      const citasConServicios = await Promise.all(citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita);
        return { ...cita, servicios };
      }));
      
      res.status(200).json(citasConServicios);
    } catch (error) {
      console.error('Error al obtener citas por fecha:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener citas por rango de fechas
  getByRangoFechas: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: 'Debe proporcionar fechaInicio y fechaFin' });
      }
      
      // Validar formato de fechas (YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fechaInicio) || !fechaRegex.test(fechaFin)) {
        return res.status(400).json({ 
          message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD'
        });
      }
      
      // Obtener citas
      const citas = await citasModel.getByRangoFechas(fechaInicio, fechaFin);
      
      // Obtener servicios para cada cita
      const citasConServicios = await Promise.all(citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita);
        return { ...cita, servicios };
      }));
      
      res.status(200).json(citasConServicios);
    } catch (error) {
      console.error('Error al obtener citas por rango de fechas:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Obtener citas por estado
  getByEstado: async (req, res) => {
    try {
      const { estado } = req.params;
      
      // Validar el estado
      const estadosValidos = ['Programada', 'Completada', 'Cancelada'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ 
          message: 'Estado no válido',
          estadosValidos
        });
      }
      
      // Obtener citas
      const citas = await citasModel.getByEstado(estado);
      
      // Obtener servicios para cada cita
      const citasConServicios = await Promise.all(citas.map(async (cita) => {
        const servicios = await citaServicioModel.getByCita(cita.IdCita);
        return { ...cita, servicios };
      }));
      
      res.status(200).json(citasConServicios);
    } catch (error) {
      console.error('Error al obtener citas por estado:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },

  // Verificar disponibilidad de horario
  checkDisponibilidad: async (req, res) => {
    try {
      const { fecha, hora, duracion } = req.body;
      
      if (!fecha || !hora) {
        return res.status(400).json({ 
          message: 'Debe proporcionar fecha y hora'
        });
      }
      
      // Validar formato de fecha (YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fecha)) {
        return res.status(400).json({ 
          message: 'Formato de fecha inválido. Debe ser YYYY-MM-DD'
        });
      }
      
      // Validar formato de hora (HH:MM)
      const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!horaRegex.test(hora)) {
        return res.status(400).json({ 
          message: 'Formato de hora inválido. Debe ser HH:MM (24h)'
        });
      }
      
      // Verificar disponibilidad
      const disponible = await citasModel.checkDisponibilidad(
        fecha, 
        hora, 
        duracion || 60
      );
      
      res.status(200).json({ disponible });
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  }
};

// Controlador para la relación Cita-Servicio
export const citaServicioController = {
  // Obtener todos los servicios de una cita
  getByCita: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si la cita existe
      const cita = await citasModel.getById(id);
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // Obtener servicios
      const servicios = await citaServicioModel.getByCita(id);
      
      res.status(200).json(servicios);
    } catch (error) {
      console.error('Error al obtener servicios de la cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },
  
  // Obtener todas las citas de un servicio
  getByServicio: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(id);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Obtener citas
      const citas = await citaServicioModel.getByServicio(id);
      
      res.status(200).json(citas);
    } catch (error) {
      console.error('Error al obtener citas del servicio:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },
  
  // Agregar un servicio a una cita
  addServicio: async (req, res) => {
    try {
      const { idCita, idServicio } = req.params;
      
      // Verificar si la cita existe
      const cita = await citasModel.getById(idCita);
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(idServicio);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Verificar si ya existe la relación
      const existingRelacion = await citaServicioModel.getById(idCita, idServicio);
      if (existingRelacion) {
        return res.status(400).json({ message: 'El servicio ya está asociado a esta cita' });
      }
      
      // Crear la relación
      const citaServicio = await citaServicioModel.create({
        IdCita: idCita,
        IdServicio: idServicio
      });
      
      // AGREGAR: Crear notificación de servicio agregado a cita
      try {
        const mascota = await mascotasModel.getById(cita.IdMascota);
        
        await notificacionesModel.create({
          TipoNotificacion: "Cita",
          Titulo: "Servicio agregado a cita",
          Mensaje: `Se ha agregado el servicio ${servicio.Nombre} a la cita para ${mascota.Nombre}`,
          TablaReferencia: "Cita_Servicio",
          IdReferencia: idCita,
          Prioridad: "Baja",
          IdUsuario: cita.IdCliente,
          ParaAdmins: true,
          EnviarCorreo: false,
        });
      } catch (notifError) {
        console.error("Error al crear notificación de servicio agregado:", notifError);
        // No interrumpir el flujo si falla la creación de la notificación
      }
      
      res.status(201).json({
        ...citaServicio,
        NombreServicio: servicio.Nombre,
        Precio: servicio.Precio,
        Duracion: servicio.Duracion
      });
    } catch (error) {
      console.error('Error al agregar servicio a la cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },
  
  // Actualizar un servicio de una cita
  updateServicio: async (req, res) => {
    try {
      const { idCita, idServicio } = req.params;
      
      // Verificar si existe la relación
      const existingRelacion = await citaServicioModel.getById(idCita, idServicio);
      if (!existingRelacion) {
        return res.status(404).json({ message: 'Relación Cita-Servicio no encontrada' });
      }
      
      // Verificar si el servicio existe
      const servicio = await serviciosModel.getById(idServicio);
      if (!servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      
      // Actualizar la relación
      const citaServicio = await citaServicioModel.update(idCita, idServicio, {});
      
      res.status(200).json({
        ...citaServicio,
        NombreServicio: servicio.Nombre
      });
    } catch (error) {
      console.error('Error al actualizar servicio de la cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  },
  
  // Eliminar un servicio de una cita
  removeServicio: async (req, res) => {
    try {
      const { idCita, idServicio } = req.params;
      
      // Verificar si existe la relación
      const existingRelacion = await citaServicioModel.getById(idCita, idServicio);
      if (!existingRelacion) {
        return res.status(404).json({ message: 'Relación Cita-Servicio no encontrada' });
      }
      
      // Obtener información para la notificación
      const cita = await citasModel.getById(idCita);
      const servicio = await serviciosModel.getById(idServicio);
      const mascota = await mascotasModel.getById(cita.IdMascota);
      
      // Eliminar la relación
      await citaServicioModel.delete(idCita, idServicio);
      
      // AGREGAR: Crear notificación de servicio eliminado de cita
      try {
        await notificacionesModel.create({
          TipoNotificacion: "Cita",
          Titulo: "Servicio eliminado de cita",
          Mensaje: `Se ha eliminado el servicio ${servicio.Nombre} de la cita para ${mascota.Nombre}`,
          TablaReferencia: "Cita_Servicio",
          IdReferencia: idCita,
          Prioridad: "Baja",
          IdUsuario: cita.IdCliente,
          ParaAdmins: true,
          EnviarCorreo: false,
        });
      } catch (notifError) {
        console.error("Error al crear notificación de servicio eliminado:", notifError);
        // No interrumpir el flujo si falla la creación de la notificación
      }
      
      res.status(200).json({ message: 'Servicio eliminado de la cita correctamente' });
    } catch (error) {
      console.error('Error al eliminar servicio de la cita:', error);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  }
};

// Exportación por defecto
export default {
  citas: citasController,
  citaServicio: citaServicioController
};