import {categoriasModel,productosModel,} from "../../Models/ProductService/products.model.js"
import { uploadToCloudinary, deleteFromCloudinary } from "../../Utils/Cloudinary.js"

export const categoriasController = {
  getAll: async (req, res) => {
    try {
      const categorias = await categoriasModel.getAll()
      res.status(200).json(categorias)
    } catch (error) {
      console.error("Error al obtener categorías:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params
      const categoria = await categoriasModel.getById(id)

      if (!categoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      res.status(200).json(categoria)
    } catch (error) {
      console.error("Error al obtener categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  getProducts: async (req, res) => {
    try {
      const { id } = req.params
      const categoria = await categoriasModel.getById(id)

      if (!categoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      const productos = await categoriasModel.getProducts(id)
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al obtener productos de la categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "Se debe proporcionar un término de búsqueda" })
      }

      const categorias = await categoriasModel.search(term)
      res.status(200).json(categorias)
    } catch (error) {
      console.error("Error al buscar categorías:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  create: async (req, res) => {
    try {
      const categoriaData = req.body

      // Validar datos
      if (!categoriaData.NombreCategoria) {
        return res.status(400).json({ message: "El nombre de la categoría es obligatorio" })
      }

      const newCategoria = await categoriasModel.create(categoriaData)

      res.status(201).json(newCategoria)
    } catch (error) {
      console.error("Error al crear categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params
      const categoriaData = req.body

      // Verificar si la categoría existe
      const existingCategoria = await categoriasModel.getById(id)
      if (!existingCategoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      const updatedCategoria = await categoriasModel.update(id, categoriaData)

      res.status(200).json(updatedCategoria)
    } catch (error) {
      console.error("Error al actualizar categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  changeStatus: async (req, res) => {
    try {
      const { id } = req.params
      const { Estado } = req.body

      // Verificar si la categoría existe
      const existingCategoria = await categoriasModel.getById(id)
      if (!existingCategoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      const result = await categoriasModel.changeStatus(id, Estado)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al cambiar estado de categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si la categoría existe
      const existingCategoria = await categoriasModel.getById(id)
      if (!existingCategoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      try {
        await categoriasModel.delete(id)
        res.status(200).json({ message: "Categoría eliminada correctamente" })
      } catch (error) {
        if (error.message.includes("tiene productos asociados")) {
          return res.status(400).json({ message: error.message })
        }
        throw error
      }
    } catch (error) {
      console.error("Error al eliminar categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },
}

// Controlador para productos
export const productosController = {
  // Obtener todos los productos
  getAll: async (req, res) => {
    try {
      const productos = await productosModel.getAll()
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al obtener productos:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener un producto por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params
      const producto = await productosModel.getById(id)

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      res.status(200).json(producto)
    } catch (error) {
      console.error("Error al obtener producto:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener productos por categoría
  getByCategoria: async (req, res) => {
    try {
      const { id } = req.params
      const categoria = await categoriasModel.getById(id)

      if (!categoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      const productos = await productosModel.getByCategoria(id)
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al obtener productos por categoría:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Buscar productos
  search: async (req, res) => {
    try {
      const { term } = req.query

      if (!term) {
        return res.status(400).json({ message: "Se debe proporcionar un término de búsqueda" })
      }

      const productos = await productosModel.search(term)
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al buscar productos:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener productos con stock bajo
  getLowStock: async (req, res) => {
    try {
      const { threshold } = req.query
      const productos = await productosModel.getLowStock(threshold || 10)
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al obtener productos con bajo stock:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener productos próximos a vencer
  getNearExpiry: async (req, res) => {
    try {
      const { days } = req.query
      const productos = await productosModel.getNearExpiry(days || 30)
      res.status(200).json(productos)
    } catch (error) {
      console.error("Error al obtener productos próximos a vencer:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener producto por código de barras
  getByBarcode: async (req, res) => {
    try {
      const { codigo } = req.params

      if (!codigo) {
        return res.status(400).json({ message: "Se debe proporcionar un código de barras" })
      }

      const producto = await productosModel.getByBarcode(codigo)

      if (!producto) {
        return res.status(404).json({ message: "No se encontró ningún producto con ese código de barras" })
      }

      res.status(200).json(producto)
    } catch (error) {
      console.error("Error al obtener producto por código de barras:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear un nuevo producto
  create: async (req, res) => {
    try {
      const productoData = req.body

      // Validar datos básicos
      if (!productoData.NombreProducto || !productoData.IdCategoriaDeProducto || !productoData.Precio) {
        return res.status(400).json({ 
          message: "Nombre del producto, categoría y precio son campos obligatorios" 
        })
      }

      // Verificar si la categoría existe
      const categoria = await categoriasModel.getById(productoData.IdCategoriaDeProducto)
      if (!categoria) {
        return res.status(404).json({ message: "Categoría no encontrada" })
      }

      // Verificar si el código de barras ya existe
      if (productoData.CodigoBarras) {
        const existingBarcode = await productosModel.getByBarcode(productoData.CodigoBarras)
        if (existingBarcode) {
          return res.status(400).json({ message: "Ya existe un producto con ese código de barras" })
        }
      }

      // Verificar si la referencia ya existe
      if (productoData.Referencia) {
        const existingReference = await productosModel.getByReference(productoData.Referencia)
        if (existingReference) {
          return res.status(400).json({ message: "Ya existe un producto con esa referencia" })
        }
      }

      // Validar unidad de medida
      const unidadesMedida = [
        "Unidad",
        "Kilogramo",
        "Libra",
        "Bulto",
        "Gramo",
        "Litro",
        "Mililitro",
        "Metro",
        "Centimetro",
      ]
      if (productoData.UnidadMedida && !unidadesMedida.includes(productoData.UnidadMedida)) {
        return res.status(400).json({
          message: "Unidad de medida no válida",
          unidadesPermitidas: unidadesMedida,
        })
      }

      // Validar origen
      const origenes = ["Catálogo", "Stock"]
      if (productoData.Origen && !origenes.includes(productoData.Origen)) {
        return res.status(400).json({
          message: "Origen no válido",
          origenesPermitidos: origenes,
        })
      }

      // Procesar imagen si se proporciona
      if (req.file) {
  try {
    // Subir imagen a Cloudinary con carpeta específica
    const result = await uploadToCloudinary(req.file.path, 'productos')
    
    // Guardar URL de la imagen en el campo FotosProducto
    productoData.FotosProducto = result.secure_url
  } catch (uploadError) {
    console.error("Error al subir imagen a Cloudinary:", uploadError)
    return res.status(500).json({ 
      message: "Error al procesar la imagen", 
      error: uploadError.message 
    });
        }
      }

      // Crear el producto
      const newProducto = await productosModel.create(productoData)

      res.status(201).json(newProducto)
    } catch (error) {
      console.error("Error al crear producto:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar un producto existente
  update: async (req, res) => {
    try {
      const { id } = req.params
      const productoData = req.body

      // Verificar si el producto existe
      const existingProducto = await productosModel.getById(id)
      if (!existingProducto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      // Si se está actualizando la categoría, verificar que exista
      if (productoData.IdCategoriaDeProducto) {
        const categoria = await categoriasModel.getById(productoData.IdCategoriaDeProducto)
        if (!categoria) {
          return res.status(404).json({ message: "Categoría no encontrada" })
        }
      }

      // Si se está actualizando el código de barras, verificar que no exista
      if (productoData.CodigoBarras && productoData.CodigoBarras !== existingProducto.CodigoBarras) {
        const productoWithBarcode = await productosModel.getByBarcode(productoData.CodigoBarras)
        if (productoWithBarcode && productoWithBarcode.IdProducto !== parseInt(id)) {
          return res.status(400).json({ message: "Ya existe un producto con ese código de barras" })
        }
      }

      // Si se está actualizando la referencia, verificar que no exista
      if (productoData.Referencia && productoData.Referencia !== existingProducto.Referencia) {
        const productoWithReference = await productosModel.getByReference(productoData.Referencia)
        if (productoWithReference && productoWithReference.IdProducto !== parseInt(id)) {
          return res.status(400).json({ message: "Ya existe un producto con esa referencia" })
        }
      }

      // Validar unidad de medida
      const unidadesMedida = [
        "Unidad",
        "Kilogramo",
        "Libra",
        "Bulto",
        "Gramo",
        "Litro",
        "Mililitro",
        "Metro",
        "Centimetro",
      ]
      if (productoData.UnidadMedida && !unidadesMedida.includes(productoData.UnidadMedida)) {
        return res.status(400).json({
          message: "Unidad de medida no válida",
          unidadesPermitidas: unidadesMedida,
        })
      }

      // Validar origen
      const origenes = ["Catálogo", "Stock"]
      if (productoData.Origen && !origenes.includes(productoData.Origen)) {
        return res.status(400).json({
          message: "Origen no válido",
          origenesPermitidos: origenes,
        })
      }

      // Procesar imagen si se proporciona
      if (req.file) {
  try {
    // Eliminar imagen anterior si existe
    if (existingProducto.FotosProducto) {
      try {
        // Extraer el publicId de manera más robusta
        const urlParts = existingProducto.FotosProducto.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.includes('.') ? filename.split('.')[0] : filename;
        
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        console.error("Error al eliminar imagen anterior de Cloudinary:", deleteError);
        // Continuar ya que esto no debería impedir la actualización
      }
    }

    // Subir nueva imagen con carpeta específica
    const result = await uploadToCloudinary(req.file.path, 'productos');
    productoData.FotosProducto = result.secure_url;
  } catch (uploadError) {
    console.error("Error al procesar imagen:", uploadError);
    return res.status(500).json({ 
      message: "Error al procesar la imagen", 
      error: uploadError.message 
    });
  }
}

      // Actualizar el producto
      const updatedProducto = await productosModel.update(id, productoData)

      res.status(200).json(updatedProducto)
    } catch (error) {
      console.error("Error al actualizar producto:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Cambiar el estado de un producto
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params
      const { Estado } = req.body

      // Verificar si el producto existe
      const existingProducto = await productosModel.getById(id)
      if (!existingProducto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const result = await productosModel.changeStatus(id, Estado)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al cambiar estado de producto:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar el stock de un producto
  updateStock: async (req, res) => {
    try {
      const { id } = req.params
      const { cantidad } = req.body

      if (cantidad === undefined) {
        return res.status(400).json({ message: "Se debe proporcionar la cantidad a actualizar" })
      }

      // Verificar si el producto existe
      const existingProducto = await productosModel.getById(id)
      if (!existingProducto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const result = await productosModel.updateStock(id, cantidad)

      res.status(200).json(result)
    } catch (error) {
      console.error("Error al actualizar stock:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar un producto
  delete: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el producto existe
      const existingProducto = await productosModel.getById(id)
      if (!existingProducto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      if (existingProducto.FotosProducto) {
  try {
    // Extraer el publicId de manera más robusta
    const urlParts = existingProducto.FotosProducto.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.includes('.') ? filename.split('.')[0] : filename;
    
    await deleteFromCloudinary(publicId);
  } catch (deleteError) {
    console.error("Error al eliminar imagen de Cloudinary:", deleteError);
    // Continuar con la eliminación del producto
  }
}

      try {
        await productosModel.delete(id)
        res.status(200).json({ message: "Producto eliminado correctamente" })
      } catch (error) {
        if (error.message.includes("tiene variantes asociadas")) {
          return res.status(400).json({ message: error.message })
        }
        throw error
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Obtener variantes de un producto
  getVariants: async (req, res) => {
    try {
      const { id } = req.params

      // Verificar si el producto existe
      const existingProducto = await productosModel.getById(id)
      if (!existingProducto) {
        return res.status(404).json({ message: "Producto base no encontrado" })
      }

      // Obtener variantes
      const variantes = await productosModel.getVariants(id)

      res.status(200).json(variantes)
    } catch (error) {
      console.error("Error al obtener variantes:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Crear una variante de producto
  createVariant: async (req, res) => {
    try {
      const { id } = req.params
      const varianteData = req.body

      // Verificar si el producto base existe
      const productoBase = await productosModel.getById(id)
      if (!productoBase) {
        return res.status(404).json({ message: "Producto base no encontrado" })
      }

      // Verificar si el código de barras ya existe
      if (varianteData.CodigoBarras) {
        const existingBarcode = await productosModel.getByBarcode(varianteData.CodigoBarras)
        if (existingBarcode) {
          return res.status(400).json({ message: "Ya existe un producto con ese código de barras" })
        }
      }

      // Verificar si la referencia ya existe
      if (varianteData.Referencia) {
        const existingReference = await productosModel.getByReference(varianteData.Referencia)
        if (existingReference) {
          return res.status(400).json({ message: "Ya existe un producto con esa referencia" })
        }
      }

      // Procesar imagen si se proporciona
      if (req.file) {
  try {
    // Subir imagen a Cloudinary con carpeta específica
    const result = await uploadToCloudinary(req.file.path, 'productos/variantes')
    
    // Guardar URL de la imagen en el campo FotosProducto
    varianteData.FotosProducto = result.secure_url
  } catch (uploadError) {
    console.error("Error al subir imagen a Cloudinary:", uploadError)
    return res.status(500).json({ 
      message: "Error al procesar la imagen", 
      error: uploadError.message 
    });
  }
}

      // Crear la variante
      const newVariante = await productosModel.createVariant(id, varianteData)

      res.status(201).json(newVariante)
    } catch (error) {
      console.error("Error al crear variante:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Actualizar una variante de producto
  updateVariant: async (req, res) => {
    try {
      const { id, variantId } = req.params
      const updateData = req.body

      // Verificar si el producto base existe
      const baseProduct = await productosModel.getById(id)
      if (!baseProduct) {
        return res.status(404).json({ message: "Producto base no encontrado" })
      }

      // Verificar si la variante existe
      const variant = await productosModel.getById(variantId)
      if (!variant) {
        return res.status(404).json({ message: "Variante no encontrada" })
      }

      // Verificar que la variante pertenece al producto base
      if (variant.ProductoBaseId != id || !variant.EsVariante) {
        return res.status(400).json({ message: "La variante no pertenece al producto base especificado" })
      }

      // Si se está actualizando el código de barras, verificar que no exista
      if (updateData.CodigoBarras && updateData.CodigoBarras !== variant.CodigoBarras) {
        const productoWithBarcode = await productosModel.getByBarcode(updateData.CodigoBarras)
        if (productoWithBarcode && productoWithBarcode.IdProducto !== parseInt(variantId)) {
          return res.status(400).json({ message: "Ya existe un producto con ese código de barras" })
        }
      }

      // Si se está actualizando la referencia, verificar que no exista
      if (updateData.Referencia && updateData.Referencia !== variant.Referencia) {
        const productoWithReference = await productosModel.getByReference(updateData.Referencia)
        if (productoWithReference && productoWithReference.IdProducto !== parseInt(variantId)) {
          return res.status(400).json({ message: "Ya existe un producto con esa referencia" })
        }
      }

      // Procesar imagen si se proporciona
      if (req.file) {
  try {
    // Eliminar imagen anterior si existe
    if (variant.FotosProducto) {
      try {
        // Extraer el publicId de manera más robusta
        const urlParts = variant.FotosProducto.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.includes('.') ? filename.split('.')[0] : filename;
        
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        console.error("Error al eliminar imagen anterior de Cloudinary:", deleteError);
        // Continuar ya que esto no debería impedir la actualización
      }
    }

    // Subir nueva imagen con carpeta específica
    const result = await uploadToCloudinary(req.file.path, 'productos/variantes');
    updateData.FotosProducto = result.secure_url;
  } catch (uploadError) {
    console.error("Error al procesar imagen:", uploadError);
    return res.status(500).json({ 
      message: "Error al procesar la imagen", 
      error: uploadError.message 
    });
  }
}

      // Actualizar la variante
      const updatedVariant = await productosModel.updateVariant(variantId, id, updateData)

      res.status(200).json(updatedVariant)
    } catch (error) {
      console.error("Error al actualizar variante:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  },

  // Eliminar una variante de producto
  deleteVariant: async (req, res) => {
    try {
      const { id, variantId } = req.params

      // Verificar si el producto base existe
      const productoBase = await productosModel.getById(id)
      if (!productoBase) {
        return res.status(404).json({ message: "Producto base no encontrado" })
      }

      // Verificar si la variante existe
      const variante = await productosModel.getById(variantId)
      if (!variante) {
        return res.status(404).json({ message: "Variante no encontrada" })
      }

      // Verificar que la variante pertenece al producto base
      if (variante.ProductoBaseId != id || !variante.EsVariante) {
        return res.status(400).json({ message: "La variante no pertenece al producto base especificado" })
      }

      // Eliminar imagen de Cloudinary si existe
      if (variante.FotosProducto) {
  try {
    // Extraer el publicId de manera más robusta
    const urlParts = variante.FotosProducto.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.includes('.') ? filename.split('.')[0] : filename;
    
    await deleteFromCloudinary(publicId);
  } catch (deleteError) {
    console.error("Error al eliminar imagen de Cloudinary:", deleteError);
    // Continuar con la eliminación de la variante
  }
}

      // Eliminar la variante
      await productosModel.deleteVariant(id, variantId)

      res.status(200).json({ message: "Variante eliminada correctamente" })
    } catch (error) {
      console.error("Error al eliminar variante:", error)
      res.status(500).json({ message: "Error en el servidor", error: error.message })
    }
  }
}