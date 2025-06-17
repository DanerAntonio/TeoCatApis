import express from 'express';
import { reseñasProductosController, reseñasServiciosController, reseñasGeneralesController } from '../../Controllers/ReviewService/reviews.controller.js';

const router = express.Router();

// === RUTAS PÚBLICAS PARA EL FRONT DE CLIENTE ===

// Reseñas de productos públicas
router.get('/public/productos', reseñasProductosController.getAll);
router.post('/public/productos', reseñasProductosController.create);

// Reseñas de servicios públicas
router.get('/public/servicios', reseñasServiciosController.getAll);
router.post('/public/servicios', reseñasServiciosController.create);

// Reseñas generales públicas
router.get('/public/generales', reseñasGeneralesController.getAll);
router.get('/public/generales/promedio', reseñasGeneralesController.getPromedioGeneral);
router.post('/public/generales', reseñasGeneralesController.create);

// === RUTAS PRIVADAS PARA APROBACIÓN DE ADMIN ===
router.patch('/admin/productos/:id/aprobar', reseñasProductosController.approve);
router.patch('/admin/servicios/:id/aprobar', reseñasServiciosController.approve);
router.patch('/admin/generales/:id/aprobar', reseñasGeneralesController.approve);

export default router;