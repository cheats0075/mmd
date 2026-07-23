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
    const produtos = await prisma.produto.findMany({
      where: { quantidade: { lte: prisma.produto.fields.estoqueMinimo } },
      include: { categoria: true }
    });
    res.json(produtos);
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

module.exports = router;
