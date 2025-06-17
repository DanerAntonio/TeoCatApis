import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import swaggerJsDoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Importar rutas
import authRoutes from "../src/Routes/AuthService/auth.routes.js"
import customersRoutes from "../src/Routes/CustomerService/customers.routes.js"
import productsRoutes from "../src/Routes/ProductService/products.routes.js"
import productosPublicRoutes from "../src/Routes/CatalogoCliente/publicproducts.routes.js"
import servicesRoutes from "../src/Routes/ServiceManagement/service.routes.js"
import serviciosPublicRoutes from "../src/Routes/ServiceClient/servicios.routes.js"
import salesRoutes from "./Routes/SalesService/sales.routes.js"
import purchasesRoutes from "../src/Routes/PurchaseService/purchases.routes.js"
import appointmentsRoutes from "../src/Routes/AppointmentService/appointment.routes.js"
import reviewsRoutes from "../src/Routes/ReviewService/reviews.routes.js"
import notificationsRoutes from "../src/Routes/NotificationService/notifications.routes.js"
import profileRoutes from "../src/Routes/ProfileService/profile.routes.js"
import carritoRoutes from "./Routes/CarritoCliente/Carrito.routes.js"

// Configurar variables de entorno
dotenv.config()

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Inicializar la aplicación
const app = express()

// ✅ CORS adaptado para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4200",
      "http://localhost:8080",
      "http://localhost:8000",
      "http://localhost",
      "http://10.0.2.2:5173",
      "http://192.168.10.69:5173",
      "http://192.168.56.1:5173",
      "http://localhost:58836",
    ]
    if (
      process.env.NODE_ENV === "production" ||
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost")
    ) {
      callback(null, true)
    } else {
      callback(new Error("No permitido por CORS"))
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}

// Middlewares
app.use(cors(corsOptions))
app.use(helmet())
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ extended: true, limit: "100mb" }))

// Servir archivos estáticos
app.use("/uploads", express.static(join(__dirname, "../uploads")))

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API TeoCat",
      version: "1.0.0",
      description: "Documentación de la API TeoCat",
      contact: {
        name: "Equipo TeoCat",
        email: process.env.EMAIL_USER,
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Servidor de desarrollo",
      },
      {
        url: process.env.PRODUCTION_URL || "https://api.teocat.com",
        description: "Servidor de producción",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.js", "./src/docs/**/*.yaml"],
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "API de TeoCat funcionando correctamente",
    version: "1.0.0",
    documentation: `${req.protocol}://${req.get("host")}/api-docs`,
  })
})

// Rutas de la API
app.use("/api/auth", authRoutes)
app.use("/api/customers", customersRoutes)
app.use("/api/products", productsRoutes)
app.use("/api/productos", productosPublicRoutes)
app.use("/api/services", servicesRoutes)
app.use("/api/servicios", serviciosPublicRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/purchases", purchasesRoutes)
app.use("/api/appointments", appointmentsRoutes)
app.use("/api/reviews", reviewsRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/profile", profileRoutes)
app.use("/api/carrito", carritoRoutes)

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error("Error en la aplicación:", err.stack)
  const statusCode = err.statusCode || 500
  const errorResponse = {
    message: err.message || "Error en el servidor",
    error: process.env.NODE_ENV === "development" ? err.stack : {},
  }
  if (process.env.NODE_ENV === "development" && err.details) {
    errorResponse.details = err.details
  }
  res.status(statusCode).json(errorResponse)
})

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    suggestion: "Consulta la documentación en /api-docs para ver las rutas disponibles",
  })
})

export default app
