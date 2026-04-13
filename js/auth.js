// ══════════════════════════════════════
//  AUTH / BOOT
// ══════════════════════════════════════
async function fazerLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const s = document.getElementById('login-pass').value;
  if (!u) { document.getElementById('login-error').textContent = 'Informe o usuário.'; return; }

  // 1) Tenta lista local (funciona offline)
  let found = USUARIOS.find(x => x.usuario === u && x.senha === s);

  // 2) Se não achou, conecta Firebase e busca nos vendedores (usuarios criados pelo sistema)
  if (!found) {
    try {
      if (!useFirebase) {
        const saved = localStorage.getItem('fb_config');
        const cfg = saved ? JSON.parse(saved) : FB_CFG;
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        db = firebase.firestore();
        useFirebase = true;
      }
      const vends = await dbGetAll('vendedores');
      const v = vends.find(x => x.nome.toLowerCase() === u && x.senha === s);
      if (v) found = { usuario: v.nome.toLowerCase(), senha: v.senha, role: v.role || 'vendedor', nome: v.nome };
    } catch(e) { /* ignora se Firebase não conectou */ }
  }

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
}
