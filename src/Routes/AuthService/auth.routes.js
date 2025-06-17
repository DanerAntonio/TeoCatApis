import express from "express"
import {permisosController,rolesController,rolPermisoController,usuariosController,authController,} from "../../Controllers/AuthService/auth.controller.js"
import { registerController } from "../../Controllers/AuthService/register.controller.js"
import { authMiddleware } from "../../Middlewares/auth.middleware.js"
import { validatePermission } from "../../Middlewares/permission.middleware.js"
import { uploadMiddleware } from "../../Middlewares/upload.middleware.js"
import adminRoutes from "./admin.routes.js"

const router = express.Router()

// Incluir rutas administrativas
router.use("/admin", adminRoutes)

// Rutas de autenticación
router.post("/login", authController.login)
router.post("/logout", authMiddleware, authController.logout)
router.get("/verify", authMiddleware, authController.verifyToken)
router.post("/request-reset", authController.requestPasswordReset)
router.post("/resend-reset", authController.resendPasswordReset)
router.post("/reset-password", authController.resetPassword)

// Ruta de registro público (nueva)
router.post("/register", uploadMiddleware.single("foto"), registerController.register)

// Rutas para permisos
router.get("/permisos", authMiddleware, validatePermission("Visualizar Permisos"), permisosController.getAll)
router.get("/permisos/search",authMiddleware,validatePermission("Visualizar Permisos"),permisosController.searchByName,)
router.get("/permisos/:id", authMiddleware, validatePermission("Visualizar Permisos"), permisosController.getById)
router.post("/permisos", authMiddleware, validatePermission("Crear Permisos"), permisosController.create)
router.put("/permisos/:id", authMiddleware, validatePermission("Modificar Permisos"), permisosController.update)
router.delete("/permisos/:id", authMiddleware, validatePermission("Eliminar Permisos"), permisosController.delete)

// Rutas para roles
router.get("/roles", authMiddleware, validatePermission("Visualizar Roles"), rolesController.getAll)
router.get("/roles/search", authMiddleware, validatePermission("Visualizar Roles"), rolesController.searchByName)
router.get("/roles/:id", authMiddleware, validatePermission("Visualizar Roles"), rolesController.getById)
router.post("/roles", authMiddleware, validatePermission("Crear Roles"), rolesController.create)
router.put("/roles/:id", authMiddleware, validatePermission("Modificar Roles"), rolesController.update)
router.patch("/roles/:id/status", authMiddleware, validatePermission("Cambiar Estado Roles"), rolesController.changeStatus)
router.delete("/roles/:id", authMiddleware, validatePermission("Eliminar Roles"), rolesController.delete)
router.get("/roles/:id/permisos", authMiddleware, validatePermission("Visualizar Roles"), rolesController.getPermisos)

// Rutas para la relación Rol-Permiso
router.get("/rol-permiso", authMiddleware, validatePermission("Visualizar Roles"), rolPermisoController.getAll)
router.post("/roles/:idRol/permisos/:idPermiso",authMiddleware,validatePermission("Modificar Roles"),rolPermisoController.assignPermiso,)
router.delete("/roles/:idRol/permisos/:idPermiso",authMiddleware,validatePermission("Modificar Roles"),rolPermisoController.removePermiso,)
router.post("/roles/:idRol/permisos",authMiddleware,validatePermission("Modificar Roles"),rolPermisoController.assignMultiplePermisos,)

// Rutas para usuarios
router.get("/usuarios", authMiddleware, validatePermission("Visualizar Usuarios"), usuariosController.getAll)
router.get("/usuarios/:id", authMiddleware, validatePermission("Visualizar Usuarios"), usuariosController.getById)
router.post("/usuarios",authMiddleware,validatePermission("Crear Usuarios"),uploadMiddleware.single("foto"),usuariosController.create,)


router.put("/usuarios/:id/foto", authMiddleware, validatePermission("Modificar Usuarios"), uploadMiddleware.single("foto"), usuariosController.updateFoto)

router.put("/usuarios/:id",authMiddleware,validatePermission("Modificar Usuarios"),uploadMiddleware.single("foto"),usuariosController.update,)
router.patch("/usuarios/:id/password", authMiddleware, usuariosController.changePassword)
router.patch("/usuarios/:id/status",authMiddleware,validatePermission("Modificar Usuarios"),usuariosController.changeStatus,)
router.delete("/usuarios/:id", authMiddleware, validatePermission("Eliminar Usuarios"), usuariosController.delete)
router.get("/usuarios/search", authMiddleware, validatePermission("Visualizar Usuarios"), usuariosController.search)
router.get("/roles/:idRol/usuarios",authMiddleware,validatePermission("Visualizar Usuarios"),usuariosController.getByRol,)

export default router