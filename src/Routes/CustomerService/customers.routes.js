// customers.routes.js - Versión actualizada
import express from 'express';
import { clientesController, mascotasController, especiesController } from '../../Controllers/CustomerService/customers.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { uploadMiddleware, handleMulterError } from '../../Middlewares/upload.middleware.js';
import { query } from '../../Config/Database.js';

const router = express.Router();

// ✅ NUEVO: Endpoint para obtener cliente por usuario
router.get("/usuario/:idUsuario", authMiddleware, async (req, res) => {
  try {
    const { idUsuario } = req.params

    console.log(`🔍 Buscando cliente para usuario ID: ${idUsuario}`)

    // const [clientes] = await query( ... )  // ❌ Incorrecto
    const clientes = await query(
      `
      SELECT 
        c.IdCliente,
        c.IdUsuario,
        c.Documento,
        c.Nombre,
        c.Apellido,
        c.Correo,
        c.Telefono,
        c.Direccion,
        c.Estado,
        c.FechaCreacion,
        c.FechaActualizacion,
        u.Correo as CorreoUsuario,
        u.Estado as EstadoUsuario,
        r.NombreRol
      FROM Clientes c
      INNER JOIN Usuarios u ON c.IdUsuario = u.IdUsuario
      INNER JOIN Roles r ON u.IdRol = r.IdRol
      WHERE c.IdUsuario = ? 
      AND c.Estado = TRUE 
      AND u.Estado = TRUE
      LIMIT 1
    `,
      [idUsuario],
    )

    if (clientes.length === 0) {
      console.log(`❌ No se encontró cliente para usuario ID: ${idUsuario}`)
      return res.status(404).json({
        message: "Cliente no encontrado para este usuario",
        idUsuario,
      })
    }

    const cliente = clientes[0]
    console.log(`✅ Cliente encontrado:`, cliente)

    res.status(200).json(cliente)
  } catch (error) {
    console.error("❌ Error al obtener cliente por usuario:", error)
    res.status(500).json({
      message: "Error en el servidor",
      error: error.message,
    })
  }
})

// Rutas para clientes
router.get('/clientes', authMiddleware, validatePermission('Visualizar Clientes'), clientesController.getAll);
router.get('/clientes/search', authMiddleware, validatePermission('Visualizar Clientes'), clientesController.search);
router.get('/clientes/:id', authMiddleware, validatePermission('Visualizar Clientes'), clientesController.getById);
// router.get('/usuarios/:idUsuario/cliente', authMiddleware, validatePermission('Visualizar Clientes'), clientesController.getByUsuario);
router.post('/clientes', authMiddleware, validatePermission('Crear Clientes'), uploadMiddleware.single('foto'), handleMulterError, clientesController.create);
router.put('/clientes/:id', authMiddleware, validatePermission('Modificar Clientes'), uploadMiddleware.single('foto'), handleMulterError, clientesController.update);
router.delete('/clientes/:id', authMiddleware, validatePermission('Eliminar Clientes'), clientesController.delete);

// Rutas para mascotas
router.get('/mascotas', authMiddleware, validatePermission('Visualizar Mascotas'), mascotasController.getAll);
router.get('/mascotas/search', authMiddleware, validatePermission('Visualizar Mascotas'), mascotasController.search);
router.get('/mascotas/:id', authMiddleware, validatePermission('Visualizar Mascotas'), mascotasController.getById);
router.post('/mascotas', authMiddleware, validatePermission('Crear Mascotas'), uploadMiddleware.single('foto'), handleMulterError, mascotasController.create);
router.put('/mascotas/:id', authMiddleware, validatePermission('Modificar Mascotas'), uploadMiddleware.single('foto'), handleMulterError, mascotasController.update);
router.delete('/mascotas/:id', authMiddleware, validatePermission('Eliminar Mascotas'), mascotasController.delete);
router.get('/clientes/:id/mascotas', authMiddleware, validatePermission('Visualizar Mascotas'), mascotasController.getByCliente);
// Agregar esta línea en customers.routes.js
router.get('/mascotas/cliente/:id', authMiddleware, validatePermission('Visualizar Mascotas'), mascotasController.getByCliente);
router.get('/mascotas/usuario/:idUsuario', mascotasController.getMascotasByUsuario)

// Rutas para especies
router.get('/especies', authMiddleware, validatePermission('Visualizar Mascotas'), especiesController.getAll);
router.get('/especies/:id', authMiddleware, validatePermission('Visualizar Mascotas'), especiesController.getById);
router.post('/especies', authMiddleware, validatePermission('Crear Mascotas'), especiesController.create);
router.put('/especies/:id', authMiddleware, validatePermission('Modificar Mascotas'), especiesController.update);
router.delete('/especies/:id', authMiddleware, validatePermission('Eliminar Mascotas'), especiesController.delete);

export default router;