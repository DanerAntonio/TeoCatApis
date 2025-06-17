import { notificacionesModel } from "../../Models/NotificationService/notifications.model.js"
import { usuariosModel } from "../../Models/AuthService/auth.model.js" // Corregido: importar desde auth.model.js
import { sendEmail } from "../../Utils/Email.js"
import { clientesModel } from "../../Models/CustomerService/customers.model.js"
import { query } from "../../Config/Database.js"

// Controlador para notificaciones
export const notificacionesController = {
  // Obtener todas las notificaciones
  getAll: async (req, res) => {
    try {
      const notificaciones = await notificacionesModel.getAll()
      res.status(200).json(notificaciones)
    } catch (error) {
      console.error("Error al obtener notificaciones:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener una notificación por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const notificacion = await notificacionesModel.getById(id)

      if (!notificacion) {
        return res.status(404).json({ message: "Notificación no encontrada" })
      }

      res.status(200).json(notificacion)
    } catch (error) {
      console.error("Error al obtener notificación:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear una nueva notificación
  create: async (req, res) => {
    try {
      const notificacionData = req.body;

      // Validar datos mínimos
      if (!notificacionData.Titulo || !notificacionData.Mensaje || !notificacionData.TipoNotificacion) {
        return res.status(400).json({
          message: "Faltan campos obligatorios: Titulo, Mensaje, TipoNotificacion",
        });
      }

      // Validar tipo de notificación
      const tiposValidos = [
        "StockBajo",
        "Vencimiento",
        "Comprobante",
        "ReseñaProducto",
        "ReseñaServicio",
        "ReseñaGeneral",
        "Cita",
      ];
      if (!tiposValidos.includes(notificacionData.TipoNotificacion)) {
        return res.status(400).json({
          message: "Tipo de notificación no válido",
          tiposValidos,
        });
      }

      // Validar que al menos un destinatario esté especificado
      if (!notificacionData.IdUsuario && !notificacionData.ParaAdmins && !notificacionData.ParaTodos) {
        return res.status(400).json({
          message: "Debe especificar al menos un destinatario: IdUsuario, ParaAdmins o ParaTodos",
        });
      }

      // Crear la notificación con los datos recibidos (incluyendo Imagen si viene en el body)
      const nuevaNotificacion = await notificacionesModel.create(notificacionData);

      // Enviar correo si se solicita
      if (notificacionData.EnviarCorreo) {
        try {
          // Si es para un usuario específico
          if (notificacionData.IdUsuario) {
            const usuario = await usuariosModel.getById(notificacionData.IdUsuario)
            if (usuario && usuario.Correo) {
              await sendEmail({
                to: usuario.Correo,
                subject: notificacionData.Titulo,
                text: notificacionData.Mensaje,
                html: `<h2>${notificacionData.Titulo}</h2><p>${notificacionData.Mensaje}</p>`,
              })
            }
          }
          // Si es para todos los administradores
          else if (notificacionData.ParaAdmins) {
            const admins = await usuariosModel.getByRol(1) // Obtener administradores (rol 1)
            for (const admin of admins) {
              if (admin.Correo) {
                await sendEmail({
                  to: admin.Correo,
                  subject: notificacionData.Titulo,
                  text: notificacionData.Mensaje,
                  html: `<h2>${notificacionData.Titulo}</h2><p>${notificacionData.Mensaje}</p>`,
                })
              }
            }
          }
          // Si es para todos los usuarios
          else if (notificacionData.ParaTodos) {
            // Aquí podrías implementar un envío masivo o usar un servicio de email marketing
            // Por ahora, solo registramos que se intentó
            console.log("Envío masivo de correos solicitado para notificación:", nuevaNotificacion.id)
          }
        } catch (emailError) {
          console.error("Error al enviar correo de notificación:", emailError)
          // No interrumpir el flujo si falla el envío de correo
        }
      }

      res.status(201).json(nuevaNotificacion)
    } catch (error) {
      console.error("Error al crear notificación:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar una notificación
  update: async (req, res) => {
    try {
      const { id } = req.params
      const notificacionData = req.body

      // Verificar si la notificación existe
      const existingNotificacion = await notificacionesModel.getById(id)
      if (!existingNotificacion) {
        return res.status(404).json({ message: "Notificación no encontrada" })
      }

      // Validar tipo de notificación si se está actualizando
      if (notificacionData.TipoNotificacion) {
        const tiposValidos = [
          "StockBajo",
          "Vencimiento",
          "Comprobante",
          "ReseñaProducto",
          "ReseñaServicio",
          "ReseñaGeneral",
          "Cita",
        ]
        if (!tiposValidos.includes(notificacionData.TipoNotificacion)) {
          return res.status(400).json({
            message: "Tipo de notificación no válido",
            tiposValidos,
          })
        }
      }

      // Actualizar la notificación
      const updatedNotificacion = await notificacionesModel.update(id, notificacionData)

      res.status(200).json(updatedNotificacion)
    } catch (error) {
      console.error("Error al actualizar notificación:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar estado de notificación y venta relacionada
  updateNotificacion: async (req, res) => {
    const { id } = req.params;
    const { nuevoEstado, motivo } = req.body;
    try {
      await notificacionesModel.updateStatus(id, nuevoEstado, motivo);
      const notificacion = await notificacionesModel.getById(id);

      // Si es comprobante y referencia a venta, actualiza la venta
      if (
        notificacion &&
        notificacion.TipoNotificacion === "Comprobante" &&
        notificacion.TablaReferencia === "Ventas" &&
        notificacion.IdReferencia
      ) {
        const nuevoEstadoVenta =
          nuevoEstado === "Aprobada"
            ? "Efectiva"
            : nuevoEstado === "Rechazada"
            ? "Cancelada"
            : null;
        if (nuevoEstadoVenta) {
          await query(
            "UPDATE Ventas SET Estado = ? WHERE IdVenta = ?",
            [nuevoEstadoVenta, notificacion.IdReferencia]
          );
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error al actualizar notificación:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Marcar notificación como leída
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params
      const idUsuario = req.user.id // Asumiendo que el middleware de autenticación agrega req.user

      // Verificar si la notificación existe
      const existingNotificacion = await notificacionesModel.getById(id)
      if (!existingNotificacion) {
        return res.status(404).json({ message: "Notificación no encontrada" })
      }

      // Marcar como leída
      const result = await notificacionesModel.markAsRead(id, idUsuario)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Marcar notificación como resuelta
  markAsResolved: async (req, res) => {
    try {
      const { id } = req.params
      const idUsuario = req.user.id // Asumiendo que el middleware de autenticación agrega req.user

      // Verificar si la notificación existe
      const existingNotificacion = await notificacionesModel.getById(id)
      if (!existingNotificacion) {
        return res.status(404).json({ message: "Notificación no encontrada" })
      }

      // Marcar como resuelta
      const result = await notificacionesModel.markAsResolved(id, idUsuario)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al marcar notificación como resuelta:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar una notificación
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si la notificación existe
      const existingNotificacion = await notificacionesModel.getById(id)
      if (!existingNotificacion) {
        return res.status(404).json({ message: "Notificación no encontrada" })
      }

      // Eliminar la notificación
      await notificacionesModel.delete(id)

      res.status(200).json({ message: "Notificación eliminada correctamente" })
    } catch (error) {
      console.error("Error al eliminar notificación:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener notificaciones por usuario
  getByUsuario: async (req, res) => {
    try {
      const { id } = req.params

      // Obtener notificaciones
      const notificaciones = await notificacionesModel.getByUsuario(id)

      res.status(200).json(notificaciones)
    } catch (error) {
      console.error("Error al obtener notificaciones del usuario:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener notificaciones por cliente
  getByCliente: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el cliente existe
      const cliente = await clientesModel.getById(id)
      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" })
      }

      // Obtener notificaciones
      const notificaciones = await notificacionesModel.getByCliente(id)

      res.status(200).json(notificaciones)
    } catch (error) {
      console.error("Error al obtener notificaciones del cliente:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener notificaciones por tipo
  getByTipo: async (req, res) => {
    try {
      const { tipo } = req.params

      // Validar tipo de notificación
      const tiposValidos = [
        "StockBajo",
        "Vencimiento",
        "Comprobante",
        "ReseñaProducto",
        "ReseñaServicio",
        "ReseñaGeneral",
        "Cita",
      ]
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          message: "Tipo de notificación no válido",
          tiposValidos,
        })
      }

      // Obtener notificaciones
      const notificaciones = await notificacionesModel.getByTipo(tipo)

      res.status(200).json(notificaciones)
    } catch (error) {
      console.error("Error al obtener notificaciones por tipo:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener notificaciones no leídas
  getUnread: async (req, res) => {
    try {
      const idUsuario = req.user.id // Asumiendo que el middleware de autenticación agrega req.user

      // Obtener notificaciones no leídas
      const notificaciones = await notificacionesModel.getUnread(idUsuario)

      res.status(200).json(notificaciones)
    } catch (error) {
      console.error("Error al obtener notificaciones no leídas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener conteo de notificaciones no leídas
  getUnreadCount: async (req, res) => {
    try {
      const idUsuario = req.user.id // Asumiendo que el middleware de autenticación agrega req.user

      // Obtener conteo de notificaciones no leídas
      const count = await notificacionesModel.getUnreadCount(idUsuario)

      res.status(200).json({ count })
    } catch (error) {
      console.error("Error al obtener conteo de notificaciones no leídas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Marcar todas las notificaciones como leídas
  markAllAsRead: async (req, res) => {
    try {
      const idUsuario = req.user.id // Asumiendo que el middleware de autenticación agrega req.user

      // Marcar todas como leídas
      const result = await notificacionesModel.markAllAsRead(idUsuario)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al marcar todas las notificaciones como leídas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar notificaciones antiguas
  deleteOld: async (req, res) => {
    try {
      const { days } = req.body

      // Validar días
      const daysNum = Number.parseInt(days) || 30
      if (daysNum < 1) {
        return res.status(400).json({ message: "El número de días debe ser mayor a 0" })
      }

      // Eliminar notificaciones antiguas
      const result = await notificacionesModel.deleteOld(daysNum)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al eliminar notificaciones antiguas:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

export default notificacionesController
