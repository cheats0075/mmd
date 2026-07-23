const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, telefone: true, usuario: true, cargo: true, status: true, createdAt: true }
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, nome: true, email: true, telefone: true, usuario: true, cargo: true, status: true, foto: true, createdAt: true }
    });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { nome, email, telefone, usuario, senha, cargo, permissoes } = req.body;
    const hashedPassword = await bcrypt.hash(senha || '123456', 10);
    const novoUsuario = await prisma.usuario.create({
      data: { nome, email, telefone, usuario, senha: hashedPassword, cargo: cargo || 'CAIXA', permissoes }
    });
    res.status(201).json({ id: novoUsuario.id, nome: novoUsuario.nome, usuario: novoUsuario.usuario });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Usuário já existe' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { nome, email, telefone, cargo, status, permissoes } = req.body;
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(req.params.id) },
      data: { nome, email, telefone, cargo, status, permissoes }
    });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await prisma.usuario.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
