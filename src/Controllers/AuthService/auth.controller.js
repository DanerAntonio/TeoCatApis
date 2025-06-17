import {permisosModel,rolesModel,rolPermisoModel,usuariosModel,sesionesUsuariosModel,tokensRecuperacionModel,} from "../../Models/AuthService/auth.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { sendEmail } from "../../Utils/Email.js"
import { clientesModel } from "../../Models/CustomerService/customers.model.js"
import { uploadToCloudinary, deleteFromCloudinary } from "../../Utils/Cloudinary.js"
import permissionCache from "../../Utils/PermissionCache.js"
import { query } from "../../Config/Database.js"

// Función para generar contraseña temporal
function generateTemporaryPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""

  // Asegurar al menos un carácter de cada tipo
  password += charset.substring(0, 26).charAt(Math.floor(Math.random() * 26)) // minúscula
  password += charset.substring(26, 52).charAt(Math.floor(Math.random() * 26)) // mayúscula
  password += charset.substring(52, 62).charAt(Math.floor(Math.random() * 10)) // número
  password += charset.substring(62).charAt(Math.floor(Math.random() * (charset.length - 62))) // especial

  // Completar con caracteres aleatorios
  for (let i = 4; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }

  // Mezclar los caracteres
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("")
}

// Función para enviar correo de bienvenida a usuarios
async function sendUserWelcomeEmail(email, nombre, password, rolNombre) {
  try {
    const loginUrl = `${process.env.FRONTEND_URL}/login`

    await sendEmail({
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
    return true
  } catch (error) {
    console.error("Error al enviar correo de bienvenida:", error)
    throw error
  }
}

// Controlador para permisos
export const permisosController = {
  // Obtener todos los permisos
  getAll: async (req, res) => {
    try {
      const permisos = await permisosModel.getAll()
      res.status(200).json(permisos)
    } catch (error) {
      console.error("Error al obtener permisos:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un permiso por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const permiso = await permisosModel.getById(id)

      if (!permiso) {
        return res.status(404).json({ message: "Permiso no encontrado" })
      }

      res.status(200).json(permiso)
    } catch (error) {
      console.error("Error al obtener permiso:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo permiso
  create: async (req, res) => {
    try {
      const permisoData = req.body

      // Validar datos
      if (!permisoData.NombrePermiso) {
        return res.status(400).json({ message: "El nombre del permiso es requerido" })
      }

      // Crear permiso
      const nuevoPermiso = await permisosModel.create(permisoData)

      // Asignar automáticamente al Super Administrador (rol ID 1)
      await rolPermisoModel.create({
        IdRol: 1,
        IdPermiso: nuevoPermiso.id,
      })

      res.status(201).json(nuevoPermiso)
    } catch (error) {
      console.error("Error al crear permiso:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar un permiso
  update: async (req, res) => {
    try {
      const { id } = req.params
      const permisoData = req.body

      // Verificar si el permiso existe
      const permiso = await permisosModel.getById(id)
      if (!permiso) {
        return res.status(404).json({ message: "Permiso no encontrado" })
      }

      // Validar datos
      if (!permisoData.NombrePermiso) {
        return res.status(400).json({ message: "El nombre del permiso es requerido" })
      }

      // Actualizar permiso
      const updatedPermiso = await permisosModel.update(id, permisoData)

      res.status(200).json(updatedPermiso)
    } catch (error) {
      console.error("Error al actualizar permiso:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un permiso
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el permiso existe
      const permiso = await permisosModel.getById(id)
      if (!permiso) {
        return res.status(404).json({ message: "Permiso no encontrado" })
      }

      // Eliminar permiso
      await permisosModel.delete(id)

      res.status(200).json({ message: "Permiso eliminado correctamente" })
    } catch (error) {
      console.error("Error al eliminar permiso:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Buscar permisos por nombre
  searchByName: async (req, res) => {
    try {
      const { nombre } = req.query

      if (!nombre) {
        return res.status(400).json({ message: "El parámetro nombre es requerido" })
      }

      const permisos = await permisosModel.searchByName(nombre)

      res.status(200).json(permisos)
    } catch (error) {
      console.error("Error al buscar permisos:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para roles
export const rolesController = {
  // Obtener todos los roles
  getAll: async (req, res) => {
    try {
      const roles = await rolesModel.getAll()
      res.status(200).json(roles)
    } catch (error) {
      console.error("Error al obtener roles:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un rol por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const rol = await rolesModel.getById(id)

      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      res.status(200).json(rol)
    } catch (error) {
      console.error("Error al obtener rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo rol
  create: async (req, res) => {
    try {
      const rolData = req.body

      // Validar datos
      if (!rolData.NombreRol) {
        return res.status(400).json({ message: "El nombre del rol es requerido" })
      }

      // Crear rol
      const nuevoRol = await rolesModel.create(rolData)

      res.status(201).json(nuevoRol)
    } catch (error) {
      console.error("Error al crear rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar un rol
  update: async (req, res) => {
    try {
      const { id } = req.params
      const rolData = req.body

      // Verificar si el rol existe
      const rol = await rolesModel.getById(id)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // Validar datos
      if (!rolData.NombreRol) {
        return res.status(400).json({ message: "El nombre del rol es requerido" })
      }

      // Actualizar rol
      const updatedRol = await rolesModel.update(id, rolData)

      res.status(200).json(updatedRol)
    } catch (error) {
      console.error("Error al actualizar rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Cambiar estado de un rol
changeStatus: async (req, res) => {
  try {
    const { id } = req.params
    const { Estado } = req.body

    if (Estado === undefined) {
      return res.status(400).json({ message: "El estado es requerido" })
    }

    // Verificar si el rol existe
    const rol = await rolesModel.getById(id)
    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" })
    }

    // No permitir desactivar el rol de Super Administrador
    if (id == 1 && Estado === false) {
      return res.status(403).json({ message: "No se puede desactivar el rol de Super Administrador" })
    }

    // Cambiar estado
    const result = await rolesModel.changeStatus(id, Estado)

    res.status(200).json(result)
  } catch (error) {
    console.error("Error al cambiar estado del rol:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
},

  // Eliminar un rol
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el rol existe
      const rol = await rolesModel.getById(id)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // No permitir eliminar el rol de Super Administrador
      if (id == 1) {
        return res.status(403).json({ message: "No se puede eliminar el rol de Super Administrador" })
      }

      // Eliminar permisos asociados al rol
      await rolPermisoModel.deleteByRol(id)

      // Eliminar rol
      await rolesModel.delete(id)

      res.status(200).json({ message: "Rol eliminado correctamente" })
    } catch (error) {
      console.error("Error al eliminar rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Buscar roles por nombre
  searchByName: async (req, res) => {
    try {
      const { nombre } = req.query

      if (!nombre) {
        return res.status(400).json({ message: "El parámetro nombre es requerido" })
      }

      const roles = await rolesModel.searchByName(nombre)

      res.status(200).json(roles)
    } catch (error) {
      console.error("Error al buscar roles:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener permisos de un rol
  getPermisos: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el rol existe
      const rol = await rolesModel.getById(id)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // Si es Super Administrador, devolver todos los permisos
      let permisos
      if (id == 1) {
        permisos = await permisosModel.getAll()
      } else {
        permisos = await rolesModel.getPermisos(id)
      }

      res.status(200).json(permisos)
    } catch (error) {
      console.error("Error al obtener permisos del rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para la relación Rol-Permiso
export const rolPermisoController = {
  // Obtener todas las relaciones rol-permiso
  getAll: async (req, res) => {
    try {
      const relaciones = await rolPermisoModel.getAll()
      res.status(200).json(relaciones)
    } catch (error) {
      console.error("Error al obtener relaciones rol-permiso:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Asignar un permiso a un rol
  assignPermiso: async (req, res) => {
    try {
      const { idRol, idPermiso } = req.params

      // Verificar si el rol existe
      const rol = await rolesModel.getById(idRol)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // Verificar si el permiso existe
      const permiso = await permisosModel.getById(idPermiso)
      if (!permiso) {
        return res.status(404).json({ message: "Permiso no encontrado" })
      }

      // Verificar si ya existe la relación
      const relacion = await rolPermisoModel.getById(idRol, idPermiso)
      if (relacion) {
        return res.status(400).json({ message: "El permiso ya está asignado a este rol" })
      }

      // Crear relación
      const nuevaRelacion = await rolPermisoModel.create({
        IdRol: idRol,
        IdPermiso: idPermiso,
      })

      // Limpiar la caché para que los cambios se apliquen inmediatamente
      permissionCache.clearCache()

      res.status(201).json(nuevaRelacion)
    } catch (error) {
      console.error("Error al asignar permiso a rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un permiso de un rol
  removePermiso: async (req, res) => {
    try {
      const { idRol, idPermiso } = req.params

      // No permitir eliminar permisos del Super Administrador
      if (idRol == 1) {
        return res.status(403).json({ message: "No se pueden eliminar permisos del rol Super Administrador" })
      }

      // Verificar si existe la relación
      const relacion = await rolPermisoModel.getById(idRol, idPermiso)
      if (!relacion) {
        return res.status(404).json({ message: "Relación rol-permiso no encontrada" })
      }

      // Eliminar relación
      await rolPermisoModel.delete(idRol, idPermiso)

      res.status(200).json({ message: "Permiso eliminado del rol correctamente" })
    } catch (error) {
      console.error("Error al eliminar permiso de rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Asignar múltiples permisos a un rol
  assignMultiplePermisos: async (req, res) => {
    try {
      const { idRol } = req.params
      const { permisos } = req.body

      if (!permisos || !Array.isArray(permisos)) {
        return res.status(400).json({ message: "Se requiere un array de IDs de permisos" })
      }

      // Verificar si el rol existe
      const rol = await rolesModel.getById(idRol)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // No permitir modificar permisos del Super Administrador
      if (idRol == 1) {
        return res.status(403).json({ message: "No se pueden modificar los permisos del rol Super Administrador" })
      }

      // Eliminar permisos actuales
      await rolPermisoModel.deleteByRol(idRol)

      // Asignar nuevos permisos
      const asignados = []
      for (const idPermiso of permisos) {
        // Verificar si el permiso existe
        const permiso = await permisosModel.getById(idPermiso)
        if (permiso) {
          await rolPermisoModel.create({
            IdRol: idRol,
            IdPermiso: idPermiso,
          })
          asignados.push(idPermiso)
        }
      }

      // Limpiar la caché para todos los usuarios
      // Esto garantiza que los cambios de permisos se apliquen inmediatamente
      permissionCache.clearCache()

      res.status(200).json({
        message: "Permisos asignados correctamente",
        permisosAsignados: asignados,
      })
    } catch (error) {
      console.error("Error al asignar múltiples permisos:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para usuarios
export const usuariosController = {
  // Obtener todos los usuarios
  getAll: async (req, res) => {
    try {
      // Modificar la consulta para incluir explícitamente el campo Documento
      const usuarios = await query(`
        SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, 
               u.FechaCreacion, u.Estado, u.Foto, u.Documento, r.IdRol, r.NombreRol
        FROM Usuarios u
        JOIN Roles r ON u.IdRol = r.IdRol
        ORDER BY u.Apellido, u.Nombre
      `)

      // Procesar los resultados para asegurar la estructura correcta
      const processedUsuarios = usuarios.map((usuario) => {
        return {
          ...usuario,
          Documento: usuario.Documento || "",
          Rol: {
            IdRol: usuario.IdRol,
            NombreRol: usuario.NombreRol,
          },
        }
      })

      console.log("Usuarios enviados al cliente:", processedUsuarios)
      res.status(200).json(processedUsuarios)
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un usuario por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      // Modificar la consulta para incluir explícitamente el campo Documento
      const usuarios = await query(
        `
        SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, 
               u.FechaCreacion, u.Estado, u.Foto, u.Documento, r.IdRol, r.NombreRol
        FROM Usuarios u
        JOIN Roles r ON u.IdRol = r.IdRol
        WHERE u.IdUsuario = ?
      `,
        [id],
      )

      if (usuarios.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      const usuario = usuarios[0]

      // Procesar el resultado para asegurar la estructura correcta
      const processedUsuario = {
        ...usuario,
        Documento: usuario.Documento || "",
        Rol: {
          IdRol: usuario.IdRol,
          NombreRol: usuario.NombreRol,
        },
      }

      res.status(200).json(processedUsuario)
    } catch (error) {
      console.error("Error al obtener usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo usuario
create: async (req, res) => {
  try {
    const usuarioData = req.body
    const sendTempPassword = req.body.sendTempPassword !== false // Por defecto, enviar contraseña temporal

    // Validar datos
    if (
      !usuarioData.Nombre ||
      !usuarioData.Apellido ||
      !usuarioData.Correo ||
      !usuarioData.IdRol ||
      !usuarioData.Documento
    ) {
      return res.status(400).json({ message: "Nombre, Apellido, Correo, Documento e IdRol son campos requeridos" })
    }

    // Verificar si el correo ya está registrado
    const existingUser = await usuariosModel.getByEmail(usuarioData.Correo)
    if (existingUser) {
      return res.status(400).json({ message: "El correo electrónico ya está registrado" })
    }

    // Verificar si el rol existe
    const rol = await rolesModel.getById(usuarioData.IdRol)
    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" })
    }

    // Si se solicita enviar contraseña temporal o no se proporciona contraseña
    if (sendTempPassword || !usuarioData.Password) {
      // Generar una contraseña temporal aleatoria
      const tempPassword = generateTemporaryPassword(10)
      usuarioData.Password = tempPassword
    }

    // Procesar imagen si se proporciona
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path, "usuarios")
        usuarioData.Foto = result.secure_url
      } catch (uploadError) {
        console.error("Error al subir imagen a Cloudinary:", uploadError)
        // Continuar sin imagen si hay error
      }
    }

    // Crear usuario
    const nuevoUsuario = await usuariosModel.create(usuarioData)

    // Si se solicitó enviar contraseña temporal, enviar correo y crear token
    if (sendTempPassword || !req.body.Password) {
      try {
        // Enviar correo con credenciales temporales
        await sendUserWelcomeEmail(usuarioData.Correo, usuarioData.Nombre, usuarioData.Password, rol.NombreRol)

        // Crear token de recuperación que expira en 24 horas para forzar cambio de contraseña
        const token = crypto.randomBytes(32).toString("hex")
        const expiracion = new Date()
        expiracion.setHours(expiracion.getHours() + 24)

        await tokensRecuperacionModel.create({
          IdUsuario: nuevoUsuario.id,
          Token: token,
          FechaCreacion: new Date(),
          FechaExpiracion: expiracion,
          Utilizado: false,
        })
      } catch (emailError) {
        console.error("Error al enviar correo o crear token:", emailError)
        // Continuar con la creación del usuario aunque falle el correo
      }
    }

    // Obtener el usuario recién creado con todos sus datos
    const usuarioCompleto = await usuariosController.getById(
      { params: { id: nuevoUsuario.id } },
      {
        status: () => ({
          json: (data) => data,
        }),
      },
    )

    res.status(201).json(usuarioCompleto)
  } catch (error) {
    console.error("Error al crear usuario:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
},

  // Actualizar un usuario
  update: async (req, res) => {
    try {
      const { id } = req.params
      const usuarioData = req.body

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getById(id)
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // Si se está actualizando el correo, verificar que no esté en uso
      if (usuarioData.Correo && usuarioData.Correo !== usuario.Correo) {
        const existingUser = await usuariosModel.getByEmail(usuarioData.Correo)
        if (existingUser) {
          return res.status(400).json({ message: "El correo electrónico ya está registrado" })
        }
      }

      // Si se está actualizando el rol, verificar que exista
      if (usuarioData.IdRol) {
        const rol = await rolesModel.getById(usuarioData.IdRol)
        if (!rol) {
          return res.status(404).json({ message: "Rol no encontrado" })
        }
      }

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          // Eliminar imagen anterior si existe
          if (usuario.Foto) {
            const publicId = usuario.Foto.split("/").pop().split(".")[0];
            await deleteFromCloudinary(publicId);
          }
      
          // Subir nueva imagen
          const result = await uploadToCloudinary(req.file.path, "usuarios");
          usuarioData.Foto = result.secure_url; // Asegurarse de usar el mismo nombre de campo que en el modelo
        } catch (uploadError) {
          console.error("Error al procesar imagen:", uploadError);
          // Continuar sin actualizar imagen si hay error
        }
      }

      // Actualizar usuario
      const updatedUsuario = await usuariosModel.update(id, usuarioData)

      // Obtener el usuario actualizado con todos sus datos
      const usuarioCompleto = await usuariosController.getById(
        { params: { id } },
        {
          status: () => ({
            json: (data) => data,
          }),
        },
      )

      res.status(200).json(usuarioCompleto)
    } catch (error) {
      console.error("Error al actualizar usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },


  updateFoto: async (req, res) => {
  try {
    const { id } = req.params;
    let fotoUrl = null;

    // Si se envía como archivo (form-data)
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, "usuarios");
      fotoUrl = result.secure_url;
    }
    // Si se envía como base64 (JSON)
    else if (req.body.foto) {
      fotoUrl = req.body.foto;
    } else {
      return res.status(400).json({ message: "No se envió ninguna foto" });
    }

    await usuariosModel.update(id, { Foto: fotoUrl });

    res.status(200).json({ message: "Foto actualizada correctamente", foto: fotoUrl });
  } catch (error) {
    console.error("Error al actualizar foto:", error);
    res.status(500).json({ message: "Error al actualizar la foto", error: error.message });
  }
},




  // Cambiar contraseña
  changePassword: async (req, res) => {
    try {
      const { id } = req.params
      const { currentPassword, newPassword } = req.body

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Se requieren las contraseñas actual y nueva" })
      }

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getById(id)
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // Verificar contraseña actual
      const usuarioCompleto = await usuariosModel.getByEmail(usuario.Correo)
      const isMatch = await bcrypt.compare(currentPassword, usuarioCompleto.Contraseña)
      if (!isMatch) {
        return res.status(400).json({ message: "Contraseña actual incorrecta" })
      }

      // Cambiar contraseña
      await usuariosModel.changePassword(id, newPassword)

      res.status(200).json({ message: "Contraseña actualizada correctamente" })
    } catch (error) {
      console.error("Error al cambiar contraseña:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Cambiar estado de un usuario
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params
      const { Estado } = req.body

      if (Estado === undefined) {
        return res.status(400).json({ message: "El estado es requerido" })
      }

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getById(id)
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // No permitir desactivar al Super Administrador
      if (usuario.IdRol === 1 && Estado === false) {
        return res.status(403).json({ message: "No se puede desactivar al Super Administrador" })
      }

      // Cambiar estado
      const result = await usuariosModel.changeStatus(id, Estado)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al cambiar estado del usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un usuario
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getById(id)
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // Verificar si es Super Administrador (Rol ID 1)
      if (usuario.IdRol === 1) {
        return res.status(403).json({ message: "No se puede eliminar al Super Administrador" })
      }

      // Eliminar imagen si existe
      if (usuario.Foto) {
        try {
          const publicId = usuario.Foto.split("/").pop().split(".")[0]
          await deleteFromCloudinary(publicId)
        } catch (deleteError) {
          console.error("Error al eliminar imagen de Cloudinary:", deleteError)
          // Continuar con la eliminación del usuario
        }
      }

      // Eliminar sesiones y tokens de recuperación
      await sesionesUsuariosModel.deleteByUsuario(id)
      await tokensRecuperacionModel.deleteByUsuario(id)

      // Eliminar usuario
      await usuariosModel.delete(id)

      res.status(200).json({ message: "Usuario eliminado correctamente" })
    } catch (error) {
      console.error("Error al eliminar usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Buscar usuarios
  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "El término de búsqueda es requerido" })
      }

      // Modificar la consulta para incluir explícitamente el campo Documento
      const usuarios = await query(
        `
        SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, 
               u.FechaCreacion, u.Estado, u.Foto, u.Documento, r.IdRol, r.NombreRol
        FROM Usuarios u
        JOIN Roles r ON u.IdRol = r.IdRol
        WHERE u.Nombre LIKE ? OR u.Apellido LIKE ? OR u.Correo LIKE ?
        ORDER BY u.Apellido, u.Nombre
      `,
        [`%${term}%`, `%${term}%`, `%${term}%`],
      )

      // Procesar los resultados para asegurar la estructura correcta
      const processedUsuarios = usuarios.map((usuario) => {
        return {
          ...usuario,
          Documento: usuario.Documento || "",
          Rol: {
            IdRol: usuario.IdRol,
            NombreRol: usuario.NombreRol,
          },
        }
      })

      res.status(200).json(processedUsuarios)
    } catch (error) {
      console.error("Error al buscar usuarios:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener usuarios por rol
  getByRol: async (req, res) => {
    try {
      const { idRol } = req.params

      // Verificar si el rol existe
      const rol = await rolesModel.getById(idRol)
      if (!rol) {
        return res.status(404).json({ message: "Rol no encontrado" })
      }

      // Modificar la consulta para incluir explícitamente el campo Documento
      const usuarios = await query(
        `
        SELECT u.IdUsuario, u.Nombre, u.Apellido, u.Correo, u.Telefono, u.Direccion, 
               u.FechaCreacion, u.Estado, u.Foto, u.Documento, r.IdRol, r.NombreRol
        FROM Usuarios u
        JOIN Roles r ON u.IdRol = r.IdRol
        WHERE u.IdRol = ?
        ORDER BY u.Apellido, u.Nombre
      `,
        [idRol],
      )

      // Procesar los resultados para asegurar la estructura correcta
      const processedUsuarios = usuarios.map((usuario) => {
        return {
          ...usuario,
          Documento: usuario.Documento || "",
          Rol: {
            IdRol: usuario.IdRol,
            NombreRol: usuario.NombreRol,
          },
        }
      })

      res.status(200).json(processedUsuarios)
    } catch (error) {
      console.error("Error al obtener usuarios por rol:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  checkDocumentoExists: async (req, res) => {
  try {
    const { documento, excludeUserId } = req.query;
    
    let query = "SELECT COUNT(*) as count FROM Usuarios WHERE Documento = ?";
    let params = [documento];
    
    if (excludeUserId) {
      query += " AND IdUsuario != ?";
      params.push(excludeUserId);
    }
    
    const result = await db.query(query, params);
    const exists = result[0].count > 0;
    
    res.status(200).json({ exists });
  } catch (error) {
    console.error("Error al verificar documento:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
}
}

// Controlador para autenticación
export const authController = {
  // Iniciar sesión
  login: async (req, res) => {
    try {
      const { correo, password } = req.body

      if (!correo || !password) {
        return res.status(400).json({ message: "Correo y contraseña son requeridos" })
      }

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getByEmail(correo)
      if (!usuario) {
        return res.status(401).json({ message: "Credenciales inválidas" })
      }

      // Verificar contraseña
      const isMatch = await bcrypt.compare(password, usuario.Contraseña)
      if (!isMatch) {
        return res.status(401).json({ message: "Credenciales inválidas" })
      }

      // Verificar si el usuario está activo
      if (!usuario.Estado) {
        return res.status(403).json({ message: "Usuario inactivo. Contacte al administrador" })
      }

      // Generar token JWT con información completa
      const token = jwt.sign(
        {
          id: usuario.IdUsuario,
          role: usuario.IdRol,
          email: usuario.Correo,
          name: usuario.Nombre,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      )

      // Registrar sesión
      const expiracion = new Date()
      expiracion.setHours(expiracion.getHours() + 24)

      await sesionesUsuariosModel.create({
        IdUsuario: usuario.IdUsuario,
        Token: token,
        FechaInicio: new Date(),
        FechaExpiracion: expiracion,
        IP: req.ip,
        Dispositivo: req.headers["user-agent"],
      })

      // Obtener permisos del usuario
      const rol = await rolesModel.getById(usuario.IdRol)
      let permisos = []

      // Si es Super Administrador, obtener TODOS los permisos
      if (usuario.IdRol === 1) {
        permisos = await permisosModel.getAll()
      } else {
        // Usar el modelo en lugar de consulta directa
        permisos = await rolesModel.getPermisos(usuario.IdRol)

        console.log(
          `Login: Usuario ID ${usuario.IdUsuario}, Rol ID ${usuario.IdRol}, Permisos encontrados: ${permisos.length}`,
        )
      }

      // Obtener cliente asociado al usuario
      const cliente = await clientesModel.getByUsuario(usuario.IdUsuario)

      res.status(200).json({
        token,
        usuario: {
          id: usuario.IdUsuario,
          nombre: usuario.Nombre,
          apellido: usuario.Apellido,
          correo: usuario.Correo,
          documento: usuario.Documento,
          rol: {
            id: rol.IdRol,
            nombre: rol.NombreRol,
          },
          permisos: permisos.map((p) => p.NombrePermiso),
          cliente: cliente
            ? {
                id: cliente.IdCliente,
                nombre: cliente.Nombre,
                apellido: cliente.Apellido,
              }
            : null,
        },
      })
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Cerrar sesión
  logout: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1]

      if (!token) {
        return res.status(400).json({ message: "Token no proporcionado" })
      }

      // Eliminar sesión
      await sesionesUsuariosModel.deleteByToken(token)

      res.status(200).json({ message: "Sesión cerrada correctamente" })
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Verificar token
  verifyToken: async (req, res) => {
    try {
      // El middleware de autenticación ya verificó el token
      const usuario = await usuariosModel.getById(req.user.id)
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" })
      }

      // Obtener permisos del usuario
      const rol = await rolesModel.getById(usuario.IdRol)
      let permisos = []

      // Si es Super Administrador, obtener TODOS los permisos
      if (usuario.IdRol === 1) {
        permisos = await permisosModel.getAll()
      } else {
        permisos = await rolesModel.getPermisos(usuario.IdRol)
      }

      // Obtener cliente asociado al usuario (si aplica)
      const cliente = await clientesModel.getByUsuario(usuario.IdUsuario)

      res.status(200).json({
        usuario: {
          id: usuario.IdUsuario,
          nombre: usuario.Nombre,
          apellido: usuario.Apellido,
          correo: usuario.Correo,
          documento: usuario.Documento,
          rol: {
            id: rol.IdRol,
            nombre: rol.NombreRol,
          },
          permisos: permisos.map((p) => p.NombrePermiso),
          cliente: cliente
            ? {
                id: cliente.IdCliente,
                nombre: cliente.Nombre,
                apellido: cliente.Apellido,
              }
            : null,
        },
      })
    } catch (error) {
      console.error("Error al verificar token:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Solicitar recuperación de contraseña
  requestPasswordReset: async (req, res) => {
    try {
      const { correo } = req.body

      if (!correo) {
        return res.status(400).json({ message: "El correo electrónico es requerido" })
      }

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getByEmail(correo)
      if (!usuario) {
        // Por seguridad, no informamos si el correo existe o no
        return res
          .status(200)
          .json({ message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" })
      }

      // Generar token
      const token = crypto.randomBytes(32).toString("hex")

      // Establecer expiración (24 horas)
      const expiracion = new Date()
      expiracion.setHours(expiracion.getHours() + 24)

      // Guardar token
      await tokensRecuperacionModel.create({
        IdUsuario: usuario.IdUsuario,
        Token: token,
        FechaCreacion: new Date(),
        FechaExpiracion: expiracion,
        Utilizado: false,
      })

      // Enviar correo
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

      await sendEmail({
        to: usuario.Correo,
        subject: "Recuperación de Contraseña - TeoCat",
        text: `Hola ${usuario.Nombre},\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no solicitaste este cambio, ignora este correo.\n\nSaludos,\nEquipo TeoCat`,
        html: `
          <h2>Recuperación de Contraseña - TeoCat</h2>
          <p>Hola ${usuario.Nombre},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
          <p><a href="${resetUrl}" target="_blank">Restablecer contraseña</a></p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
      })

      res
        .status(200)
        .json({ message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" })
    } catch (error) {
      console.error("Error al solicitar recuperación de contraseña:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // NUEVO MÉTODO: Reenviar enlace de recuperación de contraseña
  // Reenviar enlace de recuperación de contraseña
  resendPasswordReset: async (req, res) => {
    try {
      const { correo } = req.body

      if (!correo) {
        return res.status(400).json({ message: "El correo electrónico es requerido" })
      }

      // Verificar si el usuario existe
      const usuario = await usuariosModel.getByEmail(correo)
      if (!usuario) {
        // Por seguridad, no informamos si el correo existe o no
        return res
          .status(200)
          .json({ message: "Si el correo está registrado, recibirás un nuevo enlace para restablecer tu contraseña" })
      }

      // Buscar si ya existe un token válido para este usuario
      const tokenExistente = await tokensRecuperacionModel.getValidByUsuario(usuario.IdUsuario)
      let token

      if (tokenExistente) {
        // Reutilizar el token existente
        token = tokenExistente.Token
      } else {
        // No hay token válido, generar uno nuevo
        token = crypto.randomBytes(32).toString("hex")

        // Establecer expiración (24 horas)
        const expiracion = new Date()
        expiracion.setHours(expiracion.getHours() + 24)

        // Guardar token
        await tokensRecuperacionModel.create({
          IdUsuario: usuario.IdUsuario,
          Token: token,
          FechaCreacion: new Date(),
          FechaExpiracion: expiracion,
          Utilizado: false,
        })
      }

      // Preparar la URL de restablecimiento
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

      // CAMBIO CLAVE: Responder al usuario inmediatamente
      res.status(200).json({
        message: "Si el correo está registrado, recibirás un nuevo enlace para restablecer tu contraseña",
      })

      // Enviar el correo después de responder al usuario
      // Esto evita que el usuario tenga que esperar a que se complete el envío
      setTimeout(() => {
        sendEmail({
          to: usuario.Correo,
          subject: "Recuperación de Contraseña - TeoCat (Reenvío)",
          text: `Hola ${usuario.Nombre},\n\nHas solicitado reenviar el enlace para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no solicitaste este cambio, ignora este correo.\n\nSaludos,\nEquipo TeoCat`,
          html: `
          <h2>Recuperación de Contraseña - TeoCat (Reenvío)</h2>
          <p>Hola ${usuario.Nombre},</p>
          <p>Has solicitado reenviar el enlace para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
          <p><a href="${resetUrl}" target="_blank">Restablecer contraseña</a></p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <p>Saludos,<br>Equipo TeoCat</p>
        `,
        }).catch((error) => {
          console.error("Error al enviar correo de recuperación:", error)
        })
      }, 0) // El setTimeout con 0ms permite que el envío ocurra en el próximo ciclo del event loop
    } catch (error) {
      console.error("Error al reenviar enlace de recuperación de contraseña:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Restablecer contraseña
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token y nueva contraseña son requeridos" })
      }

      // Verificar token
      const tokenInfo = await tokensRecuperacionModel.isValid(token)
      if (!tokenInfo) {
        return res.status(400).json({ message: "Token inválido o expirado" })
      }

      // Cambiar contraseña
      await usuariosModel.changePassword(tokenInfo.IdUsuario, newPassword)

      // Marcar token como utilizado
      await tokensRecuperacionModel.markAsUsed(tokenInfo.IdToken)

      const correctamente = "Contraseña restablecida correctamente"
      res.status(200).json({ message: correctamente })
    } catch (error) {
      console.error("Error al restablecer contraseña:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

export default {
  permisosController,
  rolesController,
  rolPermisoController,
  usuariosController,
  authController,
}
