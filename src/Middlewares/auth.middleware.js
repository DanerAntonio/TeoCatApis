import jwt from "jsonwebtoken"
import { sesionesUsuariosModel } from "../Models/AuthService/auth.model.js"

// Middleware para verificar autenticación
export const authMiddleware = async (req, res, next) => {
  try {
    // Verificar si hay un token en los headers
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado. Token no proporcionado" })
    }

    // Extraer el token
    const token = authHeader.split(" ")[1]

    try {
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Verificar si el token está en la base de datos y es válido
      const session = await sesionesUsuariosModel.isValid(token)
      if (!session) {
        return res.status(401).json({ message: "No autorizado. Sesión inválida o expirada" })
      }

      // Añadir el usuario decodificado a la solicitud
      req.user = decoded

      // Añadir información de la sesión para auditoría
      req.session = {
        id: session.IdSesion,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }

      next()
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "No autorizado. Token expirado" })
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "No autorizado. Token inválido" })
      }
      throw error
    }
  } catch (error) {
    console.error("Error en el middleware de autenticación:", error)
    res.status(500).json({ message: "Error en el servidor", error: error.message })
  }
}

export default authMiddleware