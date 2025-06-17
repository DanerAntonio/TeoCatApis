import express from 'express';
import { ventasController, detalleVentasController, detalleVentasServiciosController } from '../../Controllers/SalesService/sales.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { uploadMiddleware, handleMulterError } from '../../Middlewares/upload.middleware.js';
import { validateSaleData, validateReceiptFile } from '../../Middlewares/sales.middleware.js';


const router = express.Router();

// Rutas de ventas
router.get('/ventas', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getAll);
router.get('/ventas/cliente/:id', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getByCliente);
router.get('/ventas/usuario/:id', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getByUsuario);
router.get('/ventas/fecha', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getByFecha);
router.get('/ventas/estado/:estado', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getByEstado);
router.get('/ventas/tipo/:tipo', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getByTipo);
router.get('/ventas/:id', authMiddleware, validatePermission('Visualizar Ventas'), ventasController.getById);
router.post('/ventas', authMiddleware, validatePermission('Crear Ventas'), uploadMiddleware.single('ComprobantePago'), validateReceiptFile, validateSaleData, ventasController.create);
router.put('/ventas/:id', authMiddleware, validatePermission('Modificar Ventas'), uploadMiddleware.single('ComprobantePago'), validateReceiptFile, ventasController.update);
router.patch('/ventas/:id/status', authMiddleware, validatePermission('Cambiar Estado Ventas'), ventasController.changeStatus);
router.patch(
  '/ventas/:id/aprobar-qr',
  authMiddleware,
  validatePermission('Cambiar Estado Ventas'),
  ventasController.aprobarVentaQR
);
router.patch("/:id/aprobar", authMiddleware, ventasController.aprobarVenta)
router.patch("/:id/rechazar", authMiddleware, ventasController.rechazarVenta)
router.delete('/ventas/:id', authMiddleware, validatePermission('Eliminar Ventas'), ventasController.delete);

// Rutas de detalles de ventas (productos)
router.get('/ventas/:id/detalles', authMiddleware, validatePermission('Visualizar Ventas'), detalleVentasController.getByVenta);
router.post('/detalles-ventas', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasController.create);
router.put('/detalles-ventas/:id', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasController.update);
router.delete('/detalles-ventas/:id', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasController.delete);

// Rutas de detalles de ventas de servicios
router.get('/ventas/:id/detalles-servicios', authMiddleware, validatePermission('Visualizar Ventas'), detalleVentasServiciosController.getByVenta);
router.post('/detalles-ventas-servicios', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasServiciosController.create);
router.put('/detalles-ventas-servicios/:id', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasServiciosController.update);
router.delete('/detalles-ventas-servicios/:id', authMiddleware, validatePermission('Modificar Ventas'), detalleVentasServiciosController.delete);

// Endpoint para ?idVenta=1096
router.get('/detalles-ventas-servicios', authMiddleware, validatePermission('Visualizar Ventas'), async (req, res) => {
  const { idVenta } = req.query;
  if (!idVenta) return res.status(400).json({ message: 'idVenta es requerido' });
  try {
    const detalles = await detalleVentasServiciosController.getByVenta({ params: { id: idVenta } }, res, true);
    // Si tu controlador ya responde, puedes omitir el res.json aquí
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles de servicios', error });
  }
});

// Endpoint para /venta/1096
router.get('/detalles-ventas-servicios/venta/:id', authMiddleware, validatePermission('Visualizar Ventas'), (req, res) => {
  detalleVentasServiciosController.getByVenta(req, res);
});

// Rutas para Consumidor Final y Mascota Genérica
router.get('/consumidor-final', authMiddleware, ventasController.getConsumidorFinal);
router.get('/mascota-generica', authMiddleware, ventasController.getMascotaGenerica);

// Ruta para registrar devoluciones
router.post('/devoluciones', authMiddleware, validatePermission('Crear Ventas'), ventasController.registrarDevolucion);
router.post(
  '/ventas/devolver-stock',
  authMiddleware,
  validatePermission('Crear Ventas'),
  ventasController.devolverProductos
);

// En tu archivo de rutas
router.get('/clientes-para-ventas', ventasController.getClientesParaVentas)
router.get('/clientes/:idCliente/mascotas', ventasController.getMascotasCliente)

router.get('/debug-stock/:idProducto', ventasController.debugStock)


export default router;