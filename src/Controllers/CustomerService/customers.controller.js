import { clientesModel, mascotasModel, especiesModel } from "../../Models/CustomerService/customers.model.js"
import { usuariosModel, tokensRecuperacionModel } from "../../Models/AuthService/auth.model.js"
import { uploadToCloudinary, deleteFromCloudinary, uploadImage } from "../../Utils/Cloudinary.js"
import { query } from "../../Config/Database.js"
import { sendEmail } from "../../Utils/Email.js"
import crypto from "crypto"

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

// Función para enviar correo de bienvenida
async function sendWelcomeEmail(email, nombre, password) {
  try {
    const loginUrl = `${process.env.FRONTEND_URL}/login`

    await sendEmail({
      to: email,
      subject: "Bienvenido a TeoCat - Información de acceso",
      text: `Hola ${nombre},\n\nSe ha creado una cuenta para ti en TeoCat. Tus credenciales de acceso son:\n\nCorreo: ${email}\nContraseña temporal: ${password}\n\nPor seguridad, deberás cambiar esta contraseña en las próximas 24 horas.\n\nPuedes iniciar sesión aquí: ${loginUrl}\n\nSaludos,\nEquipo TeoCat`,
      html: `
        <h2>Bienvenido a TeoCat</h2>
        <p>Hola ${nombre},</p>
        <p>Se ha creado una cuenta para ti en TeoCat. Tus credenciales de acceso son:</p>
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

// Función para crear token de recuperación que expira en 24 horas
async function createPasswordResetToken(userId) {
  try {
    // Generar token
    const token = crypto.randomBytes(32).toString("hex")

    // Establecer expiración (24 horas)
    const expiracion = new Date()
    expiracion.setHours(expiracion.getHours() + 24)

    // Guardar token
    await tokensRecuperacionModel.create({
      IdUsuario: userId,
      Token: token,
      FechaCreacion: new Date(),
      FechaExpiracion: expiracion,
      Utilizado: false,
    })

    return token
  } catch (error) {
    console.error("Error al crear token de recuperación:", error)
    throw error
  }
}

// Controlador para clientes
export const clientesController = {
  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Obtener todos los clientes
  getAll: async (req, res) => {
    try {
      const clientes = await clientesModel.getAll()
      res.status(200).json(clientes)
    } catch (error) {
      console.error("Error al obtener clientes:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ NUEVO: Obtener todos los clientes usando procedimiento almacenado
  getAllClientesCompleto: async (req, res) => {
    try {
      console.log('🔍 Obteniendo todos los clientes con procedimiento almacenado...')
      
      // Usar el procedimiento almacenado que creamos
      const [clientes] = await query('CALL ObtenerTodosLosClientes()')
      
      console.log('✅ Clientes obtenidos:', clientes.length)
      res.json(clientes)
    } catch (error) {
      console.error('❌ Error al obtener clientes completo:', error)
      res.status(500).json({ 
        message: 'Error al obtener clientes', 
        error: error.message 
      })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Obtener un cliente por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const cliente = await clientesModel.getById(id)

      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      res.status(200).json(cliente)
    } catch (error) {
      console.error("Error al obtener cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ NUEVO: Obtener cliente por ID de usuario
  getClienteByUsuario: async (req, res) => {
    try {
      const { idUsuario } = req.params
      console.log(`🔍 Obteniendo cliente para usuario ${idUsuario}...`)
      
      // Buscar cliente asociado al usuario
      const [cliente] = await query(
        'SELECT * FROM Clientes WHERE IdUsuario = ? LIMIT 1',
        [idUsuario]
      )
      
      if (cliente.length > 0) {
        console.log('✅ Cliente encontrado:', cliente[0])
        res.json(cliente[0])
      } else {
        console.log('⚠️ Cliente no encontrado para usuario:', idUsuario)
        res.status(404).json({ message: 'Cliente no encontrado para este usuario' })
      }
    } catch (error) {
      console.error('❌ Error al obtener cliente por usuario:', error)
      res.status(500).json({ 
        message: 'Error al obtener cliente por usuario', 
        error: error.message 
      })
    }
  },

  // ✅ NUEVO: Obtener usuarios con rol cliente y sus mascotas
  getUsuariosClientesConMascotas: async (req, res) => {
    try {
      console.log('🔍 Obteniendo usuarios con rol cliente y sus mascotas...')
      
      // Obtener usuarios con rol cliente
      const [usuarios] = await query(`
        SELECT 
          u.IdUsuario,
          u.Nombre,
          u.Apellido,
          CONCAT(u.Nombre, ' ', u.Apellido) as NombreCompleto,
          u.Correo,
          u.Telefono,
          u.Direccion,
          u.Documento,
          u.Estado,
          u.IdRol,
          c.IdCliente,
          CASE 
            WHEN c.IdCliente IS NOT NULL THEN 'Sincronizado' 
            ELSE 'No sincronizado' 
          END as EstadoSincronizacion
        FROM Usuarios u
        LEFT JOIN Clientes c ON u.IdUsuario = c.IdUsuario
        WHERE u.IdRol = 2 AND u.Estado = TRUE
        ORDER BY u.Nombre, u.Apellido
      `)

      // Para cada usuario, obtener sus mascotas
      const usuariosConMascotas = await Promise.all(
        usuarios.map(async (usuario) => {
          try {
            // Obtener mascotas usando el procedimiento almacenado
            const [mascotas] = await query('CALL ObtenerMascotasPorUsuario(?)', [usuario.IdUsuario])
            
            return {
              ...usuario,
              mascotas: mascotas || [],
              totalMascotas: mascotas ? mascotas.length : 0,
              tieneMascotas: mascotas && mascotas.length > 0
            }
          } catch (error) {
            console.warn(`⚠️ Error al obtener mascotas para usuario ${usuario.IdUsuario}:`, error)
            return {
              ...usuario,
              mascotas: [],
              totalMascotas: 0,
              tieneMascotas: false
            }
          }
        })
      )

      console.log('✅ Usuarios con rol cliente y mascotas obtenidos:', usuariosConMascotas.length)
      res.json(usuariosConMascotas)
    } catch (error) {
      console.error('❌ Error al obtener usuarios clientes con mascotas:', error)
      res.status(500).json({ 
        message: 'Error al obtener usuarios clientes con mascotas', 
        error: error.message 
      })
    }
  },

  // ✅ NUEVO: Sincronizar usuario a cliente
  sincronizarUsuarioACliente: async (req, res) => {
    try {
      const { idUsuario } = req.params
      console.log(`🔄 Sincronizando usuario ${idUsuario} a cliente...`)
      
      // Usar el procedimiento almacenado que creamos
      await query('CALL SincronizarUsuarioACliente(?)', [idUsuario])
      
      // Verificar el resultado
      const [cliente] = await query(
        'SELECT * FROM Clientes WHERE IdUsuario = ? LIMIT 1',
        [idUsuario]
      )
      
      if (cliente.length > 0) {
        console.log('✅ Usuario sincronizado exitosamente:', cliente[0])
        res.json({ 
          message: 'Usuario sincronizado exitosamente', 
          cliente: cliente[0] 
        })
      } else {
        console.log('⚠️ Usuario no se pudo sincronizar')
        res.status(400).json({ message: 'No se pudo sincronizar el usuario' })
      }
    } catch (error) {
      console.error('❌ Error al sincronizar usuario a cliente:', error)
      res.status(500).json({ 
        message: 'Error al sincronizar usuario a cliente', 
        error: error.message 
      })
    }
  },

  // ✅ NUEVO: Validar mascotas para servicios
  validarMascotasParaServicios: async (req, res) => {
    try {
      const { idCliente, tieneServicios } = req.body
      console.log(`🔍 Validando mascotas para servicios - Cliente: ${idCliente}, Tiene servicios: ${tieneServicios}`)
      
      // Usar el procedimiento almacenado que creamos
      await query(
        'CALL ValidarMascotasParaServicios(?, ?, @esValido, @mensaje)',
        [idCliente, tieneServicios]
      )
      
      // Obtener los valores de salida
      const [output] = await query('SELECT @esValido as esValido, @mensaje as mensaje')
      
      const validacion = output[0]
      console.log('✅ Validación completada:', validacion)
      
      res.json({
        esValido: validacion.esValido === 1,
        mensaje: validacion.mensaje
      })
    } catch (error) {
      console.error('❌ Error al validar mascotas para servicios:', error)
      res.status(500).json({ 
        message: 'Error al validar mascotas para servicios', 
        error: error.message 
      })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Crear un nuevo cliente
  create: async (req, res) => {
    try {
      const clienteData = req.body

      // Validar datos
      if (!clienteData.Nombre || !clienteData.Apellido || !clienteData.Correo) {
        return res.status(400).json({ message: "Nombre, Apellido y Correo son campos requeridos" })
      }

      // Verificar si el correo ya está registrado en clientes
      const existingClient = await clientesModel.getByEmail(clienteData.Correo)
      if (existingClient) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado" })
      }

      // Verificar si el correo ya está registrado en usuarios
      const existingUser = await usuariosModel.getByEmail(clienteData.Correo)
      if (existingUser) {
        return res.status(400).json({ message: "El correo electrónico ya está registrado como usuario" })
      }

      // Generar una contraseña temporal aleatoria
      const tempPassword = generateTemporaryPassword(10) // Función para generar contraseña

      // Crear usuario con rol de cliente (IdRol = 2)
      const usuarioData = {
        Nombre: clienteData.Nombre,
        Apellido: clienteData.Apellido,
        Correo: clienteData.Correo,
        Password: tempPassword,
        Telefono: clienteData.Telefono || "",
        Direccion: clienteData.Direccion || "",
        IdRol: 2, // Rol de cliente
        Documento: clienteData.Documento || "",
        Estado: true,
      }

      console.log("Datos de usuario a crear:", usuarioData)

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          const result = await uploadImage(req.file.path, "usuarios")
          usuarioData.Foto = result.secure_url
        } catch (uploadError) {
          console.error("Error al subir imagen a Cloudinary:", uploadError)
        }
      }

      // Crear usuario
      const nuevoUsuario = await usuariosModel.create(usuarioData)
      console.log("Usuario creado:", nuevoUsuario)

      // El trigger se encargará de crear el cliente automáticamente
      // Pero necesitamos obtener el ID del cliente para devolverlo
      console.log("Buscando cliente para usuario ID:", nuevoUsuario.id)
      let nuevoCliente = await clientesModel.getByUsuario(nuevoUsuario.id)
      console.log("Cliente obtenido por ID de usuario:", nuevoCliente)

      // Si no se pudo obtener el cliente pero sabemos que existe
      if (!nuevoCliente) {
        console.warn("No se pudo obtener el cliente automáticamente, intentando consulta directa")
        
        // Intentar obtener el cliente directamente por correo (que debe ser único)
        const clientesPorCorreo = await clientesModel.getByEmail(usuarioData.Correo)
        
        if (clientesPorCorreo) {
          nuevoCliente = clientesPorCorreo
          console.log("Cliente recuperado por correo:", nuevoCliente)
        } else {
          console.error("No se pudo recuperar el cliente ni por usuario ni por correo")
          
          // Crear el cliente manualmente si el trigger falló
          console.log("Creando cliente manualmente...")
          const clienteManual = {
            IdUsuario: nuevoUsuario.id,
            Documento: usuarioData.Documento,
            Nombre: usuarioData.Nombre,
            Apellido: usuarioData.Apellido,
            Correo: usuarioData.Correo,
            Telefono: usuarioData.Telefono,
            Direccion: usuarioData.Direccion,
            Estado: usuarioData.Estado ? 1 : 0
          }
          
          nuevoCliente = await clientesModel.create(clienteManual)
          console.log("Cliente creado manualmente:", nuevoCliente)
        }
      }

      // Asegurarse de que el cliente tenga un estado válido para el frontend
      if (nuevoCliente) {
        // Si tiene id pero no IdCliente, copiar id a IdCliente
        if (nuevoCliente.id && !nuevoCliente.IdCliente) {
          nuevoCliente.IdCliente = nuevoCliente.id
          console.log("Backend: ID normalizado de id a IdCliente:", nuevoCliente.IdCliente)
        }
        
        // Normalizar el estado
        if (typeof nuevoCliente.Estado === "number") {
          nuevoCliente.Estado = nuevoCliente.Estado === 1 ? "Activo" : "Inactivo"
        }
      }

      // Enviar correo con credenciales temporales
      await sendWelcomeEmail(clienteData.Correo, clienteData.Nombre, tempPassword)

      // Crear token de recuperación que expira en 24 horas para forzar cambio de contraseña
      await createPasswordResetToken(nuevoUsuario.id)

      res.status(201).json(nuevoCliente)
    } catch (error) {
      console.error("Error al crear cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Actualizar un cliente
  update: async (req, res) => {
    try {
      const { id } = req.params
      const clienteData = req.body

      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id)
      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      // Si se está actualizando el correo, verificar que no esté en uso
      if (clienteData.Correo && clienteData.Correo !== cliente.Correo) {
        const existingClient = await clientesModel.getByEmail(clienteData.Correo)
        if (existingClient && existingClient.IdCliente !== Number.parseInt(id)) {
          return res.status(400).json({ message: "El correo electrónico ya está registrado" })
        }
      }

      // Si se está actualizando el IdUsuario, verificar que exista y no esté en uso
      if (clienteData.IdUsuario && clienteData.IdUsuario !== cliente.IdUsuario) {
        const usuario = await usuariosModel.getById(clienteData.IdUsuario)
        if (!usuario) {
          return res.status(404).json({ message: "El usuario especificado no existe" })
        }

        // Verificar si el usuario ya está asociado a otro cliente
        const clienteExistente = await clientesModel.getByUsuario(clienteData.IdUsuario)
        if (clienteExistente && clienteExistente.IdCliente !== Number.parseInt(id)) {
          return res.status(400).json({
            message: "El usuario ya está asociado a otro cliente",
            cliente: clienteExistente,
          })
        }
      }

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          // Eliminar imagen anterior si existe
          if (cliente.Foto) {
            const publicId = cliente.Foto.split("/").pop().split(".")[0]
            await deleteFromCloudinary(publicId)
          }

          // Subir nueva imagen
          const result = await uploadImage(req.file.path, "clientes")
          clienteData.Foto = result.secure_url
        } catch (uploadError) {
          console.error("Error al procesar imagen:", uploadError)
          // Continuar sin actualizar imagen si hay error
        }
      }

      // Actualizar cliente
      const updatedCliente = await clientesModel.update(id, clienteData)

      // Normalizar la respuesta para asegurar que tenga IdCliente
      if (updatedCliente) {
        // Si tiene id pero no IdCliente, copiar id a IdCliente
        if (updatedCliente.id && !updatedCliente.IdCliente) {
          updatedCliente.IdCliente = updatedCliente.id
          console.log("Backend (update): ID normalizado de id a IdCliente:", updatedCliente.IdCliente)
        }
        
        // Normalizar el estado
        if (typeof updatedCliente.Estado === "number") {
          updatedCliente.Estado = updatedCliente.Estado === 1 ? "Activo" : "Inactivo"
        }
      }

      // Si se actualizaron datos que también están en el usuario, actualizar el usuario
      if (
        cliente.IdUsuario &&
        (clienteData.Nombre ||
          clienteData.Apellido ||
          clienteData.Correo ||
          clienteData.Telefono ||
          clienteData.Direccion ||
          clienteData.Estado)
      ) {
        const usuarioData = {}
        if (clienteData.Nombre) usuarioData.Nombre = clienteData.Nombre
        if (clienteData.Apellido) usuarioData.Apellido = clienteData.Apellido
        if (clienteData.Correo) usuarioData.Correo = clienteData.Correo
        if (clienteData.Telefono) usuarioData.Telefono = clienteData.Telefono
        if (clienteData.Direccion) usuarioData.Direccion = clienteData.Direccion
        if (clienteData.Estado !== undefined) usuarioData.Estado = clienteData.Estado

        // Solo actualizar si hay datos para actualizar
        if (Object.keys(usuarioData).length > 0) {
          await usuariosModel.update(cliente.IdUsuario, usuarioData)
        }
      }

      res.status(200).json(updatedCliente)
    } catch (error) {
      console.error("Error al actualizar cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Eliminar un cliente
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id)
      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      // Verificar si tiene mascotas asociadas
      const mascotas = await mascotasModel.getByCliente(id)
      if (mascotas.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar el cliente porque tiene mascotas asociadas",
          mascotas,
        })
      }

      // Guardar el ID de usuario para eliminarlo después
      const idUsuario = cliente.IdUsuario

      // Eliminar imagen si existe
      if (cliente.Foto) {
        try {
          const publicId = cliente.Foto.split("/").pop().split(".")[0]
          await deleteFromCloudinary(publicId)
        } catch (deleteError) {
          console.error("Error al eliminar imagen de Cloudinary:", deleteError)
          // Continuar con la eliminación del cliente
        }
      }

      // Eliminar cliente
      await clientesModel.delete(id)
      
      // Eliminar el usuario asociado si existe
      if (idUsuario) {
        try {
          console.log(`Eliminando usuario asociado con ID ${idUsuario}`)
          await usuariosModel.delete(idUsuario)
          console.log(`Usuario con ID ${idUsuario} eliminado correctamente`)
        } catch (userDeleteError) {
          console.error(`Error al eliminar usuario asociado con ID ${idUsuario}:`, userDeleteError)
          // No interrumpir el flujo si falla la eliminación del usuario
          // pero informar en la respuesta
          return res.status(200).json({ 
            message: "Cliente eliminado correctamente, pero hubo un problema al eliminar el usuario asociado",
            error: userDeleteError.message
          })
        }
      }

      res.status(200).json({ message: "Cliente y usuario asociado eliminados correctamente" })
    } catch (error) {
      console.error("Error al eliminar cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Buscar clientes
  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "El término de búsqueda es requerido" })
      }

      const clientes = await clientesModel.search(term)

      res.status(200).json(clientes)
    } catch (error) {
      console.error("Error al buscar clientes:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para mascotas
export const mascotasController = {
  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Obtener todas las mascotas
  getAll: async (req, res) => {
    try {
      const mascotas = await mascotasModel.getAll()
      res.status(200).json(mascotas)
    } catch (error) {
      console.error("Error al obtener mascotas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Obtener una mascota por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const mascota = await mascotasModel.getById(id)

      if (!mascota) {
        return res.status(404).json({ message: "Mascota no encontrada" })
      }

      res.status(200).json(mascota)
    } catch (error) {
      console.error("Error al obtener mascota:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ MEJORADO: Obtener mascotas por cliente usando procedimiento almacenado
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params

      console.log(`🔍 Buscando mascotas para cliente ID: ${id}`)

      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id)
      if (!cliente) {
        console.log(`❌ Cliente con ID ${id} no encontrado`)
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      console.log(`✅ Cliente encontrado: ${cliente.Nombre} ${cliente.Apellido}`)

      // Consulta directa usando el modelo
      const mascotas = await mascotasModel.getByCliente(id)

      const mascotasNormalizadas = mascotas.map(mascota => ({
        ...mascota,
        id: mascota.IdMascota || mascota.id,
        IdMascota: mascota.IdMascota || mascota.id,
        nombre: mascota.Nombre,
        Nombre: mascota.Nombre,
        tipo: 'Normal',
        TipoMascotaTemporal: 'Normal',
        textoCompleto: `${mascota.Nombre} (${mascota.IdEspecie || 'Sin especificar'})`,
        disponibleParaServicios: mascota.Estado === true || mascota.Estado === 1
      }))

      res.status(200).json(mascotasNormalizadas)
    } catch (error) {
      console.error("❌ Error al obtener mascotas del cliente:", error)
      res.status(500).json({
        message: "Error en el servidor al obtener mascotas",
        error: error.message,
        clienteId: req.params.id
      })
    }
  },

  // ✅ NUEVO: Obtener mascotas por ID de usuario
  getMascotasByUsuario: async (req, res) => {
    try {
      const { idUsuario } = req.params
      console.log(`🔍 Obteniendo mascotas para usuario ${idUsuario}...`)
      
      // Usar el procedimiento almacenado que creamos
      const [mascotas] = await query('CALL ObtenerMascotasPorUsuario(?)', [idUsuario])
      
      console.log('✅ Mascotas obtenidas para usuario:', mascotas.length)
      
      // Normalizar respuesta
      const mascotasNormalizadas = mascotas.map(mascota => ({
        ...mascota,
        id: mascota.IdMascota || mascota.id,
        IdMascota: mascota.IdMascota || mascota.id,
        nombre: mascota.Nombre,
        Nombre: mascota.Nombre,
        tipo: mascota.esMascotaGenerica ? 'Genérica' : mascota.Especie,
        TipoMascotaTemporal: mascota.esMascotaGenerica ? 'Genérica' : mascota.Especie,
        textoCompleto: `${mascota.Nombre} (${mascota.Especie || 'Sin especificar'})`,
        disponibleParaServicios: mascota.Estado === true || mascota.Estado === 1
      }))
      
      res.json(mascotasNormalizadas)
    } catch (error) {
      console.error('❌ Error al obtener mascotas por usuario:', error)
      res.status(500).json({ 
        message: 'Error al obtener mascotas del usuario', 
        error: error.message 
      })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Crear una nueva mascota
  create: async (req, res) => {
    try {
      const mascotaData = req.body

      // Validar datos básicos
      if (!mascotaData.Nombre || !mascotaData.IdEspecie || !mascotaData.IdCliente) {
        return res.status(400).json({ message: "Nombre, IdEspecie e IdCliente son campos requeridos" })
      }

      // Validar que la especie exista
      const especie = await especiesModel.getById(mascotaData.IdEspecie)
      if (!especie) {
        return res.status(404).json({ message: "La especie especificada no existe" })
      }

      // Validar enumeraciones
      const tamañosValidos = ["Pequeño", "Mediano", "Grande"]
      if (mascotaData.Tamaño && !tamañosValidos.includes(mascotaData.Tamaño)) {
        return res.status(400).json({
          message: "Tamaño no válido. Debe ser uno de: " + tamañosValidos.join(", "),
        })
      }

      // Validar fecha de nacimiento
      if (mascotaData.FechaNacimiento) {
        const fechaNacimiento = new Date(mascotaData.FechaNacimiento)
        const hoy = new Date()

        // Verificar que no sea futura
        if (fechaNacimiento > hoy) {
          return res.status(400).json({ message: "La fecha de nacimiento no puede ser futura" })
        }

        // Verificar que no sea extremadamente antigua (más de 30 años)
        const treintaAñosAtras = new Date()
        treintaAñosAtras.setFullYear(hoy.getFullYear() - 30)
        if (fechaNacimiento < treintaAñosAtras) {
          return res.status(400).json({ message: "La fecha de nacimiento no puede ser anterior a hace 30 años" })
        }
      }

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          // Subir imagen a Cloudinary
          const result = await uploadToCloudinary(req.file.path)
          mascotaData.Foto = result.secure_url
        } catch (uploadError) {
          console.error("Error al subir imagen a Cloudinary:", uploadError)
          // Continuar sin imagen si hay error
        }
      }

      // Crear mascota
      const nuevaMascota = await mascotasModel.create(mascotaData)

      res.status(201).json(nuevaMascota)
    } catch (error) {
      console.error("Error al crear mascota:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Actualizar una mascota
  update: async (req, res) => {
    try {
      const { id } = req.params
      const mascotaData = req.body

      // Verificar si la mascota existe
      const mascota = await mascotasModel.getById(id)
      if (!mascota) {
        return res.status(404).json({ message: "Mascota no encontrada" })
      }

      // Si se está actualizando la especie, verificar que exista
      if (mascotaData.IdEspecie) {
        const especie = await especiesModel.getById(mascotaData.IdEspecie)
        if (!especie) {
          return res.status(404).json({ message: "La especie especificada no existe" })
        }
      }

      // Verificar si se está actualizando el estado
      if (mascotaData.Estado !== undefined) {
        // Asegurar que el estado sea un número
        const estado =
          typeof mascotaData.Estado === "number" ? mascotaData.Estado : mascotaData.Estado === "Activo" ? 1 : 0

        console.log(`Actualizando estado de mascota ${id} a ${estado}`)

        // Actualizar solo el estado si es lo único que se está cambiando
        if (Object.keys(mascotaData).length === 1) {
          await query("UPDATE Mascotas SET Estado = ? WHERE IdMascota = ?", [estado, id])

          // Obtener la mascota actualizada
          const mascotaActualizada = await mascotasModel.getById(id)
          return res.status(200).json(mascotaActualizada)
        }

        // Si se están actualizando más campos, asegurar que el estado se incluya
        mascotaData.Estado = estado
      }

      // Procesar imagen si se proporciona
      if (req.file) {
        try {
          // Eliminar imagen anterior si existe
          if (mascota.Foto) {
            const publicId = mascota.Foto.split("/").pop().split(".")[0]
            await deleteFromCloudinary(publicId)
          }

          // Subir nueva imagen
          const result = await uploadImage(req.file.path, "mascotas")
          mascotaData.Foto = result.secure_url
        } catch (uploadError) {
          console.error("Error al procesar imagen:", uploadError)
          // Continuar sin actualizar imagen si hay error
        }
      }

      // Actualizar mascota
      const updatedMascota = await mascotasModel.update(id, mascotaData)

      res.status(200).json(updatedMascota)
    } catch (error) {
      console.error(`Error al actualizar mascota con ID ${req.params.id}:`, error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Eliminar una mascota
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si la mascota existe
      const mascota = await mascotasModel.getById(id)
      if (!mascota) {
        return res.status(404).json({ message: "Mascota no encontrada" })
      }

      // Verificar si tiene citas asociadas
      const citas = await query(`SELECT * FROM AgendamientoDeCitas WHERE IdMascota = ?`, [id])

      if (citas.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar la mascota porque tiene citas asociadas",
          citas,
        })
      }

      // Verificar si tiene servicios asociados
      const servicios = await query(`SELECT * FROM DetalleVentasServicios WHERE IdMascota = ?`, [id])

      if (servicios.length > 0) {
        return res.status(400).json({
          message: "No se puede eliminar la mascota porque tiene servicios asociados",
          servicios,
        })
      }

      // Eliminar imagen si existe
      if (mascota.Foto) {
        try {
          const publicId = mascota.Foto.split("/").pop().split(".")[0]
          await deleteFromCloudinary(publicId)
        } catch (deleteError) {
          console.error("Error al eliminar imagen de Cloudinary:", deleteError)
        }
      }

      // Eliminar mascota
      await mascotasModel.delete(id)

      res.status(200).json({ message: "Mascota eliminada correctamente" })
    } catch (error) {
      console.error("Error al eliminar mascota:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA - Buscar mascotas
  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "El término de búsqueda es requerido" })
      }

      const mascotas = await mascotasModel.search(term)

      res.status(200).json(mascotas)
    } catch (error) {
      console.error("Error al buscar mascotas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// ✅ CONTROLADOR EXISTENTE MANTENIDO - Especies
export const especiesController = {
  // Obtener todas las especies
  getAll: async (req, res) => {
    try {
      const especies = await especiesModel.getAll()
      res.status(200).json(especies)
    } catch (error) {
      console.error("Error al obtener especies:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener una especie por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const especie = await especiesModel.getById(id)

      if (!especie) {
        return res.status(404).json({ message: "Especie no encontrada" })
      }

      res.status(200).json(especie)
    } catch (error) {
      console.error("Error al obtener especie:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear una nueva especie
  create: async (req, res) => {
    try {
      const especieData = req.body

      // Validar datos básicos
      if (!especieData.NombreEspecie) {
        return res.status(400).json({ message: "NombreEspecie es un campo requerido" })
      }

      // Verificar si ya existe una especie con el mismo nombre
      const especies = await query(`SELECT * FROM Especies WHERE NombreEspecie = ?`, [especieData.NombreEspecie])
      if (especies.length > 0) {
        return res.status(400).json({ message: "Ya existe una especie con ese nombre" })
      }

      // Crear especie
      const nuevaEspecie = await especiesModel.create(especieData)

      res.status(201).json(nuevaEspecie)
    } catch (error) {
      console.error("Error al crear especie:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar una especie
  update: async (req, res) => {
    try {
      const { id } = req.params
      const especieData = req.body

      // Verificar si la especie existe
      const especie = await especiesModel.getById(id)
      if (!especie) {
        return res.status(404).json({ message: "Especie no encontrada" })
      }

      // Verificar si ya existe otra especie con el mismo nombre
      if (especieData.NombreEspecie && especieData.NombreEspecie !== especie.NombreEspecie) {
        const especies = await query(`SELECT * FROM Especies WHERE NombreEspecie = ?`, [especieData.NombreEspecie])
        if (especies.length > 0) {
          return res.status(400).json({ message: "Ya existe otra especie con ese nombre" })
        }
      }

      // Actualizar especie
      const updatedEspecie = await especiesModel.update(id, especieData)

      res.status(200).json(updatedEspecie)
    } catch (error) {
      console.error(`Error al actualizar especie con ID ${req.params.id}:`, error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar una especie - MEJORADO PARA CONSISTENCIA
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Validar que el ID sea un número válido
      const especieId = Number(id);
      if (isNaN(especieId) || especieId <= 0) {
        return res.status(400).json({ message: "ID de especie no válido" });
      }

      // Verificar si la especie existe
      const especie = await especiesModel.getById(especieId)
      if (!especie) {
        return res.status(404).json({ message: "Especie no encontrada" })
      }

      // Verificar si hay mascotas asociadas - MEJORADO
      let tieneMascotas = false;
      let mascotasCount = 0;

      try {
        // Consulta directa para verificar mascotas asociadas
        const result = await query(`SELECT COUNT(*) as count FROM Mascotas WHERE IdEspecie = ?`, [especieId])
        
        // Verificar si el resultado es válido y obtener el conteo de manera segura
        mascotasCount = result && result[0] && typeof result[0].count !== 'undefined' ? 
                        parseInt(result[0].count, 10) : 0;
        
        tieneMascotas = mascotasCount > 0;
      } catch (queryError) {
        console.error("Error en la primera verificación de mascotas asociadas:", queryError);
        
        // Segundo intento con consulta alternativa
        try {
          const mascotas = await query(`SELECT IdMascota FROM Mascotas WHERE IdEspecie = ? LIMIT 1`, [especieId]);
          tieneMascotas = Array.isArray(mascotas) && mascotas.length > 0;
          mascotasCount = tieneMascotas ? 1 : 0; // Al menos sabemos que hay una
        } catch (secondQueryError) {
          console.error("Error en la segunda verificación de mascotas:", secondQueryError);
          
          // Tercer intento usando el modelo
          try {
            const todasLasMascotas = await mascotasModel.getAll();
            const mascotasAsociadas = todasLasMascotas.filter(
              m => m.IdEspecie === especieId || String(m.IdEspecie) === String(especieId)
            );
            tieneMascotas = mascotasAsociadas.length > 0;
            mascotasCount = mascotasAsociadas.length;
          } catch (modelError) {
            console.error("Error en la tercera verificación de mascotas:", modelError);
            // Si todos los intentos fallan, asumimos que podría haber dependencias
            // y rechazamos la eliminación por seguridad
            return res.status(500).json({ 
              message: "No se pudo verificar si la especie tiene mascotas asociadas. Por seguridad, no se eliminará.",
              error: "Error en la verificación de dependencias"
            });
          }
        }
      }
      
      // Si tiene mascotas asociadas, no permitir la eliminación
      if (tieneMascotas) {
        return res.status(400).json({
          message: "No se puede eliminar la especie porque tiene mascotas asociadas",
          count: mascotasCount
        });
      }

      // Eliminar especie
      await especiesModel.delete(especieId);

      res.status(200).json({ message: "Especie eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar especie:", error);
      res.status(500).json({ 
        message: "Error en el servidor al eliminar la especie", 
        error: error.message 
      });
    }
  },

  // Verificar si una especie tiene mascotas asociadas - MEJORADO
  checkDependencies: async (id) => {
    // Validar que el ID sea un número válido
    const especieId = Number(id);
    if (isNaN(especieId) || especieId <= 0) {
      throw new Error("ID de especie no válido");
    }
    
    // Múltiples métodos de verificación para garantizar consistencia
    const resultados = {
      metodo1: null,
      metodo2: null,
      metodo3: null,
      conclusion: false
    };
    
    // Método 1: COUNT
    try {
      const result = await query(`SELECT COUNT(*) as count FROM Mascotas WHERE IdEspecie = ?`, [especieId]);
      const count = result && result[0] && typeof result[0].count !== 'undefined' ? 
                    parseInt(result[0].count, 10) : null;
      
      resultados.metodo1 = count !== null ? count > 0 : null;
    } catch (error) {
      console.error("Error en método 1 (COUNT):", error);
      resultados.metodo1 = null;
    }
    
    // Método 2: SELECT con LIMIT
    try {
      const mascotas = await query(`SELECT IdMascota FROM Mascotas WHERE IdEspecie = ? LIMIT 1`, [especieId]);
      resultados.metodo2 = Array.isArray(mascotas) && mascotas.length > 0;
    } catch (error) {
      console.error("Error en método 2 (SELECT LIMIT):", error);
      resultados.metodo2 = null;
    }
    
    // Método 3: JOIN
    try {
      const joinQuery = `
        SELECT m.IdMascota 
        FROM Especies e 
        JOIN Mascotas m ON e.IdEspecie = m.IdEspecie 
        WHERE e.IdEspecie = ? 
        LIMIT 1
      `;
      const relacionadas = await query(joinQuery, [especieId]);
      resultados.metodo3 = Array.isArray(relacionadas) && relacionadas.length > 0;
    } catch (error) {
      console.error("Error en método 3 (JOIN):", error);
      resultados.metodo3 = null;
    }
    
    // Determinar la conclusión basada en los resultados disponibles
    const resultadosValidos = [
      resultados.metodo1, 
      resultados.metodo2, 
      resultados.metodo3
    ].filter(r => r !== null);
    
    if (resultadosValidos.length > 0) {
      // Si al menos un método funcionó, usamos el resultado más común
      // o el peor caso (true) si hay empate
      const trueCount = resultadosValidos.filter(r => r === true).length;
      const falseCount = resultadosValidos.filter(r => r === false).length;
      
      resultados.conclusion = trueCount >= falseCount;
    } else {
      // Si todos los métodos fallaron, hacemos una última verificación
      try {
        const todasLasMascotas = await mascotasModel.getAll();
        const tieneMascotas = todasLasMascotas.some(
          m => m.IdEspecie === especieId || String(m.IdEspecie) === String(especieId)
        );
        resultados.conclusion = tieneMascotas;
      } catch (error) {
        console.error("Error en verificación final:", error);
        // Si todo falla, asumimos que podría haber dependencias por seguridad
        resultados.conclusion = true;
      }
    }
    
    console.log("Resultados de verificación de dependencias:", resultados);
    return resultados.conclusion;
  }
}

export default {
  clientes: clientesController,
  mascotas: mascotasController,
  especies: especiesController
}