const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where = search ? {
      OR: [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } }
      ]
    } : {};
    const fornecedores = await prisma.fornecedor.findMany({ where, orderBy: { razaoSocial: 'asc' } });
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const fornecedor = await prisma.fornecedor.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fornecedor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const fornecedor = await prisma.fornecedor.create({ data: req.body });
    res.status(201).json(fornecedor);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'CNPJ já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const fornecedor = await prisma.fornecedor.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.fornecedor.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Fornecedor excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir fornecedor' });
  }
});

module.exports = router;
