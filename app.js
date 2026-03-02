// ===============================
// Fluxograma (render via JSON)
// Pan + Zoom + Fit + Fullscreen
// ===============================

const $ = (id) => document.getElementById(id);

const viewport = $("viewport");
const world = $("world");
const edgesSvg = $("edges");
const nodesWrap = $("nodes");
const statusEl = $("status");

const btnZoomIn = $("btnZoomIn");
const btnZoomOut = $("btnZoomOut");
const btnFit = $("btnFit");
const btnFull = $("btnFull");
const toggleCompact = $("toggleCompact");

// --- Layout base (coordenadas) ---
// Unidades em px "lógicas" (antes do zoom)
const COL_X = {
  left: 120,
  center: 560,
  right: 1000
};

const Y0 = 60;
const STEP = 120;

// Nós: id, type, column, yIndex, title/body
// type: terminator | process | decision | note
const nodes = [
  { id:"start", type:"terminator", col:"center", y:0, text:"INÍCIO" },

  { id:"c1", type:"process", col:"center", y:1, text:"Vendedor chega para alinhar a troca" },
  { id:"c2", type:"process", col:"center", y:2, text:"Emitir relatório com avaria do fornecedor" },
  { id:"c3", type:"process", col:"center", y:3, text:"Conferir itens na área de avarias junto com vendedor" },
  { id:"c4", type:"process", col:"center", y:4, text:"Separar itens no saco e lacrar" },

  { id:"dec_tipo", type:"decision", col:"center", y:5, text:"Tipo de troca?" },

  // --- OPÇÃO A ---
  { id:"a_tag", type:"note", col:"left", y:5.25, smallTop:"OPÇÃO A", title:"NF de Devolução", text:"" },
  { id:"a1", type:"note", col:"left", y:6.15, text:"Informar CPD quais itens deve emitir nota e qual será a forma de pagamento (boleto, depósito em conta, bonificação ou desconto) e anexar a NF e boleto no saco lacrado" },
  { id:"a2", type:"process", col:"left", y:7.25, text:"Quando o caminhão chegar para recolher a troca" },
  { id:"dec_pag", type:"decision", col:"left", y:8.25, text:"Forma de Pagamento da devolução?" },

  // Boleto
  { id:"a_boleto_1", type:"process", col:"left", y:9.35, smallTop:"BOLETO", text:"Destacar o canhoto da NF e do BOLETO e coletar assinatura do motorista" },
  { id:"a_boleto_2", type:"process", col:"left", y:10.35, text:"Bater a foto do(s) canhoto(s) pelo coletor" },
  { id:"a_boleto_3", type:"process", col:"left", y:11.35, text:"Enviar o(s) canhoto(s) para o financeiro" },

  // Bonificação (coluna A com deslocamento)
  { id:"a_boni_1", type:"process", col:"left", y:9.35, dx: 360, smallTop:"BONIFICAÇÃO", text:"Escrever no canhoto da NF a informação que será pago em bonificação. Ou caso já tenha sido pago escrever qual foi a NF e informar ao CPD" },
  { id:"a_boni_2", type:"process", col:"left", y:10.35, dx: 360, text:"Bater a foto do(s) canhoto(s) pelo coletor" },
  { id:"a_boni_3", type:"process", col:"left", y:11.35, dx: 360, text:"Enviar o(s) canhoto(s) para o financeiro" },

  // Desconto (coluna A com deslocamento)
  { id:"a_desc_1", type:"process", col:"left", y:9.35, dx: 720, smallTop:"DESCONTO NA NF OU BOLETO", text:"Escrever no canhoto da NF a informação que será pago em desconto ou se já foi efetuado desconto na NF ou boleto, escrever no canhoto qual foi a NF que teve o desconto e informar ao CPD" },
  { id:"a_desc_2", type:"process", col:"left", y:10.35, dx: 720, text:"Bater a foto do(s) canhoto(s) pelo coletor" },
  { id:"a_desc_3", type:"process", col:"left", y:11.35, dx: 720, text:"Enviar o(s) canhoto(s) para o financeiro" },

  // --- OPÇÃO B ---
  { id:"b_tag", type:"note", col:"center", y:5.25, smallTop:"OPÇÃO B", title:"Troca produto por produto sem NF", text:"" },
  { id:"b1", type:"process", col:"center", y:6.15, text:"Identificar o saco com os itens separado com a informação que está aguardando a troca" },
  { id:"b2", type:"process", col:"center", y:7.25, text:"Quando o caminhão chegar para recolher a troca" },
  { id:"b3", type:"process", col:"center", y:8.35, text:"Conferir se quantidade é a mesma e se são os mesmos itens" },
  { id:"b4", type:"process", col:"center", y:9.45, text:"Receber os itens e devolver ou descartar os avariados" },
  { id:"b5", type:"note", col:"center", y:10.55, text:"Realizar o lançamento dos itens RECEBIDOS com centro de custo PRODPROD SEM NOTA" },

  // --- OPÇÃO C ---
  { id:"c_tag", type:"note", col:"right", y:5.25, smallTop:"OPÇÃO C", title:"Troca produto por produto com NF", text:"" },
  { id:"cC1", type:"process", col:"right", y:6.15, text:"Identificar o saco com os itens separado com a informação que está aguardando a troca" },
  { id:"cC2", type:"process", col:"right", y:7.25, text:"Quando o caminhão chegar para recolher a troca" },
  { id:"cC3", type:"process", col:"process", col:"right", y:8.35, text:"Conferir se o valor da bonificação bate com o valor das avarias" },
  { id:"cC4", type:"process", col:"right", y:9.45, text:"Descartar os itens avariados" },
  { id:"cC5", type:"note", col:"right", y:10.55, text:"Fazer o lançamento dos itens AVARIADOS com centro de custo PRODPROD COM NOTA" },

  // Fim
  { id:"end", type:"terminator", col:"center", y:12.15, text:"FIM" }
];

// Conexões: from -> to
// (linhas automáticas entre centros dos nós)
const edges = [
  ["start","c1"],
  ["c1","c2"],
  ["c2","c3"],
  ["c3","c4"],
  ["c4","dec_tipo"],

  // Split Tipo de troca
  ["dec_tipo","a_tag", "label", "OPÇÃO A", "warn"],
  ["dec_tipo","b_tag", "label", "OPÇÃO B", "accent"],
  ["dec_tipo","c_tag", "label", "OPÇÃO C", "warn"],

  // Opção A
  ["a_tag","a1"],
  ["a1","a2"],
  ["a2","dec_pag"],

  // Decisão Pagamento -> 3 caminhos
  ["dec_pag","a_boleto_1","label","BOLETO","accent"],
  ["dec_pag","a_boni_1","label","BONIFICAÇÃO","warn"],
  ["dec_pag","a_desc_1","label","DESCONTO","warn"],

  ["a_boleto_1","a_boleto_2"],
  ["a_boleto_2","a_boleto_3"],

  ["a_boni_1","a_boni_2"],
  ["a_boni_2","a_boni_3"],

  ["a_desc_1","a_desc_2"],
  ["a_desc_2","a_desc_3"],

  // Opção B
  ["b_tag","b1"],
  ["b1","b2"],
  ["b2","b3"],
  ["b3","b4"],
  ["b4","b5"],

  // Opção C
  ["c_tag","cC1"],
  ["cC1","cC2"],
  ["cC2","cC3"],
  ["cC3","cC4"],
  ["cC4","cC5"],

  // Convergência para FIM
  ["a_boleto_3","end"],
  ["a_boni_3","end"],
  ["a_desc_3","end"],
  ["b5","end"],
  ["cC5","end"]
];

// --- Pan/Zoom state ---
let scale = 1;
let tx = 0;
let ty = 0;

let isDragging = false;
let dragStart = { x:0, y:0, tx:0, ty:0 };

// Mapa de posições calculadas
const layout = new Map();

function nodeXY(n){
  const xBase = COL_X[n.col] ?? COL_X.center;
  const x = xBase + (n.dx || 0);
  const y = Y0 + n.y * STEP;
  return { x, y };
}

function createNodeEl(n){
  const el = document.createElement("div");
  el.className = `node ${n.type === "process" ? "process" : ""} ${n.type === "note" ? "note" : ""} ${n.type === "decision" ? "decision" : ""} ${n.type === "terminator" ? "terminator" : ""}`;
  el.dataset.id = n.id;

  if(n.smallTop){
    const st = document.createElement("div");
    st.className = "smallTop";
    st.textContent = n.smallTop;
    el.appendChild(st);
  }

  if(n.title){
    const t = document.createElement("div");
    t.className = "title";
    t.textContent = n.title;
    el.appendChild(t);
  }

  if(n.text){
    const p = document.createElement("div");
    p.textContent = n.text;
    el.appendChild(p);
  } else if(n.type === "terminator" || n.type === "decision"){
    el.textContent = n.text || "";
  }

  return el;
}

function render(){
  nodesWrap.innerHTML = "";
  edgesSvg.innerHTML = "";

  // Render nodes and store bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for(const n of nodes){
    const { x, y } = nodeXY(n);
    const el = createNodeEl(n);
    nodesWrap.appendChild(el);

    // position first, measure after paint
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;

    layout.set(n.id, { x, y, el });

    // approximate bounds (will refine after measurements)
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  }

  // After nodes are in DOM, measure exact bounds and adjust edges svg size
  requestAnimationFrame(() => {
    minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;

    for(const [id, item] of layout.entries()){
      const rect = item.el.getBoundingClientRect();
      // convert viewport coords -> world coords using current transform inverse is hard here.
      // We'll instead use offsetWidth/Height (world space sizes) because nodes are positioned in world.
      const w = item.el.offsetWidth;
      const h = item.el.offsetHeight;
      item.w = w; item.h = h;

      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + w);
      maxY = Math.max(maxY, item.y + h);
    }

    // Give some padding
    const pad = 120;
    const W = (maxX - minX) + pad*2;
    const H = (maxY - minY) + pad*2;

    world.style.width = `${W}px`;
    world.style.height = `${H}px`;

    // shift everything so minX/minY starts at pad
    for(const [id, item] of layout.entries()){
      const nx = item.x - minX + pad;
      const ny = item.y - minY + pad;
      item.el.style.left = `${nx}px`;
      item.el.style.top  = `${ny}px`;
      item.x2 = nx; item.y2 = ny;
    }

    edgesSvg.setAttribute("width", W);
    edgesSvg.setAttribute("height", H);
    edgesSvg.style.width = `${W}px`;
    edgesSvg.style.height = `${H}px`;

    drawEdges();
    fitToScreen(true);
  });
}

function centerOf(id){
  const it = layout.get(id);
  if(!it) return null;
  const x = (it.x2 ?? it.x) + (it.w || it.el.offsetWidth)/2;
  const y = (it.y2 ?? it.y) + (it.h || it.el.offsetHeight)/2;
  return { x, y };
}

function drawEdges(){
  edgesSvg.innerHTML = "";

  // helper to draw a smooth elbow path (vertical/horizontal)
  function elbowPath(a, b){
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // prefer vertical flow
    const midY = a.y + dy * 0.55;
    const p1 = { x: a.x, y: midY };
    const p2 = { x: b.x, y: midY };

    return `M ${a.x} ${a.y}
            L ${p1.x} ${p1.y}
            L ${p2.x} ${p2.y}
            L ${b.x} ${b.y}`;
  }

  for(const e of edges){
    const [from, to, kind, label, style] = e;
    const a = centerOf(from);
    const b = centerOf(to);
    if(!a || !b) continue;

    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d", elbowPath(a,b));
    path.setAttribute("class", `edge ${style === "accent" ? "accent" : ""} ${style === "warn" ? "warn" : ""}`);
    edgesSvg.appendChild(path);

    if(kind === "label" && label){
      // label near the start-middle
      const t = document.createElementNS("http://www.w3.org/2000/svg","text");
      t.setAttribute("class","label");
      const lx = (a.x + b.x) / 2;
      const ly = (a.y + b.y) / 2 - 8;
      t.setAttribute("x", lx);
      t.setAttribute("y", ly);
      t.textContent = label;
      edgesSvg.appendChild(t);
    }
  }
}

// --- Transform apply ---
function applyTransform(){
  world.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  statusEl.textContent = `Zoom: ${(scale*100).toFixed(0)}%`;
}

function clampScale(s){
  return Math.max(0.25, Math.min(2.8, s));
}

function zoomAt(deltaScale, clientX, clientY){
  const rect = viewport.getBoundingClientRect();
  const vx = clientX - rect.left;
  const vy = clientY - rect.top;

  // world coords under pointer before zoom
  const wx = (vx - tx) / scale;
  const wy = (vy - ty) / scale;

  const newScale = clampScale(scale * deltaScale);

  // adjust translate so the same world point stays under pointer
  tx = vx - wx * newScale;
  ty = vy - wy * newScale;
  scale = newScale;
  applyTransform();
}

function fitToScreen(silent=false){
  // Compute content size from world size (unscaled)
  const W = world.offsetWidth;
  const H = world.offsetHeight;

  const v = viewport.getBoundingClientRect();
  const vw = v.width;
  const vh = v.height;

  // margin inside viewport
  const margin = 40;
  const s = Math.min((vw - margin) / W, (vh - margin) / H);

  scale = clampScale(s);
  // center
  tx = (vw - W * scale) / 2;
  ty = (vh - H * scale) / 2;

  applyTransform();
  if(!silent) statusEl.textContent = "Ajustado à tela ✅";
}

function toggleFullscreen(){
  const el = $("stage");
  if(!document.fullscreenElement){
    el.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// --- Pan handlers ---
viewport.addEventListener("mousedown", (ev) => {
  isDragging = true;
  dragStart = { x: ev.clientX, y: ev.clientY, tx, ty };
});

window.addEventListener("mouseup", () => { isDragging = false; });

window.addEventListener("mousemove", (ev) => {
  if(!isDragging) return;
  const dx = ev.clientX - dragStart.x;
  const dy = ev.clientY - dragStart.y;
  tx = dragStart.tx + dx;
  ty = dragStart.ty + dy;
  applyTransform();
});

// Touch pan
viewport.addEventListener("touchstart", (ev) => {
  if(ev.touches.length !== 1) return;
  const t = ev.touches[0];
  isDragging = true;
  dragStart = { x: t.clientX, y: t.clientY, tx, ty };
}, { passive: true });

viewport.addEventListener("touchmove", (ev) => {
  if(!isDragging || ev.touches.length !== 1) return;
  const t = ev.touches[0];
  const dx = t.clientX - dragStart.x;
  const dy = t.clientY - dragStart.y;
  tx = dragStart.tx + dx;
  ty = dragStart.ty + dy;
  applyTransform();
}, { passive: true });

viewport.addEventListener("touchend", () => { isDragging = false; });

// Wheel zoom
viewport.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const zoomFactor = ev.deltaY > 0 ? 0.92 : 1.08;
  zoomAt(zoomFactor, ev.clientX, ev.clientY);
}, { passive: false });

// Buttons
btnZoomIn.addEventListener("click", () => zoomAt(1.12, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2));
btnZoomOut.addEventListener("click", () => zoomAt(0.89, viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2));
btnFit.addEventListener("click", () => fitToScreen());
btnFull.addEventListener("click", () => toggleFullscreen());

toggleCompact.addEventListener("change", () => {
  document.body.classList.toggle("compact", toggleCompact.checked);
  // re-render to recalc sizes and edges
  render();
});

// Fit on resize / fullscreen change
window.addEventListener("resize", () => fitToScreen(true));
document.addEventListener("fullscreenchange", () => fitToScreen(true));

// Start
render();
applyTransform();
