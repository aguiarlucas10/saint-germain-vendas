// ══════════════════════════════════════
//  DRAWERS
// ══════════════════════════════════════
function abrirDrawer(id) {
  document.getElementById(id)?.classList.add('open');
}
function fecharDrawer(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ══════════════════════════════════════
//  TOAST
// ══════════════════════════════════════
let toastTimer;
function toast(msg) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

function fmtPreco(v) {
  return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ══════════════════════════════════════
//  TABS
// ══════════════════════════════════════
function setTab(btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = btn.dataset.tab;
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'historico')  renderHistorico();
  if (tab === 'produtos')   renderProdutos();
  if (tab === 'clientes')   renderClientes();
  if (tab === 'equipe')     renderEquipe();
  if (tab === 'dashboard')  renderDashboard();
}

// ══════════════════════════════════════
//  DETALHES POPUP
// ══════════════════════════════════════
function abrirDetalhes(tipo, id) {
  const isAdmin = usuarioAtual?.role === 'admin';
  let titulo='', corpo='', onEditar=null, onExcluir=null;

  if (tipo==='produto') {
    const p=produtos.find(x=>x.id===id); if(!p)return;
    const est=p.estoque!=null?Number(p.estoque):null;
    const estHtml=est===null?'—':`<span class="${est<=0?'estoque-zero':est<=5?'estoque-low':'estoque-ok'}">${est<=0?'sem estoque':est+' un.'}</span>`;
    titulo=p.nome;
    corpo=`<div>
      <div class="det-row"><span class="det-lbl">SKU</span><span>${p.sku||'—'}</span></div>
      <div class="det-row"><span class="det-lbl">Categoria</span><span>${p.categoria||'—'}</span></div>
      <div class="det-row"><span class="det-lbl">Preço</span><span class="mono">${fmtPreco(p.preco)}</span></div>
      <div class="det-row"><span class="det-lbl">Estoque</span><span>${estHtml}</span></div>
    </div>`;
    onEditar=()=>editarProduto(id);
    onExcluir=()=>excluirProduto(id);
  } else if (tipo==='cliente') {
    const c=clientes.find(x=>x.id===id); if(!c)return;
    const isCpf=c.tipo==='cpf';
    titulo=c.nome;
    corpo=`<div>
      ${isCpf
        ?`<div class="det-row"><span class="det-lbl">CPF</span><span>${c.cpf||'—'}</span></div>
           <div class="det-row"><span class="det-lbl">Telefone</span><span>${c.telCpf||'—'}</span></div>`
        :`<div class="det-row"><span class="det-lbl">CNPJ</span><span>${c.doc||'—'}</span></div>
          <div class="det-row"><span class="det-lbl">IE</span><span>${c.ie||'—'}</span></div>
          <div class="det-row"><span class="det-lbl">Telefone</span><span>${c.tel||'—'}</span></div>
          <div class="det-row"><span class="det-lbl">E-mail</span><span>${c.email||'—'}</span></div>
          <div class="det-row"><span class="det-lbl">Endereço</span><span>${c.end||'—'}</span></div>`
      }
      ${c.obs?`<div class="det-row"><span class="det-lbl">Obs.</span><span>${c.obs}</span></div>`:''}
    </div>`;
    onEditar=()=>editarCliente(id);
    onExcluir=()=>excluirCliente(id);
  } else if (tipo==='vendedor') {
    const v=vendedores.find(x=>x.id===id); if(!v)return;
    titulo=v.nome;
    corpo=`<div>
      <div class="det-row"><span class="det-lbl">Perfil</span><span class="badge ${v.role==='admin'?'bw':'bg'}">${v.role==='admin'?'Admin':'Vendedor'}</span></div>
      <div class="det-row"><span class="det-lbl">Telefone</span><span>${v.tel||'—'}</span></div>
      <div class="det-row"><span class="det-lbl">Senha</span><span>${v.senha?'••••••':'⚠️ não definida'}</span></div>
    </div>`;
    onEditar=()=>editarVendedor(id);
    onExcluir=()=>excluirVendedor(id);
  }

  document.getElementById('det-titulo').textContent=titulo;
  document.getElementById('det-corpo').innerHTML=corpo;

  const btnEdit=document.getElementById('det-btn-editar');
  const btnExc=document.getElementById('det-btn-excluir');
  if(isAdmin&&onEditar) {
    btnEdit.style.display='inline-flex';
    btnEdit.onclick=()=>{fecharDrawer('drawer-detalhes');setTimeout(onEditar,150);};
  } else btnEdit.style.display='none';
  if(isAdmin&&onExcluir) {
    btnExc.style.display='inline-flex';
    btnExc.onclick=()=>{fecharDrawer('drawer-detalhes');setTimeout(onExcluir,150);};
  } else btnExc.style.display='none';

  abrirDrawer('drawer-detalhes');
}

// ══════════════════════════════════════
//  MODAL SENHA
// ══════════════════════════════════════
function abrirModalSenha(cb) {
  pendingFinalizarCb = cb;
  document.getElementById('senha-aprovacao').value='';
  document.getElementById('senha-erro').textContent='';
  document.getElementById('modal-senha').style.display='flex';
  setTimeout(()=>document.getElementById('senha-aprovacao').focus(),100);
}
function fecharModalSenha() {
  document.getElementById('modal-senha').style.display='none';
  pendingFinalizarCb=null;
}
function confirmarSenha() {
  const s = document.getElementById('senha-aprovacao').value;
  if (s !== SENHA_APROVACAO) {
    document.getElementById('senha-erro').textContent='Senha incorreta.'; return;
  }
  fecharModalSenha();
  if (pendingFinalizarCb) pendingFinalizarCb();
}
