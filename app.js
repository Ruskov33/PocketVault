// ─── POSTER SVG GENERATOR ───

const PALETTES = [
  ['#1a1030', '#6c3fcf', '#c8b87a'],
  ['#0d1f2d', '#2a7c6f', '#e8c47a'],
  ['#1f0d1a', '#8c3060', '#f0c070'],
  ['#0d1a0d', '#2e6b3e', '#b8d87a'],
  ['#1a0d0d', '#8c3030', '#e8a070'],
  ['#0d0d1f', '#2a3a8c', '#70c0e8'],
  ['#1a150d', '#7a5020', '#e8d090'],
  ['#100d1a', '#4a2a7a', '#d0a0f0'],
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function makePosterSVG(titulo, tipo) {
  const h = hashStr(titulo + tipo);
  const [bg, mid, accent] = PALETTES[h % PALETTES.length];
  const initials = titulo.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  const shapes = Array.from({ length: 6 }, (_, i) => {
    const x = (rng(h + i) * 400).toFixed(0);
    const y = (rng(h + i + 10) * 600).toFixed(0);
    const r = (40 + rng(h + i + 20) * 120).toFixed(0);
    const o = (0.15 + rng(h + i + 30) * 0.25).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${mid}" opacity="${o}"/>`;
  }).join('');
  const shortTitle = titulo.length > 18 ? titulo.slice(0, 16) + '…' : titulo;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <rect width="400" height="600" fill="${bg}"/>
    ${shapes}
    <rect x="0" y="380" width="400" height="220" fill="${bg}" opacity="0.85"/>
    <text x="200" y="290" font-family="Georgia,serif" font-size="90" fill="${accent}" opacity="0.3" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    <text x="200" y="430" font-family="Georgia,serif" font-size="26" fill="${accent}" text-anchor="middle" dominant-baseline="middle">${shortTitle}</text>
    <text x="200" y="470" font-family="sans-serif" font-size="14" fill="${mid}" text-anchor="middle" dominant-baseline="middle" opacity="0.8">${tipo.toUpperCase()}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function getPoster(item) {
  if (item.poster && item.poster.startsWith('http')) return item.poster;
  return makePosterSVG(item.titulo, item.tipo);
}

// ─── ESTADO ───

let biblioteca = JSON.parse(localStorage.getItem('pocketvault')) || {
  "viendo": [
    { id: 1, titulo: "Perfect Blue", tipo: "Anime", estrellas: 10 }
  ],
  "por ver": [
    { id: 2, titulo: "Metropolis", tipo: "Película", estrellas: 0 }
  ],
  "vistos": [
    { id: 3, titulo: "Serial Experiments Lain", tipo: "Serie", estrellas: 9 }
  ]
};

let carpetaActual = Object.keys(biblioteca)[0] || '';
let peliId = null;
let ratingTemp = 0;
let modoSearch = false;
let carpetaEditando = '';

function guardar() {
  localStorage.setItem('pocketvault', JSON.stringify(biblioteca));
}

// ─── TABS ───

function renderTabs() {
  const bar = document.getElementById('tabs-bar');
  bar.innerHTML = '';

  Object.keys(biblioteca).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (key === carpetaActual ? ' active' : '');
    btn.textContent = key;

    btn.addEventListener('click', () => {
      if (key === carpetaActual) {
        abrirModalCarpeta(key);
      } else {
        carpetaActual = key;
        modoSearch = false;
        document.getElementById('search-info').style.display = 'none';
        document.getElementById('titulo-seccion').textContent = key;
        renderTabs();
        renderGrid(biblioteca[carpetaActual]);
      }
    });

    bar.appendChild(btn);
  });

  const btnNueva = document.createElement('button');
  btnNueva.className = 'btn-nueva-carpeta';
  btnNueva.title = 'Nueva carpeta';
  btnNueva.textContent = '+';
  btnNueva.addEventListener('click', () => {
    document.getElementById('input-nueva-carpeta').value = '';
    abrirModal('modal-nueva-carpeta');
  });
  bar.appendChild(btnNueva);
}

// ─── GRID ───

function renderGrid(lista) {
  const grid = document.getElementById('grid-contenido');
  grid.innerHTML = '';

  if (!lista || lista.length === 0) {
    const p = document.createElement('p');
    p.className = 'vacio';
    p.textContent = 'Esta lista está vacía.';
    grid.appendChild(p);
  } else {
    lista.forEach(item => grid.appendChild(crearTarjeta(item)));
  }

  if (!modoSearch) {
    const addCard = document.createElement('div');
    addCard.className = 'tarjeta-add';
    addCard.innerHTML = `<span class="tarjeta-add-icon">+</span><span>Añadir</span>`;
    addCard.addEventListener('click', () => {
      document.getElementById('input-add-titulo').value = '';
      document.getElementById('input-add-poster').value = '';
      abrirModal('modal-add-item');
    });
    grid.appendChild(addCard);
  }
}

function crearTarjeta(item) {
  const card = document.createElement('div');
  card.className = 'tarjeta';
  const posterSrc = getPoster(item);

  card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;

  card.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') return;

    if (card.classList.contains('flipped')) {
      card.classList.remove('flipped');
      card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;
    } else {
      card.classList.add('flipped');
      const stars = item.estrellas > 0 ? `★ ${item.estrellas}/10` : 'Sin calificar';
      card.innerHTML = `
        <div class="tarjeta-inner">
          <div>
            <h3>${item.titulo}</h3>
            <div class="tarjeta-tipo">${item.tipo}</div>
            <div class="tarjeta-stars">${stars}</div>
          </div>
          <div class="tarjeta-actions">
            <button class="btn-card primary" data-id="${item.id}">Editar</button>
            <button class="btn-card ghost" data-back="1">Volver</button>
          </div>
        </div>`;
      card.querySelector('[data-id]').addEventListener('click', () => abrirModalPeli(item.id));
      card.querySelector('[data-back]').addEventListener('click', e => {
        e.stopPropagation();
        card.classList.remove('flipped');
        card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;
      });
    }
  });

  return card;
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

// Cerrar modales al hacer click en el overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) cerrarModal(overlay.id);
  });
});

function abrirModalPeli(id) {
  peliId = id;
  const peli = biblioteca[carpetaActual]?.find(p => p.id === id);
  if (!peli) return;

  document.getElementById('modal-peli-titulo').textContent = peli.titulo;
  ratingTemp = peli.estrellas || 0;
  renderStars(ratingTemp);

  const sel = document.getElementById('modal-select-carpeta');
  sel.innerHTML = '';
  Object.keys(biblioteca).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === carpetaActual) opt.selected = true;
    sel.appendChild(opt);
  });

  abrirModal('modal-peli');
}

const starsContainer = document.getElementById('stars-container');
for (let i = 1; i <= 10; i++) {
  const s = document.createElement('span');
  s.className = 'star';
  s.textContent = '★';
  s.dataset.v = i;
  s.addEventListener('click', () => { ratingTemp = i; renderStars(i); });
  starsContainer.appendChild(s);
}

function renderStars(n) {
  starsContainer.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < n));
}

document.getElementById('btn-guardar-peli').addEventListener('click', () => {
  const destino = document.getElementById('modal-select-carpeta').value;
  const idx = biblioteca[carpetaActual].findIndex(p => p.id === peliId);
  if (idx !== -1) {
    const [peli] = biblioteca[carpetaActual].splice(idx, 1);
    peli.estrellas = ratingTemp;
    biblioteca[destino].push(peli);
    guardar();
  }
  cerrarModal('modal-peli');
  renderGrid(biblioteca[carpetaActual]);
});

document.getElementById('btn-eliminar-peli').addEventListener('click', () => {
  biblioteca[carpetaActual] = biblioteca[carpetaActual].filter(p => p.id !== peliId);
  guardar();
  cerrarModal('modal-peli');
  renderGrid(biblioteca[carpetaActual]);
});

document.getElementById('btn-cerrar-modal-peli').addEventListener('click', () => cerrarModal('modal-peli'));

function abrirModalCarpeta(key) {
  carpetaEditando = key;
  document.getElementById('modal-carpeta-titulo').textContent = `"${key}"`;
  document.getElementById('input-nombre-carpeta').value = key;
  abrirModal('modal-carpeta');
}

document.getElementById('btn-confirmar-renombrar').addEventListener('click', () => {
  const nuevo = document.getElementById('input-nombre-carpeta').value.trim().toLowerCase();
  if (!nuevo || nuevo === carpetaEditando) { cerrarModal('modal-carpeta'); return; }
  if (biblioteca[nuevo]) { alert('Ya existe una carpeta con ese nombre.'); return; }
  biblioteca[nuevo] = biblioteca[carpetaEditando];
  delete biblioteca[carpetaEditando];
  if (carpetaActual === carpetaEditando) carpetaActual = nuevo;
  guardar();
  cerrarModal('modal-carpeta');
  document.getElementById('titulo-seccion').textContent = carpetaActual;
  renderTabs();
  renderGrid(biblioteca[carpetaActual]);
});

document.getElementById('btn-confirmar-borrar').addEventListener('click', () => {
  delete biblioteca[carpetaEditando];
  const keys = Object.keys(biblioteca);
  carpetaActual = keys[0] || '';
  guardar();
  cerrarModal('modal-carpeta');
  document.getElementById('titulo-seccion').textContent = carpetaActual;
  renderTabs();
  if (carpetaActual) renderGrid(biblioteca[carpetaActual]);
  else document.getElementById('grid-contenido').innerHTML = '';
});

document.getElementById('btn-cerrar-modal-carpeta').addEventListener('click', () => cerrarModal('modal-carpeta'));

document.getElementById('btn-confirmar-nueva-carpeta').addEventListener('click', () => {
  const nombre = document.getElementById('input-nueva-carpeta').value.trim().toLowerCase();
  if (!nombre) return;
  if (biblioteca[nombre]) { alert('Esa carpeta ya existe.'); return; }
  biblioteca[nombre] = [];
  carpetaActual = nombre;
  guardar();
  cerrarModal('modal-nueva-carpeta');
  document.getElementById('titulo-seccion').textContent = nombre;
  renderTabs();
  renderGrid(biblioteca[carpetaActual]);
});

document.getElementById('btn-cerrar-nueva-carpeta').addEventListener('click', () => cerrarModal('modal-nueva-carpeta'));

// Enter en input nueva carpeta
document.getElementById('input-nueva-carpeta').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-confirmar-nueva-carpeta').click();
});

document.getElementById('btn-confirmar-add-item').addEventListener('click', () => {
  const titulo = document.getElementById('input-add-titulo').value.trim();
  if (!titulo) return;
  const tipo = document.getElementById('input-add-tipo').value;
  const posterInput = document.getElementById('input-add-poster').value.trim();
  const id = Date.now();
  biblioteca[carpetaActual].push({ id, titulo, tipo, poster: posterInput || null, estrellas: 0 });
  guardar();
  cerrarModal('modal-add-item');
  renderGrid(biblioteca[carpetaActual]);
});

document.getElementById('btn-cerrar-add-item').addEventListener('click', () => cerrarModal('modal-add-item'));

document.getElementById('input-add-titulo').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-confirmar-add-item').click();
});

const TIPOS_BUSQUEDA = ['Película', 'Serie', 'Anime', 'Documental', 'Película'];

function buscar() {
  const q = document.getElementById('input-busqueda').value.trim();
  if (!q) return;
  modoSearch = true;

  document.getElementById('titulo-seccion').textContent = 'Resultados';

  const infoEl = document.getElementById('search-info');
  infoEl.style.display = 'block';
  infoEl.innerHTML = `
    <div class="search-badge">
      Buscando: <strong>${q}</strong>
      <button id="btn-clear-search" title="Limpiar búsqueda">✕</button>
    </div>`;
  document.getElementById('btn-clear-search').addEventListener('click', limpiarBusqueda);

  // Resultados simulados — reemplazar con TMDB
  const sufijos = ['', ' II', ': Season 2', ': Origins', ' Returns'];
  const resultados = sufijos.map((sfx, i) => ({
    id: Date.now() + i,
    titulo: (q + sfx).trim(),
    tipo: TIPOS_BUSQUEDA[i],
    poster: null,
    estrellas: 0
  }));

  const grid = document.getElementById('grid-contenido');
  grid.innerHTML = '';

  resultados.forEach(item => {
    const card = document.createElement('div');
    card.className = 'tarjeta';
    const posterSrc = getPoster(item);
    card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;

    card.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return;
      if (card.classList.contains('flipped')) {
        card.classList.remove('flipped');
        card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;
      } else {
        card.classList.add('flipped');
        card.innerHTML = `
          <div class="tarjeta-inner">
            <div>
              <h3>${item.titulo}</h3>
              <div class="tarjeta-tipo">${item.tipo}</div>
            </div>
            <div class="tarjeta-actions" id="ra-${item.id}">
              <button class="btn-card ghost" data-back="1">Volver</button>
            </div>
          </div>`;
        card.querySelector('[data-back]').addEventListener('click', ev => {
          ev.stopPropagation();
          card.classList.remove('flipped');
          card.innerHTML = `<img src="${posterSrc}" alt="${item.titulo}">`;
        });
        const actionsEl = card.querySelector(`#ra-${item.id}`);
        Object.keys(biblioteca).forEach(key => {
          const btn = document.createElement('button');
          btn.className = 'btn-card primary';
          btn.style.fontSize = '0.72rem';
          btn.textContent = `+ ${key}`;
          btn.addEventListener('click', ev => {
            ev.stopPropagation();
            biblioteca[key].push({ ...item, id: Date.now() });
            guardar();
            btn.textContent = '✓';
            btn.disabled = true;
          });
          actionsEl.insertBefore(btn, actionsEl.firstChild);
        });
      }
    });

    grid.appendChild(card);
  });
}

function limpiarBusqueda() {
  modoSearch = false;
  document.getElementById('input-busqueda').value = '';
  document.getElementById('search-info').style.display = 'none';
  document.getElementById('titulo-seccion').textContent = carpetaActual;
  renderGrid(biblioteca[carpetaActual]);
}

document.getElementById('btn-buscar').addEventListener('click', buscar);
document.getElementById('input-busqueda').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscar();
});

document.getElementById('titulo-seccion').textContent = carpetaActual;
renderTabs();
renderGrid(biblioteca[carpetaActual]);
