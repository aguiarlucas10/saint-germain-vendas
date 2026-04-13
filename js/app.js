// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
async function init() {
  await carregarDados();
  // Load shared config from Firebase
  try {
    if (useFirebase) {
      const doc = await db.collection('configuracoes').doc('cpf_livre').get();
      if (doc.exists) cpfLivreAtivo = !!doc.data().ativo;
    }
  } catch(e) { /* ignore */ }
  renderPicker();
  renderProdutos();
  renderClientes();
  renderHistorico();
  renderEquipe();
  popularVendedores();
  popularDashFiltros();
  atualizarBadgeDia();
  iniciarSyncConfig();
  restaurarCarrinho();
  renderPicker();
  renderResumo();
  atualizarCartBar();
}
function iniciarSyncConfig() {
  // Re-check config every 30s so changes by admin propagate to all devices
  setInterval(async () => {
    try {
      if (!useFirebase) return;
      const doc = await db.collection('configuracoes').doc('cpf_livre').get();
      const novoValor = doc.exists ? !!doc.data().ativo : false;
      if (novoValor !== cpfLivreAtivo) {
        cpfLivreAtivo = novoValor;
        renderEquipe();
        renderResumo();
        if (cpfLivreAtivo) toast('ℹ️ Modo Livre ativado pelo admin');
      }
    } catch(e) { /* ignore */ }
  }, 30000);
}

async function carregarDados() {
  [produtos, clientes, pedidos, vendedores] = await Promise.all([
    dbGetAll('produtos'), dbGetAll('clientes'), dbGetAll('pedidos'), dbGetAll('vendedores'),
  ]);
  pedidos.sort((a,b) => (b._ts||0) - (a._ts||0));
}
function atualizarBadgeDia() {
  const badge = document.getElementById('badge-dia');
  if (!badge) return;
  const inicio = new Date(); inicio.setHours(0,0,0,0);
  const n = pedidos.filter(p => (p._ts||0) >= inicio.getTime() && p.tipo !== 'brinde').length;
  badge.textContent = n + (n===1?' pedido hoje':' pedidos hoje');
  badge.style.display = n > 0 ? 'block' : 'none';
}

// ══════════════════════════════════════
//  RESET POR SEÇÃO
// ══════════════════════════════════════
async function resetarProdutos() {
  if (usuarioAtual?.role !== 'admin') { toast('Apenas admins podem resetar'); return; }
  if (!produtos.length) { toast('Nenhum produto para apagar'); return; }
  if (!confirm('Apagar todos os ' + produtos.length + ' produtos?\n\nEsta ação não pode ser desfeita.')) return;
  toast('Apagando produtos...');
  try {
    for (const p of produtos) { await dbDelete('produtos', p.id); }
    produtos = [];
    cart = {};
    descontoAtual = 0;
    descontoValor = 0;
    selecaoProdutos.clear();
    csvParaImportar = [];
    localStorage.removeItem('sg_cart');
    renderProdutos(); renderPicker(); renderResumo(); atualizarCartBar();
    toast('Todos os produtos foram apagados');
  } catch(e) { toast('Erro: ' + e.message); }
}

async function resetarClientes() {
  if (usuarioAtual?.role !== 'admin') { toast('Apenas admins podem resetar'); return; }
  if (!clientes.length) { toast('Nenhum cliente para apagar'); return; }
  if (!confirm('Apagar todos os ' + clientes.length + ' clientes?\n\nEsta ação não pode ser desfeita.')) return;
  toast('Apagando clientes...');
  try {
    for (const c of clientes) { await dbDelete('clientes', c.id); }
    clientes = [];
    renderClientes();
    toast('Todos os clientes foram apagados');
  } catch(e) { toast('Erro: ' + e.message); }
}

async function resetarPedidos() {
  if (usuarioAtual?.role !== 'admin') { toast('Apenas admins podem resetar'); return; }
  if (!pedidos.length) { toast('Nenhum pedido para apagar'); return; }
  if (!confirm('Apagar todos os ' + pedidos.length + ' pedidos?\n\nEsta ação não pode ser desfeita.')) return;
  toast('Apagando pedidos...');
  try {
    for (const p of pedidos) { await dbDelete('pedidos', p.id); }
    pedidos = [];
    jsonParaImportar = [];
    renderHistorico(); atualizarBadgeDia();
    toast('Todos os pedidos foram apagados');
  } catch(e) { toast('Erro: ' + e.message); }
}

// ══════════════════════════════════════
//  BOOT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', function boot() {
  const saved=localStorage.getItem('sg_session');
  if(saved) {
    try {
      const sess=JSON.parse(saved);
      if(sess?.usuario&&sess?.role) {
        usuarioAtual=sess;
        document.getElementById('login-modal').style.display='none';
        document.getElementById('app').style.display='flex';
        aplicarPermissoes();
        iniciarApp();
        return;
      }
    } catch(e) {}
    localStorage.removeItem('sg_session');
  }
  document.getElementById('login-modal').style.display='flex';
});

// Close client dropdown on outside click
document.addEventListener('click', e => {
  const dd=document.getElementById('cli-dropdown');
  const inp=document.getElementById('cli-busca');
  if (dd&&inp&&!inp.contains(e.target)&&!dd.contains(e.target)) dd.style.display='none';
});
