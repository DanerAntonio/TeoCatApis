import express from "express";
import { adminController } from "../../Controllers/AuthService/admin.controller.js";
import { authMiddleware } from "../../Middlewares/auth.middleware.js";

const router = express.Router();

// Ruta para corregir permisos del Super Administrador
router.post("/fix-permissions", 
  authMiddleware, 
  (req, res, next) => {
    // Solo permitir al Super Administrador ejecutar esta acción
    if (req.user.role !== 1) {
      return res.status(403).json({ message: "Acceso denegado. Solo el Super Administrador puede ejecutar esta acción" });
    }
    next();
  },
  adminController.fixSuperAdminPermissions
);

// Ruta para corregir permisos de todos los roles
router.post("/fix-all-permissions", 
  authMiddleware, 
  (req, res, next) => {
    // Solo permitir al Super Administrador ejecutar esta acción
    if (req.user.role !== 1) {
      return res.status(403).json({ message: "Acceso denegado. Solo el Super Administrador puede ejecutar esta acción" });
    }
    next();
  },
  adminController.fixAllRolesPermissions
);

// Ruta para limpiar toda la caché de permisos
router.post("/clear-cache", 
  authMiddleware, 
  (req, res, next) => {
    // Solo permitir al Super Administrador ejecutar esta acción
    if (req.user.role !== 1) {
      return res.status(403).json({ message: "Acceso denegado. Solo el Super Administrador puede ejecutar esta acción" });
    }
    next();
  },
  adminController.clearPermissionCache
);

// Ruta para limpiar la caché de un usuario específico
router.post("/clear-user-cache/:userId", 
  authMiddleware, 
  (req, res, next) => {
    // Solo permitir al Super Administrador ejecutar esta acción
    if (req.user.role !== 1) {
      return res.status(403).json({ message: "Acceso denegado. Solo el Super Administrador puede ejecutar esta acción" });
    }
    next();
  },
  adminController.clearUserPermissionCache
);

// Ruta para diagnosticar permisos de un usuario
router.get("/diagnose-permissions/:userId", 
  authMiddleware, 
  (req, res, next) => {
    // Solo permitir al Super Administrador ejecutar esta acción
    if (req.user.role !== 1) {
      return res.status(403).json({ message: "Acceso denegado. Solo el Super Administrador puede ejecutar esta acción" });
    }
    next();
  },
  adminController.diagnoseUserPermissions
);

export default router;