// Middleware para validar datos de reseñas
export const validateReviewData = (req, res, next) => {
  // Verificar si req.body existe
  if (!req.body) {
      return res.status(400).json({ 
          message: 'No se proporcionaron datos en el cuerpo de la solicitud' 
      });
  }
  
  const { Calificacion, Comentario } = req.body;
  
  // Validar calificación
  if (Calificacion !== undefined) {
      const calificacionNum = parseInt(Calificacion);
      if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 5) {
          return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
      }
  }
  
  // Validar comentario
  if (Comentario !== undefined && Comentario.length > 1000) {
      return res.status(400).json({ message: 'El comentario no puede exceder los 1000 caracteres' });
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