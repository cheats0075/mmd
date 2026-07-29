const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search, categoriaId } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search } },
        { codigoInterno: { contains: search } }
      ];
    }
    if (categoriaId) where.categoriaId = parseInt(categoriaId);
    const produtos = await prisma.produto.findMany({
      where,
      include: { categoria: true, fornecedor: true },
      orderBy: { nome: 'asc' }
    });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { categoria: true, fornecedor: true }
    });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { codigoBarras, codigoInterno, nome, categoriaId, marca, unidade, precoCusto, precoVenda, quantidade, estoqueMinimo, fornecedorId, validade, descricao, imagem, status } = req.body;
    const produto = await prisma.produto.create({
      data: { codigoBarras, codigoInterno, nome, categoriaId, marca, unidade, precoCusto, precoVenda, quantidade, estoqueMinimo, fornecedorId, validade, descricao, imagem, status }
    });
    res.status(201).json(produto);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Código de barras ou código interno já existe' });
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { codigoBarras, codigoInterno, nome, categoriaId, marca, unidade, precoCusto, precoVenda, quantidade, estoqueMinimo, fornecedorId, validade, descricao, imagem, status } = req.body;
    const produto = await prisma.produto.update({
      where: { id: parseInt(req.params.id) },
      data: { codigoBarras, codigoInterno, nome, categoriaId, marca, unidade, precoCusto, precoVenda, quantidade, estoqueMinimo, fornecedorId, validade, descricao, imagem, status }
    });
    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.produto.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

module.exports = router;
