const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { produtoId, tipo } = req.query;
    const where = {};
    if (produtoId) where.produtoId = parseInt(produtoId);
    if (tipo) where.tipo = tipo;
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where,
      include: { produto: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar movimentações' });
  }
});

router.get('/baixos', async (req, res) => {
  try {
    const todos = await prisma.produto.findMany({ include: { categoria: true } });
    const baixos = todos.filter(p => Number(p.quantidade) <= Number(p.estoqueMinimo) && Number(p.quantidade) > 0);
    res.json(baixos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estoque baixo' });
  }
});

router.get('/sem-estoque', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { quantidade: 0 },
      include: { categoria: true }
    });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos sem estoque' });
  }
});

router.post('/entrada', async (req, res) => {
  try {
    const { produtoId, quantidade, motivo, documento } = req.body;
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    await prisma.produto.update({
      where: { id: produtoId },
      data: { quantidade: { increment: quantidade } }
    });
    const movimentacao = await prisma.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'ENTRADA', quantidade, motivo, documento, usuarioId: req.usuario.id }
    });
    res.status(201).json(movimentacao);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar entrada' });
  }
});

router.post('/saida', async (req, res) => {
  try {
    const { produtoId, quantidade, motivo, documento } = req.body;
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    if (produto.quantidade < quantidade) return res.status(400).json({ error: 'Estoque insuficiente' });
    await prisma.produto.update({
      where: { id: produtoId },
      data: { quantidade: { decrement: quantidade } }
    });
    const movimentacao = await prisma.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'SAIDA', quantidade, motivo, documento, usuarioId: req.usuario.id }
    });
    res.status(201).json(movimentacao);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar saída' });
  }
});

router.post('/ajuste', async (req, res) => {
  try {
    const { produtoId, quantidade, motivo } = req.body;
    await prisma.produto.update({
      where: { id: produtoId },
      data: { quantidade }
    });
    const movimentacao = await prisma.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'AJUSTE', quantidade, motivo, usuarioId: req.usuario.id }
    });
    res.status(201).json(movimentacao);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar ajuste' });
  }
});

// Rota de Inventário/Conferência
router.get('/inventario', async (req, res) => {
  try {
    const { categoriaId, status, busca } = req.query;
    const where = {};
    
    if (categoriaId) where.categoriaId = parseInt(categoriaId);
    if (status) where.status = status;
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { codigoBarras: { contains: busca, mode: 'insensitive' } },
        { codigoInterno: { contains: busca, mode: 'insensitive' } }
      ];
    }

    const produtos = await prisma.produto.findMany({
      where,
      include: { 
        categoria: { select: { nome: true } },
        movimentacoes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { tipo: true, quantidade: true, createdAt: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const inventario = produtos.map(p => ({
      id: p.id,
      codigo: p.codigoBarras || p.codigoInterno || '-',
      nome: p.nome,
      categoria: p.categoria?.nome || '-',
      unidade: p.unidade,
      quantidadeAtual: Number(p.quantidade),
      estoqueMinimo: Number(p.estoqueMinimo),
      precoCusto: Number(p.precoCusto),
      precoVenda: Number(p.precoVenda),
      statusEstoque: Number(p.quantidade) === 0 ? 'SEM_ESTOQUE' : 
                     Number(p.quantidade) <= Number(p.estoqueMinimo) ? 'BAIXO' : 'OK',
      ultimaMovimentacao: p.movimentacoes[0] ? {
        tipo: p.movimentacoes[0].tipo,
        quantidade: Number(p.movimentacoes[0].quantidade),
        data: p.movimentacoes[0].createdAt
      } : null,
      valorTotalCusto: Number(p.quantidade) * Number(p.precoCusto),
      valorTotalVenda: Number(p.quantidade) * Number(p.precoVenda)
    }));

    // Resumo
    const resumo = {
      totalProdutos: inventario.length,
      totalItens: inventario.reduce((sum, p) => sum + p.quantidadeAtual, 0),
      estoqueBaixo: inventario.filter(p => p.statusEstoque === 'BAIXO').length,
      semEstoque: inventario.filter(p => p.statusEstoque === 'SEM_ESTOQUE').length,
      valorTotalCusto: inventario.reduce((sum, p) => sum + p.valorTotalCusto, 0),
      valorTotalVenda: inventario.reduce((sum, p) => sum + p.valorTotalVenda, 0)
    };

    res.json({ produtos: inventario, resumo });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar inventário' });
  }
});

module.exports = router;
