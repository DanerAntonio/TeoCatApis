import nodemailer from "nodemailer"

/**
 * Notificaciones para el módulo de citas - CORREGIDO y AMPLIADO
 */
export const appointmentNotifications = {
  /**
   * Configuración del transportador de correo
   */
  getEmailTransporter: () => {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  },

  /**
   * Envía notificación de nueva cita creada
   */
  sendNewCitaNotification: async (idCita, citaData, servicios = []) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      // Determinar datos del cliente
      const clienteNombre = citaData.NombreClienteTemporal || "Cliente registrado"
      const mascotaNombre = citaData.NombreMascotaTemporal || "Mascota registrada"

      // Formatear fecha en formato colombiano
      const fecha = new Date(citaData.Fecha)
      const fechaFormateada = fecha.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Bogota",
      })
      const horaFormateada = fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      })

      // Lista de servicios (solo IDs)
      const serviciosHtml =
        servicios.length > 0
          ? servicios.map((s) => `<li>Servicio ID: ${s.IdServicio}</li>`).join("")
          : "<li>Sin servicios específicos</li>"

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Nueva Cita Agendada - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Nueva Cita Agendada</h2>
            <p>Se ha agendado una nueva cita en el sistema:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles de la Cita</h3>
              <p><strong>ID Cita:</strong> ${idCita}</p>
              <p><strong>Cliente:</strong> ${clienteNombre}</p>
              <p><strong>Mascota:</strong> ${mascotaNombre}</p>
              <p><strong>Fecha:</strong> ${fechaFormateada}</p>
              <p><strong>Hora:</strong> ${horaFormateada}</p>
              <p><strong>Estado:</strong> ${citaData.Estado || "Programada"}</p>
              
              <h4 style="color: #495057;">Servicios:</h4>
              <ul>${serviciosHtml}</ul>
              
              ${citaData.Notas ? `<p><strong>Notas:</strong> ${citaData.Notas}</p>` : ""}
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de nueva cita enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de nueva cita:", error)
      throw error
    }
  },

  /**
   * Envía notificación de cambio de estado de cita
   */
  sendStatusChangeNotification: async (idCita, nuevoEstado, citaData) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      const clienteNombre = citaData.NombreClienteTemporal || "Cliente registrado"
      const mascotaNombre = citaData.NombreMascotaTemporal || "Mascota registrada"

      const estadoColors = {
        Programada: "#007bff",
        Completada: "#28a745",
        Cancelada: "#dc3545",
      }

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `Cita ${nuevoEstado} - Sistema de Gestión`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Estado de Cita Actualizado</h2>
            <p>El estado de la cita ha sido cambiado a <strong style="color: ${estadoColors[nuevoEstado]};">${nuevoEstado}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles de la Cita</h3>
              <p><strong>ID Cita:</strong> ${idCita}</p>
              <p><strong>Cliente:</strong> ${clienteNombre}</p>
              <p><strong>Mascota:</strong> ${mascotaNombre}</p>
              <p><strong>Nuevo Estado:</strong> <span style="color: ${estadoColors[nuevoEstado]};">${nuevoEstado}</span></p>
              <p><strong>Fecha del Cambio:</strong> ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de cambio de estado enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de cambio de estado:", error)
      throw error
    }
  },

  /**
   * NUEVA: Envía notificación cuando un cliente (IdRol 2) agenda una cita
   */
  sendClienteCitaAgendadaNotification: async (idCita, citaData, clienteData, servicios = []) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      const fecha = new Date(citaData.Fecha)
      const fechaFormateada = fecha.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Bogota",
      })
      const horaFormateada = fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      })

      const serviciosHtml =
        servicios.length > 0
          ? servicios.map((s) => `<li>Servicio ID: ${s.IdServicio}</li>`).join("")
          : "<li>Sin servicios específicos</li>"

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Cliente Agendó Cita - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Cliente Agendó Nueva Cita</h2>
            <p>Un cliente ha agendado una nueva cita a través del sistema:</p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">Detalles de la Cita</h3>
              <p style="color: #155724;"><strong>ID Cita:</strong> ${idCita}</p>
              <p style="color: #155724;"><strong>Cliente:</strong> ${clienteData.Nombre || "No especificado"}</p>
              <p style="color: #155724;"><strong>Email Cliente:</strong> ${clienteData.Email || "No especificado"}</p>
              <p style="color: #155724;"><strong>Teléfono:</strong> ${clienteData.Telefono || "No especificado"}</p>
              <p style="color: #155724;"><strong>Fecha:</strong> ${fechaFormateada}</p>
              <p style="color: #155724;"><strong>Hora:</strong> ${horaFormateada}</p>
              
              <h4 style="color: #155724;">Servicios Solicitados:</h4>
              <ul style="color: #155724;">${serviciosHtml}</ul>
              
              ${citaData.Notas ? `<p style="color: #155724;"><strong>Notas:</strong> ${citaData.Notas}</p>` : ""}
            </div>
            
            <p><strong>Acción requerida:</strong> Confirmar disponibilidad y contactar al cliente si es necesario.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de cita agendada por cliente enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de cita agendada por cliente:", error)
      throw error
    }
  },

  /**
   * NUEVA: Envía notificación cuando un cliente (IdRol 2) actualiza una cita
   */
  sendClienteCitaActualizadaNotification: async (idCita, citaData, clienteData, cambios) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      const cambiosHtml = Object.keys(cambios)
        .map((key) => `<li><strong>${key}:</strong> ${cambios[key]}</li>`)
        .join("")

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Cliente Actualizó Cita - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">Cliente Actualizó Cita</h2>
            <p>Un cliente ha actualizado una cita existente:</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">Detalles de la Actualización</h3>
              <p style="color: #856404;"><strong>ID Cita:</strong> ${idCita}</p>
              <p style="color: #856404;"><strong>Cliente:</strong> ${clienteData.Nombre || "No especificado"}</p>
              <p style="color: #856404;"><strong>Email Cliente:</strong> ${clienteData.Email || "No especificado"}</p>
              
              <h4 style="color: #856404;">Cambios Realizados:</h4>
              <ul style="color: #856404;">${cambiosHtml}</ul>
              
              <p style="color: #856404;"><strong>Fecha de Actualización:</strong> ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</p>
            </div>
            
            <p><strong>Acción requerida:</strong> Revisar los cambios y confirmar si es necesario contactar al cliente.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de cita actualizada por cliente enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de cita actualizada por cliente:", error)
      throw error
    }
  },

  /**
   * NUEVA: Envía notificación cuando un cliente (IdRol 2) cancela una cita
   */
  sendClienteCitaCanceladaNotification: async (idCita, citaData, clienteData, motivoCancelacion = null) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      const fecha = new Date(citaData.Fecha)
      const fechaFormateada = fecha.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Bogota",
      })
      const horaFormateada = fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      })

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "Cliente Canceló Cita - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Cliente Canceló Cita</h2>
            <p>Un cliente ha cancelado una cita programada:</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin-top: 0;">Detalles de la Cancelación</h3>
              <p style="color: #721c24;"><strong>ID Cita:</strong> ${idCita}</p>
              <p style="color: #721c24;"><strong>Cliente:</strong> ${clienteData.Nombre || "No especificado"}</p>
              <p style="color: #721c24;"><strong>Email Cliente:</strong> ${clienteData.Email || "No especificado"}</p>
              <p style="color: #721c24;"><strong>Teléfono:</strong> ${clienteData.Telefono || "No especificado"}</p>
              <p style="color: #721c24;"><strong>Fecha de la Cita:</strong> ${fechaFormateada}</p>
              <p style="color: #721c24;"><strong>Hora de la Cita:</strong> ${horaFormateada}</p>
              <p style="color: #721c24;"><strong>Fecha de Cancelación:</strong> ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</p>
              
              ${motivoCancelacion ? `<p style="color: #721c24;"><strong>Motivo:</strong> ${motivoCancelacion}</p>` : ""}
            </div>
            
            <p><strong>Nota:</strong> El horario ahora está disponible para otros clientes.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de cita cancelada por cliente enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de cita cancelada por cliente:", error)
      throw error
    }
  },

  /**
   * Envía recordatorio de cita al cliente
   */
  sendCitaReminder: async (citaData, clienteEmail) => {
    try {
      const transporter = appointmentNotifications.getEmailTransporter()

      const clienteNombre = citaData.NombreClienteTemporal || "Cliente"
      const mascotaNombre = citaData.NombreMascotaTemporal || "su mascota"

      const fecha = new Date(citaData.Fecha)
      const fechaFormateada = fecha.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Bogota",
      })
      const horaFormateada = fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      })

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: clienteEmail,
        subject: "Recordatorio de Cita - Veterinaria",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Recordatorio de Cita</h2>
            <p>Estimado/a ${clienteNombre},</p>
            <p>Le recordamos que tiene una cita programada para ${mascotaNombre}:</p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">Detalles de la Cita</h3>
              <p style="color: #155724;"><strong>Fecha:</strong> ${fechaFormateada}</p>
              <p style="color: #155724;"><strong>Hora:</strong> ${horaFormateada}</p>
              <p style="color: #155724;"><strong>Mascota:</strong> ${mascotaNombre}</p>
            </div>
            
            <p>Por favor, llegue 10 minutos antes de su cita.</p>
            <p>Si necesita reprogramar o cancelar, contáctenos con anticipación.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un recordatorio automático. No responda a este correo.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Recordatorio de cita enviado exitosamente")
    } catch (error) {
      console.error("Error al enviar recordatorio de cita:", error)
      throw error
    }
  },
}

export default {
  appointmentNotifications,
}
