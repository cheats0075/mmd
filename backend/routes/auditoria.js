const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', adminOnly, async (req, res) => {
  try {
    const { dataInicio, dataFim, usuarioId, acao } = req.query;
    const where = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    if (usuarioId) where.usuarioId = parseInt(usuarioId);
    if (acao) where.acao = acao;
    const auditorias = await prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { nome: true, usuario: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json(auditorias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar auditorias' });
  }
});

module.exports = router;
