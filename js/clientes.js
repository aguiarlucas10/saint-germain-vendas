// ══════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════
function renderClientes() {
  const q=(document.getElementById('search-clientes')?.value||'').toLowerCase();
  const filtered=clientes.filter(c=>c.nome.toLowerCase().includes(q)||(c.doc||'').includes(q)||(c.cpf||'').includes(q));
  const el=document.getElementById('lista-clientes');
  if(!el)return;
  if(!filtered.length){el.innerHTML='<div class="empty"><div class="icon">👥</div><p>Nenhum cliente.</p></div>';return;}
  el.innerHTML=filtered.map(c=>{
    const isCpf=c.tipo==='cpf';
    const sub=isCpf?(c.cpf||c.telCpf||'—'):(c.doc||c.tel||'—');
    return `<div class="list-item" onclick="abrirDetalhes('cliente','${c.id}')">
      <div class="info">
        <div class="name">${c.nome} ${isCpf?'<span class="badge bw" style="font-size:.58rem">CPF</span>':''}</div>
        <div class="sub">${sub}</div>
      </div>
      <span class="chevron">›</span>
    </div>`;
  }).join('');
}
function abrirNovoCliente() {
  document.getElementById('drawer-cliente-title').textContent='Novo Cliente';
  document.getElementById('cli-id').value='';
  setTipoCliente('loja');
  ['cli-nome','cli-doc','cli-ie','cli-tel','cli-email','cli-end','cli-cpf','cli-tel-cpf','cli-obs'].forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
  abrirDrawer('drawer-cliente');
}
function editarCliente(id) {
  const c=clientes.find(x=>x.id===id);
  if(!c)return;
  document.getElementById('drawer-cliente-title').textContent='Editar Cliente';
  document.getElementById('cli-id').value=c.id;
  setTipoCliente(c.tipo||'loja');
  document.getElementById('cli-nome').value=c.nome||'';
  document.getElementById('cli-doc').value=c.doc||'';
  document.getElementById('cli-ie').value=c.ie||'';
  document.getElementById('cli-tel').value=c.tel||'';
  document.getElementById('cli-email').value=c.email||'';
  document.getElementById('cli-end').value=c.end||'';
  document.getElementById('cli-cpf').value=c.cpf||'';
  document.getElementById('cli-tel-cpf').value=c.telCpf||'';
  document.getElementById('cli-obs').value=c.obs||'';
  abrirDrawer('drawer-cliente');
}
function setTipoCliente(tipo) {
  tipoClienteAtual=tipo;
  document.getElementById('cli-tipo-loja').classList.toggle('active',tipo==='loja');
  document.getElementById('cli-tipo-cpf').classList.toggle('active',tipo==='cpf');
  document.getElementById('cli-campos-loja').style.display=tipo==='loja'?'':'none';
  document.getElementById('cli-campos-cpf').style.display=tipo==='cpf'?'':'none';
  document.getElementById('cli-nome-label').textContent=tipo==='cpf'?'Nome *':'Nome / Razão Social *';
}
async function salvarCliente() {
  const nome=document.getElementById('cli-nome').value.trim();
  if(!nome){toast('Nome obrigatório');return;}
  const isCpf=tipoClienteAtual==='cpf';
  const telVal = isCpf
    ? (document.getElementById('cli-tel-cpf')?.value.trim()||'')
    : (document.getElementById('cli-tel')?.value.trim()||'');
  if(!telVal){toast('Telefone obrigatório');return;}
  const data={nome,tipo:tipoClienteAtual,
    doc:isCpf?'':(document.getElementById('cli-doc')?.value.trim()||''),
    ie:isCpf?'':(document.getElementById('cli-ie')?.value.trim()||''),
    tel:isCpf?'':(document.getElementById('cli-tel')?.value.trim()||''),
    email:isCpf?'':(document.getElementById('cli-email')?.value.trim()||''),
    end:isCpf?'':(document.getElementById('cli-end')?.value.trim()||''),
    cpf:isCpf?(document.getElementById('cli-cpf')?.value.trim()||''):'',
    telCpf:isCpf?(document.getElementById('cli-tel-cpf')?.value.trim()||''):'',
    obs:document.getElementById('cli-obs').value.trim(),
  };
  const id=document.getElementById('cli-id').value;
  if(id){await dbUpdate('clientes',id,data);const i=clientes.findIndex(x=>x.id===id);if(i>=0)clientes[i]={...clientes[i],...data};toast('Cliente atualizado');}
  else{await dbAdd('clientes',data);clientes=await dbGetAll('clientes');toast('Cliente adicionado');}
  fecharDrawer('drawer-cliente');
  renderClientes();
}
async function excluirCliente(id) {
  if(!confirm('Excluir cliente?'))return;
  await dbDelete('clientes',id);
  clientes=clientes.filter(x=>x.id!==id);
  renderClientes(); toast('Cliente removido');
}

function exportarCSVClientes() {
  if (!clientes.length) { toast('Nenhum cliente cadastrado'); return; }

  // Agrega totais por cliente a partir dos pedidos
  const agg = {};
  pedidos.forEach(p => {
    const cid = p.clienteId;
    if (!cid) return;
    if (!agg[cid]) agg[cid] = { total: 0, qtdPedidos: 0, ultimaCompra: '' };
    agg[cid].total += (p.total || 0);
    agg[cid].qtdPedidos += 1;
    const dt = p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '';
    if (!agg[cid].ultimaCompra || new Date(p.data) > new Date(agg[cid]._rawDate || 0)) {
      agg[cid].ultimaCompra = dt;
      agg[cid]._rawDate = p.data;
    }
  });

  const linhas = [['Tipo','Nome / Razão Social','CNPJ','IE','CPF','Telefone','E-mail','Endereço','Observações','Qtd Pedidos','Total Compras (R$)','Última Compra']];
  clientes.forEach(c => {
    const isCpf = c.tipo === 'cpf';
    const stats = agg[c.id] || { total: 0, qtdPedidos: 0, ultimaCompra: '' };
    linhas.push([
      isCpf ? 'CPF' : 'CNPJ',
      c.nome || '',
      isCpf ? '' : (c.doc || ''),
      isCpf ? '' : (c.ie || ''),
      isCpf ? (c.cpf || '') : '',
      isCpf ? (c.telCpf || '') : (c.tel || ''),
      isCpf ? '' : (c.email || ''),
      isCpf ? '' : (c.end || ''),
      c.obs || '',
      stats.qtdPedidos,
      stats.total.toFixed(2),
      stats.ultimaCompra,
    ]);
  });

  const csv = linhas.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'clientes_sg_' + new Date().toLocaleDateString('pt-BR').replace(/\//g, '-') + '.csv';
  a.click();
  toast(clientes.length + ' clientes exportados!');
}

// ══════════════════════════════════════
//  EQUIPE
// ══════════════════════════════════════
async function toggleCpfLivre() {
  if (!cpfLivreAtivo) {
    if (!confirm('Ativar modo CPF Livre?\n\nClientes com CPF poderão fazer pedidos sem valor mínimo enquanto este modo estiver ativo.')) return;
    cpfLivreAtivo = true;
    await dbUpdate('configuracoes', 'cpf_livre', { ativo: true });
    toast('✓ Modo Livre ativado — todos os vendedores podem finalizar abaixo de R$1.000');
  } else {
    if (!confirm('Desativar modo CPF Livre?\n\nO valor mínimo de R$1.000 voltará a ser exigido para todos os clientes.')) return;
    cpfLivreAtivo = false;
    await dbUpdate('configuracoes', 'cpf_livre', { ativo: false });
    toast('Modo Livre desativado — mínimo de R$1.000 exigido');
  }
  renderEquipe();
}

function renderEquipe() {
  // CPF Livre toggle card
  const cfgEl=document.getElementById('equipe-config');
  if(cfgEl){
    cfgEl.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div>
          <div style="font-size:.9rem;margin-bottom:3px">Modo CPF Livre</div>
          <div style="font-size:.75rem;color:var(--muted);line-height:1.5">Quando ativo, clientes CPF podem comprar sem valor mínimo</div>
        </div>
        <button onclick="toggleCpfLivre()"
          style="flex-shrink:0;background:${cpfLivreAtivo?'var(--green)':'var(--s2)'};border:1px solid ${cpfLivreAtivo?'var(--green)':'var(--b)'};color:${cpfLivreAtivo?'#fff':'var(--muted)'};font-family:var(--font);font-size:.82rem;padding:8px 16px;border-radius:8px;cursor:pointer;transition:all .2s;white-space:nowrap">
          ${cpfLivreAtivo?'✓ Ativo':'Desativado'}
        </button>
      </div>`;
  }
  const el=document.getElementById('lista-equipe');
  if(!el)return;
  if(!vendedores.length){el.innerHTML='<div class="empty"><div class="icon">🧑‍💼</div><p>Nenhum usuário.</p></div>';return;}
  el.innerHTML=vendedores.map(v=>`
    <div class="list-item" onclick="abrirDetalhes('vendedor','${v.id}')">
      <div class="info">
        <div class="name">${v.nome} <span class="badge ${v.role==='admin'?'bw':'bg'}" style="font-size:.6rem;margin-left:4px">${v.role==='admin'?'Admin':'Vendedor'}</span></div>
        <div class="sub">${v.tel||''}${v.senha?'':' ⚠️ sem senha'}</div>
      </div>
      <span class="chevron">›</span>
    </div>`).join('');
}
function abrirNovoUsuario() {
  document.getElementById('drawer-usuario-title').textContent='Novo Usuário';
  document.getElementById('usr-id').value='';
  ['usr-nome','usr-tel','usr-senha'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('usr-role').value='vendedor';
  abrirDrawer('drawer-usuario');
}
function editarVendedor(id) {
  const v=vendedores.find(x=>x.id===id);
  if(!v)return;
  document.getElementById('drawer-usuario-title').textContent='Editar Usuário';
  document.getElementById('usr-id').value=v.id;
  document.getElementById('usr-nome').value=v.nome||'';
  document.getElementById('usr-tel').value=v.tel||'';
  document.getElementById('usr-role').value=v.role||'vendedor';
  document.getElementById('usr-senha').value='';
  abrirDrawer('drawer-usuario');
}
async function salvarUsuario() {
  const nome=document.getElementById('usr-nome').value.trim();
  const senha=document.getElementById('usr-senha').value.trim();
  const role=document.getElementById('usr-role').value;
  const id=document.getElementById('usr-id').value;
  if(!nome){toast('Informe o nome');return;}
  if(!id&&!senha){toast('Informe uma senha');return;}
  if(senha&&senha.length<4){toast('Senha: mínimo 4 caracteres');return;}
  const data={nome,tel:document.getElementById('usr-tel').value.trim(),role};
  if(senha)data.senha=senha;
  if(id){await dbUpdate('vendedores',id,data);toast('Usuário atualizado');}
  else{await dbAdd('vendedores',data);toast('Usuário adicionado');}
  vendedores=await dbGetAll('vendedores');
  fecharDrawer('drawer-usuario');
  renderEquipe(); popularVendedores();
}
async function excluirVendedor(id) {
  if(!confirm('Excluir usuário?'))return;
  await dbDelete('vendedores',id);
  vendedores=vendedores.filter(x=>x.id!==id);
  renderEquipe(); popularVendedores();
  toast('Usuário removido');
}
