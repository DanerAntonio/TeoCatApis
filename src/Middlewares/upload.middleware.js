import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear directorio temporal si no existe
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro para validar tipos de archivos
const fileFilter = (req, file, cb) => {
  // Validar tipos de imágenes
  if (file.fieldname === 'foto' || file.fieldname === 'imagen' || file.fieldname === 'Foto') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser una imagen válida (JPEG, PNG, GIF, etc.)'), false);
    }
  } 
  // Validar tipos de documentos
  else if (file.fieldname === 'documento' || file.fieldname === 'ComprobantePago') {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser un documento válido (PDF, DOC, DOCX) o una imagen (JPEG, PNG)'), false);
    }
  } 
  // Otros tipos de archivos
  else {
    cb(null, true);
  }
};

// Configuración de multer
export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware para manejar errores de multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es demasiado grande. Tamaño máximo: 5MB' });
    }
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Función para limpiar archivos temporales
export const cleanTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default {
  uploadMiddleware,
  handleMulterError,
  cleanTempFile
};