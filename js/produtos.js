// ══════════════════════════════════════
//  SORT
// ══════════════════════════════════════
function setSort(field) {
  if (sortField === field) sortAsc = !sortAsc; else { sortField = field; sortAsc = true; }
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sort-'+field);
  if (btn) btn.textContent = field.charAt(0).toUpperCase()+field.slice(1) + (sortAsc?' ↑':' ↓');
  btn?.classList.add('active');
  renderPicker();
}
function sortedProdutos(list) {
  return [...list].sort((a,b) => {
    let va, vb;
    if (sortField==='preco')   { va=Number(a.preco||0);    vb=Number(b.preco||0); }
    else if (sortField==='estoque') { va=a.estoque??-1;    vb=b.estoque??-1; }
    else { va=(a[sortField]||'').toLowerCase(); vb=(b[sortField]||'').toLowerCase(); }
    if (va<vb) return sortAsc?-1:1;
    if (va>vb) return sortAsc?1:-1;
    return 0;
  });
}

// ══════════════════════════════════════
//  PRODUTOS
// ══════════════════════════════════════
function toggleModoSelecao() {
  modoSelecao = !modoSelecao;
  selecaoProdutos.clear();
  renderProdutos();
  const bar = document.getElementById('bulk-bar');
  if (bar) bar.style.display = modoSelecao ? 'flex' : 'none';
}
function toggleSelecionarTodos() {
  const filtered = getProdutosFiltrados();
  if (selecaoProdutos.size === filtered.length) {
    selecaoProdutos.clear();
  } else {
    filtered.forEach(p => selecaoProdutos.add(p.id));
  }
  renderProdutos();
  atualizarBulkBar();
}
function toggleSelecionarProduto(id, e) {
  e.stopPropagation();
  if (selecaoProdutos.has(id)) selecaoProdutos.delete(id);
  else selecaoProdutos.add(id);
  atualizarBulkBar();
  renderProdutos();
}
function atualizarBulkBar() {
  const n = selecaoProdutos.size;
  const lbl = document.getElementById('bulk-label');
  const btnDel = document.getElementById('bulk-del-btn');
  const btnAll = document.getElementById('bulk-all-btn');
  const filtered = getProdutosFiltrados();
  if (lbl) lbl.textContent = n === 0 ? 'Nenhum selecionado' : `${n} produto${n!==1?'s':''} selecionado${n!==1?'s':''}`;
  if (btnDel) btnDel.disabled = n === 0;
  if (btnAll) btnAll.textContent = selecaoProdutos.size === filtered.length && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos';
}
async function excluirSelecionados() {
  const n = selecaoProdutos.size;
  if (!n) return;
  if (!confirm(`Excluir ${n} produto${n!==1?'s':''}? Esta ação não pode ser desfeita.`)) return;
  for (const id of selecaoProdutos) {
    await dbDelete('produtos', id);
  }
  produtos = produtos.filter(p => !selecaoProdutos.has(p.id));
  selecaoProdutos.clear();
  toast(`${n} produto${n!==1?'s':''} excluído${n!==1?'s':''}`);
  toggleModoSelecao();
}
function getProdutosFiltrados() {
  const q = (document.getElementById('search-produtos')?.value||'').toLowerCase();
  return sortedProdutos(produtos.filter(p =>
    p.nome.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)
  ));
}

function renderProdutos() {
  const filtered=getProdutosFiltrados();
  const el=document.getElementById('lista-produtos');
  if(!el)return;

  // ── Resumo de estoque por categoria ──
  const sumEl=document.getElementById('estoque-por-categoria');
  if(sumEl && produtos.length) {
    const mapa={};
    produtos.forEach(p=>{
      const cat=p.categoria||'Sem categoria';
      if(!mapa[cat]) mapa[cat]={skus:0,total:0,valor:0,zero:0,baixo:0};
      mapa[cat].skus++;
      const est=p.estoque!=null?Number(p.estoque):null;
      if(est===null) return;
      mapa[cat].total+=est;
      mapa[cat].valor+=est*(p.preco||0);
      if(est<=0) mapa[cat].zero++;
      else if(est<=5) mapa[cat].baixo++;
    });
    const cats=Object.entries(mapa).sort((a,b)=>a[0].localeCompare(b[0]));
    const COL='grid-template-columns:1fr 44px 72px 110px';
    const hdr=`<div style="display:grid;${COL};gap:0;padding:6px 0 8px;border-bottom:2px solid var(--b);font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">
      <span>Categoria</span>
      <span style="text-align:right">SKUs</span>
      <span style="text-align:right;padding-right:8px">Estoque</span>
      <span style="text-align:right">Valor (venda)</span>
    </div>`;
    const rows=cats.map(([cat,s])=>{
      const alertas=[];
      if(s.zero>0) alertas.push(`<span class="estoque-zero" style="font-size:.62rem">${s.zero} sem est.</span>`);
      if(s.baixo>0) alertas.push(`<span class="estoque-low" style="font-size:.62rem">${s.baixo} baixo</span>`);
      return `<div style="display:grid;${COL};gap:0;align-items:center;padding:10px 0;border-bottom:1px solid var(--b)">
        <div style="min-width:0">
          <span style="font-size:.85rem">${cat}</span>
          ${alertas.length?`<div style="margin-top:2px;display:flex;gap:6px">${alertas.join('')}</div>`:''}
        </div>
        <span style="font-family:var(--mono);font-size:.8rem;color:var(--muted);text-align:right">${s.skus}</span>
        <span style="font-family:var(--mono);font-size:.8rem;color:var(--muted);text-align:right;padding-right:8px">${s.total} un.</span>
        <span style="font-family:var(--mono);font-size:.8rem;text-align:right">${fmtPreco(s.valor)}</span>
      </div>`;
    }).join('');
    sumEl.innerHTML=hdr+rows;
    sumEl.style.display='block';
  }

  if(!filtered.length){el.innerHTML='<div class="empty"><div class="icon">📦</div><p>Nenhum produto.<br/>Clique em \"+ Produto\" ou importe um CSV.</p></div>';return;}
  el.innerHTML=filtered.map(p=>{
    const est=p.estoque!=null?Number(p.estoque):null;
    const cls=est===null?'':est<=0?'estoque-zero':est<=5?'estoque-low':'estoque-ok';
    const estTxt=est===null?'':` · <span class="${cls}">${est<=0?'sem estoque':'est: '+est}</span>`;
    const sel=selecaoProdutos.has(p.id);
    if(modoSelecao){
      return `<div class="list-item${sel?' list-item-sel':''}" onclick="toggleSelecionarProduto('${p.id}',event)" style="gap:14px">
        <div style="width:20px;height:20px;border-radius:5px;border:2px solid ${sel?'#fff':'var(--b)'};background:${sel?'#fff':'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${sel?'<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>':''}
        </div>
        <div class="info">
          <div class="name">${p.nome}</div>
          <div class="sub">${p.sku?p.sku+' · ':''}${p.categoria||'Sem categoria'}${estTxt}</div>
        </div>
        <span class="badge bw mono">${fmtPreco(p.preco)}</span>
      </div>`;
    }
    return `<div class="list-item" onclick="abrirDetalhes('produto','${p.id}')">
      <div class="info">
        <div class="name">${p.nome}</div>
        <div class="sub">${p.sku?p.sku+' · ':''}${p.categoria||'Sem categoria'}${estTxt}</div>
      </div>
      <span class="badge bw mono">${fmtPreco(p.preco)}</span>
      <span class="chevron">›</span>
    </div>`;
  }).join('');
  atualizarBulkBar();
}

function abrirNovoProduto() {
  document.getElementById('drawer-produto-title').textContent='Novo Produto';
  document.getElementById('prod-id').value='';
  ['prod-nome','prod-sku','prod-categoria','prod-preco','prod-estoque'].forEach(id=>document.getElementById(id).value='');
  abrirDrawer('drawer-produto');
}
function editarProduto(id) {
  const p=produtos.find(x=>x.id===id);
  if(!p)return;
  document.getElementById('drawer-produto-title').textContent='Editar Produto';
  document.getElementById('prod-id').value=p.id;
  document.getElementById('prod-nome').value=p.nome||'';
  document.getElementById('prod-sku').value=p.sku||'';
  document.getElementById('prod-categoria').value=p.categoria||'';
  document.getElementById('prod-preco').value=p.preco||'';
  document.getElementById('prod-estoque').value=p.estoque!=null?p.estoque:'';
  abrirDrawer('drawer-produto');
}
async function salvarProduto() {
  const nome=document.getElementById('prod-nome').value.trim();
  const preco=parseFloat(document.getElementById('prod-preco').value);
  if(!nome){toast('Informe o nome');return;}
  if(isNaN(preco)||preco<0){toast('Preço inválido');return;}
  const estVal=document.getElementById('prod-estoque').value;
  const data={nome,preco,
    sku:document.getElementById('prod-sku').value.trim(),
    categoria:document.getElementById('prod-categoria').value.trim(),
    estoque:estVal!==''?Number(estVal):null
  };
  const id=document.getElementById('prod-id').value;
  if(id){await dbUpdate('produtos',id,data);toast('Produto atualizado');}
  else{await dbAdd('produtos',data);toast('Produto adicionado');}
  produtos=await dbGetAll('produtos');
  fecharDrawer('drawer-produto');
  renderProdutos(); renderPicker();
}
async function excluirProduto(id) {
  if(!confirm('Excluir produto?'))return;
  await dbDelete('produtos',id);
  produtos=produtos.filter(x=>x.id!==id);
  renderProdutos(); renderPicker();
  toast('Produto removido');
}
