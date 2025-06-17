import { query, getConnection } from "../../Config/Database.js";

export const categoriasModel = {
  getAll: async () => {
    return await query(
      `SELECT * FROM CategoriaDeProductos WHERE Estado = TRUE ORDER BY NombreCategoria`
    );
  },

  getById: async (id) => {
    const categorias = await query(
      `SELECT * FROM CategoriaDeProductos WHERE IdCategoriaDeProductos = ?`,
      [id]
    );
    return categorias[0];
  },

  getProducts: async (id) => {
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.IdCategoriaDeProducto = ? AND p.Estado = TRUE
       ORDER BY p.NombreProducto`,
      [id]
    );
  },

  search: async (term) => {
  const searchTerm = `%${term}%`;
  return await query(
    `SELECT * FROM CategoriaDeProductos 
     WHERE NombreCategoria LIKE ? AND Estado = TRUE
     ORDER BY NombreCategoria`,
    [searchTerm]
  );
},

  create: async (categoriaData) => {
  const result = await query(
    `INSERT INTO CategoriaDeProductos (NombreCategoria, Estado) VALUES (?, ?)`,
    [categoriaData.NombreCategoria, categoriaData.Estado || true]
  );
  return { id: result.insertId, ...categoriaData };
},

  update: async (id, categoriaData) => {
  let query_str = `UPDATE CategoriaDeProductos SET `;
  const params = [];
  
  if (categoriaData.NombreCategoria) {
    query_str += `NombreCategoria = ?, `;
    params.push(categoriaData.NombreCategoria);
  }
  if (categoriaData.Estado !== undefined) {
    query_str += `Estado = ?, `;
    params.push(categoriaData.Estado);
  }
  
  // Eliminar la última coma y espacio
  query_str = query_str.slice(0, -2);
  
  // Añadir la condición WHERE
  query_str += ` WHERE IdCategoriaDeProductos = ?`;
  params.push(id);
  
  await query(query_str, params);
  return { id, ...categoriaData };
},

  changeStatus: async (id, estado) => {
    await query(
      `UPDATE CategoriaDeProductos SET Estado = ? WHERE IdCategoriaDeProductos = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  delete: async (id) => {
    // Verificar si hay productos asociados
    const productos = await query(
      `SELECT COUNT(*) as count FROM Productos WHERE IdCategoriaDeProducto = ?`,
      [id]
    );
    
    if (productos[0].count > 0) {
      throw new Error('No se puede eliminar la categoría porque tiene productos asociados');
    }
    
    await query(
      `DELETE FROM CategoriaDeProductos WHERE IdCategoriaDeProductos = ?`,
      [id]
    );
    return { id };
  }
};

// Modelo para productos
export const productosModel = {
  // Obtener todos los productos
  getAll: async () => {
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       ORDER BY p.NombreProducto`
    );
  },

  // Obtener un producto por su ID
  getById: async (id) => {
    const productos = await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.IdProducto = ?`,
      [id]
    );
    return productos[0];
  },

  // Obtener productos por categoría
  getByCategoria: async (idCategoria) => {
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.IdCategoriaDeProducto = ? AND p.Estado = TRUE
       ORDER BY p.NombreProducto`,
      [idCategoria]
    );
  },

  // Buscar productos por término
  search: async (term) => {
    const searchTerm = `%${term}%`;
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE (p.NombreProducto LIKE ? OR p.Descripcion LIKE ? OR p.CodigoBarras LIKE ? OR p.Referencia LIKE ?) AND p.Estado = TRUE
       ORDER BY p.NombreProducto`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
  },

  // Obtener productos con stock bajo
  getLowStock: async (threshold = 10) => {
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.Stock <= ? AND p.Estado = TRUE
       ORDER BY p.Stock ASC, p.NombreProducto`,
      [threshold]
    );
  },

  // Obtener productos próximos a vencer
  getNearExpiry: async (days = 30) => {
    return await query(
      `SELECT p.*, c.NombreCategoria, DATEDIFF(p.FechaVencimiento, CURDATE()) as DiasParaVencer
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.FechaVencimiento IS NOT NULL 
       AND p.FechaVencimiento <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND p.FechaVencimiento >= CURDATE()
       AND p.Estado = TRUE
       ORDER BY p.FechaVencimiento ASC, p.NombreProducto`,
      [days]
    );
  },

  // Obtener producto por código de barras
  getByBarcode: async (barcode) => {
    const productos = await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.CodigoBarras = ?`,
      [barcode]
    );
    return productos[0];
  },

  // Obtener producto por referencia
  getByReference: async (reference) => {
    const productos = await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.Referencia = ?`,
      [reference]
    );
    return productos[0];
  },

  // Crear un nuevo producto
  create: async (productoData) => {
    // Construir la consulta SQL con los campos de la nueva estructura de la tabla
    const result = await query(
      `INSERT INTO Productos 
      (IdCategoriaDeProducto, NombreProducto, Descripcion, Caracteristicas, 
      Stock, UnidadMedida, ValorUnidad, Precio, 
      MargenGanancia, AplicaIVA, PorcentajeIVA, FechaVencimiento, 
      CodigoBarras, Referencia, Estado, Origen, EsVariante, ProductoBaseId, FotosProducto) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productoData.IdCategoriaDeProducto,
        productoData.NombreProducto,
        productoData.Descripcion || null,
        productoData.Caracteristicas || null,
        productoData.Stock || 0,
        productoData.UnidadMedida || 'Unidad',
        productoData.ValorUnidad || 1,
        productoData.Precio,
        productoData.MargenGanancia || 30,
        productoData.AplicaIVA || false,
        productoData.PorcentajeIVA || 0,
        productoData.FechaVencimiento || null,
        productoData.CodigoBarras || null,
        productoData.Referencia || null,
        productoData.Estado !== undefined ? productoData.Estado : true,
        productoData.Origen || 'Catálogo',
        productoData.EsVariante || false,
        productoData.ProductoBaseId || null,
        productoData.FotosProducto || null
      ]
    );
    return { id: result.insertId, ...productoData };
  },

  // Actualizar un producto existente
  update: async (id, productoData) => {
    let query_str = `UPDATE Productos SET `;
    const params = [];
    
    // Construir la consulta dinámicamente con todos los campos actualizados
    if (productoData.IdCategoriaDeProducto !== undefined) {
      query_str += `IdCategoriaDeProducto = ?, `;
      params.push(productoData.IdCategoriaDeProducto);
    }
    if (productoData.NombreProducto !== undefined) {
      query_str += `NombreProducto = ?, `;
      params.push(productoData.NombreProducto);
    }
    if (productoData.Descripcion !== undefined) {
      query_str += `Descripcion = ?, `;
      params.push(productoData.Descripcion);
    }
    if (productoData.Caracteristicas !== undefined) {
      query_str += `Caracteristicas = ?, `;
      params.push(productoData.Caracteristicas);
    }
    if (productoData.Stock !== undefined) {
      query_str += `Stock = ?, `;
      params.push(productoData.Stock);
    }
    if (productoData.UnidadMedida !== undefined) {
      query_str += `UnidadMedida = ?, `;
      params.push(productoData.UnidadMedida);
    }
    if (productoData.ValorUnidad !== undefined) {
      query_str += `ValorUnidad = ?, `;
      params.push(productoData.ValorUnidad);
    }
    if (productoData.Precio !== undefined) {
      query_str += `Precio = ?, `;
      params.push(productoData.Precio);
    }
    if (productoData.MargenGanancia !== undefined) {
      query_str += `MargenGanancia = ?, `;
      params.push(productoData.MargenGanancia);
    }
    if (productoData.AplicaIVA !== undefined) {
      query_str += `AplicaIVA = ?, `;
      params.push(productoData.AplicaIVA);
    }
    if (productoData.PorcentajeIVA !== undefined) {
      query_str += `PorcentajeIVA = ?, `;
      params.push(productoData.PorcentajeIVA);
    }
    if (productoData.FechaVencimiento !== undefined) {
      query_str += `FechaVencimiento = ?, `;
      params.push(productoData.FechaVencimiento);
    }
    if (productoData.CodigoBarras !== undefined) {
      query_str += `CodigoBarras = ?, `;
      params.push(productoData.CodigoBarras);
    }
    if (productoData.Referencia !== undefined) {
      query_str += `Referencia = ?, `;
      params.push(productoData.Referencia);
    }
    if (productoData.Estado !== undefined) {
      query_str += `Estado = ?, `;
      params.push(productoData.Estado);
    }
    if (productoData.Origen !== undefined) {
      query_str += `Origen = ?, `;
      params.push(productoData.Origen);
    }
    if (productoData.EsVariante !== undefined) {
      query_str += `EsVariante = ?, `;
      params.push(productoData.EsVariante);
    }
    if (productoData.ProductoBaseId !== undefined) {
      query_str += `ProductoBaseId = ?, `;
      params.push(productoData.ProductoBaseId);
    }
    if (productoData.FotosProducto !== undefined) {
      query_str += `FotosProducto = ?, `;
      params.push(productoData.FotosProducto);
    }

    // Eliminar la última coma y espacio
    query_str = query_str.slice(0, -2);
    
    // Añadir la condición WHERE
    query_str += ` WHERE IdProducto = ?`;
    params.push(id);

    await query(query_str, params);
    return { id, ...productoData };
  },

  // Cambiar el estado de un producto
  changeStatus: async (id, estado) => {
    await query(
      `UPDATE Productos SET Estado = ? WHERE IdProducto = ?`,
      [estado, id]
    );
    return { id, estado };
  },

  // Actualizar el stock de un producto
  updateStock: async (id, cantidad) => {
    await query(
      `UPDATE Productos SET Stock = Stock + ? WHERE IdProducto = ?`,
      [cantidad, id]
    );
    return { id, cantidad };
  },

  // Eliminar un producto
  delete: async (id) => {
    // Verificar si hay variantes asociadas
    const variantes = await query(
      `SELECT COUNT(*) as count FROM Productos WHERE ProductoBaseId = ?`,
      [id]
    );
    
    if (variantes[0].count > 0) {
      throw new Error('No se puede eliminar el producto porque tiene variantes asociadas');
    }
    
    // Eliminar el producto
    await query(
      `DELETE FROM Productos WHERE IdProducto = ?`,
      [id]
    );
    return { id };
  },
  
  // Obtener variantes de un producto
  getVariants: async (idProductoBase) => {
    return await query(
      `SELECT p.*, c.NombreCategoria 
       FROM Productos p
       JOIN CategoriaDeProductos c ON p.IdCategoriaDeProducto = c.IdCategoriaDeProductos
       WHERE p.ProductoBaseId = ? AND p.EsVariante = TRUE
       ORDER BY p.NombreProducto`,
      [idProductoBase]
    );
  },

  // Crear una variante de un producto
  createVariant: async (idProductoBase, varianteData) => {
    // Obtener datos del producto base
    const productos = await query(
      `SELECT * FROM Productos WHERE IdProducto = ?`,
      [idProductoBase]
    );
    
    if (productos.length === 0) {
      throw new Error('Producto base no encontrado');
    }
    
    const productoBase = productos[0];
    
    // Crear la variante con datos heredados del producto base
    const result = await query(
      `INSERT INTO Productos 
      (IdCategoriaDeProducto, NombreProducto, Descripcion, Caracteristicas, 
      Stock, UnidadMedida, ValorUnidad, Precio, 
      MargenGanancia, AplicaIVA, PorcentajeIVA, FechaVencimiento, 
      CodigoBarras, Referencia, Estado, Origen, EsVariante, ProductoBaseId, FotosProducto) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [
        productoBase.IdCategoriaDeProducto,
        varianteData.NombreProducto || `${productoBase.NombreProducto} - Variante`,
        varianteData.Descripcion || productoBase.Descripcion,
        varianteData.Caracteristicas || productoBase.Caracteristicas,
        varianteData.Stock || 0,
        varianteData.UnidadMedida || productoBase.UnidadMedida,
        varianteData.ValorUnidad || productoBase.ValorUnidad,
        varianteData.Precio || productoBase.Precio,
        varianteData.MargenGanancia || productoBase.MargenGanancia,
        varianteData.AplicaIVA !== undefined ? varianteData.AplicaIVA : productoBase.AplicaIVA,
        varianteData.PorcentajeIVA !== undefined ? varianteData.PorcentajeIVA : productoBase.PorcentajeIVA,
        varianteData.FechaVencimiento || productoBase.FechaVencimiento,
        varianteData.CodigoBarras || null,
        varianteData.Referencia || null,
        varianteData.Estado !== undefined ? varianteData.Estado : true,
        varianteData.Origen || productoBase.Origen,
        idProductoBase,
        varianteData.FotosProducto || null
      ]
    );
    
    return { id: result.insertId, ...varianteData, EsVariante: true, ProductoBaseId: idProductoBase };
  },

  // Actualizar una variante de producto
  updateVariant: async (variantId, baseProductId, updateData) => {
    try {
      // Verificar que la variante existe y pertenece al producto base
      const variant = await query(
        `SELECT * FROM Productos WHERE IdProducto = ? AND EsVariante = TRUE AND ProductoBaseId = ?`,
        [variantId, baseProductId]
      );
      
      if (variant.length === 0) {
        throw new Error('La variante no existe o no pertenece al producto base especificado');
      }
      
      // Preparar los campos a actualizar
      const fields = [];
      const values = [];
      
      // Añadir cada campo que se va a actualizar
      if (updateData.NombreProducto) {
        fields.push('NombreProducto = ?');
        values.push(updateData.NombreProducto);
      }
      
      if (updateData.Descripcion !== undefined) {
        fields.push('Descripcion = ?');
        values.push(updateData.Descripcion);
      }
      
      if (updateData.Caracteristicas !== undefined) {
        fields.push('Caracteristicas = ?');
        values.push(updateData.Caracteristicas);
      }
      
      if (updateData.Stock !== undefined) {
        fields.push('Stock = ?');
        values.push(updateData.Stock);
      }
      
      if (updateData.UnidadMedida) {
        fields.push('UnidadMedida = ?');
        values.push(updateData.UnidadMedida);
      }
      
      if (updateData.ValorUnidad !== undefined) {
        fields.push('ValorUnidad = ?');
        values.push(updateData.ValorUnidad);
      }
      
      if (updateData.Precio !== undefined) {
        fields.push('Precio = ?');
        values.push(updateData.Precio);
      }
      
      if (updateData.MargenGanancia !== undefined) {
        fields.push('MargenGanancia = ?');
        values.push(updateData.MargenGanancia);
      }
      
      if (updateData.AplicaIVA !== undefined) {
        fields.push('AplicaIVA = ?');
        values.push(updateData.AplicaIVA);
      }
      
      if (updateData.PorcentajeIVA !== undefined) {
        fields.push('PorcentajeIVA = ?');
        values.push(updateData.PorcentajeIVA);
      }
      
      if (updateData.FechaVencimiento) {
        fields.push('FechaVencimiento = ?');
        values.push(updateData.FechaVencimiento);
      }
      
      if (updateData.CodigoBarras) {
        fields.push('CodigoBarras = ?');
        values.push(updateData.CodigoBarras);
      }
      
      if (updateData.Referencia) {
        fields.push('Referencia = ?');
        values.push(updateData.Referencia);
      }
      
      if (updateData.Estado !== undefined) {
        fields.push('Estado = ?');
        values.push(updateData.Estado);
      }
      
      if (updateData.FotosProducto !== undefined) {
        fields.push('FotosProducto = ?');
        values.push(updateData.FotosProducto);
      }
      
      // Si no hay campos para actualizar, retornar
      if (fields.length === 0) {
        return variant[0];
      }
      
      // Construir y ejecutar la consulta de actualización
      const updateQuery = `
        UPDATE Productos 
        SET ${fields.join(', ')} 
        WHERE IdProducto = ? AND EsVariante = TRUE AND ProductoBaseId = ?
      `;
      
      values.push(variantId);
      values.push(baseProductId);
      
      await query(updateQuery, values);
      
      // Obtener y retornar la variante actualizada
      const updatedVariant = await query(
        `SELECT * FROM Productos WHERE IdProducto = ?`,
        [variantId]
      );
      
      return updatedVariant[0];
    } catch (error) {
      console.error('Error al actualizar variante:', error);
      throw error;
    }
  },

  // Eliminar una variante de producto
  deleteVariant: async (idProductoBase, idVariante) => {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      
      // Verificar que la variante existe y pertenece al producto base
      const [variantes] = await connection.query(
        `SELECT * FROM Productos WHERE IdProducto = ? AND ProductoBaseId = ? AND EsVariante = TRUE`,
        [idVariante, idProductoBase]
      );
      
      if (variantes.length === 0) {
        throw new Error('Variante no encontrada o no pertenece al producto base');
      }
      
      // Eliminar la variante
      await connection.query(
        `DELETE FROM Productos WHERE IdProducto = ?`,
        [idVariante]
      );
      
      await connection.commit();
      return { idProductoBase, idVariante };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};