const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Populando banco de dados...');

  const adminExists = await prisma.usuario.findUnique({ where: { usuario: 'admin' } });
  if (!adminExists) {
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
    console.log('Usuário admin criado!');
  }

  const categorias = [
    { nome: 'Alimentos', descricao: 'Produtos alimentícios em geral' },
    { nome: 'Bebidas', descricao: 'Bebidas alcoólicas e não alcoólicas' },
    { nome: 'Higiene', descricao: 'Produtos de higiene pessoal' },
    { nome: 'Limpeza', descricao: 'Produtos de limpeza doméstica' },
    { nome: 'Padaria', descricao: 'Produtos de padaria e confeitaria' },
    { nome: 'Açougue', descricao: 'Carnes e derivados' },
    { nome: 'Hortifruti', descricao: 'Frutas, legumes e verduras' },
    { nome: 'Laticínios', descricao: 'Leite, queijos e derivados' },
    { nome: 'Congelados', descricao: 'Produtos congelados' },
    { nome: 'Mercearia', descricao: 'Produtos de mercearia seca' }
  ];

  for (const cat of categorias) {
    const exists = await prisma.categoria.findUnique({ where: { nome: cat.nome } });
    if (!exists) await prisma.categoria.create({ data: cat });
  }
  console.log('Categorias criadas!');

  const fornecedores = [
    { razaoSocial: 'Distribuidora Alimentos SA', nomeFantasia: 'Dist. Alimentos', cnpj: '12345678000190', telefone: '(11) 3333-4444', email: 'contato@distalimentos.com.br', cidade: 'São Paulo', estado: 'SP' },
    { razaoSocial: 'Bebidas Premium LTDA', nomeFantasia: 'Bebidas Premium', cnpj: '98765432000110', telefone: '(21) 2222-3333', email: 'vendas@bebidaspremium.com.br', cidade: 'Rio de Janeiro', estado: 'RJ' }
  ];

  for (const f of fornecedores) {
    const exists = await prisma.fornecedor.findUnique({ where: { cnpj: f.cnpj } });
    if (!exists) await prisma.fornecedor.create({ data: f });
  }
  console.log('Fornecedores criados!');

  const config = [
    { chave: 'nome_empresa', valor: 'SuperMercado' },
    { chave: 'cnpj', valor: '12.345.678/0001-90' },
    { chave: 'telefone', valor: '(11) 1234-5678' },
    { chave: 'email', valor: 'contato@supermercado.com.br' },
    { chave: 'endereco', valor: 'Rua Principal, 123 - Centro - São Paulo/SP' },
    { chave: 'imposto_padrao', valor: '17.5' },
    { chave: 'cupom_texto', valor: 'Obrigado pela preferência! Volte sempre!' }
  ];

  for (const c of config) {
    const exists = await prisma.configuracao.findUnique({ where: { chave: c.chave } });
    if (!exists) await prisma.configuracao.create({ data: c });
  }
  console.log('Configurações criadas!');

  console.log('Seed concluído com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
