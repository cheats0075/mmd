# SuperMercado - Sistema de Gestão

Sistema completo de gerenciamento para supermercado, moderno, responsivo e profissional.

## Funcionalidades

- **Login** com JWT e bcrypt
- **Dashboard** com indicadores em tempo real
- **PDV** (Frente de Caixa) com código de barras
- **Cadastro de Produtos** com CRUD completo
- **Controle de Estoque** (entradas, saídas, ajustes)
- **Cadastro de Clientes**
- **Cadastro de Fornecedores**
- **Controle de Usuários** com permissões
- **Gerenciamento de Caixa** (abrir, fechar, sangria)
- **Módulo Financeiro** (contas a pagar/receber, fluxo de caixa)
- **Relatórios** (vendas, estoque, lucro, financeiro)
- **Auditoria** completa
- **Configurações** da empresa
- **Tema claro e escuro**

## Tecnologias

### Frontend
- HTML5
- CSS3
- JavaScript ES6
- Bootstrap 5
- Bootstrap Icons
- Chart.js

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT
- bcrypt

## Estrutura

```
supermercado/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── routes/
│   │   ├── auth.js
│   │   ├── usuarios.js
│   │   ├── clientes.js
│   │   ├── produtos.js
│   │   ├── categorias.js
│   │   ├── fornecedores.js
│   │   ├── estoque.js
│   │   ├── vendas.js
│   │   ├── caixa.js
│   │   ├── financeiro.js
│   │   ├── relatorios.js
│   │   ├── configuracoes.js
│   │   ├── auditoria.js
│   │   └── dashboard.js
│   ├── middlewares/
│   │   └── auth.js
│   └── prisma/
│       ├── schema.prisma
│       └── seed.js
└── README.md
```

## Instalação

### Backend

```bash
cd backend
npm install
```

### Configurar .env

```
PORT=3000
DATABASE_URL="postgresql://usuario:senha@localhost:5432/supermercado"
JWT_SECRET=sua_chave_secreta
ADMIN_USER=admin
ADMIN_PASSWORD=admin
```

### Banco de Dados

```bash
npx prisma db push
npx prisma generate
node prisma/seed.js
```

### Iniciar Backend

```bash
npm start
```

### Frontend

Abra o `index.html` no navegador ou hospede no GitHub Pages.

## Usuário Padrão

- **Usuário:** admin
- **Senha:** admin

> No primeiro login, será obrigatório alterar a senha.

## API

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/login` | POST | Login |
| `/api/usuarios` | GET/POST/PUT/DELETE | Usuários |
| `/api/clientes` | GET/POST/PUT/DELETE | Clientes |
| `/api/produtos` | GET/POST/PUT/DELETE | Produtos |
| `/api/categorias` | GET/POST/PUT/DELETE | Categorias |
| `/api/fornecedores` | GET/POST/PUT/DELETE | Fornecedores |
| `/api/estoque` | GET/POST | Estoque |
| `/api/vendas` | GET/POST | Vendas |
| `/api/caixa` | GET/POST | Caixa |
| `/api/financeiro` | GET/POST/PUT/DELETE | Financeiro |
| `/api/relatorios` | GET | Relatórios |
| `/api/configuracoes` | GET/PUT | Configurações |
| `/api/auditoria` | GET | Auditoria |
| `/api/dashboard` | GET | Dashboard |

## Hospedagem

- **Frontend:** GitHub Pages
- **Backend:** Render
- **Banco de Dados:** PostgreSQL no Render

## Licença

MIT
