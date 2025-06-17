import express from 'express';
import { categoriasController, productosController} from '../../Controllers/ProductService/products.controller.js';
import { authMiddleware } from '../../Middlewares/auth.middleware.js';
import { validatePermission } from '../../Middlewares/permission.middleware.js';
import { uploadMiddleware, handleMulterError } from '../../Middlewares/upload.middleware.js';

const router = express.Router();

// Rutas para categorías de productos (existentes)
router.get('/categorias', authMiddleware, validatePermission('Visualizar Categorias'), categoriasController.getAll);
router.get('/categorias/search', authMiddleware, validatePermission('Visualizar Categorias'), categoriasController.search);
router.get('/categorias/:id', authMiddleware, validatePermission('Visualizar Categorias'), categoriasController.getById);
router.get('/categorias/:id/productos', authMiddleware, validatePermission('Visualizar Categorias'), categoriasController.getProducts);
router.post('/categorias', authMiddleware, validatePermission('Crear Categorias'), categoriasController.create);
router.put('/categorias/:id', authMiddleware, validatePermission('Modificar Categorias'), categoriasController.update);
router.patch('/categorias/:id/status', authMiddleware, validatePermission('Cambiar Estado Categorias'), categoriasController.changeStatus);
router.delete('/categorias/:id', authMiddleware, validatePermission('Eliminar Categorias'), categoriasController.delete);

// Rutas para productos
// Rutas de consulta
router.get('/productos', authMiddleware, validatePermission('Visualizar Productos'), productosController.getAll);
router.get('/productos/search', authMiddleware, validatePermission('Visualizar Productos'), productosController.search);
router.get('/productos/low-stock', authMiddleware, validatePermission('Visualizar Productos'), productosController.getLowStock);
router.get('/productos/near-expiry', authMiddleware, validatePermission('Visualizar Productos'), productosController.getNearExpiry);
router.get('/productos/codigo/:codigo', authMiddleware, validatePermission('Visualizar Productos'), productosController.getByBarcode);
router.get('/productos/:id', authMiddleware, validatePermission('Visualizar Productos'), productosController.getById);
router.get('/productos/categoria/:id', authMiddleware, validatePermission('Visualizar Productos'), productosController.getByCategoria);

// Rutas de creación y modificación - CORREGIDAS
router.post('/productos', authMiddleware, validatePermission('Crear Productos'), uploadMiddleware.single('Foto'), handleMulterError, productosController.create);
router.put('/productos/:id', authMiddleware, validatePermission('Modificar Productos'), uploadMiddleware.single('Foto'), handleMulterError, productosController.update);
router.patch('/productos/:id/status', authMiddleware, validatePermission('Cambiar Estado Productos'), productosController.changeStatus);
router.patch('/productos/:id/stock', authMiddleware, validatePermission('Modificar Productos'), productosController.updateStock);
router.delete('/productos/:id', authMiddleware, validatePermission('Eliminar Productos'), productosController.delete);

// Rutas para variantes de productos - CORREGIDAS
router.get('/productos/:id/variantes', authMiddleware, validatePermission('Visualizar Productos'), productosController.getVariants);
router.post('/productos/:id/variantes', authMiddleware, validatePermission('Crear Productos'), uploadMiddleware.single('Foto'), handleMulterError, productosController.createVariant);
router.put('/productos/:id/variantes/:variantId', authMiddleware, validatePermission('Modificar Productos'), uploadMiddleware.single('Foto'), handleMulterError, productosController.updateVariant);
router.delete('/productos/:id/variantes/:variantId', authMiddleware, validatePermission('Eliminar Productos'), productosController.deleteVariant);

export default router;