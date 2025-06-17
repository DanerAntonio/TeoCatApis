import { sendEmail } from "../../Email.js"

// Manejo de notificaciones por correo electrónico
export const notificationsEmails = {
  // Enviar correo de notificación genérica
  sendNotificationEmail: async (recipient, notificacion) => {
    try {
      if (!recipient.email) {
        return { success: false, message: "Correo electrónico no proporcionado" }
      }

      const emailContent = notificationsEmails.generateEmailContent(notificacion, recipient)

      await sendEmail({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      })

      console.log(`Correo de notificación enviado a ${recipient.email}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar correo de notificación:", error)
      return { success: false, error: error.message }
    }
  },

  // Generar contenido del correo según el tipo de notificación
  generateEmailContent: (notificacion, recipient) => {
    const baseSubject = notificacion.Titulo
    const baseName = `${recipient.nombre} ${recipient.apellido}`

    switch (notificacion.TipoNotificacion) {
      case "StockBajo":
        return notificationsEmails.generateLowStockEmailContent(notificacion, baseName)

      case "Vencimiento":
        return notificationsEmails.generateExpirationEmailContent(notificacion, baseName)

      case "Cita":
        return notificationsEmails.generateAppointmentEmailContent(notificacion, baseName)

      case "AnulacionVenta":
        return notificationsEmails.generateSaleCancellationEmailContent(notificacion, baseName)

      case "Comprobante":
        return notificationsEmails.generateReceiptEmailContent(notificacion, baseName)

      case "ReseñaProducto":
      case "ReseñaServicio":
      case "ReseñaGeneral":
        return notificationsEmails.generateReviewEmailContent(notificacion, baseName)

      default:
        return notificationsEmails.generateGenericEmailContent(notificacion, baseName)
    }
  },

  // Contenido para notificación de stock bajo
  generateLowStockEmailContent: (notificacion, recipientName) => {
    return {
      subject: `🚨 ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Esta es una notificación de alta prioridad que requiere atención inmediata.

Por favor, tome las medidas necesarias para reabastecer el inventario.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #721c24; margin: 0;">🚨 ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>⚠️ Esta es una notificación de alta prioridad que requiere atención inmediata.</strong></p>
          </div>
          <p>Por favor, tome las medidas necesarias para reabastecer el inventario.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido para notificación de vencimiento
  generateExpirationEmailContent: (notificacion, recipientName) => {
    return {
      subject: `⏰ ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Esta es una alerta de vencimiento que requiere su atención.

Por favor, revise los productos próximos a vencer y tome las medidas correspondientes.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0;">⏰ ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>⚠️ Esta es una alerta de vencimiento que requiere su atención.</strong></p>
          </div>
          <p>Por favor, revise los productos próximos a vencer y tome las medidas correspondientes.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido para notificación de cita
  generateAppointmentEmailContent: (notificacion, recipientName) => {
    return {
      subject: `📅 ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Recordatorio importante sobre su cita programada.

Por favor, llegue 10 minutos antes de la hora programada.

Si necesita reprogramar o cancelar, contacte con nosotros con anticipación.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #0c5460; margin: 0;">📅 ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>📝 Recordatorio importante sobre su cita programada.</strong></p>
          </div>
          <p><strong>Por favor, llegue 10 minutos antes de la hora programada.</strong></p>
          <p>Si necesita reprogramar o cancelar, contacte con nosotros con anticipación.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido para notificación de anulación de venta
  generateSaleCancellationEmailContent: (notificacion, recipientName) => {
    return {
      subject: `❌ ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Se ha procesado una anulación de venta que requiere su conocimiento.

Si tiene alguna pregunta sobre esta anulación, no dude en contactarnos.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #721c24; margin: 0;">❌ ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>ℹ️ Se ha procesado una anulación de venta que requiere su conocimiento.</strong></p>
          </div>
          <p>Si tiene alguna pregunta sobre esta anulación, no dude en contactarnos.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido para notificación de comprobante
  generateReceiptEmailContent: (notificacion, recipientName) => {
    return {
      subject: `🧾 ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Su comprobante ha sido generado y está disponible.

Puede descargar o imprimir su comprobante cuando lo necesite.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #155724; margin: 0;">🧾 ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>📄 Su comprobante ha sido generado y está disponible.</strong></p>
          </div>
          <p>Puede descargar o imprimir su comprobante cuando lo necesite.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido para notificaciones de reseñas
  generateReviewEmailContent: (notificacion, recipientName) => {
    return {
      subject: `⭐ ${notificacion.Titulo}`,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Hemos recibido una nueva reseña que puede ser de su interés.

Agradecemos su participación en nuestro sistema de reseñas.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0;">⭐ ${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>💬 Hemos recibido una nueva reseña que puede ser de su interés.</strong></p>
          </div>
          <p>Agradecemos su participación en nuestro sistema de reseñas.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // Contenido genérico para otros tipos de notificación
  generateGenericEmailContent: (notificacion, recipientName) => {
    return {
      subject: notificacion.Titulo,
      text: `Hola ${recipientName},

${notificacion.Mensaje}

Esta es una notificación del sistema TeoCat.

Si tiene alguna pregunta, no dude en contactarnos.

Saludos,
Equipo TeoCat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #e2e3e5; border: 1px solid #d6d8db; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #383d41; margin: 0;">${notificacion.Titulo}</h2>
          </div>
          <p>Hola <strong>${recipientName}</strong>,</p>
          <p>${notificacion.Mensaje}</p>
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 10px; margin: 15px 0;">
            <p style="margin: 0;"><strong>📢 Esta es una notificación del sistema TeoCat.</strong></p>
          </div>
          <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
        </div>
      `,
    }
  },

  // ✅ CORRECCIÓN: Eliminar sendEmailAsync problemático y reemplazar con función síncrona
  // ELIMINADO: sendEmailAsync - Era problemático con setTimeout()

  // ✅ NUEVA FUNCIÓN: Envío síncrono con manejo de errores mejorado
  sendNotificationEmailSync: async (recipient, notificacion) => {
    try {
      const result = await notificationsEmails.sendNotificationEmail(recipient, notificacion)
      return result
    } catch (error) {
      console.error("Error en envío síncrono de correo:", error)
      return { success: false, error: error.message }
    }
  },

  // Enviar correos a múltiples destinatarios
  sendBulkEmails: async (recipients, notificacion) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const recipient of recipients) {
      try {
        if (!recipient.email) {
          results.failed++
          results.errors.push({
            recipient: recipient.nombre || "Desconocido",
            error: "Correo electrónico no proporcionado",
          })
          continue
        }

        const emailResult = await notificationsEmails.sendNotificationEmail(recipient, notificacion)

        if (emailResult.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push({
            recipient: recipient.email,
            error: emailResult.error || emailResult.message,
          })
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          recipient: recipient.email || "Desconocido",
          error: error.message,
        })
      }
    }

    return results
  },

  // Enviar resumen diario de notificaciones
  sendDailyNotificationSummary: async (recipient, notificaciones) => {
    try {
      if (!recipient.email || !notificaciones || notificaciones.length === 0) {
        return { success: false, message: "No hay notificaciones para enviar" }
      }

      const groupedNotifications = notificaciones.reduce((groups, notif) => {
        const tipo = notif.TipoNotificacion
        if (!groups[tipo]) {
          groups[tipo] = []
        }
        groups[tipo].push(notif)
        return groups
      }, {})

      const totalNotifications = notificaciones.length
      const recipientName = `${recipient.nombre} ${recipient.apellido}`

      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">📊 Resumen Diario de Notificaciones</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
            <p>Hola <strong>${recipientName}</strong>,</p>
            <p>Aquí tienes un resumen de tus notificaciones del día:</p>
            <p><strong>Total de notificaciones: ${totalNotifications}</strong></p>
            <hr style="margin: 20px 0;">
      `

      Object.keys(groupedNotifications).forEach((tipo) => {
        const notifs = groupedNotifications[tipo]
        htmlContent += `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">
              ${tipo} (${notifs.length})
            </h3>
            <ul style="list-style-type: none; padding: 0;">
        `

        notifs.forEach((notif) => {
          const prioridad = notif.Prioridad === "Alta" ? "🔴" : notif.Prioridad === "Media" ? "🟡" : "🟢"
          htmlContent += `
            <li style="margin-bottom: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 3px;">
              ${prioridad} <strong>${notif.Titulo}</strong><br>
              <small style="color: #6c757d;">${notif.Mensaje.substring(0, 100)}${notif.Mensaje.length > 100 ? "..." : ""}</small>
            </li>
          `
        })

        htmlContent += `
            </ul>
          </div>
        `
      })

      htmlContent += `
            <hr style="margin: 20px 0;">
            <p>Para ver todas tus notificaciones, inicia sesión en el sistema TeoCat.</p>
            <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
          </div>
        </div>
      `

      await sendEmail({
        to: recipient.email,
        subject: `📊 Resumen Diario - ${totalNotifications} notificaciones`,
        text: `Resumen diario de notificaciones para ${recipientName}. Total: ${totalNotifications} notificaciones.`,
        html: htmlContent,
      })

      console.log(`Resumen diario enviado a ${recipient.email}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar resumen diario:", error)
      return { success: false, error: error.message }
    }
  },

  // Enviar notificación de recordatorio
  sendReminderNotification: async (recipient, notificacion, reminderType = "general") => {
    try {
      if (!recipient.email) {
        return { success: false, message: "Correo electrónico no proporcionado" }
      }

      const recipientName = `${recipient.nombre} ${recipient.apellido}`
      const subject = `🔔 Recordatorio: ${notificacion.Titulo}`

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #17a2b8; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">🔔 Recordatorio</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
            <p>Hola <strong>${recipientName}</strong>,</p>
            <p>Te recordamos sobre la siguiente notificación:</p>
            <div style="background-color: #f8f9fa; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #495057;">${notificacion.Titulo}</h3>
              <p style="margin-bottom: 0;">${notificacion.Mensaje}</p>
            </div>
            <p>Por favor, revisa esta notificación cuando tengas oportunidad.</p>
            <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
          </div>
        </div>
      `

      await sendEmail({
        to: recipient.email,
        subject: subject,
        text: `Recordatorio: ${notificacion.Titulo}. ${notificacion.Mensaje}`,
        html: htmlContent,
      })

      console.log(`Recordatorio enviado a ${recipient.email}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar recordatorio:", error)
      return { success: false, error: error.message }
    }
  },
}
