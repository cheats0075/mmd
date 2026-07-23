const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://supermercado-api-ox6c.onrender.com/api';

let token = localStorage.getItem('token');
let currentUser = null;
let carrinho = [];
let chartVendas = null;

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    currentUser = JSON.parse(localStorage.getItem('usuario'));
    if (currentUser) {
      if (currentUser.primeiroLogin) {
        showSenhaScreen();
      } else {
        showApp();
      }
    } else {
      logout();
    }
  }
  initEventListeners();
});

// PDV CLOCK
function updatePDVClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR');
  const date = now.toLocaleDateString('pt-BR');
  const clockEl = document.getElementById('pdv-clock');
  const horaEl = document.getElementById('pdv-hora');
  if (clockEl) clockEl.textContent = time;
  if (horaEl) horaEl.textContent = `${date} - ${time}`;
}

setInterval(updatePDVClock, 1000);

// PDV PAYMENT SELECTION
let pagamentoAtual = 'DINHEIRO';

function selectPagamento(tipo, btn) {
  pagamentoAtual = tipo;
  document.getElementById('pdv-pagamento').value = tipo;
  document.querySelectorAll('.pdv-pay-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  toggleTroco();
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
  if (!currentUser) return;
  const pdvPage = document.getElementById('page-pdv');
  if (!pdvPage || !pdvPage.classList.contains('active')) return;

  if (e.key === 'F1') {
    e.preventDefault();
    document.getElementById('pdv-busca').focus();
  }
  if (e.key === 'F9') {
    e.preventDefault();
    finalizarVenda();
  }
  if (e.key === 'Escape') {
    cancelarVenda();
  }
});

function initEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('senha-form').addEventListener('submit', handleAlterarSenha);
  document.getElementById('link-recuperar').addEventListener('click', handleRecuperarSenha);
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('btn-minha-conta').addEventListener('click', () => navigateTo('minha-conta'));

  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  document.getElementById('form-config').addEventListener('submit', saveConfig);
  document.getElementById('form-conta').addEventListener('submit', saveMinhaConta);

  document.getElementById('busca-produtos').addEventListener('input', loadProdutos);
  document.getElementById('busca-clientes').addEventListener('input', loadClientes);
  document.getElementById('busca-fornecedores').addEventListener('input', loadFornecedores);

  document.getElementById('pdv-busca').addEventListener('input', searchProdutoPDV);
  document.getElementById('pdv-busca-btn').addEventListener('click', searchProdutoPDV);
  document.getElementById('pdv-desconto').addEventListener('input', updatePDVTotals);
  document.getElementById('pdv-recebido').addEventListener('input', updatePDVTroco);
  document.getElementById('pdv-finalizar').addEventListener('click', finalizarVenda);
  document.getElementById('pdv-cancelar').addEventListener('click', cancelarVenda);

  document.getElementById('btn-novo-produto').addEventListener('click', () => openProdutoModal());
  document.getElementById('btn-novo-cliente').addEventListener('click', () => openClienteModal());
  document.getElementById('btn-novo-fornecedor').addEventListener('click', () => openFornecedorModal());
  document.getElementById('btn-novo-funcionario').addEventListener('click', () => openFuncionarioModal());
  document.getElementById('btn-nova-conta-pagar').addEventListener('click', () => openContaModal('pagar'));
  document.getElementById('btn-nova-conta-receber').addEventListener('click', () => openContaModal('receber'));
  document.getElementById('btn-abrir-caixa').addEventListener('click', abrirCaixa);
  document.getElementById('btn-fechar-caixa').addEventListener('click', fecharCaixa);
  document.getElementById('btn-sangria').addEventListener('click', openSangriaModal);
  document.getElementById('btn-entrada-estoque').addEventListener('click', () => openEstoqueModal('ENTRADA'));
  document.getElementById('btn-saida-estoque').addEventListener('click', () => openEstoqueModal('SAIDA'));
  document.getElementById('btn-ajuste-estoque').addEventListener('click', () => openEstoqueModal('AJUSTE'));
}

// API HELPERS
function resetModalButton() {
  const btn = document.getElementById('modal-save');
  btn.disabled = false;
  btn.textContent = 'Salvar';
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (response.status === 401) { logout(); return null; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  } catch (error) {
    showToast(error.message, 'danger');
    throw error;
  }
}

// AUTH
async function handleLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('login-usuario').value;
  const senha = document.getElementById('login-senha').value;
  try {
    const data = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    }).then(r => r.json());
    if (data.error) {
      document.getElementById('login-erro').textContent = data.error;
      document.getElementById('login-erro').classList.remove('d-none');
      return;
    }
    token = data.token;
    currentUser = data.usuario;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(currentUser));
    if (currentUser.primeiroLogin) {
      showSenhaScreen();
    } else {
      showApp();
    }
  } catch (error) {
    document.getElementById('login-erro').textContent = 'Erro ao conectar ao servidor';
    document.getElementById('login-erro').classList.remove('d-none');
  }
}

async function handleAlterarSenha(e) {
  e.preventDefault();
  const atual = document.getElementById('senha-atual').value;
  const nova = document.getElementById('nova-senha').value;
  const confirmar = document.getElementById('confirmar-senha').value;
  if (nova !== confirmar) { showToast('As senhas não conferem', 'danger'); return; }
  try {
    await api('/login/alterar-senha', {
      method: 'POST',
      body: JSON.stringify({ senhaAtual: atual, novaSenha: nova })
    });
    currentUser.primeiroLogin = false;
    localStorage.setItem('usuario', JSON.stringify(currentUser));
    showToast('Senha alterada com sucesso!', 'success');
    showApp();
  } catch (error) {}
}

function handleRecuperarSenha(e) {
  e.preventDefault();
  const usuario = prompt('Digite seu usuário:');
  const email = prompt('Digite seu email:');
  if (usuario && email) {
    fetch(`${API_URL}/login/recuperar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, email })
    }).then(() => showToast('Se os dados estiverem corretos, você receberá um email.', 'info'));
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  document.getElementById('login-screen').classList.remove('d-none');
  document.getElementById('senha-screen').classList.add('d-none');
  document.getElementById('app').classList.add('d-none');
  document.getElementById('login-usuario').value = '';
  document.getElementById('login-senha').value = '';
  document.getElementById('login-erro').classList.add('d-none');
}

function showSenhaScreen() {
  document.getElementById('login-screen').classList.add('d-none');
  document.getElementById('senha-screen').classList.remove('d-none');
  document.getElementById('app').classList.add('d-none');
}

function showApp() {
  document.getElementById('login-screen').classList.add('d-none');
  document.getElementById('senha-screen').classList.add('d-none');
  document.getElementById('app').classList.remove('d-none');
  document.getElementById('user-name').textContent = currentUser.nome;
  const pdvOperator = document.getElementById('pdv-operator');
  if (pdvOperator) pdvOperator.textContent = currentUser.nome;
  updatePDVClock();
  loadDashboard();
  toggleTroco();
}

// NAVIGATION
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add('active');

  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'produtos': loadProdutos(); break;
    case 'estoque': loadEstoque(); break;
    case 'clientes': loadClientes(); break;
    case 'fornecedores': loadFornecedores(); break;
    case 'funcionarios': loadFuncionarios(); break;
    case 'caixa': loadCaixa(); break;
    case 'financeiro': loadFinanceiro(); break;
    case 'relatorios': break;
    case 'configuracoes': loadConfig(); break;
    case 'auditoria': loadAuditoria(); break;
    case 'minha-conta': loadMinhaConta(); break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('main-content').classList.toggle('expanded');
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const icon = document.querySelector('#btn-theme-toggle i');
  icon.className = next === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
}

// TOAST
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const body = document.getElementById('toast-body');
  body.textContent = message;
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// DASHBOARD
async function loadDashboard() {
  try {
    const data = await api('/dashboard');
    document.getElementById('stat-vendas').textContent = `R$ ${data.totalVendidoHoje.toFixed(2).replace('.', ',')}`;
    document.getElementById('stat-caixa').textContent = data.caixaAberto ? `Aberto (R$ ${Number(data.caixaAberto.valorAbertura).toFixed(2).replace('.', ',')})` : 'Fechado';
    document.getElementById('stat-produtos').textContent = data.totalProdutos;
    document.getElementById('stat-clientes').textContent = data.totalClientes;
    document.getElementById('stat-estoque-baixo').textContent = data.estoqueBaixo;
    document.getElementById('stat-sem-estoque').textContent = data.semEstoque;
    document.getElementById('stat-lucro-diario').textContent = `R$ ${data.lucroDiario.toFixed(2).replace('.', ',')}`;
    document.getElementById('stat-lucro-mensal').textContent = `R$ ${data.lucroMensal.toFixed(2).replace('.', ',')}`;

    const vendasTbody = document.getElementById('dashboard-vendas');
    vendasTbody.innerHTML = data.ultimasVendas.map(v =>
      `<tr><td>#${v.id}</td><td>${v.cliente?.nome || 'Consumidor Final'}</td><td>R$ ${Number(v.total).toFixed(2).replace('.', ',')}</td><td>${new Date(v.createdAt).toLocaleString('pt-BR')}</td></tr>`
    ).join('') || '<tr><td colspan="4" class="text-center text-muted">Nenhuma venda hoje</td></tr>';

    const maisVendidos = document.getElementById('dashboard-mais-vendidos');
    maisVendidos.innerHTML = data.produtosMaisVendidos.map(p =>
      `<div class="d-flex justify-content-between mb-2"><span>${p.produto?.nome || 'N/A'}</span><span class="badge bg-primary">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</span></div>`
    ).join('') || '<p class="text-muted">Nenhum dado</p>';
  } catch (error) {}
}

// PDV
async function searchProdutoPDV() {
  const busca = document.getElementById('pdv-busca').value;
  if (busca.length < 2) { document.getElementById('pdv-resultados').innerHTML = ''; return; }
  try {
    const produtos = await api(`/produtos?search=${encodeURIComponent(busca)}`);
    const html = produtos.map(p =>
      `<div class="pdv-result-item" onclick="adicionarAoCarrinho(${p.id}, '${p.nome.replace(/'/g, "\\'")}', ${p.precoVenda}, ${p.quantidade})">
        <div>
          <div class="pdv-result-name">${p.nome}</div>
          <div class="pdv-result-code">${p.codigoBarras || p.codigoInterno || ''}</div>
        </div>
        <div style="text-align:right">
          <div class="pdv-result-price">R$ ${Number(p.precoVenda).toFixed(2).replace('.', ',')}</div>
          <div class="pdv-result-stock">Est: ${p.quantidade}</div>
        </div>
      </div>`
    ).join('');
    document.getElementById('pdv-resultados').innerHTML = html;
  } catch (error) {}
}

function adicionarAoCarrinho(id, nome, preco, estoque) {
  const item = carrinho.find(i => i.produtoId === id);
  if (item) {
    if (item.quantidade >= estoque) { showToast('Estoque insuficiente', 'warning'); return; }
    item.quantidade++;
  } else {
    if (estoque <= 0) { showToast('Produto sem estoque', 'warning'); return; }
    carrinho.push({ produtoId: id, nome, precoUnit: preco, quantidade: 1, desconto: 0 });
  }
  updateCarrinho();
  document.getElementById('pdv-busca').value = '';
  document.getElementById('pdv-resultados').innerHTML = '';
  showToast(`${nome} adicionado ao carrinho`, 'success');
}

function updateCarrinho() {
  const tbody = document.getElementById('pdv-carrinho');
  const itemCount = document.getElementById('pdv-item-count');

  if (carrinho.length === 0) {
    tbody.innerHTML = `
      <tr class="pdv-empty-row">
        <td colspan="7">
          <i class="bi bi-cart-x"></i>
          <p>Carrinho vazio</p>
          <small>Busque um produto para adicionar</small>
        </td>
      </tr>`;
    if (itemCount) itemCount.textContent = '0';
  } else {
    tbody.innerHTML = carrinho.map((item, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:left;font-weight:600">${item.nome}</td>
        <td><input type="number" value="${item.quantidade}" min="1" onchange="alterarQtdCarrinho(${idx}, this.value)"></td>
        <td>R$ ${item.precoUnit.toFixed(2).replace('.', ',')}</td>
        <td><input type="number" value="${item.desconto}" min="0" step="0.01" onchange="alterarDescCarrinho(${idx}, this.value)" style="width:70px"></td>
        <td style="font-weight:700;color:#22c55e">R$ ${((item.precoUnit * item.quantidade) - item.desconto).toFixed(2).replace('.', ',')}</td>
        <td><button class="pdv-btn-remove" onclick="removerItemCarrinho(${idx})"><i class="bi bi-trash-fill"></i></button></td>
      </tr>`
    ).join('');
    if (itemCount) itemCount.textContent = carrinho.length;
  }
  updatePDVTotals();
}

function alterarQtdCarrinho(idx, val) {
  carrinho[idx].quantidade = parseInt(val) || 1;
  updateCarrinho();
}

function alterarDescCarrinho(idx, val) {
  carrinho[idx].desconto = parseFloat(val) || 0;
  updateCarrinho();
}

function removerItemCarrinho(idx) {
  carrinho.splice(idx, 1);
  updateCarrinho();
}

function updatePDVTotals() {
  const subtotal = carrinho.reduce((acc, item) => acc + (item.precoUnit * item.quantidade), 0);
  const desconto = parseFloat(document.getElementById('pdv-desconto').value) || 0;
  const total = subtotal - desconto;
  document.getElementById('pdv-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('pdv-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  updatePDVTroco();
}

function updatePDVTroco() {
  const total = parseFloat(document.getElementById('pdv-total').textContent.replace('R$', '').replace(',', '.')) || 0;
  const recebido = parseFloat(document.getElementById('pdv-recebido').value) || 0;
  const troco = recebido - total;
  document.getElementById('pdv-troco').textContent = `R$ ${troco.toFixed(2).replace('.', ',')}`;
}

function toggleTroco() {
  const trocoGroup = document.getElementById('pdv-troco-group');
  if (pagamentoAtual === 'DINHEIRO') {
    trocoGroup.style.display = 'block';
  } else {
    trocoGroup.style.display = 'none';
  }
}

async function finalizarVenda() {
  if (carrinho.length === 0) { showToast('Carrinho vazio', 'warning'); return; }
  const total = parseFloat(document.getElementById('pdv-total').textContent.replace('R$', '').replace(',', '.')) || 0;
  const recebido = parseFloat(document.getElementById('pdv-recebido').value) || 0;
  if (pagamentoAtual === 'DINHEIRO' && recebido < total) {
    showToast('Valor recebido insuficiente', 'warning');
    return;
  }
  try {
    const result = await api('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        itens: carrinho.map(item => ({ produtoId: item.produtoId, quantidade: item.quantidade, precoUnit: item.precoUnit, desconto: item.desconto })),
        pagamentos: [{ formaPagamento: pagamentoAtual, valor: recebido || total, troco: Math.max(0, recebido - total) }],
        desconto: parseFloat(document.getElementById('pdv-desconto').value) || 0
      })
    });
    const troco = Math.max(0, recebido - total);
    let cupomHtml = `
      <div style="font-family:monospace;text-align:center;max-width:400px;margin:0 auto;">
        <h5>Venda #${result.id} Concluída!</h5>
        <hr>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <hr>
        <table style="width:100%;font-size:14px;">
          <tr><th style="text-align:left;">Item</th><th>Qtd</th><th style="text-align:right;">Total</th></tr>
          ${carrinho.map(item => `<tr><td style="text-align:left;">${item.nome}</td><td>${item.quantidade}x</td><td style="text-align:right;">R$ ${((item.precoUnit * item.quantidade) - item.desconto).toFixed(2).replace('.', ',')}</td></tr>`).join('')}
        </table>
        <hr>
        <p><strong>Pagamento:</strong> ${pagamentoAtual}</p>
        <h4>TOTAL: R$ ${total.toFixed(2).replace('.', ',')}</h4>
        ${troco > 0 ? `<h5>Troco: R$ ${troco.toFixed(2).replace('.', ',')}</h5>` : ''}
        <hr>
        <p style="font-size:12px;">Obrigado pela preferência!</p>
      </div>
    `;
    document.getElementById('modal-title').textContent = 'Venda Finalizada';
    document.getElementById('modal-body').innerHTML = cupomHtml;
    document.getElementById('modal-save').style.display = 'none';
    new bootstrap.Modal(document.getElementById('modal')).show();
    document.querySelector('#modal .btn-close').addEventListener('click', () => {
      document.getElementById('modal-save').style.display = '';
    });
    showToast('Venda realizada com sucesso!', 'success');
    carrinho = [];
    document.getElementById('pdv-desconto').value = 0;
    document.getElementById('pdv-recebido').value = 0;
    updateCarrinho();
  } catch (error) {}
}

function cancelarVenda() {
  carrinho = [];
  document.getElementById('pdv-desconto').value = 0;
  document.getElementById('pdv-recebido').value = 0;
  updateCarrinho();
  showToast('Venda cancelada', 'info');
}

// PRODUTOS
async function loadProdutos() {
  try {
    const search = document.getElementById('busca-produtos')?.value || '';
    const produtos = await api(`/produtos?search=${encodeURIComponent(search)}`);
    const tbody = document.getElementById('tabela-produtos');
    tbody.innerHTML = produtos.map(p =>
      `<tr>
        <td>${p.codigoBarras || p.codigoInterno || '-'}</td>
        <td>${p.nome}</td>
        <td>${p.categoria?.nome || '-'}</td>
        <td>R$ ${Number(p.precoVenda).toFixed(2).replace('.', ',')}</td>
        <td>${p.quantidade}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="openProdutoModal(${p.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduto(${p.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`
    ).join('');
  } catch (error) {}
}

async function openProdutoModal(id = null) {
  resetModalButton();
  let produto = {};
  if (id) {
    produto = await api(`/produtos/${id}`);
  }
  const categorias = await api('/categorias');
  const fornecedores = await api('/fornecedores');
  document.getElementById('modal-title').textContent = id ? 'Editar Produto' : 'Novo Produto';
  document.getElementById('modal-body').innerHTML = `
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Código de Barras</label><input type="text" class="form-control" id="m-codigoBarras" value="${produto.codigoBarras || ''}"></div>
      <div class="col-md-6"><label class="form-label">Código Interno</label><input type="text" class="form-control" id="m-codigoInterno" value="${produto.codigoInterno || ''}"></div>
      <div class="col-md-12"><label class="form-label">Nome *</label><input type="text" class="form-control" id="m-nome" value="${produto.nome || ''}" required></div>
      <div class="col-md-6"><label class="form-label">Categoria</label><select class="form-select" id="m-categoria">${categorias.map(c => `<option value="${c.id}" ${produto.categoriaId == c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}</select></div>
      <div class="col-md-6"><label class="form-label">Fornecedor</label><select class="form-select" id="m-fornecedor"><option value="">Nenhum</option>${fornecedores.map(f => `<option value="${f.id}" ${produto.fornecedorId == f.id ? 'selected' : ''}>${f.nomeFantasia || f.razaoSocial}</option>`).join('')}</select></div>
      <div class="col-md-4"><label class="form-label">Marca</label><input type="text" class="form-control" id="m-marca" value="${produto.marca || ''}"></div>
      <div class="col-md-4"><label class="form-label">Unidade</label><input type="text" class="form-control" id="m-unidade" value="${produto.unidade || 'UN'}"></div>
      <div class="col-md-4"><label class="form-label">Validade</label><input type="date" class="form-control" id="m-validade" value="${produto.validade ? produto.validade.split('T')[0] : ''}"></div>
      <div class="col-md-3"><label class="form-label">Preço Custo</label><input type="number" class="form-control" id="m-precoCusto" value="${produto.precoCusto || 0}" step="0.01"></div>
      <div class="col-md-3"><label class="form-label">Preço Venda</label><input type="number" class="form-control" id="m-precoVenda" value="${produto.precoVenda || 0}" step="0.01"></div>
      <div class="col-md-3"><label class="form-label">Quantidade</label><input type="number" class="form-control" id="m-quantidade" value="${produto.quantidade || 0}"></div>
      <div class="col-md-3"><label class="form-label">Estoque Mínimo</label><input type="number" class="form-control" id="m-estoqueMinimo" value="${produto.estoqueMinimo || 0}"></div>
      <div class="col-md-12"><label class="form-label">Descrição</label><textarea class="form-control" id="m-descricao">${produto.descricao || ''}</textarea></div>
    </div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    const data = {
      codigoBarras: document.getElementById('m-codigoBarras').value || null,
      codigoInterno: document.getElementById('m-codigoInterno').value || null,
      nome: document.getElementById('m-nome').value,
      categoriaId: parseInt(document.getElementById('m-categoria').value) || null,
      fornecedorId: parseInt(document.getElementById('m-fornecedor').value) || null,
      marca: document.getElementById('m-marca').value || null,
      unidade: document.getElementById('m-unidade').value,
      validade: document.getElementById('m-validade').value || null,
      precoCusto: parseFloat(document.getElementById('m-precoCusto').value) || 0,
      precoVenda: parseFloat(document.getElementById('m-precoVenda').value) || 0,
      quantidade: parseInt(document.getElementById('m-quantidade').value) || 0,
      estoqueMinimo: parseInt(document.getElementById('m-estoqueMinimo').value) || 0,
      descricao: document.getElementById('m-descricao').value || null
    };
    if (!data.nome) { showToast('Nome é obrigatório', 'warning'); return; }
    if (id) {
      await api(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/produtos', { method: 'POST', body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadProdutos();
    showToast('Produto salvo com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

async function deleteProduto(id) {
  if (!confirm('Excluir este produto?')) return;
  await api(`/produtos/${id}`, { method: 'DELETE' });
  loadProdutos();
  showToast('Produto excluído', 'success');
}

// ESTOQUE
async function loadEstoque() {
  try {
    const movs = await api('/estoque');
    const tbody = document.getElementById('tabela-estoque');
    tbody.innerHTML = movs.map(m =>
      `<tr>
        <td>${new Date(m.createdAt).toLocaleString('pt-BR')}</td>
        <td>${m.produto?.nome || '-'}</td>
        <td><span class="badge ${m.tipo === 'ENTRADA' ? 'bg-success' : m.tipo === 'SAIDA' ? 'bg-danger' : 'bg-warning'}">${m.tipo}</span></td>
        <td>${m.quantidade}</td>
        <td>${m.motivo || '-'}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhuma movimentação</td></tr>';
  } catch (error) {}
}

async function openEstoqueModal(tipo) {
  const produtos = await api('/produtos');
  document.getElementById('modal-title').textContent = `Estoque - ${tipo}`;
  const optionsHtml = produtos.length > 0
    ? produtos.map(p => `<option value="${p.id}">${p.nome} (Est: ${p.quantidade})</option>`).join('')
    : '<option value="">Nenhum produto cadastrado</option>';
  document.getElementById('modal-body').innerHTML = `
    <div class="mb-3"><label class="form-label">Produto</label><select class="form-select" id="m-produto">${optionsHtml}</select></div>
    <div class="mb-3"><label class="form-label">Quantidade</label><input type="number" class="form-control" id="m-quantidade" min="1" value="1"></div>
    <div class="mb-3"><label class="form-label">Motivo</label><input type="text" class="form-control" id="m-motivo" placeholder="Ex: Compra, Devolução..."></div>
  `;
  if (produtos.length === 0) {
    document.getElementById('modal-save').disabled = true;
    document.getElementById('modal-save').textContent = 'Cadastre produtos primeiro';
  } else {
    document.getElementById('modal-save').disabled = false;
    document.getElementById('modal-save').textContent = 'Salvar';
    document.getElementById('modal-save').onclick = async () => {
      await api(`/estoque/${tipo.toLowerCase()}`, {
        method: 'POST',
        body: JSON.stringify({
          produtoId: parseInt(document.getElementById('m-produto').value),
          quantidade: parseInt(document.getElementById('m-quantidade').value),
          motivo: document.getElementById('m-motivo').value
        })
      });
      bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
      loadEstoque();
      showToast(`${tipo} registrada com sucesso!`, 'success');
    };
  }
  new bootstrap.Modal(document.getElementById('modal')).show();
}

// CLIENTES
async function loadClientes() {
  try {
    const search = document.getElementById('busca-clientes')?.value || '';
    const clientes = await api(`/clientes?search=${encodeURIComponent(search)}`);
    const tbody = document.getElementById('tabela-clientes');
    tbody.innerHTML = clientes.map(c =>
      `<tr>
        <td>${c.nome}</td>
        <td>${c.cpfCnpj || '-'}</td>
        <td>${c.telefone || c.celular || '-'}</td>
        <td>${c.email || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="openClienteModal(${c.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCliente(${c.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`
    ).join('');
  } catch (error) {}
}

async function openClienteModal(id = null) {
  resetModalButton();
  let cliente = {};
  if (id) cliente = await api(`/clientes/${id}`);
  document.getElementById('modal-title').textContent = id ? 'Editar Cliente' : 'Novo Cliente';
  document.getElementById('modal-body').innerHTML = `
    <div class="row g-3">
      <div class="col-md-12"><label class="form-label">Nome *</label><input type="text" class="form-control" id="m-nome" value="${cliente.nome || ''}" required></div>
      <div class="col-md-6"><label class="form-label">CPF/CNPJ</label><input type="text" class="form-control" id="m-cpfCnpj" value="${cliente.cpfCnpj || ''}"></div>
      <div class="col-md-6"><label class="form-label">Telefone</label><input type="text" class="form-control" id="m-telefone" value="${cliente.telefone || ''}"></div>
      <div class="col-md-6"><label class="form-label">Celular</label><input type="text" class="form-control" id="m-celular" value="${cliente.celular || ''}"></div>
      <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="m-email" value="${cliente.email || ''}"></div>
      <div class="col-md-6"><label class="form-label">Data Nascimento</label><input type="date" class="form-control" id="m-dataNascimento" value="${cliente.dataNascimento ? cliente.dataNascimento.split('T')[0] : ''}"></div>
      <div class="col-md-6"><label class="form-label">CEP</label><input type="text" class="form-control" id="m-cep" value="${cliente.cep || ''}"></div>
      <div class="col-md-8"><label class="form-label">Endereço</label><input type="text" class="form-control" id="m-endereco" value="${cliente.endereco || ''}"></div>
      <div class="col-md-4"><label class="form-label">Número</label><input type="text" class="form-control" id="m-numero" value="${cliente.numero || ''}"></div>
      <div class="col-md-4"><label class="form-label">Complemento</label><input type="text" class="form-control" id="m-complemento" value="${cliente.complemento || ''}"></div>
      <div class="col-md-4"><label class="form-label">Bairro</label><input type="text" class="form-control" id="m-bairro" value="${cliente.bairro || ''}"></div>
      <div class="col-md-4"><label class="form-label">Cidade</label><input type="text" class="form-control" id="m-cidade" value="${cliente.cidade || ''}"></div>
      <div class="col-md-2"><label class="form-label">UF</label><input type="text" class="form-control" id="m-estado" value="${cliente.estado || ''}" maxlength="2"></div>
      <div class="col-md-12"><label class="form-label">Observações</label><textarea class="form-control" id="m-observacoes">${cliente.observacoes || ''}</textarea></div>
    </div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    const data = {
      nome: document.getElementById('m-nome').value,
      cpfCnpj: document.getElementById('m-cpfCnpj').value || null,
      telefone: document.getElementById('m-telefone').value || null,
      celular: document.getElementById('m-celular').value || null,
      email: document.getElementById('m-email').value || null,
      dataNascimento: document.getElementById('m-dataNascimento').value || null,
      cep: document.getElementById('m-cep').value || null,
      endereco: document.getElementById('m-endereco').value || null,
      numero: document.getElementById('m-numero').value || null,
      complemento: document.getElementById('m-complemento').value || null,
      bairro: document.getElementById('m-bairro').value || null,
      cidade: document.getElementById('m-cidade').value || null,
      estado: document.getElementById('m-estado').value || null,
      observacoes: document.getElementById('m-observacoes').value || null
    };
    if (!data.nome) { showToast('Nome é obrigatório', 'warning'); return; }
    if (id) {
      await api(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/clientes', { method: 'POST', body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadClientes();
    showToast('Cliente salvo com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

async function deleteCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  await api(`/clientes/${id}`, { method: 'DELETE' });
  loadClientes();
  showToast('Cliente excluído', 'success');
}

// FORNECEDORES
async function loadFornecedores() {
  try {
    const search = document.getElementById('busca-fornecedores')?.value || '';
    const fornecedores = await api(`/fornecedores?search=${encodeURIComponent(search)}`);
    const tbody = document.getElementById('tabela-fornecedores');
    tbody.innerHTML = fornecedores.map(f =>
      `<tr>
        <td>${f.razaoSocial}</td>
        <td>${f.cnpj}</td>
        <td>${f.telefone || '-'}</td>
        <td>${f.cidade || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="openFornecedorModal(${f.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteFornecedor(${f.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`
    ).join('');
  } catch (error) {}
}

async function openFornecedorModal(id = null) {
  resetModalButton();
  let f = {};
  if (id) f = await api(`/fornecedores/${id}`);
  document.getElementById('modal-title').textContent = id ? 'Editar Fornecedor' : 'Novo Fornecedor';
  document.getElementById('modal-body').innerHTML = `
    <div class="row g-3">
      <div class="col-md-12"><label class="form-label">Razão Social *</label><input type="text" class="form-control" id="m-razaoSocial" value="${f.razaoSocial || ''}" required></div>
      <div class="col-md-6"><label class="form-label">Nome Fantasia</label><input type="text" class="form-control" id="m-nomeFantasia" value="${f.nomeFantasia || ''}"></div>
      <div class="col-md-6"><label class="form-label">CNPJ *</label><input type="text" class="form-control" id="m-cnpj" value="${f.cnpj || ''}" required></div>
      <div class="col-md-6"><label class="form-label">IE</label><input type="text" class="form-control" id="m-ie" value="${f.ie || ''}"></div>
      <div class="col-md-6"><label class="form-label">Telefone</label><input type="text" class="form-control" id="m-telefone" value="${f.telefone || ''}"></div>
      <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="m-email" value="${f.email || ''}"></div>
      <div class="col-md-6"><label class="form-label">Contato</label><input type="text" class="form-control" id="m-contato" value="${f.contato || ''}"></div>
      <div class="col-md-8"><label class="form-label">Endereço</label><input type="text" class="form-control" id="m-endereco" value="${f.endereco || ''}"></div>
      <div class="col-md-4"><label class="form-label">Cidade</label><input type="text" class="form-control" id="m-cidade" value="${f.cidade || ''}"></div>
      <div class="col-md-2"><label class="form-label">UF</label><input type="text" class="form-control" id="m-estado" value="${f.estado || ''}" maxlength="2"></div>
    </div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    const data = {
      razaoSocial: document.getElementById('m-razaoSocial').value,
      nomeFantasia: document.getElementById('m-nomeFantasia').value || null,
      cnpj: document.getElementById('m-cnpj').value,
      ie: document.getElementById('m-ie').value || null,
      telefone: document.getElementById('m-telefone').value || null,
      email: document.getElementById('m-email').value || null,
      contato: document.getElementById('m-contato').value || null,
      endereco: document.getElementById('m-endereco').value || null,
      cidade: document.getElementById('m-cidade').value || null,
      estado: document.getElementById('m-estado').value || null
    };
    if (!data.razaoSocial || !data.cnpj) { showToast('Razão Social e CNPJ são obrigatórios', 'warning'); return; }
    if (id) {
      await api(`/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/fornecedores', { method: 'POST', body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadFornecedores();
    showToast('Fornecedor salvo com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

async function deleteFornecedor(id) {
  if (!confirm('Excluir este fornecedor?')) return;
  await api(`/fornecedores/${id}`, { method: 'DELETE' });
  loadFornecedores();
  showToast('Fornecedor excluído', 'success');
}

// FUNCIONÁRIOS
async function loadFuncionarios() {
  try {
    const usuarios = await api('/usuarios');
    const tbody = document.getElementById('tabela-funcionarios');
    tbody.innerHTML = usuarios.map(u =>
      `<tr>
        <td>${u.nome}</td>
        <td>${u.usuario}</td>
        <td>${u.cargo}</td>
        <td><span class="badge ${u.status === 'ATIVO' ? 'bg-success' : 'bg-danger'}">${u.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="openFuncionarioModal(${u.id})"><i class="bi bi-pencil"></i></button>
          ${u.usuario !== 'admin' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteFuncionario(${u.id})"><i class="bi bi-trash"></i></button>` : ''}
        </td>
      </tr>`
    ).join('');
  } catch (error) {}
}

async function openFuncionarioModal(id = null) {
  resetModalButton();
  let u = {};
  if (id) u = await api(`/usuarios/${id}`);
  document.getElementById('modal-title').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
  document.getElementById('modal-body').innerHTML = `
    <div class="row g-3">
      <div class="col-md-12"><label class="form-label">Nome *</label><input type="text" class="form-control" id="m-nome" value="${u.nome || ''}" required></div>
      <div class="col-md-6"><label class="form-label">Usuário *</label><input type="text" class="form-control" id="m-usuario" value="${u.usuario || ''}" ${id ? 'disabled' : ''} required></div>
      <div class="col-md-6"><label class="form-label">Senha ${id ? '(deixe vazio para manter)' : '*'}</label><input type="password" class="form-control" id="m-senha"></div>
      <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="m-email" value="${u.email || ''}"></div>
      <div class="col-md-6"><label class="form-label">Telefone</label><input type="text" class="form-control" id="m-telefone" value="${u.telefone || ''}"></div>
      <div class="col-md-6"><label class="form-label">Cargo</label><select class="form-select" id="m-cargo">
        <option value="ADMIN" ${u.cargo === 'ADMIN' ? 'selected' : ''}>Administrador</option>
        <option value="GERENTE" ${u.cargo === 'GERENTE' ? 'selected' : ''}>Gerente</option>
        <option value="CAIXA" ${u.cargo === 'CAIXA' ? 'selected' : ''}>Caixa</option>
        <option value="ESTOQUISTA" ${u.cargo === 'ESTOQUISTA' ? 'selected' : ''}>Estoquista</option>
      </select></div>
      <div class="col-md-6"><label class="form-label">Status</label><select class="form-select" id="m-status">
        <option value="ATIVO" ${u.status === 'ATIVO' ? 'selected' : ''}>Ativo</option>
        <option value="INATIVO" ${u.status === 'INATIVO' ? 'selected' : ''}>Inativo</option>
      </select></div>
    </div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    const data = {
      nome: document.getElementById('m-nome').value,
      email: document.getElementById('m-email').value || null,
      telefone: document.getElementById('m-telefone').value || null,
      cargo: document.getElementById('m-cargo').value,
      status: document.getElementById('m-status').value
    };
    const senha = document.getElementById('m-senha').value;
    if (!id) {
      data.usuario = document.getElementById('m-usuario').value;
      if (!senha) { showToast('Senha é obrigatória', 'warning'); return; }
      data.senha = senha;
    } else if (senha) {
      data.senha = senha;
    }
    if (!data.nome) { showToast('Nome é obrigatório', 'warning'); return; }
    if (id) {
      await api(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/usuarios', { method: 'POST', body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadFuncionarios();
    showToast('Funcionário salvo com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

async function deleteFuncionario(id) {
  if (!confirm('Excluir este funcionário?')) return;
  await api(`/usuarios/${id}`, { method: 'DELETE' });
  loadFuncionarios();
  showToast('Funcionário excluído', 'success');
}

// CAIXA
async function loadCaixa() {
  try {
    const caixas = await api('/caixa');
    const aberto = await api('/caixa/aberto');
    const info = document.getElementById('caixa-info');
    if (aberto) {
      const totalVendas = aberto.vendas?.reduce((acc, v) => acc + Number(v.total), 0) || 0;
      const totalSangrias = aberto.sangrias?.filter(s => s.tipo === 'SANGRIA').reduce((acc, s) => acc + Number(s.valor), 0) || 0;
      const totalSuprimentos = aberto.sangrias?.filter(s => s.tipo === 'SUPRIMENTO').reduce((acc, s) => acc + Number(s.valor), 0) || 0;
      info.innerHTML = `
        <div class="row text-center">
          <div class="col-md-3"><h6>Abertura</h6><p>R$ ${Number(aberto.valorAbertura).toFixed(2).replace('.', ',')}</p></div>
          <div class="col-md-3"><h6>Vendas</h6><p class="text-success">R$ ${totalVendas.toFixed(2).replace('.', ',')}</p></div>
          <div class="col-md-3"><h6>Sangrias</h6><p class="text-danger">R$ ${totalSangrias.toFixed(2).replace('.', ',')}</p></div>
          <div class="col-md-3"><h6>Suprimentos</h6><p class="text-info">R$ ${totalSuprimentos.toFixed(2).replace('.', ',')}</p></div>
        </div>
      `;
    } else {
      info.innerHTML = '<p class="text-muted">Nenhum caixa aberto.</p>';
    }
    const tbody = document.getElementById('tabela-caixas');
    tbody.innerHTML = caixas.map(c =>
      `<tr>
        <td>#${c.numero}</td>
        <td><span class="badge ${c.status === 'ABERTO' ? 'bg-success' : 'bg-secondary'}">${c.status}</span></td>
        <td>${c.dataAbertura ? new Date(c.dataAbertura).toLocaleString('pt-BR') : '-'}</td>
        <td>${c.dataFechamento ? new Date(c.dataFechamento).toLocaleString('pt-BR') : '-'}</td>
        <td>R$ ${Number(c.valorFechamento || c.valorAbertura).toFixed(2).replace('.', ',')}</td>
      </tr>`
    ).join('');
  } catch (error) {}
}

async function abrirCaixa() {
  const numero = prompt('Número do caixa:');
  if (!numero) return;
  const valor = prompt('Valor de abertura (R$):', '200');
  try {
    await api('/caixa/abrir', {
      method: 'POST',
      body: JSON.stringify({ numero: parseInt(numero), valorAbertura: parseFloat(valor) || 0 })
    });
    loadCaixa();
    showToast('Caixa aberto com sucesso!', 'success');
  } catch (error) {}
}

async function fecharCaixa() {
  if (!confirm('Deseja fechar o caixa?')) return;
  try {
    await api('/caixa/fechar', { method: 'POST' });
    loadCaixa();
    showToast('Caixa fechado com sucesso!', 'success');
  } catch (error) {}
}

async function openSangriaModal() {
  resetModalButton();
  document.getElementById('modal-title').textContent = 'Sangria / Suprimento';
  document.getElementById('modal-body').innerHTML = `
    <div class="mb-3"><label class="form-label">Tipo</label><select class="form-select" id="m-tipo"><option value="SANGRIA">Sangria</option><option value="SUPRIMENTO">Suprimento</option></select></div>
    <div class="mb-3"><label class="form-label">Valor (R$)</label><input type="number" class="form-control" id="m-valor" step="0.01" min="0.01"></div>
    <div class="mb-3"><label class="form-label">Motivo</label><input type="text" class="form-control" id="m-motivo"></div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    await api('/caixa/sangria', {
      method: 'POST',
      body: JSON.stringify({
        tipo: document.getElementById('m-tipo').value,
        valor: parseFloat(document.getElementById('m-valor').value),
        motivo: document.getElementById('m-motivo').value
      })
    });
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadCaixa();
    showToast('Registro realizado com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

// FINANCEIRO
async function loadFinanceiro() {
  try {
    const pagar = await api('/financeiro/contas-pagar');
    const receber = await api('/financeiro/contas-receber');
    const fluxo = await api('/financeiro/fluxo-caixa');
    document.getElementById('tabela-pagar').innerHTML = pagar.map(c =>
      `<tr>
        <td>${c.descricao}</td>
        <td>R$ ${Number(c.valor).toFixed(2).replace('.', ',')}</td>
        <td>${new Date(c.dataVencimento).toLocaleDateString('pt-BR')}</td>
        <td><span class="badge ${c.status === 'PAGA' ? 'bg-success' : 'bg-warning'}">${c.status}</span></td>
        <td>${c.status !== 'PAGA' ? `<button class="btn btn-sm btn-success" onclick="pagarConta(${c.id})"><i class="bi bi-check"></i></button>` : ''}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhuma conta</td></tr>';
    document.getElementById('tabela-receber').innerHTML = receber.map(c =>
      `<tr>
        <td>${c.descricao}</td>
        <td>R$ ${Number(c.valor).toFixed(2).replace('.', ',')}</td>
        <td>${new Date(c.dataVencimento).toLocaleDateString('pt-BR')}</td>
        <td><span class="badge ${c.status === 'RECEBIDA' ? 'bg-success' : 'bg-warning'}">${c.status}</span></td>
        <td>${c.status !== 'RECEBIDA' ? `<button class="btn btn-sm btn-success" onclick="receberConta(${c.id})"><i class="bi bi-check"></i></button>` : ''}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhuma conta</td></tr>';
    document.getElementById('fluxo-entradas').textContent = `R$ ${(fluxo.totalVendas + fluxo.totalReceber).toFixed(2).replace('.', ',')}`;
    document.getElementById('fluxo-saidas').textContent = `R$ ${fluxo.totalPagar.toFixed(2).replace('.', ',')}`;
    document.getElementById('fluxo-saldo').textContent = `R$ ${fluxo.saldo.toFixed(2).replace('.', ',')}`;
    document.getElementById('fluxo-saldo').className = fluxo.saldo >= 0 ? 'text-success' : 'text-danger';
  } catch (error) {}
}

async function pagarConta(id) {
  await api(`/financeiro/contas-pagar/${id}/pagar`, { method: 'POST' });
  loadFinanceiro();
  showToast('Conta paga!', 'success');
}

async function receberConta(id) {
  await api(`/financeiro/contas-receber/${id}/receber`, { method: 'POST' });
  loadFinanceiro();
  showToast('Conta recebida!', 'success');
}

async function openContaModal(tipo) {
  resetModalButton();
  document.getElementById('modal-title').textContent = tipo === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber';
  document.getElementById('modal-body').innerHTML = `
    <div class="mb-3"><label class="form-label">Descrição *</label><input type="text" class="form-control" id="m-descricao" required></div>
    <div class="mb-3"><label class="form-label">Valor (R$) *</label><input type="number" class="form-control" id="m-valor" step="0.01" min="0.01"></div>
    <div class="mb-3"><label class="form-label">Data Vencimento *</label><input type="date" class="form-control" id="m-vencimento"></div>
    <div class="mb-3"><label class="form-label">Categoria</label><input type="text" class="form-control" id="m-categoria"></div>
    <div class="mb-3"><label class="form-label">Observação</label><textarea class="form-control" id="m-observacao"></textarea></div>
  `;
  document.getElementById('modal-save').onclick = async () => {
    const data = {
      descricao: document.getElementById('m-descricao').value,
      valor: parseFloat(document.getElementById('m-valor').value),
      dataVencimento: document.getElementById('m-vencimento').value,
      categoria: document.getElementById('m-categoria').value || null,
      observacao: document.getElementById('m-observacao').value || null
    };
    if (!data.descricao || !data.valor || !data.dataVencimento) { showToast('Preencha os campos obrigatórios', 'warning'); return; }
    await api(`/financeiro/contas-${tipo}`, { method: 'POST', body: JSON.stringify(data) });
    bootstrap.Modal.getInstance(document.getElementById('modal')).hide();
    loadFinanceiro();
    showToast('Conta criada com sucesso!', 'success');
  };
  new bootstrap.Modal(document.getElementById('modal')).show();
}

// RELATÓRIOS
async function gerarRelatorio(tipo) {
  const resultado = document.getElementById('relatorio-resultado');
  resultado.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split"></i> Gerando...</p>';
  try {
    let html = '';
    if (tipo === 'vendas') {
      const vendas = await api('/relatorios/vendas');
      html = `<h6>Relatório de Vendas (${vendas.length} vendas)</h6>
        <div class="table-responsive"><table class="table table-sm"><thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${vendas.map(v => `<tr><td>${v.id}</td><td>${new Date(v.createdAt).toLocaleString('pt-BR')}</td><td>${v.cliente?.nome || 'N/A'}</td><td>R$ ${Number(v.total).toFixed(2).replace('.', ',')}</td><td>${v.status}</td></tr>`).join('')}
        </tbody></table></div>`;
    } else if (tipo === 'estoque') {
      const produtos = await api('/relatorios/estoque');
      html = `<h6>Relatório de Estoque (${produtos.length} produtos)</h6>
        <div class="table-responsive"><table class="table table-sm"><thead><tr><th>Produto</th><th>Estoque</th><th>Mínimo</th><th>Preço Venda</th></tr></thead><tbody>
        ${produtos.map(p => `<tr><td>${p.nome}</td><td>${p.quantidade}</td><td>${p.estoqueMinimo}</td><td>R$ ${Number(p.precoVenda).toFixed(2).replace('.', ',')}</td></tr>`).join('')}
        </tbody></table></div>`;
    } else if (tipo === 'lucro') {
      const lucro = await api('/relatorios/lucro');
      html = `<h6>Relatório de Lucro</h6><p>Total de vendas: ${lucro.totalVendas}</p><p class="text-success fs-4">Lucro estimado: R$ ${lucro.lucro.toFixed(2).replace('.', ',')}</p>`;
    } else if (tipo === 'clientes') {
      const clientes = await api('/clientes');
      html = `<h6>Relatório de Clientes (${clientes.length} clientes)</h6>
        <div class="table-responsive"><table class="table table-sm"><thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Email</th></tr></thead><tbody>
        ${clientes.map(c => `<tr><td>${c.nome}</td><td>${c.cpfCnpj || '-'}</td><td>${c.telefone || '-'}</td><td>${c.email || '-'}</td></tr>`).join('')}
        </tbody></table></div>`;
    } else if (tipo === 'financeiro') {
      const pagar = await api('/financeiro/contas-pagar');
      const receber = await api('/financeiro/contas-receber');
      html = `<h6>Relatório Financeiro</h6>
        <p><strong>A Pagar:</strong> R$ ${pagar.filter(c => c.status !== 'PAGA').reduce((a, c) => a + Number(c.valor), 0).toFixed(2).replace('.', ',')}</p>
        <p><strong>A Receber:</strong> R$ ${receber.filter(c => c.status !== 'RECEBIDA').reduce((a, c) => a + Number(c.valor), 0).toFixed(2).replace('.', ',')}</p>`;
    } else {
      html = '<p class="text-muted">Relatório em desenvolvimento.</p>';
    }
    resultado.innerHTML = html;
  } catch (error) {
    resultado.innerHTML = '<p class="text-danger">Erro ao gerar relatório.</p>';
  }
}

// CONFIGURAÇÕES
async function loadConfig() {
  try {
    const config = await api('/configuracoes');
    document.getElementById('config-empresa').value = config.nome_empresa || '';
    document.getElementById('config-cnpj').value = config.cnpj || '';
    document.getElementById('config-telefone').value = config.telefone || '';
    document.getElementById('config-email').value = config.email || '';
    document.getElementById('config-endereco').value = config.endereco || '';
    document.getElementById('config-imposto').value = config.imposto_padrao || '';
    document.getElementById('config-cupom').value = config.cupom_texto || '';
  } catch (error) {}
}

async function saveConfig(e) {
  e.preventDefault();
  await api('/configuracoes', {
    method: 'PUT',
    body: JSON.stringify({
      nome_empresa: document.getElementById('config-empresa').value,
      cnpj: document.getElementById('config-cnpj').value,
      telefone: document.getElementById('config-telefone').value,
      email: document.getElementById('config-email').value,
      endereco: document.getElementById('config-endereco').value,
      imposto_padrao: document.getElementById('config-imposto').value,
      cupom_texto: document.getElementById('config-cupom').value
    })
  });
  showToast('Configurações salvas com sucesso!', 'success');
}

// AUDITORIA
async function loadAuditoria() {
  try {
    const auditorias = await api('/auditoria');
    const tbody = document.getElementById('tabela-auditoria');
    tbody.innerHTML = auditorias.map(a =>
      `<tr>
        <td>${new Date(a.createdAt).toLocaleString('pt-BR')}</td>
        <td>${a.usuario?.nome || 'Sistema'}</td>
        <td>${a.acao}</td>
        <td>${a.tabela || '-'}</td>
        <td>${a.ip || '-'}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhuma auditoria</td></tr>';
  } catch (error) {}
}

// MINHA CONTA
async function loadMinhaConta() {
  try {
    const user = await api(`/usuarios/${currentUser.id}`);
    document.getElementById('conta-nome').value = user.nome || '';
    document.getElementById('conta-email').value = user.email || '';
    document.getElementById('conta-telefone').value = user.telefone || '';
  } catch (error) {}
}

async function saveMinhaConta(e) {
  e.preventDefault();
  const data = {
    nome: document.getElementById('conta-nome').value,
    email: document.getElementById('conta-email').value || null,
    telefone: document.getElementById('conta-telefone').value || null
  };
  await api(`/usuarios/${currentUser.id}`, { method: 'PUT', body: JSON.stringify(data) });
  currentUser.nome = data.nome;
  localStorage.setItem('usuario', JSON.stringify(currentUser));
  document.getElementById('user-name').textContent = data.nome;
  showToast('Conta atualizada com sucesso!', 'success');
}
