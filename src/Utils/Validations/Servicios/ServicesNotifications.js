import nodemailer from "nodemailer"

/**
 * Notificaciones para el módulo de servicios
 * Equivalente a customersNotifications pero para servicios
 */
export const servicesNotifications = {
  /**
   * Configuración del transportador de correo
   */
  getEmailTransporter: () => {
    return nodemailer.createTransporter({
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
   * Envía notificación de nuevo servicio creado
   */
  sendNewServiceNotification: async (adminEmail, serviceName, tipoServicio) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: "Nuevo Servicio Creado - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Nuevo Servicio Creado</h2>
            <p>Se ha creado un nuevo servicio en el sistema:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles del Servicio</h3>
              <p><strong>Nombre:</strong> ${serviceName}</p>
              <p><strong>Tipo de Servicio:</strong> ${tipoServicio}</p>
              <p><strong>Fecha de Creación:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
            </div>
            
            <p>Este servicio ya está disponible para ser agendado por los clientes.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de nuevo servicio enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de nuevo servicio:", error)
      throw error
    }
  },

  /**
   * Envía notificación de servicio actualizado
   */
  sendServiceUpdateNotification: async (adminEmail, serviceName, changes) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()

      const changesHtml = Object.keys(changes)
        .map((key) => `<li><strong>${key}:</strong> ${changes[key]}</li>`)
        .join("")

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: "Servicio Actualizado - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Servicio Actualizado</h2>
            <p>Se ha actualizado el servicio <strong>${serviceName}</strong>:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Cambios Realizados</h3>
              <ul>${changesHtml}</ul>
              <p><strong>Fecha de Actualización:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de actualización de servicio enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de actualización de servicio:", error)
      throw error
    }
  },

  /**
   * Envía notificación de cambio de estado de servicio
   */
  sendServiceStatusChangeNotification: async (adminEmail, serviceName, newStatus) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()
      const statusText = newStatus ? "activado" : "desactivado"
      const statusColor = newStatus ? "#28a745" : "#dc3545"

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: `Servicio ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - Sistema de Gestión`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Estado de Servicio Cambiado</h2>
            <p>El servicio <strong>${serviceName}</strong> ha sido <strong style="color: ${statusColor};">${statusText}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles del Cambio</h3>
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Nuevo Estado:</strong> <span style="color: ${statusColor};">${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</span></p>
              <p><strong>Fecha del Cambio:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
            </div>
            
            ${
              !newStatus
                ? '<p style="color: #dc3545;"><strong>Nota:</strong> Este servicio ya no estará disponible para nuevas citas.</p>'
                : '<p style="color: #28a745;"><strong>Nota:</strong> Este servicio ya está disponible para nuevas citas.</p>'
            }
            
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
   * Envía notificación de servicio eliminado
   */
  sendServiceDeletedNotification: async (adminEmail, serviceName, tipoServicio) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: "Servicio Eliminado - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Servicio Eliminado</h2>
            <p>Se ha eliminado el servicio <strong>${serviceName}</strong> del sistema.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles del Servicio Eliminado</h3>
              <p><strong>Nombre:</strong> ${serviceName}</p>
              <p><strong>Tipo de Servicio:</strong> ${tipoServicio}</p>
              <p><strong>Fecha de Eliminación:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
            </div>
            
            <p style="color: #dc3545;"><strong>Nota:</strong> Esta acción no se puede deshacer.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de eliminación de servicio enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de eliminación de servicio:", error)
      throw error
    }
  },

  /**
   * Envía notificación de nuevo tipo de servicio creado
   */
  sendNewTipoServicioNotification: async (adminEmail, tipoServicioName) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: "Nuevo Tipo de Servicio Creado - Sistema de Gestión",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Nuevo Tipo de Servicio Creado</h2>
            <p>Se ha creado un nuevo tipo de servicio en el sistema:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles</h3>
              <p><strong>Nombre:</strong> ${tipoServicioName}</p>
              <p><strong>Fecha de Creación:</strong> ${new Date().toLocaleDateString("es-ES")}</p>
            </div>
            
            <p>Ahora puedes crear servicios bajo esta nueva categoría.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Este es un mensaje automático del sistema de gestión.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación de nuevo tipo de servicio enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación de nuevo tipo de servicio:", error)
      throw error
    }
  },

  /**
   * Envía notificación masiva a clientes sobre nuevo servicio
   */
  sendNewServiceToClientsNotification: async (clientEmails, serviceName, serviceDescription, servicePrice) => {
    try {
      const transporter = servicesNotifications.getEmailTransporter()

      const mailOptions = {
        from: process.env.SMTP_USER,
        bcc: clientEmails, // Envío masivo oculto
        subject: "¡Nuevo Servicio Disponible! - Veterinaria",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">¡Nuevo Servicio Disponible!</h2>
            <p>Nos complace anunciar que tenemos un nuevo servicio disponible para tu mascota:</p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">${serviceName}</h3>
              <p style="color: #155724;">${serviceDescription}</p>
              <p style="color: #155724;"><strong>Precio:</strong> ${servicePrice}</p>
            </div>
            
            <p>¡Agenda tu cita ahora y brinda el mejor cuidado a tu mascota!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Agendar Cita
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Si no deseas recibir estas notificaciones, puedes darte de baja en tu perfil.
            </p>
          </div>
        `,
      }

      await transporter.sendMail(mailOptions)
      console.log("Notificación masiva de nuevo servicio enviada exitosamente")
    } catch (error) {
      console.error("Error al enviar notificación masiva de nuevo servicio:", error)
      throw error
    }
  },
}

export default {
  servicesNotifications,
}
