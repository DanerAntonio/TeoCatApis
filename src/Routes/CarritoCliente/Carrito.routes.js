import express from "express"
import multer from "multer"
import { ventasController } from "../../Controllers/SalesService/sales.controller.js"
import { authMiddleware } from "../../Middlewares/auth.middleware.js"
import { validateSaleData, validateReceiptFile } from "../../Middlewares/sales.middleware.js"
import { query } from "../../Config/Database.js" // <-- Asegúrate de importar query

const router = express.Router()
const upload = multer()

// 🔄 Convierte fecha a formato MySQL
function toMySQLDateTime(dateString) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// ✅ Ruta protegida para crear una venta desde el carrito (requiere autenticación y validación)
router.post(
  "/crear",
  authMiddleware,
  upload.single("ComprobantePago"), // Maneja comprobante si se adjunta
  async (req, res, next) => {
    try {
      const ventaData = JSON.parse(req.body.ventaData);

      // Inyectar usuario autenticado
      ventaData.venta.IdUsuario = req.user?.id;

      // Si falta IdCliente, buscarlo por el usuario autenticado
      if (!ventaData.venta.IdCliente && req.user?.id) {
        const [clientes] = await query(
          `SELECT IdCliente FROM Clientes WHERE IdUsuario = ? LIMIT 1`,
          [req.user.id]
        );
        if (clientes.length > 0) {
          ventaData.venta.IdCliente = clientes[0].IdCliente;
        }
      }

      req.body = ventaData;
      req.file = req.file;
      next();
    } catch (err) {
      return res.status(400).json({ message: "Formato de venta inválido", error: err.message });
    }
  },
  validateSaleData,        // Middleware que valida datos de la venta
  validateReceiptFile,     // Middleware que valida archivo si existe
  ventasController.create  // Controlador que guarda la venta
);

// ✅ Obtener todas las ventas
router.get("/", authMiddleware, ventasController.getAll);

// ✅ Obtener una venta específica
router.get("/:id", authMiddleware, ventasController.getById);

// ❌ Elimina esta si no vas a permitir ventas sin login
// router.post("/publico-crear-pedido", upload.any(), ventasController.create);

export default router;
