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
        { nome: { contains: search, mode: 'insensitive' } },
        { cpfCnpj: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    const clientes = await prisma.cliente.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

router.get('/:id/compras', async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: { clienteId: parseInt(req.params.id) },
      include: { itens: { include: { produto: true } }, pagamentos: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar compras' });
  }
});

router.post('/', async (req, res) => {
  try {
    const cliente = await prisma.cliente.create({ data: req.body });
    res.status(201).json(cliente);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const cliente = await prisma.cliente.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.cliente.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

module.exports = router;
