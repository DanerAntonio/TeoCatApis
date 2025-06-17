import express from 'express';
import { tipoServicioController, serviciosController } from '../../Controllers/ServiceManagement/service.controller.js';

const router = express.Router();

// ============================================
// 🔹 RUTAS PÚBLICAS PARA CATÁLOGO DE SERVICIOS
// ============================================

// Obtener todos los tipos de servicio (público para catálogo)
router.get('/tipos', tipoServicioController.getAll);

// Obtener un tipo de servicio específico por ID (público para catálogo)
router.get('/tipos/:id', tipoServicioController.getById);

// Obtener servicios de un tipo específico (público para catálogo)
router.get('/tipos/:id/servicios', tipoServicioController.getServices);

// Obtener todos los servicios (público para catálogo)
router.get('/servicios', serviciosController.getAll);

// Buscar servicios (público para catálogo)
router.get('/servicios/search', serviciosController.search);

// Obtener un servicio específico por ID (público para catálogo)
router.get('/servicios/:id', serviciosController.getById);

export default router;