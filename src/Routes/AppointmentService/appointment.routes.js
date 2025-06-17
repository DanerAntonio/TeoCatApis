import express from 'express';
import { citasController, citaServicioController } from '../../Controllers/AppointmentService/appointment.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';

const router = express.Router();

// Rutas para citas
router.get('/citas', authMiddleware, validatePermission('Visualizar Citas'), citasController.getAll);
router.get('/citas/:id', authMiddleware, validatePermission('Visualizar Citas'), citasController.getById);
router.post('/citas', authMiddleware, validatePermission('Crear Citas'), citasController.create);
router.put('/citas/:id', authMiddleware, validatePermission('Modificar Citas'), citasController.update);
router.patch('/citas/:id/status', authMiddleware, validatePermission('Cambiar Estado Citas'), citasController.changeStatus);
router.delete('/citas/:id', authMiddleware, validatePermission('Eliminar Citas'), citasController.delete);
router.get('/citas/cliente/:id', authMiddleware, validatePermission('Visualizar Citas'), citasController.getByCliente);
router.get('/citas/mascota/:id', authMiddleware, validatePermission('Visualizar Citas'), citasController.getByMascota);
router.get('/citas/fecha/:fecha', authMiddleware, validatePermission('Visualizar Citas'), citasController.getByFecha);
router.get('/citas/rango-fechas', authMiddleware, validatePermission('Visualizar Citas'), citasController.getByRangoFechas);
router.get('/citas/estado/:estado', authMiddleware, validatePermission('Visualizar Citas'), citasController.getByEstado);
router.post('/citas/disponibilidad', authMiddleware, citasController.checkDisponibilidad);

// Rutas para la relación Cita-Servicio
router.get('/citas/:id/servicios', authMiddleware, validatePermission('Visualizar Citas'), citaServicioController.getByCita);
router.get('/servicios/:id/citas', authMiddleware, validatePermission('Visualizar Citas'), citaServicioController.getByServicio);
router.post('/citas/:idCita/servicios/:idServicio', authMiddleware, validatePermission('Modificar Citas'), citaServicioController.addServicio);
// AGREGAR: Ruta para actualizar un servicio de una cita
router.put('/citas/:idCita/servicios/:idServicio', authMiddleware, validatePermission('Modificar Citas'), citaServicioController.updateServicio);
router.delete('/citas/:idCita/servicios/:idServicio', authMiddleware, validatePermission('Modificar Citas'), citaServicioController.removeServicio);

export default router;