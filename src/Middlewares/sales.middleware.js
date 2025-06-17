// Middleware para validar datos de ventas
export const validateSaleData = (req, res, next) => {
    const { venta, detallesProductos, detallesServicios } = req.body;
    
    // Validar datos básicos de la venta
    if (!venta) {
      return res.status(400).json({ message: "Datos de venta no proporcionados" });
    }
    
    if (!venta.IdCliente) {
      return res.status(400).json({ message: "ID de cliente no proporcionado" });
    }
    
    if (!venta.IdUsuario) {
      return res.status(400).json({ message: "ID de usuario no proporcionado" });
    }
    
    // Validar que haya al menos un detalle de producto o servicio
    if ((!detallesProductos || detallesProductos.length === 0) && 
        (!detallesServicios || detallesServicios.length === 0)) {
      return res.status(400).json({ message: "La venta debe tener al menos un producto o servicio" });
    }
    
    // Validar detalles de productos
    if (detallesProductos && detallesProductos.length > 0) {
      for (const detalle of detallesProductos) {
        if (!detalle.IdProducto) {
          return res.status(400).json({ message: "ID de producto no proporcionado en un detalle" });
        }
        
        if (!detalle.Cantidad || detalle.Cantidad <= 0) {
          return res.status(400).json({ message: "Cantidad inválida en un detalle de producto" });
        }
      }
    }
    
    // Validar detalles de servicios
    if (detallesServicios && detallesServicios.length > 0) {
      for (const detalle of detallesServicios) {
        if (!detalle.IdServicio) {
          return res.status(400).json({ message: "ID de servicio no proporcionado en un detalle" });
        }
        
        if (!detalle.IdMascota) {
          return res.status(400).json({ message: "ID de mascota no proporcionado en un detalle de servicio" });
        }
        
        if (!detalle.Cantidad || detalle.Cantidad <= 0) {
          return res.status(400).json({ message: "Cantidad inválida en un detalle de servicio" });
        }
      }
    }
    
    next();
  };
  
  // Middleware para validar archivos de comprobante
  export const validateReceiptFile = (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG, GIF y PDF' });
    }
    
    // Validar tamaño de archivo (máximo 10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'El tamaño del comprobante no puede exceder los 10MB' });
    }
    
    next();
  };