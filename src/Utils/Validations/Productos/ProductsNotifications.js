import { sendEmail } from "../../Email.js"

// Manejo de notificaciones para productos
export const productsNotifications = {
  // Enviar notificación de stock bajo
  sendLowStockNotification: async (producto, recipients) => {
    try {
      const subject = `🚨 Stock Bajo: ${producto.NombreProducto}`

      for (const recipient of recipients) {
        if (!recipient.email) continue

        await sendEmail({
          to: recipient.email,
          subject: subject,
          text: `Hola ${recipient.nombre},

El producto "${producto.NombreProducto}" tiene stock bajo.

Stock actual: ${producto.Stock} ${producto.UnidadMedida}
Categoría: ${producto.NombreCategoria}
${producto.CodigoBarras ? `Código de barras: ${producto.CodigoBarras}` : ""}
${producto.Referencia ? `Referencia: ${producto.Referencia}` : ""}

Es necesario reabastecer este producto lo antes posible.

Saludos,
Equipo TeoCat`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #721c24; margin: 0;">🚨 Stock Bajo</h2>
              </div>
              <p>Hola <strong>${recipient.nombre}</strong>,</p>
              <p>El producto <strong>"${producto.NombreProducto}"</strong> tiene stock bajo.</p>
              <div style="background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin: 15px 0;">
                <p><strong>Stock actual:</strong> ${producto.Stock} ${producto.UnidadMedida}</p>
                <p><strong>Categoría:</strong> ${producto.NombreCategoria}</p>
                ${producto.CodigoBarras ? `<p><strong>Código de barras:</strong> ${producto.CodigoBarras}</p>` : ""}
                ${producto.Referencia ? `<p><strong>Referencia:</strong> ${producto.Referencia}</p>` : ""}
              </div>
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 15px 0;">
                <p style="margin: 0;"><strong>⚠️ Es necesario reabastecer este producto lo antes posible.</strong></p>
              </div>
              <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
            </div>
          `,
        })
      }

      console.log(`Notificación de stock bajo enviada para producto: ${producto.NombreProducto}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar notificación de stock bajo:", error)
      return { success: false, error: error.message }
    }
  },

  // Enviar notificación de producto próximo a vencer
  sendExpiryNotification: async (producto, recipients) => {
    try {
      const fechaVencimiento = new Date(producto.FechaVencimiento).toLocaleDateString("es-ES")
      const diasParaVencer = Math.ceil((new Date(producto.FechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24))
      const subject = `⏰ Producto próximo a vencer: ${producto.NombreProducto}`

      for (const recipient of recipients) {
        if (!recipient.email) continue

        await sendEmail({
          to: recipient.email,
          subject: subject,
          text: `Hola ${recipient.nombre},

El producto "${producto.NombreProducto}" está próximo a vencer.

Fecha de vencimiento: ${fechaVencimiento}
Días restantes: ${diasParaVencer}
Stock actual: ${producto.Stock} ${producto.UnidadMedida}
Categoría: ${producto.NombreCategoria}
${producto.CodigoBarras ? `Código de barras: ${producto.CodigoBarras}` : ""}
${producto.Referencia ? `Referencia: ${producto.Referencia}` : ""}

Por favor, tome las medidas necesarias.

Saludos,
Equipo TeoCat`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <h2 style="color: #856404; margin: 0;">⏰ Producto próximo a vencer</h2>
              </div>
              <p>Hola <strong>${recipient.nombre}</strong>,</p>
              <p>El producto <strong>"${producto.NombreProducto}"</strong> está próximo a vencer.</p>
              <div style="background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin: 15px 0;">
                <p><strong>Fecha de vencimiento:</strong> ${fechaVencimiento}</p>
                <p><strong>Días restantes:</strong> ${diasParaVencer}</p>
                <p><strong>Stock actual:</strong> ${producto.Stock} ${producto.UnidadMedida}</p>
                <p><strong>Categoría:</strong> ${producto.NombreCategoria}</p>
                ${producto.CodigoBarras ? `<p><strong>Código de barras:</strong> ${producto.CodigoBarras}</p>` : ""}
                ${producto.Referencia ? `<p><strong>Referencia:</strong> ${producto.Referencia}</p>` : ""}
              </div>
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 10px; margin: 15px 0;">
                <p style="margin: 0;"><strong>⚠️ Por favor, tome las medidas necesarias.</strong></p>
              </div>
              <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
            </div>
          `,
        })
      }

      console.log(`Notificación de vencimiento enviada para producto: ${producto.NombreProducto}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar notificación de vencimiento:", error)
      return { success: false, error: error.message }
    }
  },

  // Enviar notificación de producto creado
  sendProductCreatedNotification: async (producto, createdBy) => {
    try {
      const subject = `✅ Nuevo producto creado: ${producto.NombreProducto}`

      await sendEmail({
        to: createdBy.email,
        subject: subject,
        text: `Hola ${createdBy.nombre},

Se ha creado exitosamente el producto "${producto.NombreProducto}".

Detalles del producto:
- Categoría: ${producto.NombreCategoria}
- Precio: $${producto.Precio}
- Precio de venta: $${producto.PrecioVenta}
- Precio con IVA: $${producto.PrecioConIVA}
- Stock inicial: ${producto.Stock} ${producto.UnidadMedida}
${producto.CodigoBarras ? `- Código de barras: ${producto.CodigoBarras}` : ""}
${producto.Referencia ? `- Referencia: ${producto.Referencia}` : ""}

El producto ya está disponible en el sistema.

Saludos,
Equipo TeoCat`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #155724; margin: 0;">✅ Nuevo producto creado</h2>
            </div>
            <p>Hola <strong>${createdBy.nombre}</strong>,</p>
            <p>Se ha creado exitosamente el producto <strong>"${producto.NombreProducto}"</strong>.</p>
            <div style="background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Detalles del producto:</h3>
              <p><strong>Categoría:</strong> ${producto.NombreCategoria}</p>
              <p><strong>Precio:</strong> $${producto.Precio}</p>
              <p><strong>Precio de venta:</strong> $${producto.PrecioVenta}</p>
              <p><strong>Precio con IVA:</strong> $${producto.PrecioConIVA}</p>
              <p><strong>Stock inicial:</strong> ${producto.Stock} ${producto.UnidadMedida}</p>
              ${producto.CodigoBarras ? `<p><strong>Código de barras:</strong> ${producto.CodigoBarras}</p>` : ""}
              ${producto.Referencia ? `<p><strong>Referencia:</strong> ${producto.Referencia}</p>` : ""}
            </div>
            <p>El producto ya está disponible en el sistema.</p>
            <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
          </div>
        `,
      })

      console.log(`Notificación de producto creado enviada: ${producto.NombreProducto}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar notificación de producto creado:", error)
      return { success: false, error: error.message }
    }
  },

  // Enviar notificación de actualización de stock
  sendStockUpdateNotification: async (producto, oldStock, newStock, updatedBy) => {
    try {
      const diferencia = newStock - oldStock
      const tipo = diferencia > 0 ? "incrementado" : "decrementado"
      const subject = `📦 Stock ${tipo}: ${producto.NombreProducto}`

      await sendEmail({
        to: updatedBy.email,
        subject: subject,
        text: `Hola ${updatedBy.nombre},

Se ha ${tipo} el stock del producto "${producto.NombreProducto}".

Stock anterior: ${oldStock} ${producto.UnidadMedida}
Stock actual: ${newStock} ${producto.UnidadMedida}
Diferencia: ${diferencia > 0 ? "+" : ""}${diferencia} ${producto.UnidadMedida}

Categoría: ${producto.NombreCategoria}
${producto.CodigoBarras ? `Código de barras: ${producto.CodigoBarras}` : ""}
${producto.Referencia ? `Referencia: ${producto.Referencia}` : ""}

Saludos,
Equipo TeoCat`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #0c5460; margin: 0;">📦 Stock ${tipo}</h2>
            </div>
            <p>Hola <strong>${updatedBy.nombre}</strong>,</p>
            <p>Se ha ${tipo} el stock del producto <strong>"${producto.NombreProducto}"</strong>.</p>
            <div style="background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin: 15px 0;">
              <p><strong>Stock anterior:</strong> ${oldStock} ${producto.UnidadMedida}</p>
              <p><strong>Stock actual:</strong> ${newStock} ${producto.UnidadMedida}</p>
              <p><strong>Diferencia:</strong> <span style="color: ${diferencia > 0 ? "#28a745" : "#dc3545"};">${diferencia > 0 ? "+" : ""}${diferencia} ${producto.UnidadMedida}</span></p>
              <p><strong>Categoría:</strong> ${producto.NombreCategoria}</p>
              ${producto.CodigoBarras ? `<p><strong>Código de barras:</strong> ${producto.CodigoBarras}</p>` : ""}
              ${producto.Referencia ? `<p><strong>Referencia:</strong> ${producto.Referencia}</p>` : ""}
            </div>
            <p>Saludos,<br><strong>Equipo TeoCat</strong></p>
          </div>
        `,
      })

      console.log(`Notificación de actualización de stock enviada: ${producto.NombreProducto}`)
      return { success: true }
    } catch (error) {
      console.error("Error al enviar notificación de actualización de stock:", error)
      return { success: false, error: error.message }
    }
  },

  // ✅ CORRECCIÓN: Eliminar sendEmailAsync problemático
  // ELIMINADO: sendEmailAsync - Era problemático con setTimeout()

  // Obtener destinatarios para notificaciones de productos
  getProductNotificationRecipients: async () => {
    try {
      const { usuariosModel } = await import("../../Models/AuthService/auth.model.js")

      // ✅ CORRECCIÓN: Manejar si getByRol no existe
      let admins = []
      if (typeof usuariosModel.getByRol === "function") {
        admins = await usuariosModel.getByRol(1) // Administradores
      } else {
        // Alternativa si no existe getByRol
        const allUsers = await usuariosModel.getAll()
        admins = allUsers.filter((user) => user.IdRol === 1)
      }

      return admins
        .filter((admin) => admin.Estado) // Solo usuarios activos
        .map((admin) => ({
          id: admin.IdUsuario,
          email: admin.Correo,
          nombre: admin.Nombre,
          apellido: admin.Apellido,
          rol: admin.IdRol,
        }))
    } catch (error) {
      console.error("Error al obtener destinatarios:", error)
      return []
    }
  },
}
