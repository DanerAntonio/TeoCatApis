import { sendEmail } from "../../Email.js"

// Manejo de notificaciones para customers
export const customersNotifications = {
  // ✅ CORRECCIÓN 1: Enviar correo de bienvenida con manejo de errores correcto
  sendClientWelcomeEmail: async (email, nombre, password) => {
    try {
      const loginUrl = `${process.env.FRONTEND_URL}/login`

      await sendEmail({
        to: email,
        subject: "Bienvenido a TeoCat - Información de acceso",
        text: `Hola ${nombre},

Se ha creado una cuenta para ti en TeoCat como cliente. Tus credenciales de acceso son:

Correo: ${email}
Contraseña temporal: ${password}

Por seguridad, deberás cambiar esta contraseña en las próximas 24 horas.

Puedes iniciar sesión aquí: ${loginUrl}

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Bienvenido a TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Se ha creado una cuenta para ti en TeoCat como cliente. Tus credenciales de acceso son:</p>
          <p><strong>Correo:</strong> ${email}<br>
          <strong>Contraseña temporal:</strong> ${password}</p>
          <p><strong>Por seguridad, deberás cambiar esta contraseña en las próximas 24 horas.</strong></p>
          <p><a href="${loginUrl}" target="_blank">Iniciar sesión</a></p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Correo de bienvenida de cliente enviado a ${email}`)
      // ✅ CORRECCIÓN: Retornar true como en AuthNotifications
      return true
    } catch (error) {
      console.error("Error al enviar correo de bienvenida de cliente:", error)
      // ✅ CORRECCIÓN: Propagar error para manejo adecuado
      throw error
    }
  },

  // ✅ CORRECCIÓN 2: Notificar actualización con manejo de errores correcto
  sendClientUpdateNotification: async (email, nombre, cambios) => {
    try {
      const cambiosTexto = cambios.join(", ")

      await sendEmail({
        to: email,
        subject: "Actualización de datos - TeoCat",
        text: `Hola ${nombre},

Tus datos han sido actualizados en TeoCat.

Cambios realizados: ${cambiosTexto}

Si no realizaste estos cambios, contacta inmediatamente al administrador.

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Actualización de datos - TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Tus datos han sido actualizados en TeoCat.</p>
          <p><strong>Cambios realizados:</strong> ${cambiosTexto}</p>
          <p><strong>Si no realizaste estos cambios, contacta inmediatamente al administrador.</strong></p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Notificación de actualización enviada a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar notificación de actualización:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 3: Notificar registro de mascota con manejo de errores correcto
  sendPetRegistrationNotification: async (email, nombreCliente, nombreMascota, especie) => {
    try {
      await sendEmail({
        to: email,
        subject: "Nueva mascota registrada - TeoCat",
        text: `Hola ${nombreCliente},

Se ha registrado exitosamente una nueva mascota en tu cuenta de TeoCat.

Nombre de la mascota: ${nombreMascota}
Especie: ${especie}

Ya puedes agendar citas y servicios para ${nombreMascota}.

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Nueva mascota registrada - TeoCat</h2>
          <p>Hola ${nombreCliente},</p>
          <p>Se ha registrado exitosamente una nueva mascota en tu cuenta de TeoCat.</p>
          <p><strong>Nombre de la mascota:</strong> ${nombreMascota}<br>
          <strong>Especie:</strong> ${especie}</p>
          <p>Ya puedes agendar citas y servicios para ${nombreMascota}.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Notificación de registro de mascota enviada a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar notificación de registro de mascota:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 4: Notificar eliminación de cuenta con manejo de errores correcto
  sendAccountDeletionNotification: async (email, nombre) => {
    try {
      await sendEmail({
        to: email,
        subject: "Cuenta eliminada - TeoCat",
        text: `Hola ${nombre},

Tu cuenta de cliente en TeoCat ha sido eliminada.

Si esto fue un error o tienes alguna pregunta, contacta al administrador.

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Cuenta eliminada - TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Tu cuenta de cliente en TeoCat ha sido eliminada.</p>
          <p>Si esto fue un error o tienes alguna pregunta, contacta al administrador.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Notificación de eliminación de cuenta enviada a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar notificación de eliminación:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 5: Notificar cambio de estado de mascota con manejo de errores correcto
  sendPetStatusChangeNotification: async (email, nombreCliente, nombreMascota, nuevoEstado) => {
    try {
      const estadoTexto = nuevoEstado ? "activada" : "desactivada"

      await sendEmail({
        to: email,
        subject: `Estado de mascota actualizado - TeoCat`,
        text: `Hola ${nombreCliente},

El estado de tu mascota ${nombreMascota} ha sido ${estadoTexto} en TeoCat.

${
  nuevoEstado
    ? `${nombreMascota} ahora está disponible para agendar citas y servicios.`
    : `${nombreMascota} ya no está disponible para nuevas citas y servicios.`
}

Si tienes alguna pregunta, contacta al administrador.

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Estado de mascota actualizado - TeoCat</h2>
          <p>Hola ${nombreCliente},</p>
          <p>El estado de tu mascota <strong>${nombreMascota}</strong> ha sido <strong>${estadoTexto}</strong> en TeoCat.</p>
          <p>${
            nuevoEstado
              ? `${nombreMascota} ahora está disponible para agendar citas y servicios.`
              : `${nombreMascota} ya no está disponible para nuevas citas y servicios.`
          }</p>
          <p>Si tienes alguna pregunta, contacta al administrador.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Notificación de cambio de estado de mascota enviada a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar notificación de cambio de estado:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 6: Enviar recordatorio de cita con manejo de errores correcto
  sendAppointmentReminder: async (email, nombreCliente, nombreMascota, fechaCita, notas = "") => {
    try {
      const fechaFormateada = new Date(fechaCita).toLocaleString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      await sendEmail({
        to: email,
        subject: "Recordatorio de cita - TeoCat",
        text: `Hola ${nombreCliente},

Te recordamos que tienes una cita programada para tu mascota ${nombreMascota}.

Fecha y hora: ${fechaFormateada}
${notas ? `Notas: ${notas}` : ""}

Por favor, llega 10 minutos antes de la hora programada.

Saludos,
Equipo TeoCat`,
        html: `
          <h2>Recordatorio de cita - TeoCat</h2>
          <p>Hola ${nombreCliente},</p>
          <p>Te recordamos que tienes una cita programada para tu mascota <strong>${nombreMascota}</strong>.</p>
          <p><strong>Fecha y hora:</strong> ${fechaFormateada}</p>
          ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ""}
          <p>Por favor, llega 10 minutos antes de la hora programada.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Recordatorio de cita enviado a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar recordatorio de cita:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 7: ELIMINAR función sendEmailAsync problemática
  // La función sendEmailAsync fue eliminada porque causaba problemas de manejo de errores
  // Ahora se usan las funciones directamente con await en el controlador
}
