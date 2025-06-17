// register.controller.js - Versión actualizada
import { usuariosModel, rolesModel } from "../../Models/AuthService/auth.model.js"
import { clientesModel } from "../../Models/CustomerService/customers.model.js"
import { uploadToCloudinary } from "../../Utils/Cloudinary.js"
import { sendEmail } from "../../Utils/Email.js"

// Controlador para registro público
export const registerController = {
  // Registrar un nuevo usuario
  register: async (req, res) => {
    try {
      const usuarioData = req.body

      // Validar datos requeridos
      if (
        !usuarioData.Documento ||
        !usuarioData.Nombre ||
        !usuarioData.Apellido ||
        !usuarioData.Correo ||
        !usuarioData.Password
      ) {
        return res.status(400).json({
          message: "Documento, Nombre, Apellido, Correo y Contraseña son campos requeridos",
        })
      }

      // Verificar si el correo ya está registrado
      const existingUser = await usuariosModel.getByEmail(usuarioData.Correo)
      if (existingUser) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado" })
      }

      // Verificar si se está creando un Super Administrador
      const isSuperAdmin = usuarioData.superAdminCode === process.env.SUPER_ADMIN_CODE

      if (isSuperAdmin) {
        // Verificar si ya existe un Super Administrador
        const superAdmins = await usuariosModel.getByRol(1)

        if (superAdmins && superAdmins.length > 0) {
          return res.status(400).json({ message: "Ya existe un Super Administrador en el sistema" })
        }

        // Asignar rol de Super Administrador (ID 1)
        usuarioData.IdRol = 1
      } else {
        // Asignar rol de cliente por defecto (ID 2)
        const rolCliente = await rolesModel.getById(2)
        if (!rolCliente) {
          return res.status(500).json({ message: "Error al asignar rol de cliente" })
        }
        usuarioData.IdRol = rolCliente.IdRol
      }

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          const result = await uploadToCloudinary(req.file.path, "usuarios")
          usuarioData.FotoURL = result.secure_url
        } catch (uploadError) {
          console.error("Error al subir imagen a Cloudinary:", uploadError)
          // Continuar sin imagen si hay error
        }
      }

      // Crear usuario
      const nuevoUsuario = await usuariosModel.create(usuarioData)

      // Crear cliente asociado al usuario (ahora esto lo hace el trigger en la BD)
      // No es necesario crear el cliente manualmente, el trigger se encarga de esto

      // Enviar correo de bienvenida
      try {
        await sendEmail({
          to: usuarioData.Correo,
          subject: "Bienvenido a TeoCat",
          text: `Hola ${usuarioData.Nombre},\n\nGracias por registrarte en TeoCat. Tu cuenta ha sido creada exitosamente.\n\nSaludos,\nEquipo TeoCat`,
          html: `
            <h2>Bienvenido a TeoCat</h2>
            <p>Hola ${usuarioData.Nombre},</p>
            <p>Gracias por registrarte en TeoCat. Tu cuenta ha sido creada exitosamente.</p>
            <p>Saludos,<br>Equipo TeoCat</p>
          `,
        })
      } catch (emailError) {
        console.error("Error al enviar correo de bienvenida:", emailError)
        // Continuar con el registro aunque falle el envío del correo
      }

      // No devolver datos sensibles
      const { Password, ...usuarioSinPassword } = nuevoUsuario

      res.status(201).json({
        message: "Usuario registrado correctamente",
        usuario: usuarioSinPassword,
      })
    } catch (error) {
      console.error("Error al registrar usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

export default registerController