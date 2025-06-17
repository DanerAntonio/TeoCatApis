import express from 'express';
import { reseñasProductosController, reseñasServiciosController, reseñasGeneralesController } from '../../Controllers/ReviewService/reviews.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { validateReviewData, validateImageFile } from '../../Middlewares/review.middleware.js';
import { uploadMiddleware, handleMulterError } from '../../Middlewares/upload.middleware.js';

const router = express.Router();

// Rutas para reseñas de productos
router.get('/productos', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getAll);
router.get('/productos/cliente/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getByCliente);
router.get('/productos/producto/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getByProducto);
router.get('/productos/calificacion/:calificacion', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getByCalificacion);
router.get('/productos/estado/:estado', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getByEstado);
router.get('/productos/promedio/:id', authMiddleware, reseñasProductosController.getPromedioByProducto);
router.get('/productos/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasProductosController.getById);
router.post('/productos', authMiddleware, validatePermission('Crear Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasProductosController.create);
router.put('/productos/:id', authMiddleware, validatePermission('Modificar Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasProductosController.update);
router.patch('/productos/:id/status', authMiddleware, validatePermission('Modificar Reseñas'), reseñasProductosController.changeStatus);
router.delete('/productos/:id', authMiddleware, validatePermission('Eliminar Reseñas'), reseñasProductosController.delete);

// Rutas para reseñas de servicios
router.get('/servicios', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getAll);
router.get('/servicios/cliente/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getByCliente);
router.get('/servicios/servicio/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getByServicio);
router.get('/servicios/calificacion/:calificacion', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getByCalificacion);
router.get('/servicios/estado/:estado', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getByEstado);
router.get('/servicios/promedio/:id', authMiddleware, reseñasServiciosController.getPromedioByServicio);
router.get('/servicios/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasServiciosController.getById);
router.post('/servicios', authMiddleware, validatePermission('Crear Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasServiciosController.create);
router.put('/servicios/:id', authMiddleware, validatePermission('Modificar Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasServiciosController.update);
router.patch('/servicios/:id/status', authMiddleware, validatePermission('Modificar Reseñas'), reseñasServiciosController.changeStatus);
router.delete('/servicios/:id', authMiddleware, validatePermission('Eliminar Reseñas'), reseñasServiciosController.delete);

// Rutas para reseñas generales
router.get('/generales', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasGeneralesController.getAll);
router.get('/generales/cliente/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasGeneralesController.getByCliente);
router.get('/generales/calificacion/:calificacion', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasGeneralesController.getByCalificacion);
router.get('/generales/estado/:estado', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasGeneralesController.getByEstado);
router.get('/generales/promedio', authMiddleware, reseñasGeneralesController.getPromedioGeneral);
router.get('/generales/:id', authMiddleware, validatePermission('Visualizar Reseñas'), reseñasGeneralesController.getById);
router.post('/generales', authMiddleware, validatePermission('Crear Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasGeneralesController.create);
router.put('/generales/:id', authMiddleware, validatePermission('Modificar Reseñas'), uploadMiddleware.single('Foto'), validateImageFile, validateReviewData, reseñasGeneralesController.update);
router.patch('/generales/:id/status', authMiddleware, validatePermission('Modificar Reseñas'), reseñasGeneralesController.changeStatus);
router.delete('/generales/:id', authMiddleware, validatePermission('Eliminar Reseñas'), reseñasGeneralesController.delete);

export default router;