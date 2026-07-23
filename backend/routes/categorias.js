const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { nome: 'asc' } });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.post('/', async (req, res) => {
  try {
    const categoria = await prisma.categoria.create({ data: req.body });
    res.status(201).json(categoria);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Categoria já existe' });
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const categoria = await prisma.categoria.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.categoria.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;
