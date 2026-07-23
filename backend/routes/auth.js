const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middlewares/auth');

const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const user = await prisma.usuario.findUnique({ where: { usuario } });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    if (user.status !== 'ATIVO') {
      return res.status(401).json({ error: 'Conta desativada' });
    }
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, cargo: user.cargo, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    await prisma.auditoria.create({
      data: { acao: 'LOGIN', tabela: 'usuarios', registroId: user.id, usuarioId: user.id, ip: req.ip }
    });
    res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        usuario: user.usuario,
        cargo: user.cargo,
        primeiroLogin: user.primeiroLogin,
        foto: user.foto
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/alterar-senha', authMiddleware, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const user = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
    const validPassword = await bcrypt.compare(senhaAtual, user.senha);
    if (!validPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { senha: hashedPassword, primeiroLogin: false }
    });
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

router.post('/recuperar-senha', async (req, res) => {
  try {
    const { usuario, email } = req.body;
    const user = await prisma.usuario.findUnique({ where: { usuario } });
    if (!user || user.email !== email) {
      return res.json({ message: 'Se os dados estiverem corretos, você receberá um email.' });
    }
    res.json({ message: 'Se os dados estiverem corretos, você receberá um email.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao recuperar senha' });
  }
});

module.exports = router;
