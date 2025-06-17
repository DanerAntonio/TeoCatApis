import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Función para enviar correos electrónicos
export const sendEmail = async (options) => {
  try {
    // Configurar el mensaje
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions)
    console.log("Correo enviado:", info.messageId)
    return info
  } catch (error) {
    console.error("Error al enviar correo:", error)
    throw error
  }
}

// Verificar la configuración del correo
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify()
    console.log("Configuración de correo verificada correctamente")
    return true
  } catch (error) {
    console.error("Error en la configuración de correo:", error)
    return false
  }
}

export default { sendEmail, verifyEmailConfig }
