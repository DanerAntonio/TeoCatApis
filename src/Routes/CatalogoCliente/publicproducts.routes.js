import express from 'express';
import { categoriasController, productosController } from '../../Controllers/ProductService/products.controller.js';

const router = express.Router();

// ============================================
// 🔹 RUTAS PÚBLICAS PARA CATÁLOGO DE PRODUCTOS
// ============================================

// Obtener todas las categorías (público para catálogo)
router.get('/categorias', categoriasController.getAll);

// Buscar categorías (público para catálogo)
router.get('/categorias/search', categoriasController.search);

// Obtener una categoría específica por ID (público para catálogo)
router.get('/categorias/:id', categoriasController.getById);

// Obtener productos de una categoría específica (público para catálogo)
router.get('/categorias/:id/productos', categoriasController.getProducts);

// Obtener todos los productos (público para catálogo)
router.get('/productos', productosController.getAll);

// Buscar productos (público para catálogo)
router.get('/productos/search', productosController.search);

// Obtener un producto específico por ID (público para catálogo)
router.get('/productos/:id', productosController.getById);

// Obtener productos por categoría (público para catálogo)
router.get('/productos/categoria/:id', productosController.getByCategoria);

// Obtener producto por código de barras (público para catálogo)
router.get('/productos/codigo/:codigo', productosController.getByBarcode);

// Obtener variantes de un producto (público para catálogo)
router.get('/productos/:id/variantes', productosController.getVariants);

export default router;