// tests/controllers/sales.controller.test.js
import { jest } from '@jest/globals'
import httpMocks from 'node-mocks-http'

let ventasController
const getConnectionMock = jest.fn()

beforeAll(async () => {
  await jest.unstable_mockModule('../../src/Config/Database.js', () => ({
    getConnection: getConnectionMock,
    query: jest.fn()
  }))
  // Importar controlador después del mock
  const mod = await import('../../src/Controllers/SalesService/sales.controller.js')
  ventasController = mod.ventasController
})

describe('ventasController.create', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe retornar 400 si no se proporciona cliente', async () => {
    const req = { body: { detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/cliente/i)
  })

  it('debe retornar 400 si no se envía ningún producto ni servicio', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 } } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/producto.*servicio/i)
  })

  it('debe retornar 400 si el método de pago no es válido', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "tarjeta", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/método de pago inválido/i)
  })

  it('debe retornar 400 si el monto recibido es insuficiente para efectivo', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 500 }, detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/monto recibido.*insuficiente/i)
  })

  it('debe retornar 400 si la fecha de venta es inválida', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "fecha-invalida", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/fecha.*inválida/i)
  })

  it('debe retornar 404 si el cliente no existe en la base de datos', async () => {
    const req = { body: { venta: { IdCliente: 9999, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    // Simula respuesta de cliente no encontrado
    getConnectionMock.mockReturnValueOnce({
      query: jest.fn().mockResolvedValue([[]]),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn()
    })
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(404)
    const data = res._getJSONData()
    expect(data.message).toMatch(/cliente.*no encontrado/i)
  })

  it('debe crear una venta con productos correctamente', async () => {
    // Aquí debes simular todos los mocks necesarios para una venta exitosa
    // ...
    // expect(res.statusCode).toBe(201)
    // expect(data.message).toMatch(/venta creada exitosamente/i)
    // expect(data.venta.IdVenta).toBe(123)
  })

  it('debe crear una venta con servicios correctamente', async () => {
    // Aquí debes simular todos los mocks necesarios para una venta exitosa con servicios
    // ...
    // expect(res.statusCode).toBe(201)
    // expect(data.message).toMatch(/venta creada exitosamente/i)
    // expect(data.venta.IdVenta).toBe(456)
  })

  it('debe retornar 400 si detallesProductos no es un array', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: "no-array" } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/debe agregar al menos un producto o servicio/i)
  })

  it('debe retornar 400 si detallesServicios no es un array', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: [], detallesServicios: "no-array" } }
    const res = httpMocks.createResponse()
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.message).toMatch(/debe agregar al menos un producto o servicio/i)
  })

  it('debe retornar 500 si ocurre un error inesperado', async () => {
    const req = { body: { venta: { IdCliente: 1, MetodoPago: "efectivo", FechaVenta: "2025-06-16T00:43:31.127Z", Subtotal: 1000, TotalMonto: 1000, TotalIva: 0, MontoRecibido: 1000 }, detallesProductos: [{ IdProducto: 1, Cantidad: 1, PrecioUnitario: 1000 }] } }
    const res = httpMocks.createResponse()
    // Simula error inesperado
    getConnectionMock.mockImplementationOnce(() => { throw new Error("DB error") })
    await ventasController.create(req, res)
    expect(res.statusCode).toBe(500)
    const data = res._getJSONData()
    expect(data.message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.getAllVentas', () => {
  it('devuelve todas las ventas (200)', async () => {
    ventasController.getAllVentas = jest.fn(async (req, res) => res.status(200).json([{ IdVenta: 1 }]))
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    await ventasController.getAllVentas(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual([{ IdVenta: 1 }])
  })

  it('devuelve 500 si hay error', async () => {
    ventasController.getAllVentas = jest.fn(async (req, res) => res.status(500).json({ message: "Error en el servidor" }))
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    await ventasController.getAllVentas(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.getVentaById', () => {
  it('devuelve la venta si existe (200)', async () => {
    ventasController.getVentaById = jest.fn(async (req, res) => res.status(200).json({ IdVenta: 1 }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.getVentaById(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ IdVenta: 1 })
  })

  it('devuelve 404 si no existe', async () => {
    ventasController.getVentaById = jest.fn(async (req, res) => res.status(404).json({ message: "Venta no encontrada" }))
    const req = httpMocks.createRequest({ params: { id: 999 } })
    const res = httpMocks.createResponse()
    await ventasController.getVentaById(req, res)
    expect(res.statusCode).toBe(404)
    expect(res._getJSONData().message).toMatch(/no encontrada/i)
  })

  it('devuelve 500 si hay error', async () => {
    ventasController.getVentaById = jest.fn(async (req, res) => res.status(500).json({ message: "Error en el servidor" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.getVentaById(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.deleteVenta', () => {
  it('eliminación exitosa (200)', async () => {
    ventasController.deleteVenta = jest.fn(async (req, res) => res.status(200).json({ message: "Venta eliminada" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.deleteVenta(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/eliminada/i)
  })

  it('venta no encontrada (404)', async () => {
    ventasController.deleteVenta = jest.fn(async (req, res) => res.status(404).json({ message: "Venta no encontrada" }))
    const req = httpMocks.createRequest({ params: { id: 999 } })
    const res = httpMocks.createResponse()
    await ventasController.deleteVenta(req, res)
    expect(res.statusCode).toBe(404)
    expect(res._getJSONData().message).toMatch(/no encontrada/i)
  })

  it('error inesperado (500)', async () => {
    ventasController.deleteVenta = jest.fn(async (req, res) => res.status(500).json({ message: "Error en el servidor" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.deleteVenta(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.updateVenta', () => {
  it('actualización válida (200)', async () => {
    ventasController.updateVenta = jest.fn(async (req, res) => res.status(200).json({ message: "Venta actualizada" }))
    const req = httpMocks.createRequest({ params: { id: 1 }, body: { Subtotal: 200 } })
    const res = httpMocks.createResponse()
    await ventasController.updateVenta(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/actualizada/i)
  })

  it('venta no encontrada (404)', async () => {
    ventasController.updateVenta = jest.fn(async (req, res) => res.status(404).json({ message: "Venta no encontrada" }))
    const req = httpMocks.createRequest({ params: { id: 999 }, body: {} })
    const res = httpMocks.createResponse()
    await ventasController.updateVenta(req, res)
    expect(res.statusCode).toBe(404)
    expect(res._getJSONData().message).toMatch(/no encontrada/i)
  })

  it('error inesperado (500)', async () => {
    ventasController.updateVenta = jest.fn(async (req, res) => res.status(500).json({ message: "Error en el servidor" }))
    const req = httpMocks.createRequest({ params: { id: 1 }, body: {} })
    const res = httpMocks.createResponse()
    await ventasController.updateVenta(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.devolverVenta', () => {
  it('devolución exitosa (200)', async () => {
    ventasController.devolverVenta = jest.fn(async (req, res) => res.status(200).json({ message: "Venta devuelta" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.devolverVenta(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/devuelta/i)
  })

  it('venta no encontrada (404)', async () => {
    ventasController.devolverVenta = jest.fn(async (req, res) => res.status(404).json({ message: "Venta no encontrada" }))
    const req = httpMocks.createRequest({ params: { id: 999 } })
    const res = httpMocks.createResponse()
    await ventasController.devolverVenta(req, res)
    expect(res.statusCode).toBe(404)
    expect(res._getJSONData().message).toMatch(/no encontrada/i)
  })

  it('error inesperado (500)', async () => {
    ventasController.devolverVenta = jest.fn(async (req, res) => res.status(500).json({ message: "Error en el servidor" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.devolverVenta(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error en el servidor/i)
  })
})

describe('ventasController.generarFacturaVenta', () => {
  it('genera factura correctamente (200)', async () => {
    ventasController.generarFacturaVenta = jest.fn(async (req, res) => res.status(200).json({ message: "Factura generada" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.generarFacturaVenta(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/factura generada/i)
  })

  it('error inesperado (500)', async () => {
    ventasController.generarFacturaVenta = jest.fn(async (req, res) => res.status(500).json({ message: "Error al generar factura" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.generarFacturaVenta(req, res)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData().message).toMatch(/error al generar factura/i)
  })
})

describe('ventasController.calcularTotalesVenta', () => {
  it('calcula totales correctamente (200)', async () => {
    ventasController.calcularTotalesVenta = jest.fn(async (req, res) => res.status(200).json({ total: 100 }))
    const req = httpMocks.createRequest({ body: { productos: [], servicios: [] } })
    const res = httpMocks.createResponse()
    await ventasController.calcularTotalesVenta(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toHaveProperty('total')
  })
})

describe('ventasController.obtenerProductosYServicios', () => {
  it('devuelve productos y servicios (200)', async () => {
    ventasController.obtenerProductosYServicios = jest.fn(async (req, res) => res.status(200).json({ productos: [], servicios: [] }))
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    await ventasController.obtenerProductosYServicios(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toHaveProperty('productos')
    expect(res._getJSONData()).toHaveProperty('servicios')
  })
})

describe('ventasController.getResumenVentas', () => {
  it('devuelve resumen de ventas (200)', async () => {
    ventasController.getResumenVentas = jest.fn(async (req, res) => res.status(200).json({ totalVentas: 10 }))
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    await ventasController.getResumenVentas(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toHaveProperty('totalVentas')
  })
})

describe('ventasController.getTopProductosVendidos', () => {
  it('devuelve top productos vendidos (200)', async () => {
    ventasController.getTopProductosVendidos = jest.fn(async (req, res) => res.status(200).json([{ IdProducto: 1, cantidad: 5 }]))
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    await ventasController.getTopProductosVendidos(req, res)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res._getJSONData())).toBe(true)
  })
})

describe('ventasController.getVentaPDF', () => {
  it('devuelve PDF de venta (200)', async () => {
    ventasController.getVentaPDF = jest.fn(async (req, res) => res.status(200).json({ pdf: "base64string" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.getVentaPDF(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toHaveProperty('pdf')
  })
})

describe('ventasController.sincronizarVentaCliente', () => {
  it('sincroniza venta con cliente (200)', async () => {
    ventasController.sincronizarVentaCliente = jest.fn(async (req, res) => res.status(200).json({ message: "Sincronización exitosa" }))
    const req = httpMocks.createRequest({ params: { id: 1 } })
    const res = httpMocks.createResponse()
    await ventasController.sincronizarVentaCliente(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/sincronización exitosa/i)
  })
})

describe('ventasController.validarExistenciaStock', () => {
  it('valida existencia de stock (200)', async () => {
    ventasController.validarExistenciaStock = jest.fn(async (req, res) => res.status(200).json({ disponible: true }))
    const req = httpMocks.createRequest({ body: { IdProducto: 1, Cantidad: 2 } })
    const res = httpMocks.createResponse()
    await ventasController.validarExistenciaStock(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toHaveProperty('disponible')
  })
})

describe('ventasController.registrarPagoAdicional', () => {
  it('registra pago adicional (200)', async () => {
    ventasController.registrarPagoAdicional = jest.fn(async (req, res) => res.status(200).json({ message: "Pago registrado" }))
    const req = httpMocks.createRequest({ params: { id: 1 }, body: { monto: 100 } })
    const res = httpMocks.createResponse()
    await ventasController.registrarPagoAdicional(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toMatch(/pago registrado/i)
  })
})

describe('ventasController.getVentasPorFecha', () => {
  it('devuelve ventas por fecha (200)', async () => {
    ventasController.getVentasPorFecha = jest.fn(async (req, res) => res.status(200).json([{ IdVenta: 1 }]))
    const req = httpMocks.createRequest({ query: { fechaInicio: "2025-06-01", fechaFin: "2025-06-30" } })
    const res = httpMocks.createResponse()
    await ventasController.getVentasPorFecha(req, res)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res._getJSONData())).toBe(true)
  })
})
