const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const caixas = await prisma.caixa.findMany({
      include: { usuario: true, vendas: true, sangrias: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(caixas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar caixas' });
  }
});

router.get('/aberto', async (req, res) => {
  try {
    const caixa = await prisma.caixa.findFirst({
      where: { status: 'ABERTO' },
      include: { usuario: true, vendas: true, sangrias: true }
    });
    res.json(caixa);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar caixa aberto' });
  }
});

router.post('/abrir', async (req, res) => {
  try {
    const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
    if (caixaAberto) return res.status(400).json({ error: 'Já existe um caixa aberto' });
    const { numero, valorAbertura } = req.body;
    const caixa = await prisma.caixa.create({
      data: {
        numero,
        valorAbertura: valorAbertura || 0,
        status: 'ABERTO',
        dataAbertura: new Date(),
        usuarioId: req.usuario.id
      }
    });
    res.status(201).json(caixa);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
});

router.post('/fechar', async (req, res) => {
  try {
    const caixa = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
    if (!caixa) return res.status(400).json({ error: 'Nenhum caixa aberto' });
    const totalVendas = caixa.vendas?.reduce((acc, v) => acc + Number(v.total), 0) || 0;
    const totalSangrias = caixa.sangrias?.filter(s => s.tipo === 'SANGRIA').reduce((acc, s) => acc + Number(s.valor), 0) || 0;
    const totalSuprimentos = caixa.sangrias?.filter(s => s.tipo === 'SUPRIMENTO').reduce((acc, s) => acc + Number(s.valor), 0) || 0;
    const valorFechamento = Number(caixa.valorAbertura) + totalVendas - totalSangrias + totalSuprimentos;
    const caixaAtualizado = await prisma.caixa.update({
      where: { id: caixa.id },
      data: { status: 'FECHADO', dataFechamento: new Date(), valorFechamento }
    });
    res.json(caixaAtualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
});

router.post('/sangria', async (req, res) => {
  try {
    const caixa = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
    if (!caixa) return res.status(400).json({ error: 'Nenhum caixa aberto' });
    const { tipo, valor, motivo } = req.body;
    const sangria = await prisma.sangria.create({
      data: { caixaId: caixa.id, tipo, valor, motivo, usuarioId: req.usuario.id }
    });
    res.status(201).json(sangria);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar sangria' });
  }
});

module.exports = router;
