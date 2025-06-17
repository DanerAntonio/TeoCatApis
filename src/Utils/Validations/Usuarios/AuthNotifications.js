import { sendEmail } from "../../Email.js"

// Manejo de notificaciones para autenticación
export const authNotifications = {
  // ✅ CORRECCIÓN 7: Enviar correo de bienvenida con manejo de errores mejorado
  sendUserWelcomeEmail: async (email, nombre, password, rolNombre) => {
    try {
      const loginUrl = `${process.env.FRONTEND_URL}/login`

      const emailResult = await sendEmail({
        to: email,
        subject: "Bienvenido a TeoCat - Información de acceso",
        text: `Hola ${nombre},\n\nSe ha creado una cuenta para ti en TeoCat con rol de ${rolNombre}. Tus credenciales de acceso son:\n\nCorreo: ${email}\nContraseña temporal: ${password}\n\nPor seguridad, deberás cambiar esta contraseña en las próximas 24 horas.\n\nPuedes iniciar sesión aquí: ${loginUrl}\n\nSaludos,\nEquipo TeoCat`,
        html: `
          <h2>Bienvenido a TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Se ha creado una cuenta para ti en TeoCat con rol de <strong>${rolNombre}</strong>. Tus credenciales de acceso son:</p>
          <p><strong>Correo:</strong> ${email}<br>
          <strong>Contraseña temporal:</strong> ${password}</p>
          <p><strong>Por seguridad, deberás cambiar esta contraseña en las próximas 24 horas.</strong></p>
          <p><a href="${loginUrl}" target="_blank">Iniciar sesión</a></p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Correo de bienvenida enviado a ${email}`)
      // ✅ CORRECCIÓN: Retornar boolean como en el archivo antiguo
      return true
    } catch (error) {
      console.error("Error al enviar correo de bienvenida:", error)
      // ✅ CORRECCIÓN: Propagar error como en el archivo antiguo
      throw error
    }
  },

  // ✅ CORRECCIÓN 8: Enviar correo de recuperación con manejo mejorado
  sendPasswordResetEmail: async (email, nombre, token) => {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

      await sendEmail({
        to: email,
        subject: "Recuperación de Contraseña - TeoCat",
        text: `Hola ${nombre},\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no solicitaste este cambio, ignora este correo.\n\nSaludos,\nEquipo TeoCat`,
        html: `
          <h2>Recuperación de Contraseña - TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
          <p><a href="${resetUrl}" target="_blank">Restablecer contraseña</a></p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Correo de recuperación enviado a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar correo de recuperación:", error)
      throw error
    }
  },

  // Reenviar correo de recuperación de contraseña
  resendPasswordResetEmail: async (email, nombre, token) => {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

      await sendEmail({
        to: email,
        subject: "Recuperación de Contraseña - TeoCat (Reenvío)",
        text: `Hola ${nombre},\n\nHas solicitado reenviar el enlace para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no solicitaste este cambio, ignora este correo.\n\nSaludos,\nEquipo TeoCat`,
        html: `
          <h2>Recuperación de Contraseña - TeoCat (Reenvío)</h2>
          <p>Hola ${nombre},</p>
          <p>Has solicitado reenviar el enlace para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
          <p><a href="${resetUrl}" target="_blank">Restablecer contraseña</a></p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Correo de recuperación reenviado a ${email}`)
      return true
    } catch (error) {
      console.error("Error al reenviar correo de recuperación:", error)
      throw error
    }
  },

  // Notificar cambio de contraseña exitoso
  sendPasswordChangeConfirmation: async (email, nombre) => {
    try {
      await sendEmail({
        to: email,
        subject: "Contraseña actualizada - TeoCat",
        text: `Hola ${nombre},\n\nTu contraseña ha sido actualizada exitosamente.\n\nSi no realizaste este cambio, contacta inmediatamente al administrador.\n\nSaludos,\nEquipo TeoCat`,
        html: `
          <h2>Contraseña actualizada - TeoCat</h2>
          <p>Hola ${nombre},</p>
          <p>Tu contraseña ha sido actualizada exitosamente.</p>
          <p><strong>Si no realizaste este cambio, contacta inmediatamente al administrador.</strong></p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      console.log(`Confirmación de cambio de contraseña enviada a ${email}`)
      return true
    } catch (error) {
      console.error("Error al enviar confirmación de cambio de contraseña:", error)
      throw error
    }
  },

  // ✅ CORRECCIÓN 9: Eliminar función sendEmailAsync (innecesaria)
  // La función sendEmailAsync se eliminó porque causaba problemas de manejo de errores
  // Ahora se usan las funciones directamente con await en el controlador
}
