-- Script de corrección para base de datos teocat (SIN TipoDocumento)
USE teocat;

-- Crear categoría de alimentos
INSERT IGNORE INTO CategoriaDeProductos (NombreCategoria) 
VALUES ('Alimentos');

-- Crear Consumidor Final (SIN TipoDocumento)
INSERT IGNORE INTO Clientes (
    Nombre, Apellido, Documento, 
    Correo, Telefono, Direccion, Estado
) VALUES (
    'Consumidor', 'Final', '0000000000', 
    'consumidor@final.com', '0000000000', 
    'Dirección genérica', 'Activo'
);

-- Crear especie genérica
INSERT IGNORE INTO Especies (NombreEspecie) 
VALUES ('Genérica');

-- Crear mascota genérica
INSERT IGNORE INTO Mascotas (
    IdCliente, IdEspecie, Nombre, Raza, Edad, Peso, 
    Tamaño, Color, Sexo, Estado
) VALUES (
    (SELECT IdCliente FROM Clientes WHERE Documento = '0000000000' LIMIT 1),
    (SELECT IdEspecie FROM Especies WHERE NombreEspecie = 'Genérica' LIMIT 1),
    'Mascota Genérica', 'Genérica', 0, 0.0, 
    'Mediano', 'Variado', 'Indefinido', 'Activo'
);

-- Verificar resultados
SELECT 'Consumidor Final creado:' AS Info, COUNT(*) AS Cantidad 
FROM Clientes WHERE Documento = '0000000000';
