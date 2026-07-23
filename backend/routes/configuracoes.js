const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configObj = {};
    configs.forEach(c => { configObj[c.chave] = c.valor; });
    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    for (const [chave, valor] of Object.entries(updates)) {
      await prisma.configuracao.upsert({
        where: { chave },
        update: { valor },
        create: { chave, valor }
      });
    }
    res.json({ message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

module.exports = router;
