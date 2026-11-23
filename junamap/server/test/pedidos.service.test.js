import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPedidosService } from '../src/services/pedidos.service.js';

const config = { costoServicio: 250 };
const promo = { id: 1, titulo: 'Menú + postre', precio: 3500, local_nombre: 'Doña Rosa', convenio_vigente: true };

function armar({ promoRes = promo, codigos = ['JM-1111'], pedidoExistente } = {}) {
  let i = 0;
  const pedidosRepo = {
    crear: async (d) => (d.codigo === 'JM-0000' ? null : { id: 9, ...d, estado: 'por_retirar' }),
    porId: async () => pedidoExistente ?? null,
    actualizarEstado: async (id, estado) => ({ id, estado }),
    eliminar: async () => true,
  };
  const localesRepo = { promoPorId: async () => promoRes };
  const estudiantesRepo = { porId: async () => ({ id: 1 }) };
  return crearPedidosService({ pedidosRepo, localesRepo, estudiantesRepo, config, generar: () => codigos[i++] });
}

test('crear cobra solo el costo de servicio en la app y la promo en el local', async () => {
  const p = await armar().crear({ estudianteId: 1, promoId: 1 });
  assert.equal(p.pagas_ahora_en_la_app, 250);
  assert.equal(p.pagas_en_el_local, 3500);
});

test('reintenta con otro código si el primero ya existía', async () => {
  const p = await armar({ codigos: ['JM-0000', 'JM-2222'] }).crear({ estudianteId: 1, promoId: 1 });
  assert.equal(p.codigoGenerado ?? p.codigo, 'JM-2222');
});

test('no permite pedir en un local sin convenio vigente (422)', async () => {
  const s = armar({ promoRes: { ...promo, convenio_vigente: false } });
  await assert.rejects(s.crear({ estudianteId: 1, promoId: 1 }), (e) => e.status === 422);
});

test('promo inexistente responde 404', async () => {
  await assert.rejects(armar({ promoRes: null }).crear({ estudianteId: 1, promoId: 99 }), (e) => e.status === 404);
});

test('un pedido retirado no puede cancelarse (409)', async () => {
  const s = armar({ pedidoExistente: { id: 1, estudiante_id: 1, estado: 'retirado' } });
  await assert.rejects(s.cambiarEstado(1, 'cancelado', 1), (e) => e.status === 409);
});

test('un pedido por retirar pasa a retirado', async () => {
  const s = armar({ pedidoExistente: { id: 1, estudiante_id: 1, estado: 'por_retirar' } });
  assert.equal((await s.cambiarEstado(1, 'retirado', 1)).estado, 'retirado');
});

test('solo se anulan pedidos por retirar (409 si ya se retiró)', async () => {
  const s = armar({ pedidoExistente: { id: 1, estudiante_id: 1, estado: 'retirado' } });
  await assert.rejects(s.eliminar(1, 1), (e) => e.status === 409);
});

test('un pedido de otra persona se ve como inexistente (404) al cambiarlo o anularlo', async () => {
  const s = armar({ pedidoExistente: { id: 1, estudiante_id: 2, estado: 'por_retirar' } });
  await assert.rejects(s.cambiarEstado(1, 'retirado', 1), (e) => e.status === 404);
  await assert.rejects(s.eliminar(1, 1), (e) => e.status === 404);
});
