// Middleware para validar datos de servicios
export const validateServiceData = (req, res, next) => {
    const servicioData = req.body;
    
    // Validar campos obligatorios
    if (!servicioData.IdTipoServicio) {
      return res.status(400).json({ message: 'El tipo de servicio es obligatorio' });
    }
    
    if (!servicioData.Nombre) {
      return res.status(400).json({ message: 'El nombre del servicio es obligatorio' });
    }
    
    if (!servicioData.Precio) {
      return res.status(400).json({ message: 'El precio del servicio es obligatorio' });
    } else if (isNaN(servicioData.Precio) || servicioData.Precio <= 0) {
      return res.status(400).json({ message: 'El precio debe ser un número positivo' });
    }
    
    if (!servicioData.Duracion) {
      return res.status(400).json({ message: 'La duración del servicio es obligatoria' });
    } else if (isNaN(servicioData.Duracion) || servicioData.Duracion <= 0) {
      return res.status(400).json({ message: 'La duración debe ser un número positivo' });
    }
    
    next();
  };
  
  // Middleware para validar datos de tipos de servicio
  export const validateServiceTypeData = (req, res, next) => {
    const tipoData = req.body;
    
    // Validar campos obligatorios
    if (!tipoData.Nombre) {
      return res.status(400).json({ message: 'El nombre del tipo de servicio es obligatorio' });
    }
    
    next();
  };
  
  // Middleware para validar archivos de imagen
  export const validateImageFile = (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y GIF' });
    }
    
    // Validar tamaño de archivo (máximo 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'El tamaño de la imagen no puede exceder los 5MB' });
    }
    
    next();
  };