USE teocat;

-- Crear categoría de alimentos
INSERT IGNORE INTO CategoriaDeProductos (NombreCategoria) VALUES ('Alimentos');

-- Crear Consumidor Final
INSERT IGNORE INTO Clientes (Nombre, Apellido, Documento, Correo, Telefono, Direccion, Estado) 
VALUES ('Consumidor', 'Final', '0000000000', 'consumidor@final.com', '0000000000', 'Direccion generica', 'Activo');

-- Verificar
SELECT 'Consumidor Final:' AS Info, COUNT(*) AS Cantidad FROM Clientes WHERE Documento = '0000000000';
