import express from "express"
import { notificacionesController } from "../../Controllers/NotificationService/notifications.controller.js"
import { authMiddleware } from "../../Middlewares/auth.middleware.js"
import { validatePermission } from "../../Middlewares/permission.middleware.js"

const router = express.Router()

// Rutas para notificaciones
router.get("/notificaciones",authMiddleware,validatePermission("Visualizar Notificaciones"),notificacionesController.getAll,)
router.get("/notificaciones/unread", authMiddleware, notificacionesController.getUnread)
router.get("/notificaciones/unread/count", authMiddleware, notificacionesController.getUnreadCount)
router.get("/notificaciones/tipo/:tipo",authMiddleware,validatePermission("Visualizar Notificaciones"),notificacionesController.getByTipo,)
router.get("/notificaciones/usuario/:id", authMiddleware, notificacionesController.getByUsuario)
router.get("/notificaciones/cliente/:id",authMiddleware,validatePermission("Visualizar Notificaciones"),notificacionesController.getByCliente,)
router.get("/notificaciones/:id",authMiddleware,validatePermission("Visualizar Notificaciones"),notificacionesController.getById,)
router.post("/notificaciones",authMiddleware,validatePermission("Crear Notificaciones"),notificacionesController.create,)
router.post("/notificaciones/mark-all-read", authMiddleware, notificacionesController.markAllAsRead)
router.post("/notificaciones/delete-old",authMiddleware,validatePermission("Eliminar Notificaciones"),notificacionesController.deleteOld,)
router.put("/notificaciones/:id",authMiddleware,validatePermission("Modificar Notificaciones"),notificacionesController.update,)
router.patch("/notificaciones/:id/read", authMiddleware, notificacionesController.markAsRead)
router.patch("/notificaciones/:id/resolve", authMiddleware, notificacionesController.markAsResolved)
router.patch("/notificaciones/:id/estado", authMiddleware, validatePermission("Modificar Notificaciones"), notificacionesController.updateNotificacion)
router.delete("/notificaciones/:id",authMiddleware,validatePermission("Eliminar Notificaciones"),notificacionesController.delete,)


export default router
