import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Sube un archivo a Cloudinary
 * @param {string} filePath - Ruta del archivo a subir
 * @param {string} folder - Carpeta en Cloudinary donde se guardará el archivo
 * @returns {Promise<object>} - Resultado de la subida
 */
export const uploadToCloudinary = async (filePath, folder = '') => {
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe`);
    }
    
    // Subir archivo a Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto' // Detectar automáticamente el tipo de recurso
    });
    
    // Eliminar archivo temporal
    fs.unlinkSync(filePath);
    
    return result;
  } catch (error) {
    // Eliminar archivo temporal si existe
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw error;
  }
};

/**
 * Elimina un archivo de Cloudinary
 * @param {string} publicId - ID público del archivo en Cloudinary
 * @returns {Promise<object>} - Resultado de la eliminación
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Sube una imagen a Cloudinary y la optimiza para su uso en la web
 * @param {string} filePath - Ruta del archivo a subir
 * @param {string} folder - Carpeta en Cloudinary donde se guardará el archivo
 * @param {object} options - Opciones adicionales para la subida
 * @returns {Promise<object>} - Resultado de la subida
 */
export const uploadImage = async (filePath, folder = '', options = {}) => {
  try {
    // Opciones por defecto para imágenes
    const defaultOptions = {
      folder: folder,
      transformation: [
        { width: 1000, crop: 'limit' }, // Limitar ancho máximo
        { quality: 'auto:good' } // Optimizar calidad
      ],
      format: 'webp' // Convertir a formato WebP para mejor compresión
    };
    
    // Combinar opciones
    const uploadOptions = { ...defaultOptions, ...options };
    
    // Subir imagen a Cloudinary
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    // Eliminar archivo temporal
    fs.unlinkSync(filePath);
    
    return result;
  } catch (error) {
    // Eliminar archivo temporal si existe
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw error;
  }
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadImage
};