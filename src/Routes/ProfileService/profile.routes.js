import express from "express"
import { usuariosController } from "../../Controllers/AuthService/auth.controller.js"
import { mascotasController, especiesController } from "../../Controllers/CustomerService/customers.controller.js"
import { ventasController } from "../../Controllers/SalesService/sales.controller.js"
import { citasController } from "../../Controllers/AppointmentService/appointment.controller.js"
import {
  reseñasProductosController,
  reseñasServiciosController,
  reseñasGeneralesController,
} from "../../Controllers/ReviewService/reviews.controller.js"
import { authMiddleware } from "../../Middlewares/auth.middleware.js"
import { uploadMiddleware } from "../../Middlewares/upload.middleware.js"
import { clientesModel, mascotasModel } from "../../Models/CustomerService/customers.model.js"

const router = express.Router()

// Función auxiliar para obtener o crear cliente CON DATOS REALES
const getOrCreateCliente = async (userId) => {
  try {
    // Primero intentar obtener el cliente existente
    let cliente = await clientesModel.getByUsuario(userId)

    if (cliente) {
      console.log("✅ Cliente encontrado:", cliente)
      return cliente
    }

    console.log("⚠️ Cliente no encontrado, obteniendo datos reales del usuario...")

    // ✅ USAR EL CONTROLADOR EN LUGAR DEL MODELO
    // Crear un mock request/response para usar el controlador
    const mockReq = { params: { id: userId } }
    let usuario = null

    const mockRes = {
      status: () => ({
        json: (data) => {
          usuario = data
        },
      }),
    }

    // Llamar al controlador que SÍ incluye el campo Documento
    await usuariosController.getById(mockReq, mockRes)

    if (!usuario) {
      console.error("❌ Usuario no encontrado con ID:", userId)
      return null
    }

    console.log("👤 Usuario encontrado con datos reales (incluyendo Documento):", usuario)

    // Verificar si el usuario tiene rol de cliente (IdRol = 2)
    if (usuario.IdRol !== 2) {
      console.log("⚠️ Usuario no es cliente, rol:", usuario.IdRol)
      return null
    }

    // Crear cliente con los datos REALES del usuario
    console.log("🔄 Creando cliente con datos reales del usuario...")

    const nuevoClienteData = {
      IdUsuario: userId,
      Documento: usuario.Documento, // ✅ AHORA SÍ TENDREMOS EL DOCUMENTO REAL
      Nombre: usuario.Nombre,
      Apellido: usuario.Apellido,
      Correo: usuario.Correo,
      Telefono: usuario.Telefono,
      Direccion: usuario.Direccion,
      Estado: usuario.Estado,
    }

    console.log("📋 Datos REALES para crear cliente:", nuevoClienteData)

    cliente = await clientesModel.create(nuevoClienteData)
    console.log("✅ Cliente creado con datos reales:", cliente)

    return cliente
  } catch (error) {
    console.error("❌ Error en getOrCreateCliente:", error)
    return null
  }
}

// ============================================
// 🔹 1. INFORMACIÓN PERSONAL DEL USUARIO
// ============================================

// Obtener información personal del usuario autenticado
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({
        message: "ID de usuario no encontrado en el token",
        userObject: req.user,
      })
    }

    console.log("✅ Obteniendo datos del usuario ID:", userId)

    // ✅ USAR EL CONTROLADOR EN LUGAR DEL MODELO
    // Crear un mock request/response para usar el controlador
    const mockReq = { params: { id: userId } }
    let usuario = null

    const mockRes = {
      status: () => ({
        json: (data) => {
          usuario = data
        },
      }),
    }

    // Llamar al controlador que SÍ incluye el campo Documento
    await usuariosController.getById(mockReq, mockRes)

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" })
    }

    console.log("🔍 DEBUG - Usuario completo del CONTROLADOR:", usuario)
    console.log("🔍 DEBUG - Campo Documento del CONTROLADOR:", usuario.Documento)

    // Formatear los datos para el frontend
    const userData = {
      IdUsuario: usuario.IdUsuario,
      documento: usuario.Documento, // ✅ AHORA SÍ TENDREMOS EL DOCUMENTO
      correo: usuario.Correo,
      nombre: usuario.Nombre,
      apellido: usuario.Apellido,
      telefono: usuario.Telefono,
      direccion: usuario.Direccion,
      estado: usuario.Estado,
      fechaCreacion: usuario.FechaCreacion,
      fotoURL: usuario.Foto,
      rol: usuario.NombreRol,
    }

    console.log("📤 Enviando datos del usuario al frontend:", userData)

    res.status(200).json(userData)
  } catch (error) {
    console.error("❌ Error al obtener información del usuario:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar información personal del usuario
router.put("/me", authMiddleware, uploadMiddleware.single("foto"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    // ✅ PREPARAR CORRECTAMENTE LOS DATOS COMO EN EL ADMIN
    console.log("🔍 Datos recibidos en profile/me:", req.body)
    
    // ✅ FORMATEAR LOS DATOS IGUAL QUE EN EL ADMIN
    const formattedData = {
      Nombre: req.body.nombre || req.body.Nombre,
      Apellido: req.body.apellido || req.body.Apellido, 
      Correo: req.body.correo || req.body.Correo,
      Documento: req.body.documento || req.body.Documento,
      Telefono: req.body.telefono || req.body.Telefono,
      Direccion: req.body.direccion || req.body.Direccion,
      Foto: req.body.foto || req.body.Foto || (req.file ? req.file.filename : undefined),
      // NO incluir IdRol ni Estado desde el perfil del cliente
    }

    // ✅ LIMPIAR CAMPOS UNDEFINED
    Object.keys(formattedData).forEach(key => {
      if (formattedData[key] === undefined) {
        delete formattedData[key]
      }
    })

    console.log("🔍 Datos formateados para actualizar:", formattedData)

    // ✅ PREPARAR EL REQUEST CORRECTAMENTE
    req.params.id = userId
    req.body = formattedData

    await usuariosController.update(req, res)
  } catch (error) {
    console.error("Error al actualizar información del usuario:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar solo la foto del usuario
router.put("/me/photo", authMiddleware, uploadMiddleware.single("foto"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    req.params.id = userId

    await usuariosController.updateFoto(req, res)
  } catch (error) {
    console.error("Error al actualizar foto del usuario:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Cambiar contraseña del usuario
router.patch("/me/password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    req.params.id = userId

    await usuariosController.changePassword(req, res)
  } catch (error) {
    console.error("Error al cambiar contraseña:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// ============================================
// 🔹 2. MIS MASCOTAS
// ============================================

// Obtener todas las mascotas del cliente autenticado
router.get("/me/pets", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    console.log("🔍 Obteniendo mascotas para usuario ID:", userId)

    // Obtener o crear cliente con datos reales
    const cliente = await getOrCreateCliente(userId)

    if (!cliente) {
      return res.status(404).json({
        message: "No se pudo obtener o crear el perfil de cliente",
        details: "El usuario debe tener rol de cliente para acceder a las mascotas",
      })
    }

    // Obtener mascotas directamente del modelo
    const mascotas = await mascotasModel.getByCliente(cliente.IdCliente || cliente.id)
    console.log("🐾 Mascotas encontradas:", mascotas)

    res.status(200).json(mascotas)
  } catch (error) {
    console.error("❌ Error al obtener mascotas del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener una mascota específica del cliente
router.get("/me/pets/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // Verificar que la mascota pertenezca al cliente
    const mascota = await mascotasModel.getById(req.params.id)
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" })
    }

    const clienteId = cliente.IdCliente || cliente.id
    if (mascota.IdCliente !== clienteId) {
      return res.status(403).json({ message: "No tienes permiso para ver esta mascota" })
    }

    res.status(200).json(mascota)
  } catch (error) {
    console.error("Error al obtener mascota del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Crear una nueva mascota para el cliente autenticado
router.post("/me/pets", authMiddleware, uploadMiddleware.single("foto"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // Asignar automáticamente el ID del cliente
    req.body.IdCliente = cliente.IdCliente || cliente.id

    // Llamar al controlador directamente
    await mascotasController.create(req, res)
  } catch (error) {
    console.error("Error al crear mascota del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar una mascota del cliente autenticado
router.put("/me/pets/:id", authMiddleware, uploadMiddleware.single("foto"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // Verificar que la mascota pertenezca al cliente
    const mascota = await mascotasModel.getById(req.params.id)
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" })
    }

    const clienteId = cliente.IdCliente || cliente.id
    if (mascota.IdCliente !== clienteId) {
      return res.status(403).json({ message: "No tienes permiso para modificar esta mascota" })
    }

    // Asegurar que no se cambie el IdCliente
    req.body.IdCliente = clienteId

    // Llamar al controlador directamente
    await mascotasController.update(req, res)
  } catch (error) {
    console.error("Error al actualizar mascota del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener especies disponibles (para formularios)
router.get("/me/especies", authMiddleware, async (req, res) => {
  try {
    await especiesController.getAll(req, res)
  } catch (error) {
    console.error("Error al obtener especies:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// ============================================
// 🔹 3. MIS PEDIDOS/ÓRDENES
// ============================================

// Obtener todos los pedidos del cliente autenticado
router.get("/me/orders", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // Crear un objeto req mock con el ID del cliente
    const mockReq = { params: { id: cliente.IdCliente || cliente.id } }
    await ventasController.getByCliente(mockReq, res)
  } catch (error) {
    console.error("Error al obtener pedidos del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener un pedido específico del cliente
router.get("/me/orders/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // Crear un objeto req mock
    const mockReq = { params: { id: req.params.id } }

    // Crear un objeto res mock para interceptar la respuesta
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          // Verificar que el pedido pertenezca al cliente
          if (data && data.IdCliente !== (cliente.IdCliente || cliente.id)) {
            return res.status(403).json({ message: "No tienes permiso para ver este pedido" })
          }
          res.status(code).json(data)
        },
      }),
    }

    await ventasController.getById(mockReq, mockRes)
  } catch (error) {
    console.error("Error al obtener pedido del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Cancelar un pedido del cliente (solo si está en estado "Efectiva")
router.patch("/me/orders/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = {
      params: { id: req.params.id },
      body: { Estado: "Cancelada" },
    }

    await ventasController.changeStatus(mockReq, res)
  } catch (error) {
    console.error("Error al cancelar pedido del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// ============================================
// 🔹 4. MIS CITAS
// ============================================

// Obtener todas las citas del cliente autenticado
router.get("/me/appointments", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = { params: { id: cliente.IdCliente || cliente.id } }
    await citasController.getByCliente(mockReq, res)
  } catch (error) {
    console.error("Error al obtener citas del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener una cita específica del cliente
router.get("/me/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = { params: { id: req.params.id } }
    await citasController.getById(mockReq, res)
  } catch (error) {
    console.error("Error al obtener cita del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Cancelar una cita del cliente (solo si está "Programada")
router.patch("/me/appointments/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = {
      params: { id: req.params.id },
      body: { Estado: "Cancelada" },
    }

    await citasController.changeStatus(mockReq, res)
  } catch (error) {
    console.error("Error al cancelar cita del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// ============================================
// 🔹 5. MIS RESEÑAS
// ============================================

// Obtener todas las reseñas de productos del cliente
router.get("/me/reviews/products", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = { params: { id: cliente.IdCliente || cliente.id } }
    await reseñasProductosController.getByCliente(mockReq, res)
  } catch (error) {
    console.error("Error al obtener reseñas de productos del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar una reseña de producto del cliente
router.put("/me/reviews/products/:id", authMiddleware, uploadMiddleware.single("foto"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasProductosController.update(req, res)
  } catch (error) {
    console.error("Error al actualizar reseña de producto del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Eliminar una reseña de producto del cliente
router.delete("/me/reviews/products/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasProductosController.delete(req, res)
  } catch (error) {
    console.error("Error al eliminar reseña de producto del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener todas las reseñas de servicios del cliente
router.get("/me/reviews/services", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = { params: { id: cliente.IdCliente || cliente.id } }
    await reseñasServiciosController.getByCliente(mockReq, res)
  } catch (error) {
    console.error("Error al obtener reseñas de servicios del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar una reseña de servicio del cliente
router.put("/me/reviews/services/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasServiciosController.update(req, res)
  } catch (error) {
    console.error("Error al actualizar reseña de servicio del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Eliminar una reseña de servicio del cliente
router.delete("/me/reviews/services/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasServiciosController.delete(req, res)
  } catch (error) {
    console.error("Error al eliminar reseña de servicio del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Obtener todas las reseñas generales del cliente
router.get("/me/reviews/general", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    const mockReq = { params: { id: cliente.IdCliente || cliente.id } }
    await reseñasGeneralesController.getByCliente(mockReq, res)
  } catch (error) {
    console.error("Error al obtener reseñas generales del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Actualizar una reseña general del cliente
router.put("/me/reviews/general/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasGeneralesController.update(req, res)
  } catch (error) {
    console.error("Error al actualizar reseña general del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

// Eliminar una reseña general del cliente
router.delete("/me/reviews/general/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.IdUsuario || req.user.userId

    if (!userId) {
      return res.status(400).json({ message: "ID de usuario no encontrado en el token" })
    }

    const cliente = await getOrCreateCliente(userId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    await reseñasGeneralesController.delete(req, res)
  } catch (error) {
    console.error("Error al eliminar reseña general del perfil:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
})

export default router
