import app from './App.js';
import dotenv from 'dotenv';
import { testConnection } from '../src/Config/Database.js';

// Configurar variables de entorno
dotenv.config();

// Puerto en el que se ejecutará el servidor
const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Verificar la conexión a la base de datos
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo establecer conexión con la base de datos. Verificando en 5 segundos...');
      
      // Intentar reconectar después de 5 segundos
      setTimeout(async () => {
        const retryConnection = await testConnection();
        if (!retryConnection) {
          console.error('❌ Fallo en la reconexión a la base de datos. Iniciando servidor sin conexión a BD.');
          startServerWithoutDB();
        } else {
          console.log('✅ Reconexión exitosa a la base de datos');
          startServerWithDB();
        }
      }, 5000);
    } else {
      startServerWithDB();
    }
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor con conexión a BD
const startServerWithDB = () => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs`);
    console.log(`🔐 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Base de datos: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    console.log(`🌍 URL pública: ${process.env.PRODUCTION_URL || 'localhost'}`);
  });
};

// Iniciar servidor sin conexión a BD (modo limitado)
const startServerWithoutDB = () => {
  app.listen(PORT, () => {
    console.log(`⚠️ Servidor corriendo en modo LIMITADO en http://localhost:${PORT}`);
    console.log(`⚠️ No hay conexión a la base de datos. Algunas funciones no estarán disponibles.`);
    console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs`);
    console.log(`🔐 Modo: ${process.env.NODE_ENV || 'development'}`);
  });
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promesa rechazada no manejada:', error);
  process.exit(1);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 Señal SIGTERM recibida. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Señal SIGINT recibida. Cerrando servidor...');
  process.exit(0);
});

// Iniciar el servidor
startServer();