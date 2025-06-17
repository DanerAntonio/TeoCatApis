import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Determinar la configuración de la base de datos según el entorno
const getDbConfig = () => {
  // Si existe una URL de base de datos (típico en servicios en la nube)
  if (process.env.DATABASE_URL) {
    try {
      // Parsear la URL de la base de datos
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbUser = dbUrl.username;
      const dbPassword = dbUrl.password;
      const dbHost = dbUrl.hostname;
      const dbPort = dbUrl.port || 3306;
      const dbName = dbUrl.pathname.substring(1); // Eliminar el slash inicial
      
      return {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false
      };
    } catch (error) {
      console.error('Error al parsear DATABASE_URL:', error);
      // Si hay un error, usar la configuración local
    }
  }
  
  // Configuración local (fallback)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TeoCat',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  };
};

// Crear el pool de conexiones con la configuración determinada
const createPool = () => {
  const dbConfig = getDbConfig();
  
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
     timezone: '-05:00', // <- ¡Este es el correcto!
  });
};

// Crear el pool de conexiones
let pool;

try {
  pool = createPool();
} catch (error) {
  console.error('Error al crear el pool de conexiones:', error);
}

// Función para ejecutar consultas SQL
export const query = async (sql, params) => {
  try {
    // Si el pool no existe, intentar crearlo
    if (!pool) {
      pool = createPool();
    }
    
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Error en la consulta SQL:', error);
    throw error;
  }
};

// Función para obtener una conexión para transacciones
export const getConnection = async () => {
  try {
    // Si el pool no existe, intentar crearlo
    if (!pool) {
      pool = createPool();
    }
    
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error al obtener conexión para transacción:', error);
    throw error;
  }
};

// Verificar la conexión a la base de datos
export const testConnection = async () => {
  try {
    // Si el pool no existe, intentar crearlo
    if (!pool) {
      pool = createPool();
    }
    
    await pool.query('SELECT 1');
    
    // Obtener información de la base de datos
    const [rows] = await pool.query('SELECT VERSION() as version');
    const dbVersion = rows[0].version;
    
    console.log('✅ Conexión a la base de datos establecida correctamente');
    console.log(`📊 Versión de MySQL: ${dbVersion}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    return false;
  }
};

// Cerrar la conexión a la base de datos
export const closeConnection = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('✅ Conexión a la base de datos cerrada correctamente');
    }
  } catch (error) {
    console.error('❌ Error al cerrar la conexión a la base de datos:', error);
  }
};

export default { query, getConnection, testConnection, closeConnection };