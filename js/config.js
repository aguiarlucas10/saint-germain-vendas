// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════
const USUARIOS = [
  { usuario:'lucas',    senha:'lucas123',    role:'admin',    nome:'Lucas'    },
  { usuario:'gustavo',  senha:'gustavo123',  role:'admin',    nome:'Gustavo'  },
  { usuario:'taynara',  senha:'taynara123',  role:'vendedor', nome:'Taynara'  },
  { usuario:'michelle', senha:'michelle123', role:'vendedor', nome:'Michelle' },
  { usuario:'fabio',    senha:'fabio123',    role:'vendedor', nome:'Fabio'    },
  { usuario:'vick',     senha:'vick123',     role:'vendedor', nome:'Vick'     },
];
const SENHA_APROVACAO = 'aprova';
const PEDIDO_MINIMO   = 1000;
let cpfLivreAtivo = false; // synced via Firebase configuracoes/cpf_livre
const FB_CFG = {
    apiKey:     'AIzaSyDyQWt_D950AoJFRCQBFyspG34ti0bWXro',
    authDomain: 'banco-b2b-sg.firebaseapp.com',
    projectId:  'banco-b2b-sg',
    appId:      '1:979394861028:web:650b17010d3ed44db219f1',
  };

// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let db = null, useFirebase = false;
let usuarioAtual = null;
let produtos = [], clientes = [], pedidos = [], vendedores = [];
let cart = {};           // { id: { qty, brinde } }
let descontoAtual = 0;
let descontoValor = 0;
let tipoPedido = 'venda';
let sortField = 'nome', sortAsc = true;
let pedidoDetAtual = null;
let tipoClienteAtual = 'loja';
let pendingFinalizarCb = null;
let csvParaImportar = [], jsonParaImportar = [];
let selecaoProdutos = new Set();
let filtroHistStatus = 'todos';
let modoSelecao = false;

const LOCAL = {
  get: k => JSON.parse(localStorage.getItem(k) || '[]'),
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
};

const TIERS = [
  {pct:3,  min:0,    id:'tier-3'},
  {pct:5,  min:1500, id:'tier-5'},
  {pct:7,  min:3000, id:'tier-7'},
  {pct:10, min:4000, id:'tier-10'},
];

const CHART_COLORS = ['#ffffff','#4caf7d','#f5a623','#5b8af5','#e05252','#a855f7','#06b6d4','#f97316','#84cc16','#ec4899'];
