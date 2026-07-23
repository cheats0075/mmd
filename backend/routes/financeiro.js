const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/contas-pagar', async (req, res) => {
  try {
    const contas = await prisma.contaPagar.findMany({ orderBy: { dataVencimento: 'asc' } });
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contas a pagar' });
  }
});

router.post('/contas-pagar', async (req, res) => {
  try {
    const conta = await prisma.contaPagar.create({ data: req.body });
    res.status(201).json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.put('/contas-pagar/:id', async (req, res) => {
  try {
    const conta = await prisma.contaPagar.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

router.post('/contas-pagar/:id/pagar', async (req, res) => {
  try {
    const conta = await prisma.contaPagar.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PAGA', dataPagamento: new Date() }
    });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao pagar conta' });
  }
});

router.delete('/contas-pagar/:id', async (req, res) => {
  try {
    await prisma.contaPagar.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

router.get('/contas-receber', async (req, res) => {
  try {
    const contas = await prisma.contaReceber.findMany({ orderBy: { dataVencimento: 'asc' } });
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contas a receber' });
  }
});

router.post('/contas-receber', async (req, res) => {
  try {
    const conta = await prisma.contaReceber.create({ data: req.body });
    res.status(201).json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.put('/contas-receber/:id', async (req, res) => {
  try {
    const conta = await prisma.contaReceber.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

router.post('/contas-receber/:id/receber', async (req, res) => {
  try {
    const conta = await prisma.contaReceber.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'RECEBIDA', dataPagamento: new Date() }
    });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao receber conta' });
  }
});

router.delete('/contas-receber/:id', async (req, res) => {
  try {
    await prisma.contaReceber.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

router.get('/fluxo-caixa', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const where = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    const vendas = await prisma.venda.findMany({ where: { ...where, status: 'CONCLUIDA' } });
    const contasPagar = await prisma.contaPagar.findMany({ where: { ...where, status: 'PAGA' } });
    const contasReceber = await prisma.contaReceber.findMany({ where: { ...where, status: 'RECEBIDA' } });
    const totalVendas = vendas.reduce((acc, v) => acc + Number(v.total), 0);
    const totalPagar = contasPagar.reduce((acc, c) => acc + Number(c.valor), 0);
    const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0);
    res.json({ totalVendas, totalPagar, totalReceber, saldo: totalVendas + totalReceber - totalPagar });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fluxo de caixa' });
  }
});

module.exports = router;
