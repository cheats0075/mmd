const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimDia = new Date();
    fimDia.setHours(23, 59, 59, 999);

    const vendasHoje = await prisma.venda.findMany({
      where: { createdAt: { gte: hoje, lte: fimDia }, status: 'CONCLUIDA' },
      include: { itens: true }
    });
    const totalVendidoHoje = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0);

    const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });

    const totalProdutos = await prisma.produto.count();
    const totalClientes = await prisma.cliente.count();

    const estoqueBaixo = await prisma.produto.findMany({
      where: { quantidade: { gt: 0 }, estoqueMinimo: { gt: 0 } },
      take: 100
    });
    const estoqueBaixoFiltrado = estoqueBaixo.filter(p => Number(p.quantidade) <= Number(p.estoqueMinimo));

    const semEstoque = await prisma.produto.count({ where: { quantidade: 0 } });

    const ultimasVendas = await prisma.venda.findMany({
      take: 10,
      include: { cliente: true, usuario: true },
      orderBy: { createdAt: 'desc' }
    });

    const produtosMaisVendidos = await prisma.itemVenda.groupBy({
      by: ['produtoId'],
      _sum: { quantidade: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5
    });
    const produtosVendidos = [];
    for (const item of produtosMaisVendidos) {
      const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      produtosVendidos.push({ produto, total: item._sum.total });
    }

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const vendasMes = await prisma.venda.findMany({
      where: { createdAt: { gte: inicioMes }, status: 'CONCLUIDA' }
    });
    const lucroMensal = vendasMes.reduce((acc, v) => acc + Number(v.total) * 0.3, 0);
    const lucroDiario = totalVendidoHoje * 0.3;

    res.json({
      totalVendidoHoje,
      caixaAberto: caixaAberto ? { id: caixaAberto.id, valorAbertura: caixaAberto.valorAbertura } : null,
      totalProdutos,
      totalClientes,
      estoqueBaixo: estoqueBaixoFiltrado.length,
      semEstoque,
      ultimasVendas,
      produtosMaisVendidos: produtosVendidos,
      lucroDiario,
      lucroMensal
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
