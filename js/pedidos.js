// ══════════════════════════════════════
//  PICKER
// ══════════════════════════════════════
function renderPicker() {
  const q = (document.getElementById('search-prod')?.value||'').toLowerCase();
  const filtered = sortedProdutos(produtos.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    (p.sku||'').toLowerCase().includes(q) ||
    (p.categoria||'').toLowerCase().includes(q)
  ));
  const el = document.getElementById('picker-list');
  if (!el) return;
  if (!produtos.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><p>Nenhum produto cadastrado ainda.</p></div>';
    return;
  }
  el.innerHTML = filtered.map(p => {
    const item = cart[p.id];
    const qty  = item?.qty || 0;
    const est  = p.estoque != null ? Number(p.estoque) : null;
    let estHtml = '';
    if (est !== null) {
      const cls = est<=0?'estoque-zero':est<=5?'estoque-low':'estoque-ok';
      const txt = est<=0?'sem estoque':('est: '+est);
      estHtml = `<span class="pick-stock ${cls}">${txt}</span>`;
    }
    const isBrinde = tipoPedido==='brinde' || item?.brinde;
    const priceHtml = tipoPedido==='brinde'
      ? '<span style="color:var(--green);font-size:.75rem">Brinde</span>'
      : fmtPreco(p.preco);
    return `<div class="pick-item" style="${est===0?'opacity:.5':''}">
      <span class="pick-sku">${p.sku||'—'}</span>
      <div class="pick-name">${p.nome}${estHtml}</div>
      <span class="pick-price">${priceHtml}</span>
      <div class="qty-ctrl">
        <button onclick="addCart('${p.id}',-1)">−</button>
        <span class="qty-num">${qty}</span>
        <button onclick="addCart('${p.id}',1)">+</button>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
//  CARRINHO PERSISTENTE
// ══════════════════════════════════════
function salvarCarrinho() {
  LOCAL.set('sg_cart', { cart, descontoAtual, descontoValor, tipoPedido });
}
function restaurarCarrinho() {
  try {
    const saved = LOCAL.get('sg_cart');
    if (saved && saved.cart && Object.keys(saved.cart).length) {
      // Valida que os produtos ainda existem
      const cartValido = {};
      Object.entries(saved.cart).forEach(([id, item]) => {
        if (produtos.find(p => p.id === id)) cartValido[id] = item;
      });
      if (Object.keys(cartValido).length) {
        cart = cartValido;
        descontoAtual = saved.descontoAtual || 0;
        descontoValor = saved.descontoValor || 0;
        tipoPedido = saved.tipoPedido || 'venda';
        // Restore tipo buttons
        const vBtn = document.getElementById('tipo-venda-btn');
        const bBtn = document.getElementById('tipo-brinde-btn');
        if (vBtn) { vBtn.classList.toggle('active', tipoPedido==='venda'); vBtn.classList.toggle('brinde-active', false); }
        if (bBtn) { bBtn.classList.toggle('active', tipoPedido==='brinde'); bBtn.classList.toggle('brinde-active', tipoPedido==='brinde'); }
        // Restore desconto
        if (descontoAtual) document.getElementById('tier-'+descontoAtual)?.classList.add('active');
      }
    }
  } catch(e) { cart={}; descontoAtual=0; tipoPedido='venda'; }
}

// ══════════════════════════════════════
//  TIPO PEDIDO
// ══════════════════════════════════════
function setTipoPedido(tipo) {
  tipoPedido = tipo;
  salvarCarrinho();
  const vBtn = document.getElementById('tipo-venda-btn');
  const bBtn = document.getElementById('tipo-brinde-btn');
  vBtn.classList.toggle('active', tipo === 'venda');
  bBtn.classList.toggle('active', tipo === 'brinde');
  bBtn.classList.toggle('brinde-active', tipo === 'brinde');
  renderPicker();
  renderResumo();
}

// ══════════════════════════════════════
//  DESCONTO
// ══════════════════════════════════════
function aplicarDesconto(pct) {
  descontoAtual = (descontoAtual === pct) ? 0 : pct;
  document.querySelectorAll('.tier').forEach(t => t.classList.remove('active'));
  if (descontoAtual) document.getElementById('tier-'+descontoAtual)?.classList.add('active');
  renderResumo();
}
function atualizarTiers(bruto) {
  TIERS.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;
    const ok = bruto >= t.min;
    el.classList.toggle('disabled', !ok);
    if (!ok && descontoAtual === t.pct) { descontoAtual = 0; el.classList.remove('active'); }
  });
}

function getSubtotalBruto() {
  return Object.entries(cart).reduce((s,[id,item]) => {
    if (item.brinde) return s;
    const p = produtos.find(x=>x.id===id);
    return s + (p ? p.preco*item.qty : 0);
  }, 0);
}

function maxPctParaBruto(bruto) {
  let pct = 0;
  for (const t of TIERS) { if (bruto >= t.min) pct = t.pct; }
  return pct;
}
function atualizarSliderDesconto(bruto) {
  const slider = document.getElementById('desc-slider');
  const input  = document.getElementById('desc-input');
  const limLabel = document.getElementById('desc-limite-label');
  const pctLabel = document.getElementById('desc-pct-label');
  const maxLabel = document.getElementById('desc-max-label');
  if (!slider) return;
  const maxPct = maxPctParaBruto(bruto);
  const maxVal = Math.floor(bruto * maxPct / 100 * 100) / 100;
  if (descontoValor > maxVal) descontoValor = maxVal;
  slider.max = maxVal; slider.value = descontoValor;
  if (input) { input.max = maxVal; input.value = descontoValor.toFixed(2); }
  if (limLabel) limLabel.textContent = maxPct ? `limite ${maxPct}% (${fmtPreco(maxVal)})` : 'sem desconto disponível';
  if (pctLabel) { const pct = bruto>0?(descontoValor/bruto*100):0; pctLabel.textContent = descontoValor>0?pct.toFixed(1)+'%':''; }
  if (maxLabel) maxLabel.textContent = fmtPreco(maxVal);
  if (slider) slider.disabled = maxPct === 0;
}
function onDescSlider(val) {
  descontoValor = Math.max(0, parseFloat(val)||0);
  const input = document.getElementById('desc-input');
  if (input) input.value = descontoValor.toFixed(2);
  renderResumo();
}
function onDescInput(val) {
  const bruto = getSubtotalBruto();
  const maxPct = maxPctParaBruto(bruto);
  const maxVal = bruto * maxPct / 100;
  descontoValor = Math.min(Math.max(0, parseFloat(val)||0), maxVal);
  const slider = document.getElementById('desc-slider');
  if (slider) slider.value = descontoValor;
  renderResumo();
}

// ══════════════════════════════════════
//  CARRINHO / CART
// ══════════════════════════════════════
function calcTotaisCart(cartOverride) {
  const c = cartOverride || cart;
  let totalVenda = 0, totalBrinde = 0;
  for (const [id, item] of Object.entries(c)) {
    const p = produtos.find(x => x.id === id);
    if (!p) continue;
    if (item.brinde) totalBrinde += p.preco * item.qty;
    else totalVenda += p.preco * item.qty;
  }
  return { totalVenda, totalBrinde };
}
function limiteBreinde() {
  // 5% do valor de venda do carrinho
  const { totalVenda } = calcTotaisCart();
  return totalVenda * 0.05;
}
function addCart(id, delta) {
  const p = produtos.find(x => x.id === id);
  const cur = cart[id]?.qty || 0;
  const novaQty = Math.max(0, cur + delta);
  if (delta > 0 && p?.estoque != null && novaQty > Number(p.estoque)) {
    toast('⚠️ Estoque: '+p.estoque+' un.'); return;
  }
  // Se item é brinde, verifica limite de 5% do valor de venda
  if (delta > 0 && cart[id]?.brinde && p) {
    const cartTeste = { ...cart, [id]: { ...cart[id], qty: novaQty } };
    const { totalVenda, totalBrinde } = calcTotaisCart(cartTeste);
    const limite = totalVenda * 0.05;
    if (totalBrinde > limite) {
      toast(`⚠️ Limite de brindes: 5% do pedido (${fmtPreco(limite)})`); return;
    }
  }
  if (novaQty === 0) delete cart[id];
  else cart[id] = { qty: novaQty, brinde: cart[id]?.brinde || false };
  if (!Object.keys(cart).length) descontoAtual = 0;
  salvarCarrinho();
  renderPicker();
  renderResumo();
  atualizarCartBar();
}
function toggleBrinde(id) {
  if (!cart[id]) return;
  const novoEstado = !cart[id].brinde;
  // Se vai virar brinde, verifica limite de 5%
  if (novoEstado) {
    const p = produtos.find(x => x.id === id);
    const cartTeste = { ...cart, [id]: { ...cart[id], brinde: true } };
    const { totalVenda, totalBrinde } = calcTotaisCart(cartTeste);
    // totalVenda já excluiu o item que virou brinde
    const limite = totalVenda * 0.05;
    if (totalBrinde > limite) {
      const limFmt = fmtPreco(limite);
      toast(`⚠️ Limite de brindes (5% = ${limFmt}). Reduza a qty ou o valor do brinde.`);
      return;
    }
  }
  cart[id] = { ...cart[id], brinde: novoEstado };
  salvarCarrinho();
  renderResumo();
  atualizarCartBar();
}
function atualizarCartBar() {
  const bar = document.getElementById('cart-bar');
  const itens = Object.entries(cart);
  if (!itens.length) { bar.classList.remove('visible'); return; }
  const bruto = itens.reduce((s,[id,item]) => {
    const p = produtos.find(x=>x.id===id);
    return s + (p && !item.brinde ? p.preco*item.qty : 0);
  }, 0);
  const total = bruto - (tipoPedido==='brinde' ? 0 : descontoValor);
  const totalItens = itens.reduce((s,[,i])=>s+i.qty,0);
  document.getElementById('cb-count').textContent = totalItens+' iten'+(totalItens===1?'':'s');
  document.getElementById('cb-total').textContent = tipoPedido==='brinde'?'Brinde':fmtPreco(total);
  bar.classList.add('visible');
}

// ══════════════════════════════════════
//  RESUMO DRAWER
// ══════════════════════════════════════
function renderResumo() {
  const itens = Object.entries(cart);
  atualizarCartBar();
  const card = document.getElementById('resumo-card');
  const desc_card = document.getElementById('desconto-card');
  const total_row = document.getElementById('resumo-total-row');
  const aviso = document.getElementById('aviso-minimo');

  if (!itens.length) {
    document.getElementById('resumo-itens').innerHTML = '<p class="text-muted" style="padding:8px 0">Carrinho vazio</p>';
    if (total_row) total_row.style.display='none';
    if (desc_card) desc_card.style.display='none';
    if (aviso) aviso.style.display='none';
    return;
  }

  const temVenda = itens.some(([,i])=>!i.brinde);
  const bruto = itens.reduce((s,[id,i]) => {
    if (i.brinde) return s;
    const p = produtos.find(x=>x.id===id);
    return s + (p ? p.preco*i.qty : 0);
  },0);

  if (desc_card) {
    desc_card.style.display = (temVenda && tipoPedido!=='brinde') ? 'block':'none';
    if (temVenda) atualizarSliderDesconto(bruto);
  }

  // Clamp descontoValor to current max
  const maxPct = maxPctParaBruto(bruto);
  const maxDesc = bruto * maxPct / 100;
  if (descontoValor > maxDesc) descontoValor = maxDesc;
  const valorDesc = tipoPedido==='brinde' ? 0 : descontoValor;
  const total = bruto - valorDesc;

  document.getElementById('resumo-itens').innerHTML = itens.map(([id,item])=>{
    const p = produtos.find(x=>x.id===id);
    if (!p) return '';
    const subVal = item.brinde ? '<span style="color:var(--green);font-size:.75rem">🎁 Brinde</span>' : fmtPreco(p.preco*item.qty);
    return `<div class="resumo-item">
      <div style="flex:1;min-width:0">
        <div style="font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
        <button onclick="toggleBrinde('${id}')" style="background:none;border:1px solid ${item.brinde?'var(--green)':'var(--b)'};color:${item.brinde?'var(--green)':'var(--muted)'};font-size:.6rem;border-radius:4px;padding:2px 6px;cursor:pointer;margin-top:4px;font-family:var(--font)">${item.brinde?'✓ brinde':'+ brinde'}</button>
      </div>
      <div class="qty-ctrl" style="background:var(--bg)">
        <button onclick="addCart('${id}',-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button onclick="addCart('${id}',1)">+</button>
      </div>
      <div style="min-width:72px;text-align:right;font-family:var(--mono);font-size:.82rem">${subVal}</div>
    </div>`;
  }).join('');

  const descRow = document.getElementById('resumo-desconto');
  if (descRow) {
    descRow.style.display = valorDesc > 0 ? 'flex':'none';
    if (valorDesc > 0) {
      const pct = bruto > 0 ? (valorDesc/bruto*100).toFixed(1) : 0;
      document.getElementById('resumo-desc-label').textContent = 'Desconto ('+pct+'%)';
      document.getElementById('resumo-desc-val').textContent = '- '+fmtPreco(valorDesc);
    }
  }

  if (total_row) {
    total_row.style.display='flex';
    document.getElementById('resumo-total-val').textContent = fmtPreco(total);
  }
  if (aviso) aviso.style.display = (tipoPedido!=='brinde' && total<PEDIDO_MINIMO && temVenda && !cpfLivreAtivo)?'block':'none';

  // Indicador de limite de brinde
  const catEl = document.getElementById('resumo-categorias');
  const brindeInfoEl = document.getElementById('resumo-brinde-info');
  if (brindeInfoEl) {
    const { totalVenda, totalBrinde } = calcTotaisCart();
    if (totalBrinde > 0 && totalVenda > 0) {
      const limite = totalVenda * 0.05;
      const pct = (totalBrinde / totalVenda * 100).toFixed(1);
      const ok = totalBrinde <= limite;
      brindeInfoEl.style.display = 'flex';
      brindeInfoEl.style.background = ok ? 'rgba(76,175,125,.1)' : 'rgba(224,82,82,.1)';
      brindeInfoEl.style.border = `1px solid ${ok ? 'var(--green)' : 'var(--red)'}`;
      brindeInfoEl.innerHTML = `
        <span style="font-size:.78rem;color:${ok?'var(--green)':'var(--red)'}">
          🎁 Brindes: ${fmtPreco(totalBrinde)} de ${fmtPreco(limite)} (${pct}% / 5%)
        </span>
        <span style="font-family:var(--mono);font-size:.72rem;color:${ok?'var(--green)':'var(--red)'}">
          ${ok ? '✓' : '⚠️ LIMITE'}
        </span>`;
    } else {
      brindeInfoEl.style.display = 'none';
    }
  }

  // Resumo por categoria
  if (catEl) {
    const mapaCAT = {};
    itens.forEach(([id, item]) => {
      const p = produtos.find(x => x.id === id);
      if (!p) return;
      const cat = p.categoria || 'Outros';
      mapaCAT[cat] = (mapaCAT[cat] || 0) + item.qty;
    });
    const cats = Object.entries(mapaCAT).sort((a,b) => a[0].localeCompare(b[0]));
    catEl.style.display = cats.length ? 'block' : 'none';
    catEl.innerHTML = cats.map(([cat, qty]) =>
      `<div style="display:flex;justify-content:space-between;font-size:.78rem;padding:3px 0;color:var(--muted)">
        <span>${cat}</span><span class="mono">${qty} un.</span>
      </div>`).join('');
  }

  renderParcelasPreview();
}
function renderParcelasPreview() {
  const el = document.getElementById('parcelas-preview');
  const opcao = document.getElementById('pedido-pagamento')?.value||'';
  if (!el) return;
  const m = opcao.match(/Cartão\s*(\d+)x/i);
  if (m && parseInt(m[1])>1) {
    const totalEl = document.getElementById('resumo-total-val');
    const total = parseFloat((totalEl?.textContent||'0').replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    el.style.display='flex';
    el.querySelector('.valor').textContent = parseInt(m[1])+'x de '+fmtPreco(total/parseInt(m[1]));
  } else {
    el.style.display='none';
  }
}

// ══════════════════════════════════════
//  CLIENTE BUSCA (PEDIDO)
// ══════════════════════════════════════
function filtrarClientesBusca(q) {
  const dd = document.getElementById('cli-dropdown');
  if (!dd) return;
  const termo = (q||'').toLowerCase().trim();
  const filtered = termo
    ? clientes.filter(c => c.nome.toLowerCase().includes(termo)||(c.doc||'').includes(termo)||(c.cpf||'').includes(termo)).slice(0,8)
    : clientes.slice(0,8);
  if (!filtered.length) { dd.style.display='none'; return; }
  dd.innerHTML = filtered.map(c=>`
    <div class="cli-opt" onclick="selecionarCliente('${c.id}')">
      <div>${c.nome}</div>
      <div class="cli-sub">${c.doc||c.cpf||c.tel||''}</div>
    </div>`).join('');
  dd.style.display='block';
}
function selecionarCliente(id) {
  const c = clientes.find(x=>x.id===id);
  if (!c) return;
  document.getElementById('pedido-cliente').value = id;
  document.getElementById('cli-busca').value = c.nome;
  document.getElementById('cli-dropdown').style.display='none';
}
function popularVendedores() {
  const sel = document.getElementById('pedido-vendedor');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Selecionar —</option>' +
    vendedores.map(v=>`<option value="${v.id}">${v.nome}</option>`).join('');
  if (cur) sel.value=cur;
  else if (usuarioAtual?.nome) {
    const match = vendedores.find(v=>v.nome.toLowerCase()===usuarioAtual.nome.toLowerCase());
    if (match) sel.value=match.id;
  }
}

// ══════════════════════════════════════
//  FINALIZAR PEDIDO
// ══════════════════════════════════════
async function finalizarPedido() {
  // ── Validações básicas ──
  if (!Object.keys(cart).length)  { toast('Adicione produtos ao pedido'); return; }
  if (!document.getElementById('pedido-cliente').value)  { toast('Selecione um cliente'); return; }
  if (!document.getElementById('pedido-vendedor').value) { toast('Selecione um vendedor'); return; }

  const nfVal = document.getElementById('pedido-nf')?.value;
  if (!nfVal) {
    toast('Informe se precisa emitir NF');
    document.getElementById('pedido-nf')?.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  // ── Verificação de mínimo ──
  if (tipoPedido === 'venda' && !cpfLivreAtivo) {
    const bruto = Object.entries(cart).reduce((s,[id,i]) => {
      if (i.brinde) return s;
      const p = produtos.find(x => x.id === id);
      return s + (p ? p.preco * i.qty : 0);
    }, 0);
    const total = bruto - descontoValor;
    if (total < PEDIDO_MINIMO) {
      abrirModalSenha(() => _gravarPedido());
      return;
    }
  }

  await _gravarPedido();
}
async function _gravarPedido() {
  const clienteId  = document.getElementById('pedido-cliente').value;
  const vendedorId = document.getElementById('pedido-vendedor').value;
  const cliente    = clientes.find(c=>c.id===clienteId);
  const vendedor   = vendedores.find(v=>v.id===vendedorId);

  // ── Verificar estoque antes de gravar ──
  const semEstoque = [];
  for (const [id, item] of Object.entries(cart)) {
    if (item.brinde) continue;
    const p = produtos.find(x => x.id === id);
    if (p && p.estoque != null && Number(p.estoque) < item.qty) {
      semEstoque.push(`${p.nome} (pedido: ${item.qty}, disponível: ${p.estoque})`);
    }
  }
  if (semEstoque.length) {
    const listaErros = semEstoque.map(s => '• ' + s).join('\n');
    alert('Estoque insuficiente para finalizar o pedido:\n\n' + listaErros + '\n\nAjuste as quantidades antes de continuar.');
    toast('⚠️ Estoque insuficiente em ' + semEstoque.length + ' produto(s)');
    return;
  }

  const itensPedido = Object.entries(cart).map(([id,item])=>{
    const p = produtos.find(x=>x.id===id);
    const preco = item.brinde ? 0 : p.preco;
    return { prodId:id, nome:p.nome, sku:p.sku||'', preco, qty:item.qty, brinde:item.brinde||false, subtotal:preco*item.qty };
  });

  const isBrinde = itensPedido.every(i=>i.brinde);
  const bruto = itensPedido.reduce((s,i)=>s+i.subtotal,0);
  const valorDesc = isBrinde ? 0 : descontoValor;
  const total = bruto-valorDesc;
  const pctDesc = bruto > 0 ? Math.round(valorDesc/bruto*1000)/10 : 0;

  await dbAdd('pedidos',{
    clienteId, clienteNome:cliente.nome,
    vendedorId:vendedorId||'', vendedorNome:vendedor?.nome||'',
    tipo:isBrinde?'brinde':'venda',
    itens:itensPedido, bruto, desconto:pctDesc, valorDesconto:valorDesc, total,
    obs:document.getElementById('pedido-obs').value,
    pagamento:document.getElementById('pedido-pagamento').value,
    emitirNF:document.getElementById('pedido-nf')?.value||'',
    data:new Date().toISOString(), status:'finalizado',
  });

  // Descontar estoque
  for (const [id,item] of Object.entries(cart)) {
    const p = produtos.find(x=>x.id===id);
    if (p?.estoque!=null) {
      const novo = Math.max(0, Number(p.estoque)-item.qty);
      await dbUpdate('produtos', id, {estoque:novo});
      p.estoque = novo;
    }
  }

  pedidos = await dbGetAll('pedidos');
  pedidos.sort((a,b)=>(b._ts||0)-(a._ts||0));
  atualizarBadgeDia();
  toast(isBrinde?'🎁 Brinde registrado!':'✓ Pedido '+fmtPreco(total));
  limparPedido(true);
  fecharDrawer('drawer-resumo');
}
function limparPedido(force) {
  if (!force && Object.keys(cart).length>0) {
    if (!confirm('Limpar o pedido atual?')) return;
  }
  cart={}; descontoAtual=0; descontoValor=0; tipoPedido='venda';
  document.getElementById('pedido-cliente').value='';
  document.getElementById('cli-busca').value='';
  document.getElementById('cli-dropdown').style.display='none';
  document.getElementById('pedido-obs').value='';
  const nfEl=document.getElementById('pedido-nf'); if(nfEl) nfEl.value='';
  document.querySelectorAll('.tier').forEach(t=>t.classList.remove('active'));
  const vBtn=document.getElementById('tipo-venda-btn');
  const bBtn=document.getElementById('tipo-brinde-btn');
  if(vBtn){vBtn.classList.add('active');vBtn.classList.remove('brinde-active');}
  if(bBtn){bBtn.classList.remove('active','brinde-active');}
  document.getElementById('cart-bar').classList.remove('visible');
  salvarCarrinho();
  renderPicker();
  renderResumo();
  popularVendedores();
}

// ══════════════════════════════════════
//  HISTÓRICO
// ══════════════════════════════════════
function setFiltroHist(status) {
  filtroHistStatus = status;
  ['todos','pendente','entregue','apagar','pago'].forEach(s => {
    const btn = document.getElementById('hist-filtro-'+s);
    if (btn) btn.classList.toggle('active', s === status);
  });
  renderHistorico();
}

function renderHistorico() {
  const q=(document.getElementById('search-hist')?.value||'').toLowerCase();
  const filtered=pedidos.filter(p=>{
    if (filtroHistStatus === 'pendente' && p.entregue) return false;
    if (filtroHistStatus === 'entregue' && !p.entregue) return false;
    if (filtroHistStatus === 'apagar' && p.pago) return false;
    if (filtroHistStatus === 'pago' && !p.pago) return false;
    return (
    (p.clienteNome||'').toLowerCase().includes(q)||
    (p.vendedorNome||'').toLowerCase().includes(q)||
    (p.itens||[]).some(i=>i.nome.toLowerCase().includes(q)||(i.sku||'').toLowerCase().includes(q))
    );
  });
  const el=document.getElementById('lista-historico');
  if(!el)return;
  if(!filtered.length){el.innerHTML='<div class="empty"><div class="icon">📋</div><p>Nenhum pedido.</p></div>';return;}
  el.innerHTML=filtered.map(p=>{
    const preview=(p.itens||[]).map(i=>i.nome+' ×'+i.qty).join(', ');
    const dt=p.data?new Date(p.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    const totalHtml=p.tipo==='brinde'?'<span style="color:var(--green)">Brinde</span>':fmtPreco(p.total||0);
    const entregue = !!p.entregue;
    const pago     = !!p.pago;
    return `<div class="order-card${entregue?' order-entregue':''}" onclick="abrirPedidoDet('${p.id}')">
      <div class="order-hdr">
        <div>
          <div class="order-client">${p.clienteNome||'—'}</div>
          <div class="order-dt">${dt}${p.vendedorNome?' · '+p.vendedorNome:''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span class="badge bw">${p.pagamento||'—'}</span>
          <button onclick="marcarPago('${p.id}',event)"
            style="background:${pago?'rgba(76,175,125,.2)':'var(--s2)'};border:1px solid ${pago?'var(--green)':'var(--b)'};
                   color:${pago?'var(--green)':'var(--muted)'};font-family:var(--font);font-size:.65rem;
                   padding:3px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;transition:all .2s">
            ${pago?'$ Pago':'$ A pagar'}
          </button>
          <button onclick="marcarEntregue('${p.id}',event)"
            style="background:${entregue?'var(--green)':'var(--s2)'};border:1px solid ${entregue?'var(--green)':'var(--b)'};
                   color:${entregue?'#fff':'var(--muted)'};font-family:var(--font);font-size:.65rem;
                   padding:3px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;transition:all .2s">
            ${entregue?'✓ Entregue':'Pendente'}
          </button>
        </div>
      </div>
      <div class="order-preview">${preview}</div>
      <div class="order-ftr">
        <span class="text-muted">${(p.itens||[]).length} iten${(p.itens||[]).length!==1?'s':''}</span>
        <span class="order-total mono">${totalHtml}</span>
      </div>
    </div>`;
  }).join('');
}
function abrirPedidoDet(id) {
  const p=pedidos.find(x=>x.id===id); if(!p)return;
  pedidoDetAtual=p;
  const isAdmin=usuarioAtual?.role==='admin';
  const dt=p.data?new Date(p.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  const rows=(p.itens||[]).map((item,idx)=>{
    const isBr=item.brinde||item.preco===0;
    return `<div class="resumo-item">
      <div style="flex:1;min-width:0">
        <div style="font-size:.85rem">${item.nome}${item.sku?' <span style="color:var(--muted);font-size:.7rem">'+item.sku+'</span>':''}</div>
        ${isBr?'<span style="color:var(--green);font-size:.72rem">🎁 Brinde</span>':''}
      </div>
      <div class="qty-ctrl" style="background:var(--bg)">
        ${isAdmin?`<button onclick="editarQtyPedido('${p.id}',${idx},-1)">−</button>`:'<span style="width:26px"></span>'}
        <span class="qty-num">${item.qty}</span>
        ${isAdmin?`<button onclick="editarQtyPedido('${p.id}',${idx},1)">+</button>`:'<span style="width:26px"></span>'}
      </div>
      <span class="mono" style="min-width:72px;text-align:right;font-size:.82rem">${isBr?'—':fmtPreco(item.subtotal||item.preco*item.qty)}</span>
    </div>`;
  }).join('');
  document.getElementById('pedido-det-content').innerHTML=`
    <div class="drawer-title">${p.clienteNome||'—'}</div>
    <p class="text-muted" style="margin-bottom:14px">${dt}${p.vendedorNome?' · '+p.vendedorNome:''}</p>
    <div class="card" style="margin-bottom:12px">
      ${rows}
      ${p.desconto?`<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem;color:var(--muted)"><span>Desconto ${p.desconto}%</span><span style="color:var(--green)">- ${fmtPreco(p.valorDesconto||0)}</span></div>`:''}
      <div class="resumo-total"><span class="lbl">Total</span><span class="val">${p.tipo==='brinde'?'<span style="color:var(--green)">Brinde</span>':fmtPreco(p.total||0)}</span></div>
    </div>
    <div class="card">
      <div class="det-row" id="det-whatsapp-row">
        <span class="det-lbl">WhatsApp</span>
        <div id="det-whatsapp-btns"></div>
      </div>
      <div class="det-row"><span class="det-lbl">Pagamento</span>
        <button onclick="marcarPago('${p.id}',event)"
          style="background:${p.pago?'rgba(76,175,125,.2)':'var(--s2)'};border:1px solid ${p.pago?'var(--green)':'var(--b)'};
                 color:${p.pago?'var(--green)':'var(--muted)'};font-family:var(--font);font-size:.75rem;
                 padding:4px 12px;border-radius:6px;cursor:pointer;transition:all .2s">
          ${p.pago?'$ Pago':'$ A pagar — clique para marcar como pago'}
        </button>
      </div>
      <div class="det-row"><span class="det-lbl">Entrega</span>
        <button onclick="marcarEntregue('${p.id}',event)"
          style="background:${p.entregue?'var(--green)':'var(--s2)'};border:1px solid ${p.entregue?'var(--green)':'var(--b)'};
                 color:${p.entregue?'#fff':'var(--muted)'};font-family:var(--font);font-size:.75rem;
                 padding:4px 12px;border-radius:6px;cursor:pointer;transition:all .2s">
          ${p.entregue?'✓ Entregue':'⏳ Pendente — clique para marcar como entregue'}
        </button>
      </div>
      <div class="det-row"><span class="det-lbl">Pagamento</span><span>${p.pagamento||'—'}</span></div>
      <div class="det-row"><span class="det-lbl">Emitir NF</span><span style="color:${p.emitirNF==='sim'?'var(--green)':'var(--muted)'}">${p.emitirNF==='sim'?'✓ Sim':'✗ Não'}</span></div>
      <div class="det-row"><span class="det-lbl">Vendedor</span><span>${p.vendedorNome||'—'}</span></div>
      ${p.obs?`<div class="det-row"><span class="det-lbl">Obs.</span><span>${p.obs}</span></div>`:''}
    </div>`;
  // ── WhatsApp ──
  const cliDet = clientes.find(c => c.id === p.clienteId);
  const telRaw = cliDet ? (cliDet.tipo === 'cpf' ? (cliDet.telCpf||cliDet.tel||'') : (cliDet.tel||'')) : '';
  const waEl  = document.getElementById('det-whatsapp-btns');
  const rowEl = document.getElementById('det-whatsapp-row');
  if (waEl && rowEl) {
    if (telRaw) {
      const tel   = telRaw.replace(/\D/g,'');
      const telBR = tel.startsWith('55') ? tel : '55'+tel;
      const dtFmt = p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '';
      const linhas = (p.itens||[]).map(i =>
        '• ' + i.nome + (i.sku?' ('+i.sku+')':'') + ' x'+i.qty +
        (i.brinde ? ' — Brinde' : '  '+fmtPreco(i.preco*i.qty))
      ).join('\n');
      const msgCompleta = 'Olá '+(cliDet?.nome||'')+'! Segue o resumo do seu pedido Saint Germain de '+dtFmt+':\n\n'+
        linhas +
        (p.valorDesconto>0 ? '\n\nDesconto: - '+fmtPreco(p.valorDesconto) : '') +
        '\n\n*Total: '+fmtPreco(p.total||0)+'*' +
        '\nPagamento: '+(p.pagamento||'—') +
        (p.obs ? '\nObs: '+p.obs : '');
      const msgSimples = 'Olá '+(cliDet?.nome||'')+'!';
      const base = 'https://wa.me/'+telBR;
      const btnStyle = (bg,color,border) =>
        'display:inline-flex;align-items:center;gap:5px;background:'+bg+';color:'+color+
        ';border:1px solid '+border+';font-family:var(--font);font-size:.75rem;'+
        'padding:6px 12px;border-radius:8px;text-decoration:none;white-space:nowrap';
      const waSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">'+
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>'+
        '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.847L0 24l6.338-1.497A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.36-.213-3.733.881.936-3.619-.234-.372A9.818 9.818 0 1112 21.818z"/></svg>';
      waEl.innerHTML =
        '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
          '<a href="'+base+'?text='+encodeURIComponent(msgCompleta)+'" target="_blank" style="'+btnStyle('#25d366','#fff','#25d366')+'">'+
            waSvg+' Enviar mensagem</a>'+
          '<a href="'+base+'" target="_blank" style="'+btnStyle('var(--s2)','var(--text)','var(--b)')+'">'+
            waSvg+' Só abrir chat</a>'+
        '</div>';
      rowEl.style.display = 'flex';
    } else {
      rowEl.style.display = 'none';
    }
  }

  abrirDrawer('drawer-pedido-det');
}

async function marcarPago(id, e) {
  if (e) e.stopPropagation();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const novoStatus = p.pago ? false : true;
  await dbUpdate('pedidos', id, { pago: novoStatus });
  p.pago = novoStatus;
  toast(novoStatus ? '✓ Pedido marcado como pago' : 'Pedido marcado como a pagar');
  renderHistorico();
  if (pedidoDetAtual?.id === id) {
    pedidoDetAtual.pago = novoStatus;
    abrirPedidoDet(id);
  }
}

async function marcarEntregue(id, e) {
  if (e) e.stopPropagation();
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const novoStatus = p.entregue ? false : true;
  await dbUpdate('pedidos', id, { entregue: novoStatus });
  p.entregue = novoStatus;
  toast(novoStatus ? '✓ Pedido marcado como entregue' : 'Pedido marcado como pendente');
  renderHistorico();
  if (pedidoDetAtual?.id === id) {
    pedidoDetAtual.entregue = novoStatus;
    abrirPedidoDet(id);
  }
}

async function editarPedidoAtual() {
  const p = pedidoDetAtual;
  if (!p) return;
  const podeEditar = usuarioAtual?.role === 'admin' ||
    (p.vendedorId && vendedores.find(v => v.nome.toLowerCase() === usuarioAtual?.nome?.toLowerCase())?.id === p.vendedorId);
  if (!podeEditar) { toast('Sem permissão para editar este pedido'); return; }
  if (!confirm('Editar este pedido? Ele será removido do histórico e os produtos voltarão ao carrinho.')) return;

  // Recarrega produtos para estoque atualizado
  produtos = await dbGetAll('produtos');
  // Restore stock
  for (const item of p.itens||[]) {
    const prod = produtos.find(x => x.id === item.prodId);
    if (prod&&prod.estoque != null) {
      const restored = Number(prod.estoque) + item.qty;
      await dbUpdate('produtos', item.prodId, { estoque: restored });
      prod.estoque = restored;
    }
  }
  // Delete the pedido
  await dbDelete('pedidos', p.id);
  pedidos = pedidos.filter(x => x.id !== p.id);

  // Restore cart
  cart = {};
  descontoValor = p.valorDesconto || 0;
  descontoAtual = p.desconto || 0;
  tipoPedido = p.tipo === 'brinde' ? 'brinde' : 'venda';

  for (const item of p.itens||[]) {
    cart[item.prodId] = { qty: item.qty, brinde: item.brinde || false };
  }

  // Restore form fields
  const clienteEl = document.getElementById('pedido-cliente');
  const buscaEl   = document.getElementById('cli-busca');
  const vendEl    = document.getElementById('pedido-vendedor');
  const pagEl     = document.getElementById('pedido-pagamento');
  const obsEl     = document.getElementById('pedido-obs');
  const nfEl      = document.getElementById('pedido-nf');
  if (clienteEl) clienteEl.value = p.clienteId || '';
  if (buscaEl)   buscaEl.value   = p.clienteNome || '';
  if (vendEl)    vendEl.value    = p.vendedorId || '';
  if (pagEl)     pagEl.value     = p.pagamento || 'PIX';
  if (obsEl)     obsEl.value     = p.obs || '';
  if (nfEl)      nfEl.value      = p.emitirNF || '';

  // Restore tipo buttons
  setTipoPedido(tipoPedido);

  salvarCarrinho();
  fecharDrawer('drawer-pedido-det');
  setTab(document.querySelector('[data-tab="pedido"]'));
  renderPicker();
  renderResumo();
  atualizarCartBar();
  atualizarBadgeDia();
  toast('Pedido aberto para edição');
}

async function excluirPedidoAtual() {
  if(!pedidoDetAtual||!confirm('Excluir pedido?'))return;
  // Recarrega produtos do Firebase para ter estoque atualizado
  produtos = await dbGetAll('produtos');
  // Restaura estoque
  for(const item of pedidoDetAtual.itens||[]) {
    const p=produtos.find(x=>x.id===item.prodId);
    if(p&&p.estoque!=null) {
      const novoEstoque = Number(p.estoque)+item.qty;
      await dbUpdate('produtos',item.prodId,{estoque:novoEstoque});
      p.estoque=novoEstoque;
    }
  }
  await dbDelete('pedidos',pedidoDetAtual.id);
  pedidos=pedidos.filter(x=>x.id!==pedidoDetAtual.id);
  fecharDrawer('drawer-pedido-det');
  renderHistorico(); renderProdutos(); renderPicker(); atualizarBadgeDia();
  toast('Pedido excluído — estoque restaurado');
}
async function editarQtyPedido(pedidoId,itemIdx,delta) {
  const p=pedidos.find(x=>x.id===pedidoId); if(!p)return;
  const item=p.itens[itemIdx]; if(!item)return;
  const nova=Math.max(1,item.qty+delta);
  // Recarrega produtos para estoque atualizado
  produtos = await dbGetAll('produtos');
  // Ajusta estoque (delta negativo = devolvendo, aumenta estoque)
  const prod=produtos.find(x=>x.id===item.prodId);
  if(prod&&prod.estoque!=null) {
    const diff=nova-item.qty;
    const novoEst=Math.max(0,Number(prod.estoque)-diff);
    await dbUpdate('produtos',prod.id,{estoque:novoEst});
    prod.estoque=novoEst;
  }
  item.qty=nova;
  item.subtotal=item.preco*nova;
  p.bruto=(p.itens||[]).reduce((s,i)=>s+i.subtotal,0);
  p.valorDesconto=p.bruto*((p.desconto||0)/100);
  p.total=p.bruto-p.valorDesconto;
  await dbUpdate('pedidos',pedidoId,{itens:p.itens,bruto:p.bruto,valorDesconto:p.valorDesconto,total:p.total});
  abrirPedidoDet(pedidoId);
}
function imprimirPedidoExistente() {
  if(pedidoDetAtual)gerarImpressao(pedidoDetAtual);
}
function exportarPDFCliente() {
  if(!pedidoDetAtual)return;
  gerarImpressao(pedidoDetAtual);
}
