// Carga menús JUNAEB ajustados a los topes oficiales BAES 2026 en RM:
// - Menú Preferencial BAES: hasta $2.400
// - Menú Mejorado BAES: hasta $4.700
// Uso: node --env-file=.env scripts/cargar-menus-junaeb.js
import pg from 'pg';

// Orden importa: Domino's Pizza va antes de Dominó para no confundirlos.
const MENUS_JUNAEB = [
  {
    cadena: "McDonald's",
    re: /mc\s?donald/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero/agua',
    items: [
      ['Menú Junaeb Preferencial: McPollo + bebida Zero', 2400],
      ['Menú Junaeb Preferencial: Hamburguesa con queso + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: McPollo + ensalada/acompañamiento + bebida Zero', 4290],
      ['Menú Junaeb Mejorado: Cuarto de Libra + acompañamiento + bebida Zero', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Preferencial McPollo + bebida Zero', precio: 2400, precio_original: 5290 },
  },
  {
    cadena: 'Burger King',
    re: /burger\s*king/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero/agua',
    items: [
      ['Menú Junaeb Preferencial: Hamburguesa con queso + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: Whopper Jr + acompañamiento + bebida Zero', 4490],
      ['Menú Junaeb Mejorado: Crispy Chicken + acompañamiento + bebida Zero', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Preferencial Burger + bebida Zero', precio: 2400, precio_original: 4990 },
  },
  {
    cadena: 'KFC',
    re: /\bkfc\b/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero/agua',
    items: [
      ['Menú Junaeb Preferencial: Ruster + bebida Zero', 2400],
      ['Menú Junaeb Preferencial: Twister clásico + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: 3 Chicken Strips + acompañamiento + bebida Zero', 4490],
      ['Menú Junaeb Mejorado: Crunch Sandwich + acompañamiento + bebida Zero', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Preferencial Ruster + bebida Zero', precio: 2400, precio_original: 4990 },
  },
  {
    cadena: 'Subway',
    re: /subway/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) en Sub 15 cm',
    items: [
      ['Menú Junaeb Preferencial: Sub 15 cm Jamón de Pavo + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: Sub 15 cm Pollo Teriyaki + bebida Zero', 4290],
      ['Menú Junaeb Mejorado: Sub 15 cm Atún + bebida Zero', 4590],
      ['Menú Junaeb Mejorado: Sub 15 cm Italiano B.M.T. + bebida Zero', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Sub 15 cm Jamón de Pavo + bebida Zero', precio: 2400, precio_original: 5200 },
  },
  {
    cadena: 'Doggis',
    re: /doggis/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero/agua',
    items: [
      ['Menú Junaeb Preferencial: Hot Dog tomate/palta + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: 2 Hot Dogs tomate/palta + bebida Zero', 4290],
      ['Menú Junaeb Mejorado: Wrap de pollo + bebida Zero', 4590],
    ],
    promo: { titulo: 'Menú Junaeb Preferencial Hot Dog + bebida Zero', precio: 2400, precio_original: 4490 },
  },
  {
    cadena: "Domino's Pizza",
    re: /domino['’`]?s\s*pizza/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero',
    items: [
      ['Menú Junaeb Preferencial: Sándwich ciabatta + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: Pizza individual vegetariana/pollo + bebida Zero', 4490],
      ['Menú Junaeb Mejorado: Pizza individual pepperoni + bebida Zero', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Pizza Individual + bebida Zero', precio: 4490, precio_original: 5990 },
  },
  {
    cadena: 'Dominó',
    re: /dom[ií]n[oó]/i,
    nota: 'Menú Preferencial BAES ($2.400) y Menú Mejorado (hasta $4.700) con bebida Zero/jugo',
    items: [
      ['Menú Junaeb Preferencial: Completo tomate/palta + bebida Zero', 2400],
      ['Menú Junaeb Preferencial: Dominot vegetariano + bebida Zero', 2400],
      ['Menú Junaeb Mejorado: Sándwich ave tomate palta + jugo sin azúcar', 4700],
    ],
    promo: { titulo: 'Menú Junaeb Preferencial Completo + bebida Zero', precio: 2400, precio_original: 4650 },
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const { rows: locales } = await client.query(
    `SELECT id, nombre FROM locales WHERE origen <> 'demo'`,
  );

  let actualizados = 0;
  const conteo = {};

  for (const local of locales) {
    const plantilla = MENUS_JUNAEB.find((m) => m.re.test(local.nombre));
    if (!plantilla) continue;

    await client.query(
      `UPDATE locales SET nota_menu = $2, tiene_menu_dia = TRUE WHERE id = $1`,
      [local.id, plantilla.nota.slice(0, 120)],
    );

    await client.query('DELETE FROM menu_items WHERE local_id = $1', [local.id]);
    for (const [nombre, precio] of plantilla.items) {
      await client.query(
        'INSERT INTO menu_items (local_id, nombre, precio) VALUES ($1, $2, $3)',
        [local.id, nombre.slice(0, 80), precio],
      );
    }

    await client.query(
      `INSERT INTO promos (local_id, titulo, precio, precio_original)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (local_id) DO UPDATE
         SET titulo = EXCLUDED.titulo,
             precio = EXCLUDED.precio,
             precio_original = EXCLUDED.precio_original`,
      [
        local.id,
        plantilla.promo.titulo.slice(0, 80),
        plantilla.promo.precio,
        plantilla.promo.precio_original,
      ],
    );

    actualizados++;
    conteo[plantilla.cadena] = (conteo[plantilla.cadena] || 0) + 1;
  }

  await client.query('COMMIT');
  console.log(`Listo: ${actualizados} locales actualizados con topes BAES 2026 ($2.400 / $4.700).`);
  console.table(conteo);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Error cargando menús JUNAEB:', err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}