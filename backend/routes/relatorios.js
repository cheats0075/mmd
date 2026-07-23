const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/vendas', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const where = { status: 'CONCLUIDA' };
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    const vendas = await prisma.venda.findMany({
      where,
      include: { itens: { include: { produto: true } }, pagamentos: true, usuario: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/produtos-mais-vendidos', async (req, res) => {
  try {
    const itens = await prisma.itemVenda.groupBy({
      by: ['produtoId'],
      _sum: { quantidade: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 20
    });
    const resultado = [];
    for (const item of itens) {
      const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      resultado.push({ produto, quantidadeVendida: item._sum.quantidade, totalVendido: item._sum.total });
    }
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos mais vendidos' });
  }
});

router.get('/estoque', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: { categoria: true, fornecedor: true },
      orderBy: { nome: 'asc' }
    });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório de estoque' });
  }
});

router.get('/lucro', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const where = { status: 'CONCLUIDA' };
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    const vendas = await prisma.venda.findMany({
      where,
      include: { itens: { include: { produto: true } } }
    });
    let lucro = 0;
    vendas.forEach(venda => {
      venda.itens.forEach(item => {
        lucro += Number(item.total) - (Number(item.precoUnitario) * 0.7 * Number(item.quantidade));
      });
    });
    res.json({ lucro, totalVendas: vendas.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular lucro' });
  }
});

module.exports = router;
