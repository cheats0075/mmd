const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { dataInicio, dataFim, status } = req.query;
    const where = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    if (status) where.status = status;
    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: true,
        usuario: true,
        itens: { include: { produto: true } },
        pagamentos: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        cliente: true,
        usuario: true,
        itens: { include: { produto: true } },
        pagamentos: true
      }
    });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(venda);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { clienteId, caixaId, itens, pagamentos, desconto } = req.body;
    let subtotal = 0;
    for (const item of itens) {
      subtotal += item.precoUnit * item.quantidade;
    }
    const total = subtotal - (desconto || 0);
    const venda = await prisma.venda.create({
      data: {
        clienteId: clienteId || null,
        caixaId: caixaId || null,
        usuarioId: req.usuario.id,
        subtotal,
        desconto: desconto || 0,
        total,
        status: 'CONCLUIDA',
        itens: {
          create: itens.map(item => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnit,
            desconto: item.desconto || 0,
            total: (item.precoUnit * item.quantidade) - (item.desconto || 0)
          }))
        },
        pagamentos: {
          create: pagamentos.map(pag => ({
            formaPagamento: pag.formaPagamento,
            valor: pag.valor,
            troco: pag.troco || 0
          }))
        }
      },
      include: { itens: true, pagamentos: true }
    });
    for (const item of itens) {
      await prisma.produto.update({
        where: { id: item.produtoId },
        data: { quantidade: { decrement: item.quantidade } }
      });
    }
    res.status(201).json(venda);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

router.post('/:id/cupom', async (req, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { itens: { include: { produto: true } }, pagamentos: true, usuario: true, cliente: true }
    });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
    let cupom = '=== CUPOM FISCAL ===\n';
    cupom += `Venda: #${venda.id}\n`;
    cupom += `Data: ${new Date(venda.createdAt).toLocaleString('pt-BR')}\n`;
    cupom += `Operador: ${venda.usuario?.nome || 'N/A'}\n`;
    if (venda.cliente) cupom += `Cliente: ${venda.cliente.nome}\n`;
    cupom += '-----------------------\n';
    venda.itens.forEach(item => {
      cupom += `${item.quantidade}x ${item.produto.nome}\n`;
      cupom += `  R$ ${item.precoUnitario.toFixed(2)} = R$ ${item.total.toFixed(2)}\n`;
    });
    cupom += '-----------------------\n';
    cupom += `Subtotal: R$ ${venda.subtotal.toFixed(2)}\n`;
    if (venda.desconto > 0) cupom += `Desconto: -R$ ${venda.desconto.toFixed(2)}\n`;
    cupom += `TOTAL: R$ ${venda.total.toFixed(2)}\n`;
    cupom += '-----------------------\n';
    venda.pagamentos.forEach(pag => {
      cupom += `${pag.formaPagamento}: R$ ${pag.valor.toFixed(2)}\n`;
      if (pag.troco > 0) cupom += `Troco: R$ ${pag.troco.toFixed(2)}\n`;
    });
    cupom += '=======================\n';
    cupom += 'Obrigado pela preferência!\n';
    await prisma.venda.update({ where: { id: venda.id }, data: { cupom } });
    res.json({ cupom });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar cupom' });
  }
});

module.exports = router;
