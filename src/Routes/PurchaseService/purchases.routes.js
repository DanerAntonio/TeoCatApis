import express from 'express';
import { proveedoresController, comprasController, detalleComprasController } from '../../Controllers/PurchaseService/purchases.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { uploadMiddleware } from '../../Middlewares/upload.middleware.js';

const router = express.Router();

// Rutas para proveedores
router.get('/proveedores', authMiddleware, validatePermission('Visualizar Proveedores'), proveedoresController.getAll);
router.get('/proveedores/search', authMiddleware, validatePermission('Visualizar Proveedores'), proveedoresController.search);
router.get('/proveedores/:id', authMiddleware, validatePermission('Visualizar Proveedores'), proveedoresController.getById);
router.post('/proveedores', authMiddleware, validatePermission('Crear Proveedores'), proveedoresController.create);
router.put('/proveedores/:id', authMiddleware, validatePermission('Modificar Proveedores'), proveedoresController.update);
router.patch('/proveedores/:id/status', authMiddleware, validatePermission('Cambiar Estado Proveedores'), proveedoresController.changeStatus);
router.delete('/proveedores/:id', authMiddleware, validatePermission('Eliminar Proveedores'), proveedoresController.delete);

// NUEVAS RUTAS PARA CATÁLOGO DE PROVEEDORES
router.get('/proveedores/:id/catalogo', authMiddleware, validatePermission('Visualizar Proveedores'), proveedoresController.getCatalogo);
router.post('/proveedores/:id/catalogo', authMiddleware, validatePermission('Modificar Proveedores'), proveedoresController.addToCatalogo);
router.delete('/proveedores/:id/catalogo/:productoId', authMiddleware, validatePermission('Modificar Proveedores'), proveedoresController.removeFromCatalogo);

// Rutas para compras (orden corregido)
router.get('/compras', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getAll);
// Primero las rutas específicas
router.get('/compras/proveedor/:id', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getByProveedor);
router.get('/compras/usuario/:id', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getByUsuario);
router.get('/compras/fecha', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getByFecha);
router.get('/compras/estado/:estado', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getByEstado);
// Luego la ruta con parámetro genérico
router.get('/compras/:id', authMiddleware, validatePermission('Visualizar Compras'), comprasController.getById);
router.post('/compras', authMiddleware, validatePermission('Crear Compras'), uploadMiddleware.single('ComprobantePago'), comprasController.create);
router.put('/compras/:id', authMiddleware, validatePermission('Modificar Compras'), uploadMiddleware.single('ComprobantePago'), comprasController.update);
router.patch('/compras/:id/status', authMiddleware, validatePermission('Cambiar Estado Compras'), comprasController.changeStatus);
router.delete('/compras/:id', authMiddleware, validatePermission('Eliminar Compras'), comprasController.delete);

// Rutas para detalles de compras
router.get('/compras/:id/detalles', authMiddleware, validatePermission('Visualizar Compras'), detalleComprasController.getByCompra);
router.post('/detalles-compras', authMiddleware, validatePermission('Modificar Compras'), detalleComprasController.create);
router.put('/detalles-compras/:id', authMiddleware, validatePermission('Modificar Compras'), detalleComprasController.update);
router.delete('/detalles-compras/:id', authMiddleware, validatePermission('Modificar Compras'), detalleComprasController.delete);

export default router;