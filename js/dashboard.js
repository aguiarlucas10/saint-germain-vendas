// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
function popularDashFiltros() {
  const sv=document.getElementById('dash-vendedor'); if(!sv)return;
  const cv=sv.value;
  sv.innerHTML='<option value="">Todos</option>'+vendedores.map(v=>`<option value="${v.id}">${v.nome}</option>`).join('');
  if(cv)sv.value=cv;
  const sc=document.getElementById('dash-categoria'); if(!sc)return;
  const cc=sc.value;
  const cats=[...new Set(produtos.map(p=>p.categoria||'').filter(Boolean))].sort();
  sc.innerHTML='<option value="">Todas</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(cc)sc.value=cc;
}
function onPeriodoChange() {
  const v=document.getElementById('dash-periodo').value;
  document.getElementById('dash-data').style.display=v==='data'?'block':'none';
  renderDashboard();
}
function filtrarPedidosDash() {
  const periodo=document.getElementById('dash-periodo')?.value||'geral';
  const dataUnica=document.getElementById('dash-data')?.value||'';
  const vendId=document.getElementById('dash-vendedor')?.value||'';
  const cat=document.getElementById('dash-categoria')?.value||'';
  const agora=new Date();
  const hoje=new Date(agora.getFullYear(),agora.getMonth(),agora.getDate());
  return pedidos.filter(p=>{
    if(p.tipo==='brinde')return false;
    if(periodo==='hoje'&&new Date(p.data)<hoje)return false;
    if(periodo==='7d'&&new Date(p.data)<new Date(agora-7*864e5))return false;
    if(periodo==='data'){
      if(!dataUnica)return false;
      const[y,m,d]=dataUnica.split('-').map(Number);
      const ini=new Date(y,m-1,d),fim=new Date(y,m-1,d+1);
      if(new Date(p.data)<ini||new Date(p.data)>=fim)return false;
    }
    if(vendId&&p.vendedorId!==vendId)return false;
    return true;
  }).map(p=>{
    if(!cat)return p;
    const itsFilt=(p.itens||[]).filter(i=>{
      const prod=produtos.find(x=>x.id===i.prodId);
      return prod&&(prod.categoria||'')===cat;
    });
    if(!itsFilt.length)return null;
    const bruto=itsFilt.reduce((s,i)=>s+i.preco*i.qty,0);
    const vDesc=bruto*((p.desconto||0)/100);
    return{...p,itens:itsFilt,bruto,valorDesconto:vDesc,total:bruto-vDesc};
  }).filter(Boolean);
}

function svgPieValor(data) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return '<p class="text-muted" style="text-align:center;padding:16px 0">Sem dados</p>';
  const R=52, cx=60, cy=60;
  let angle = -Math.PI/2;
  const slices = data.map(d=>{
    const sweep = (d.value/total)*2*Math.PI;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    angle += sweep;
    const x2=cx+R*Math.cos(angle), y2=cy+R*Math.sin(angle);
    const large = sweep>Math.PI?1:0;
    return {path:`M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
            color:d.color, label:d.label, value:d.value, pct:Math.round(d.value/total*100)};
  });
  const svg=`<svg viewBox="0 0 120 120" width="100" height="100" style="display:block;margin:0 auto 10px">
    ${slices.map(s=>`<path d="${s.path}" fill="${s.color}" stroke="var(--s1)" stroke-width="1.5"/>`).join('')}
  </svg>`;
  const legend=`<div class="pie-legend">${slices.map(s=>`
    <div class="pie-leg-row">
      <div class="pie-dot" style="background:${s.color}"></div>
      <span class="pie-lbl">${s.label}</span>
      <span class="pie-val" style="color:var(--text)">${fmtPreco(s.value)}</span>
      <span class="pie-val" style="color:var(--muted);margin-left:4px">${s.pct}%</span>
    </div>`).join('')}</div>`;
  return `<div class="pie-wrap">${svg}${legend}</div>`;
}

function svgPie(data) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return '<p class="text-muted" style="text-align:center;padding:16px 0">Sem dados</p>';
  const R=52, cx=60, cy=60;
  let angle = -Math.PI/2;
  const slices = data.map(d=>{
    const sweep = (d.value/total)*2*Math.PI;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    angle += sweep;
    const x2=cx+R*Math.cos(angle), y2=cy+R*Math.sin(angle);
    const large = sweep>Math.PI?1:0;
    return {path:`M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`, color:d.color, label:d.label, value:d.value, pct:Math.round(d.value/total*100)};
  });
  const svg=`<svg viewBox="0 0 120 120" width="100" height="100" style="display:block;margin:0 auto 10px">
    ${slices.map(s=>`<path d="${s.path}" fill="${s.color}" stroke="var(--s1)" stroke-width="1.5"/>`).join('')}
  </svg>`;
  const legend=`<div class="pie-legend">${slices.map(s=>`
    <div class="pie-leg-row">
      <div class="pie-dot" style="background:${s.color}"></div>
      <span class="pie-leg-label">${s.label}</span>
      <span class="pie-leg-val">${s.pct}%</span>
    </div>`).join('')}</div>`;
  return `<div class="pie-wrap">${svg}${legend}</div>`;
}

function renderDashboard() {
  const kpisEl=document.getElementById('dash-kpis');
  const rankEl=document.getElementById('dash-ranking');
  if(!kpisEl||!rankEl)return;
  popularDashFiltros();
  const peds=filtrarPedidosDash();
  const fat=peds.reduce((s,p)=>s+(p.total||0),0);
  const n=peds.length;
  const ticket=n?fat/n:0;
  const itens=peds.reduce((s,p)=>s+(p.itens||[]).reduce((si,i)=>si+i.qty,0),0);
  const descMed=n?peds.reduce((s,p)=>s+(p.desconto||0),0)/n:0;

  // ── KPIs ──
  kpisEl.innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Faturamento</div><div class="kpi-value green">${fmtPreco(fat)}</div><div class="kpi-sub">${n} pedido${n!==1?'s':''}</div></div>
    <div class="kpi-card"><div class="kpi-label">Ticket Médio</div><div class="kpi-value">${fmtPreco(ticket)}</div><div class="kpi-sub">${itens} itens vendidos</div></div>
    <div class="kpi-card"><div class="kpi-label">Desconto Médio</div><div class="kpi-value">${descMed.toFixed(1)}%</div><div class="kpi-sub">${peds.filter(p=>p.desconto>0).length} pedidos c/ desc.</div></div>
    <div class="kpi-card"><div class="kpi-label">Clientes Únicos</div><div class="kpi-value">${new Set(peds.map(p=>p.clienteId)).size}</div><div class="kpi-sub">de ${clientes.length} cadastrados</div></div>`;

  // ── Vendas por vendedor ──
  const vendEl=document.getElementById('dash-vendedores-chart');
  if(vendEl){
    const mapaV={};
    peds.forEach(p=>{
      const k=p.vendedorNome||'—';
      if(!mapaV[k])mapaV[k]={fat:0,n:0};
      mapaV[k].fat+=p.total||0; mapaV[k].n++;
    });
    const vData=Object.entries(mapaV).sort((a,b)=>b[1].fat-a[1].fat);
    if(!vData.length){vendEl.innerHTML='<p class="text-muted" style="padding:8px 0">Sem dados</p>';}
    else{
      const maxFat=vData[0][1].fat||1;
      const maxN=Math.max(...vData.map(([,v])=>v.n))||1;
      vendEl.innerHTML=`<div class="bar-chart">
        <div style="display:grid;grid-template-columns:72px 1fr 1fr auto;gap:8px;font-size:.65rem;color:var(--muted);margin-bottom:2px">
          <span></span><span>Faturamento</span><span>Nº Vendas</span><span></span>
        </div>
        ${vData.map(([nome,v],i)=>`
        <div style="display:grid;grid-template-columns:72px 1fr 1fr auto;align-items:center;gap:8px">
          <span class="bc-label" title="${nome}">${nome}</span>
          <div>
            <div class="bc-bar-wrap"><div class="bc-bar" style="width:${Math.round(v.fat/maxFat*100)}%"></div></div>
          </div>
          <div>
            <div class="bc-bar-wrap"><div class="bc-bar bc-bar2" style="width:${Math.round(v.n/maxN*100)}%"></div></div>
          </div>
          <div style="font-family:var(--mono);font-size:.7rem;text-align:right;line-height:1.4">
            <div>${fmtPreco(v.fat)}</div>
            <div style="color:var(--green)">${v.n} venda${v.n!==1?'s':''}</div>
          </div>
        </div>`).join('')}
      </div>`;
    }
  }

  // ── Pizza: pagamento ──
  const pagEl=document.getElementById('dash-pagamento-chart');
  if(pagEl){
    const mapaP={};
    peds.forEach(p=>{const k=p.pagamento||'—';mapaP[k]=(mapaP[k]||0)+(p.total||0);});
    const data=Object.entries(mapaP).sort((a,b)=>b[1]-a[1]).map(([label,value],i)=>({label,value,color:CHART_COLORS[i%CHART_COLORS.length]}));
    pagEl.innerHTML=svgPie(data);
  }

  // ── Pizza: CNPJ vs CPF ──
  const cliTipoEl=document.getElementById('dash-tipo-cli-chart');
  if(cliTipoEl){
    const cnpjFat=peds.reduce((s,p)=>{const c=clientes.find(x=>x.id===p.clienteId);return s+(c?.tipo==='cpf'?0:(p.total||0));},0);
    const cpfFat=peds.reduce((s,p)=>{const c=clientes.find(x=>x.id===p.clienteId);return s+(c?.tipo==='cpf'?p.total||0:0);},0);
    const data=[{label:'CNPJ/Loja',value:cnpjFat,color:'#ffffff'},{label:'CPF',value:cpfFat,color:'#4caf7d'}].filter(d=>d.value>0);
    cliTipoEl.innerHTML=svgPie(data);
  }

  // ── Vendas por categoria ──
  const catPieEl = document.getElementById('dash-cat-chart');
  if (catPieEl) {
    const mapaCAT = {};
    peds.forEach(p => (p.itens||[]).forEach(i => {
      const prod = produtos.find(x => x.id === i.prodId);
      const cat  = prod?.categoria || i.nome.split(' ')[0] || 'Outros';
      mapaCAT[cat] = (mapaCAT[cat] || 0) + (i.brinde ? 0 : i.preco * i.qty);
    }));
    const catData = Object.entries(mapaCAT)
      .filter(([,v]) => v > 0)
      .sort((a,b) => b[1]-a[1])
      .map(([label,value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    catPieEl.innerHTML = catData.length ? svgPieValor(catData) : '<p class="text-muted" style="padding:8px 0">Sem dados</p>';
  }

  // ── Top clientes ──
  const cliEl=document.getElementById('dash-top-clientes');
  if(cliEl){
    const mapaC={};
    peds.forEach(p=>{const k=p.clienteId||p.clienteNome;if(!mapaC[k])mapaC[k]={nome:p.clienteNome||'—',fat:0,n:0};mapaC[k].fat+=p.total||0;mapaC[k].n++;});
    const top=Object.values(mapaC).sort((a,b)=>b.fat-a.fat).slice(0,5);
    if(!top.length){cliEl.innerHTML='<p class="text-muted" style="padding:8px 0">Sem dados</p>';}
    else{
      const maxF=top[0].fat||1;
      cliEl.innerHTML=top.map((c,i)=>`
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b)">
          <span style="font-family:var(--mono);font-size:.72rem;color:var(--muted);width:14px;flex-shrink:0">${i+1}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px">${c.nome}</div>
            <div style="height:6px;background:var(--b);border-radius:3px">
              <div style="height:6px;background:#fff;border-radius:3px;width:${Math.round(c.fat/maxF*100)}%"></div>
            </div>
          </div>
          <div style="font-family:var(--mono);font-size:.75rem;text-align:right;flex-shrink:0;line-height:1.6">
            <div style="color:#fff">${fmtPreco(c.fat)}</div>
            <div style="color:var(--green)">${c.n} pedido${c.n!==1?'s':''}</div>
          </div>
        </div>`).join('');
    }
  }

  // ── Estoque crítico ──
  const estEl=document.getElementById('dash-estoque-critico');
  if(estEl){
    const criticos=produtos.filter(p=>p.estoque!=null&&Number(p.estoque)<=5).sort((a,b)=>Number(a.estoque)-Number(b.estoque)).slice(0,8);
    if(!criticos.length){estEl.innerHTML='<p style="color:var(--green);font-size:.85rem;padding:8px 0">✓ Nenhum produto crítico</p>';}
    else{
      estEl.innerHTML=criticos.map(p=>`
        <div class="rank-item-sm">
          <span class="${p.estoque<=0?'estoque-zero':'estoque-low'}" style="font-family:var(--mono);font-size:.82rem;min-width:24px">${p.estoque}</span>
          <div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
          <span style="font-size:.7rem;color:var(--muted)">${p.sku||''}</span>
        </div>`).join('');
    }
  }

  // ── Pico de vendas por hora ──
  const horaEl=document.getElementById('dash-hora-chart');
  if(horaEl){
    const porHora=new Array(24).fill(0);
    peds.forEach(p=>{if(p.data){const h=new Date(p.data).getHours();porHora[h]++;}});
    const maxH=Math.max(...porHora)||1;
    const horas=Array.from({length:16},(_,i)=>i+7);
    const fatHora=new Array(24).fill(0);
    peds.forEach(p=>{if(p.data){const h=new Date(p.data).getHours();fatHora[h]+=(p.total||0);}});
    const maxFH=Math.max(...fatHora)||1;
    const hdrHtml=`<div style="display:grid;grid-template-columns:30px 1fr 1fr;gap:4px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid var(--b)">
      <span></span>
      <div style="display:flex;align-items:center;gap:4px;font-size:.65rem;color:var(--muted)">
        <span style="display:inline-block;width:8px;height:8px;background:#fff;border-radius:2px;flex-shrink:0"></span>Pedidos
      </div>
      <div style="display:flex;align-items:center;gap:4px;font-size:.65rem;color:var(--muted)">
        <span style="display:inline-block;width:8px;height:8px;background:var(--green);border-radius:2px;flex-shrink:0"></span>Faturamento
      </div>
    </div>`;
    const rowsHtml=horas.map(h=>{
      const nPed=porHora[h];
      const fat=fatHora[h];
      const wPed=nPed>0?Math.max(3,Math.round(nPed/maxH*100)):0;
      const wFat=fat>0?Math.max(3,Math.round(fat/maxFH*100)):0;
      const dim=nPed===0&&fat===0;
      return `<div style="display:grid;grid-template-columns:30px 1fr 1fr;gap:4px;align-items:center;margin-bottom:5px;opacity:${dim?'0.3':'1'}">
        <span style="font-family:var(--mono);font-size:.65rem;color:var(--muted);text-align:right;padding-right:4px">${h}h</span>
        <div style="height:16px;background:var(--b);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${wPed}%;background:#fff;border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:${nPed>0?'5px':'0'}">
            ${nPed>0?`<span style="font-family:var(--mono);font-size:.6rem;color:#000;font-weight:700;line-height:1">${nPed}</span>`:''}
          </div>
        </div>
        <div style="height:16px;background:var(--b);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${wFat}%;background:var(--green);border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:${fat>0?'5px':'0'}">
            ${fat>0?`<span style="font-family:var(--mono);font-size:.58rem;color:#fff;font-weight:700;line-height:1">${fat>=1000?(fat/1000).toFixed(1)+'k':Math.round(fat)}</span>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
    horaEl.innerHTML=hdrHtml+rowsHtml;
  }

  // ── Top produtos ──
  const mapaQty={},mapaVal={};
  peds.forEach(p=>(p.itens||[]).forEach(i=>{mapaQty[i.nome]=(mapaQty[i.nome]||0)+i.qty;mapaVal[i.nome]=(mapaVal[i.nome]||0)+i.preco*i.qty;}));
  const ranking=Object.entries(mapaQty).map(([nome,qty])=>({nome,qty,val:mapaVal[nome]||0})).sort((a,b)=>b.qty-a.qty).slice(0,10);
  if(!ranking.length){rankEl.innerHTML='<div class="empty" style="padding:20px"><p>Nenhum dado.</p></div>';return;}
  const maxQ=ranking[0].qty;
  rankEl.innerHTML=ranking.map((item,i)=>{
    const prod=produtos.find(p=>p.nome===item.nome);
    return `<div class="rank-item">
      <span class="rank-num">${i+1}</span>
      <div style="flex:1;min-width:0">
        <div class="rank-name">${item.nome}</div>
        ${prod?.categoria?`<div class="rank-cat">${prod.categoria}</div>`:''}
        <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(item.qty/maxQ*100)}%"></div></div>
      </div>
      <span class="rank-qty">${item.qty} un.</span>
      <span class="rank-val">${fmtPreco(item.val)}</span>
    </div>`;
  }).join('');
}
