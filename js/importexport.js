// ══════════════════════════════════════
//  IMPORT CSV (PRODUTOS)
// ══════════════════════════════════════
function abrirImportCSV() {
  document.getElementById('csv-preview').style.display='none';
  document.getElementById('csv-input').value='';
  abrirDrawer('drawer-import-csv');
}
function lerCSV(event) {
  const file=event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>processarCSV(e.target.result);
  reader.readAsText(file,'UTF-8');
  event.target.value='';
}
function normCol(s){return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function parseCSVLine(line, sep) {
  // Handles quoted fields (e.g. "79,90") correctly
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === sep && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += c; }
  }
  cols.push(cur.trim());
  return cols;
}
function processarCSV(txt) {
  // Detect separator: prefer ; if present, else ,
  const linhas = txt.split(/\r?\n/).filter(l => l.trim());
  if (linhas.length < 2) { toast('CSV vazio'); return; }
  // Count unquoted semicolons vs commas in header
  let semis = 0, commas = 0, inQ = false;
  for (const c of linhas[0]) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && c === ';') semis++;
    else if (!inQ && c === ',') commas++;
  }
  const sep = semis >= commas ? ';' : ',';
  const hdr = parseCSVLine(linhas[0], sep).map(normCol);
  const iN = hdr.findIndex(h => ['nome','produto','descricao'].includes(h));
  const iP = hdr.findIndex(h => ['preco','valor','pvenda'].includes(h));
  const iS = hdr.findIndex(h => ['sku','codigo','cod','ref'].includes(h));
  const iC = hdr.findIndex(h => ['categoria','grupo','tipo'].includes(h));
  const iE = hdr.findIndex(h => ['estoque','qty','quantidade','qtd','stock','saldo'].includes(h));
  const iU = hdr.findIndex(h => ['unidade','un','unit'].includes(h));
  if (iN < 0) { toast('Coluna "nome" não encontrada'); return; }
  if (iP < 0) { toast('Coluna "preco" não encontrada'); return; }
  csvParaImportar = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = parseCSVLine(linhas[i], sep);
    const nome = cols[iN]; if (!nome) continue;
    const precoStr = (cols[iP] || '0').replace(/[R$\s]/g, '').replace(',', '.');
    const preco = parseFloat(precoStr);
    if (isNaN(preco)) continue;
    const estoqueRaw = iE >= 0 ? cols[iE] : '';
    const estoque = estoqueRaw !== '' ? parseInt(estoqueRaw, 10) : null;
    csvParaImportar.push({
      nome, preco,
      sku:      iS >= 0 ? cols[iS] || '' : '',
      categoria: iC >= 0 ? cols[iC] || '' : '',
      unidade:  iU >= 0 ? cols[iU] || '' : '',
      estoque:  !isNaN(estoque) ? estoque : null,
    });
  }
  if(!csvParaImportar.length){toast('Nenhum produto válido');return;}
  document.getElementById('csv-info').textContent=csvParaImportar.length+' produtos encontrados';
  const prev=csvParaImportar.slice(0,6);
  document.getElementById('csv-rows').innerHTML=prev.map(p=>`<div class="imp-row"><span>${p.nome}</span><span class="mono" style="color:var(--muted);font-size:.75rem">${p.categoria||'—'}</span><span class="mono">${fmtPreco(p.preco)}</span>${p.estoque!=null?`<span class="mono" style="color:var(--green);font-size:.75rem">${p.estoque} un.</span>`:'<span></span>'}</div>`).join('')+(csvParaImportar.length>6?`<div class="imp-row" style="color:var(--muted)">...e mais ${csvParaImportar.length-6}</div>`:'');
  document.getElementById('csv-preview').style.display='block';
}
async function confirmarImportacao() {
  if(!csvParaImportar.length)return;
  await dbAddBatch('produtos',csvParaImportar);
  produtos=await dbGetAll('produtos');
  fecharDrawer('drawer-import-csv');
  renderProdutos(); renderPicker();
  toast(csvParaImportar.length+' produtos importados!');
  csvParaImportar=[];
}

// ══════════════════════════════════════
//  EXPORT / IMPORT (PEDIDOS)
// ══════════════════════════════════════
function exportarCSV() {
  if(!pedidos.length){toast('Nenhum pedido');return;}
  const linhas=[['Data','Cliente','Vendedor','Produtos','Bruto','Desconto%','Desconto R$','Total','Pagamento','Obs']];
  pedidos.forEach(p=>linhas.push([
    p.data?new Date(p.data).toLocaleDateString('pt-BR'):'',
    p.clienteNome||'',p.vendedorNome||'',
    (p.itens||[]).map(i=>i.nome+' x'+i.qty).join('; '),
    (p.bruto||p.total||0).toFixed(2),(p.desconto||0)+'%',
    (p.valorDesconto||0).toFixed(2),(p.total||0).toFixed(2),
    p.pagamento||'',p.obs||''
  ]));
  const csv=linhas.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='pedidos_sg_'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')+'.csv';
  a.click(); toast('CSV exportado!');
}
function exportarJSON() {
  if(!pedidos.length){toast('Nenhum pedido');return;}
  const blob=new Blob([JSON.stringify({exportadoEm:new Date().toISOString(),app:'Saint Germain B2B',pedidos},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='pedidos_sg_'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')+'.json';
  a.click(); toast(pedidos.length+' pedidos exportados!');
}
function abrirImportJSON() {
  document.getElementById('json-preview').style.display='none';
  document.getElementById('json-input').value='';
  abrirDrawer('drawer-import-json');
}
function lerJSON(event) {
  const file=event.target.files[0]; if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    try {
      const data=JSON.parse(e.target.result);
      const lista=Array.isArray(data)?data:(data.pedidos||[]);
      if(!lista.length){toast('Nenhum pedido no arquivo');return;}
      const ts=new Set(pedidos.map(p=>p._ts).filter(Boolean));
      jsonParaImportar=lista.filter(p=>!p._ts||!ts.has(p._ts));
      document.getElementById('json-info').innerHTML=
        `📦 <strong>${lista.length}</strong> pedidos no arquivo<br>✅ <strong>${jsonParaImportar.length}</strong> novos<br><span style="color:var(--muted)">⏭ ${lista.length-jsonParaImportar.length} já existem</span>`;
      document.getElementById('json-preview').style.display='block';
    } catch(e){toast('JSON inválido');}
  };
  r.readAsText(file,'UTF-8');
  event.target.value='';
}
async function confirmarImportacaoJSON() {
  if(!jsonParaImportar.length){toast('Nenhum pedido novo');return;}
  let ok=0;
  for(const p of jsonParaImportar){
    try{const{id,...dados}=p;await dbAdd('pedidos',dados);ok++;}catch(e){}
  }
  pedidos=await dbGetAll('pedidos');
  pedidos.sort((a,b)=>(b._ts||0)-(a._ts||0));
  fecharDrawer('drawer-import-json');
  renderHistorico(); atualizarBadgeDia();
  toast(ok+' pedido(s) importado(s)!');
  jsonParaImportar=[];
}

// ══════════════════════════════════════
//  IMPRESSÃO / PDF
// ══════════════════════════════════════
function gerarImpressao(p, downloadMode) {
  const dt=new Date(p.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const rows=(p.itens||[]).map(i=>{
    const isBr=i.brinde||i.preco===0;
    return `<tr>
      <td>${i.sku||''}</td><td>${i.nome}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${isBr?'—':fmtPreco(i.preco)}</td>
      <td style="text-align:right">${isBr?'<span style="color:#4caf7d">Brinde</span>':fmtPreco(i.subtotal||i.preco*i.qty)}</td>
    </tr>`;
  }).join('');
  const descRow=p.desconto?`<tr style="color:#888"><td colspan="4" style="text-align:right;padding-top:8px">Desconto ${p.desconto}%</td><td style="text-align:right;padding-top:8px">- ${fmtPreco(p.valorDesconto||0)}</td></tr>`:'';
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Questrial&display=swap" rel="stylesheet"/>
  <style>body{font-family:'Questrial',sans-serif;padding:40px;color:#000;max-width:720px;margin:0 auto}
  .hdr{display:flex;justify-content:space-between;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #000}
  .brand{font-size:1rem;letter-spacing:.12em;text-transform:uppercase}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .info label{font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;color:#888;display:block;margin-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{border-bottom:2px solid #000;text-align:left;padding:7px 0;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase}
  td{border-bottom:1px solid #eee;padding:8px 0;font-size:.85rem}
  .total{text-align:right;padding-top:12px;border-top:2px solid #000;font-size:1.05rem}
  .footer{margin-top:48px;padding-top:12px;border-top:1px solid #eee;font-size:.7rem;color:#aaa;display:flex;justify-content:space-between}
  <\/style><\/head><body>
  <div class="hdr"><div><div class="brand">Saint Germain</div><div style="font-size:.8rem;color:#666;margin-top:4px">Pedido de Venda</div></div>
  <div style="text-align:right;font-size:.82rem;color:#666"><div>${dt}</div><div style="margin-top:4px;background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:.75rem;display:inline-block">${p.pagamento||'—'}</div></div></div>
  <div class="info">
    <div><label>Cliente</label><strong>${p.clienteNome||'—'}</strong></div>
    <div><label>Vendedor</label><span>${p.vendedorNome||'—'}</span></div>
    <div><label>Emitir NF</label><span>${p.emitirNF==='sim'?'Sim':'Não'}</span></div>
    ${p.obs?`<div style="grid-column:1/-1"><label>Observações</label><span>${p.obs}</span></div>`:''}
  </div>
  <table><thead><tr><th>SKU</th><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Preço Un.</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${rows}${descRow}</tbody></table>
  ${(()=>{
    const mapaC={};
    (p.itens||[]).forEach(i=>{
      const prod=produtos.find(x=>x.id===i.prodId);
      const cat=prod?.categoria||i.nome.split(' ')[0]||'Outros';
      mapaC[cat]=(mapaC[cat]||0)+i.qty;
    });
    const entries=Object.entries(mapaC).sort((a,b)=>a[0].localeCompare(b[0]));

    return`<div style="margin-bottom:16px;padding:10px 14px;background:#f8f8f8;border-radius:6px;font-size:.8rem">
      <div style="font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:6px">Resumo por categoria</div>
      ${entries.map(([cat,qty])=>`<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${cat}</span><span style="font-family:monospace">${qty} un.</span></div>`).join('')}
    </div>`;
  })()}
  <div class="total"><strong>TOTAL: ${fmtPreco(p.total||0)}</strong></div>
  <div class="footer"><span>Saint Germain · B2B</span><span>Emitido em ${new Date().toLocaleDateString('pt-BR')}</span></div>
  <\/body><\/html>`);
  w.document.close();
  if (downloadMode) {
    setTimeout(() => {
      try { w.print(); } catch(e) {}
    }, 600);
  } else {
    setTimeout(()=>w.print(),500);
  }
}

function enviarPdfWhatsApp(pedidoId, telBR) {
  const p = pedidos.find(x => x.id === pedidoId);
  if (!p) return;

  gerarImpressao(p, true);

  const nome = p.clienteNome || '';
  const dt   = p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '';
  const msg  = encodeURIComponent(
    'Olá ' + nome + '! Segue o PDF do seu pedido Saint Germain de ' + dt + '. ' +
    'O arquivo foi salvo no seu dispositivo — por favor anexe-o a esta conversa.'
  );
  setTimeout(() => {
    window.open('https://wa.me/' + telBR + '?text=' + msg, '_blank');
  }, 800);

  toast('📄 PDF baixado — abra o WhatsApp e anexe o arquivo');
}
