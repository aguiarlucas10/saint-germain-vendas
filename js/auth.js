// ══════════════════════════════════════
//  AUTH / BOOT
// ══════════════════════════════════════
function fazerLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const s = document.getElementById('login-pass').value;
  if (!u) { document.getElementById('login-error').textContent = 'Informe o usuário.'; return; }
  const found = USUARIOS.find(x => x.usuario === u && x.senha === s);
  if (!found) {
    document.getElementById('login-error').textContent = 'Usuário ou senha incorretos.';
    document.getElementById('login-pass').value = '';
    return;
  }
  usuarioAtual = found;
  localStorage.setItem('sg_session', JSON.stringify(found));
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  aplicarPermissoes();
  iniciarApp();
}
function fazerLogout() {
  if (!confirm('Sair do sistema?')) return;
  localStorage.removeItem('sg_session');
  location.reload();
}
function aplicarPermissoes() {
  if (!usuarioAtual) return;
  document.getElementById('u-avatar').textContent = usuarioAtual.nome.charAt(0).toUpperCase();
  document.getElementById('u-name').textContent = usuarioAtual.nome;
  const isAdmin = usuarioAtual.role === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}

// ══════════════════════════════════════
//  FIREBASE CONNECT
// ══════════════════════════════════════
function usarLocalStorage() {
  useFirebase = false;
  localStorage.removeItem('fb_config');
  document.getElementById('setup-modal').style.display = 'none';
  iniciarApp();
  toast('Modo offline ativo');
}
function iniciarFirebase() {
  const cfg = {
    apiKey:     document.getElementById('cfg-apiKey').value.trim(),
    authDomain: document.getElementById('cfg-authDomain').value.trim(),
    projectId:  document.getElementById('cfg-projectId').value.trim(),
    appId:      document.getElementById('cfg-appId').value.trim(),
  };
  if (!cfg.apiKey || !cfg.projectId) { toast('Preencha API Key e Project ID'); return; }
  localStorage.setItem('fb_config', JSON.stringify(cfg));
  conectarFirebase(cfg);
}
async function conectarFirebase(cfg) {
  try {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    db = firebase.firestore();
    useFirebase = true;
    document.getElementById('setup-modal').style.display = 'none';
    await seedVendedores();
    await init();
  } catch(e) { toast('Erro Firebase: ' + e.message); }
}
async function iniciarApp() {
  const cfgPadrao = FB_CFG;
  try {
    const saved = localStorage.getItem('fb_config');
    const cfg = saved ? JSON.parse(saved) : cfgPadrao;
    if (!saved) localStorage.setItem('fb_config', JSON.stringify(cfgPadrao));
    await conectarFirebase(cfg);
  } catch(e) {
    try { await conectarFirebase(cfgPadrao); }
    catch(e2) { toast('Erro ao conectar: ' + e2.message); }
  }
}

// ══════════════════════════════════════
//  SEED VENDEDORES
// ══════════════════════════════════════
async function seedVendedores() {
  vendedores = await dbGetAll('vendedores');
  const iniciais = [
    { nome:'Lucas',    role:'admin',    senha:'lucas123',    tel:'' },
    { nome:'Gustavo',  role:'admin',    senha:'gustavo123',  tel:'' },
    { nome:'Taynara',  role:'vendedor', senha:'taynara123',  tel:'' },
    { nome:'Michelle', role:'vendedor', senha:'michelle123', tel:'' },
    { nome:'Fabio',    role:'vendedor', senha:'fabio123',    tel:'' },
    { nome:'Vick',     role:'vendedor', senha:'vick123',     tel:'' },
  ];
  // Remove duplicatas (mantém mais antigo por nome)
  const vistos = {};
  let changed = false;
  for (const v of [...vendedores].sort((a,b)=>(a._ts||0)-(b._ts||0))) {
    const k = v.nome.toLowerCase();
    if (vistos[k]) { await dbDelete('vendedores', v.id); changed = true; }
    else vistos[k] = v;
  }
  if (changed) vendedores = await dbGetAll('vendedores');
  // Cria faltantes / preenche senha+role
  changed = false;
  for (const u of iniciais) {
    const existe = vendedores.find(v => v.nome.toLowerCase() === u.nome.toLowerCase());
    if (!existe) { await dbAdd('vendedores', u); changed = true; }
    else if (!existe.senha || !existe.role) {
      const patch = {};
      if (!existe.senha) patch.senha = u.senha;
      if (!existe.role)  patch.role  = u.role;
      await dbUpdate('vendedores', existe.id, patch);
      changed = true;
    }
  }
  if (changed) vendedores = await dbGetAll('vendedores');
}
