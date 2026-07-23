require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuarios');
const clienteRoutes = require('./routes/clientes');
const produtoRoutes = require('./routes/produtos');
const categoriaRoutes = require('./routes/categorias');
const fornecedorRoutes = require('./routes/fornecedores');
const estoqueRoutes = require('./routes/estoque');
const vendaRoutes = require('./routes/vendas');
const caixaRoutes = require('./routes/caixa');
const financeiroRoutes = require('./routes/financeiro');
const relatorioRoutes = require('./routes/relatorios');
const configuracaoRoutes = require('./routes/configuracoes');
const auditoriaRoutes = require('./routes/auditoria');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/login', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function createAdminUser() {
  try {
    const existing = await prisma.usuario.findUnique({ where: { usuario: 'admin' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.usuario.create({
        data: {
          nome: 'Administrador',
          usuario: 'admin',
          senha: hashedPassword,
          cargo: 'ADMIN',
          permissoes: { all: true },
          primeiroLogin: true
        }
      });
      console.log('Usuário admin criado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error.message);
  }
}

async function createDefaultConfig() {
  try {
    const configs = [
      { chave: 'nome_empresa', valor: 'SuperMercado' },
      { chave: 'cnpj', valor: '' },
      { chave: 'telefone', valor: '' },
      { chave: 'email', valor: '' },
      { chave: 'endereco', valor: '' },
      { chave: 'imposto_padrao', valor: '17.5' },
      { chave: 'cupom_texto', valor: 'Obrigado pela preferência!' }
    ];
    for (const config of configs) {
      const exists = await prisma.configuracao.findUnique({ where: { chave: config.chave } });
      if (!exists) {
        await prisma.configuracao.create({ data: config });
      }
    }
  } catch (error) {
    console.error('Erro ao criar configurações:', error.message);
  }
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await createAdminUser();
  await createDefaultConfig();
});

module.exports = app;
