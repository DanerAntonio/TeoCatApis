import { Server } from "socket.io"
import jwt from "jsonwebtoken"

let io

// Inicializar Socket.io
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*", // Ajusta según tus necesidades
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Middleware para autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error("Authentication error: Token missing"))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded
      next()
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"))
    }
  })

  // Manejo de conexiones
  io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.user.id}`)

    // Unir al usuario a su sala personal
    socket.join(`user:${socket.user.id}`)

    // Si el usuario es administrador, unirlo a la sala de administradores
    if (socket.user.role === 1) {
      // Asumiendo que el rol 1 es Super Administrador
      socket.join("admins")
    }

    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${socket.user.id}`)
    })
  })

  return io
}

// Obtener la instancia de Socket.io
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

// Enviar notificación a un usuario específico
export const sendNotificationToUser = (userId, notification) => {
  if (!io) return
  io.to(`user:${userId}`).emit("notification", notification)
}

// Enviar notificación a todos los administradores
export const sendNotificationToAdmins = (notification) => {
  if (!io) return
  io.to("admins").emit("notification", notification)
}

// Enviar notificación a todos los usuarios
export const sendNotificationToAll = (notification) => {
  if (!io) return
  io.emit("notification", notification)
}

export default {
  initializeSocket,
  getIO,
  sendNotificationToUser,
  sendNotificationToAdmins,
  sendNotificationToAll,
}
