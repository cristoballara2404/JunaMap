-- Datos FICTICIOS de demostración (ningún dato real de personas).
-- Campus de referencia aproximado: lat -33.4230, lng -70.6430.
INSERT INTO locales (nombre, categoria, direccion, horario, nota_menu, tiene_menu_dia, glifo, color_a, color_b, ubicacion) VALUES
('Fuente de Soda Doña Rosa','Almuerzos caseros','Av. Independencia 1240','hasta las 17:00','Incluye plato de fondo, ensalada y bebida',TRUE,'R','#FF8A5B','#FF6B35', ST_SetSRID(ST_MakePoint(-70.64300,-33.42190),4326)::geography),
('La Esquina del Completo','Completos y sándwiches','Santos Dumont 980','hasta las 19:00','Todos acompañados de bebida chica',FALSE,'E','#1D8FA8','#004E64', ST_SetSRID(ST_MakePoint(-70.64040,-33.42300),4326)::geography),
('Sushi Express Campus','Sushi y wok','Hipódromo Chile 410','hasta las 20:00','Menú ejecutivo disponible hasta las 16:00',TRUE,'S','#8E7CF0','#5B45D6', ST_SetSRID(ST_MakePoint(-70.64580,-33.42500),4326)::geography),
('Café Libreta','Café y pastelería','Av. Recoleta 1105','hasta las 18:30','Wifi libre para estudiantes',FALSE,'C','#E8AE45','#C47F12', ST_SetSRID(ST_MakePoint(-70.63950,-33.42550),4326)::geography);

INSERT INTO menu_items (local_id, nombre, precio) VALUES
(1,'Cazuela de vacuno',3800),(1,'Pastel de choclo',3800),(1,'Pollo asado con arroz',3800),
(2,'Completo italiano',2200),(2,'Lomito palta',3600),(2,'Barros Luco',3400),
(3,'Roll 10 piezas',4200),(3,'Arroz chaufán',3900),(3,'Wok de pollo',4300),
(4,'Café de grano',1800),(4,'Kuchen de frambuesa',2200),(4,'Sándwich de ave palta',3300);

INSERT INTO promos (local_id, titulo, precio, precio_original) VALUES
(1,'Menú del día + postre',3500,4200),
(2,'2 completos italianos',4000,4400),
(3,'Roll de 10 piezas + té',4200,5000),
(4,'Café + kuchen',2900,4000);

INSERT INTO resenas (local_id, autor, carrera, estrellas, comentario) VALUES
(1,'Valentina M.','Ing. Civil',5,'Porciones generosas y aceptan la BAES sin ningún problema.'),
(1,'Matías R.','Kinesiología',4,'Rápido entre clases, pero a las 13:30 se llena.'),
(2,'Diego P.','Ing. Informática',5,'El mejor completo de la zona, y el 2x1 ayuda a fin de mes.'),
(2,'Fernanda S.','Enfermería',4,'Buen precio. Ojo que en hora punta hay fila.'),
(3,'Camilo T.','Derecho',4,'Rico y rápido. Los precios son razonables con la promo.'),
(3,'Javiera L.','Psicología',4,'Buen lugar para sentarse a estudiar un rato.'),
(4,'Sofía A.','Arquitectura',5,'Tiene enchufes y silencio. Perfecto para trabajar entre clases.'),
(4,'Nicolás V.','Ing. Civil',4,'Los kuchenes son caseros y se nota.');

INSERT INTO estudiantes (nombre, carrera, operador) VALUES ('Camila Reyes','Ingeniería Civil','Pluxee');
INSERT INTO favoritos (estudiante_id, local_id) VALUES (1,4);
INSERT INTO pedidos (estudiante_id, promo_id, local_nombre, promo_titulo, codigo, valor_promo, costo_servicio, estado, creado_en) VALUES
(1,1,'Fuente de Soda Doña Rosa','Menú del día + postre','JM-4821',3500,250,'retirado', now() - interval '10 days'),
(1,4,'Café Libreta','Café + kuchen','JM-3377',2900,250,'retirado', now() - interval '13 days'),
(1,2,'La Esquina del Completo','2 completos italianos','JM-9054',4000,250,'retirado', now() - interval '14 days');
