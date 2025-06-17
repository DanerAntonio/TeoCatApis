import express from 'express';
import { tipoServicioController, serviciosController } from '../../Controllers/ServiceManagement/service.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { uploadMiddleware, handleMulterError } from '../../Middlewares/upload.middleware.js';
import { validateServiceData, validateServiceTypeData, validateImageFile } from '../../Middlewares/service.middleware.js';

const router = express.Router();

// Rutas de tipos de servicio
router.get('/tipos', authMiddleware, validatePermission('Visualizar Tipos de Servicio'), tipoServicioController.getAll);
router.get('/tipos/:id/servicios', authMiddleware, validatePermission('Visualizar Servicios'), tipoServicioController.getServices);
router.get('/tipos/:id', authMiddleware, validatePermission('Visualizar Tipos de Servicio'), tipoServicioController.getById);
router.post('/tipos', authMiddleware, validatePermission('Crear Tipos de Servicio'), validateServiceTypeData, tipoServicioController.create);
router.put('/tipos/:id', authMiddleware, validatePermission('Modificar Tipos de Servicio'), validateServiceTypeData, tipoServicioController.update);
router.patch('/tipos/:id/status', authMiddleware, validatePermission('Cambiar Estado Tipos de Servicio'), tipoServicioController.changeStatus);
router.delete('/tipos/:id', authMiddleware, validatePermission('Eliminar Tipos de Servicio'), tipoServicioController.delete);

// Rutas de servicios
router.get('/servicios', authMiddleware, validatePermission('Visualizar Servicios'), serviciosController.getAll);
router.get('/servicios/search', authMiddleware, validatePermission('Visualizar Servicios'), serviciosController.search);
router.get('/servicios/:id', authMiddleware, validatePermission('Visualizar Servicios'), serviciosController.getById);
router.post('/servicios', authMiddleware, validatePermission('Crear Servicios'), uploadMiddleware.single('Foto'), handleMulterError, validateImageFile, validateServiceData, serviciosController.create);
router.put('/servicios/:id', authMiddleware, validatePermission('Modificar Servicios'), uploadMiddleware.single('Foto'), handleMulterError, validateImageFile, validateServiceData, serviciosController.update);
router.patch('/servicios/:id/status', authMiddleware, validatePermission('Cambiar Estado Servicios'), serviciosController.changeStatus);
router.delete('/servicios/:id', authMiddleware, validatePermission('Eliminar Servicios'), serviciosController.delete);

export default router;