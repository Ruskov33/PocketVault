const CARPETAS_FIJAS = ['favoritas','pendientes','viendo','vistas'];
const QA_ICONS = {
  vistas:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  pendientes:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  viendo:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  favoritas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
};
const QA_LABELS = { vistas:'Vistas', pendientes:'Pendientes', viendo:'Viendo', favoritas:'Favoritas' };

const PALETTES=[['#1a1030','#6c3fcf','#c8b87a'],['#0d1f2d','#2a7c6f','#e8c47a'],['#1f0d1a','#8c3060','#f0c070'],['#0d1a0d','#2e6b3e','#b8d87a'],['#1a0d0d','#8c3030','#e8a070'],['#0d0d1f','#2a3a8c','#70c0e8'],['#1a150d','#7a5020','#e8d090'],['#100d1a','#4a2a7a','#d0a0f0']];
function hashStr(s){let h=0;for(let i=0;i<s.length;i++)h=Math.imul(31,h)+s.charCodeAt(i)|0;return Math.abs(h);}
function makePosterSVG(titulo,tipo){
  const h=hashStr(titulo+tipo);const[bg,mid,ac]=PALETTES[h%PALETTES.length];
  const initials=titulo.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const rng=seed=>{let x=Math.sin(seed)*10000;return x-Math.floor(x);};
  const shapes=Array.from({length:6},(_,i)=>`<circle cx="${(rng(h+i)*400).toFixed(0)}" cy="${(rng(h+i+10)*600).toFixed(0)}" r="${(40+rng(h+i+20)*120).toFixed(0)}" fill="${mid}" opacity="${(0.15+rng(h+i+30)*0.25).toFixed(2)}"/>`).join('');
  const st=titulo.length>18?titulo.slice(0,16)+'…':titulo;
  return'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="${bg}"/>${shapes}<rect x="0" y="380" width="400" height="220" fill="${bg}" opacity="0.85"/><text x="200" y="290" font-family="Georgia,serif" font-size="90" fill="${ac}" opacity="0.3" text-anchor="middle" dominant-baseline="middle">${initials}</text><text x="200" y="430" font-family="Georgia,serif" font-size="26" fill="${ac}" text-anchor="middle" dominant-baseline="middle">${st}</text><text x="200" y="470" font-family="sans-serif" font-size="14" fill="${mid}" text-anchor="middle" dominant-baseline="middle" opacity="0.8">${tipo.toUpperCase()}</text></svg>`);
}
function getPosterURL(item){if(item.poster&&item.poster.startsWith('http'))return item.poster;if(item.tmdb_poster)return`https://image.tmdb.org/t/p/w342${item.tmdb_poster}`;return null;}
function getPosterOrSVG(item){return getPosterURL(item)||makePosterSVG(item.titulo,item.tipo);}
function tienePoster(item){return!!getPosterURL(item);}

const TMDB_BASE='https://api.themoviedb.org/3';
const tmdbH=()=>({'Authorization':`Bearer ${TMDB_CONFIG.accessToken}`,'Content-Type':'application/json'});

async function tmdbSearch(query,maxPages=3){
  const all=[];
  for(let page=1;page<=maxPages;page++){
    const r=await fetch(`${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&language=${TMDB_CONFIG.language}&include_adult=false&page=${page}`,{headers:tmdbH()});
    if(!r.ok)break;const d=await r.json();
    (d.results||[]).filter(x=>x.media_type==='movie'||x.media_type==='tv').forEach(x=>all.push(x));
    if(page>=d.total_pages)break;
  }
  return all.map(r=>mkItem(r));
}
function mkItem(r){
  return{id:Date.now()+Math.random(),titulo:r.title||r.name||'Sin título',tipo:r.media_type==='tv'?'Serie':'Película',tmdb_poster:r.poster_path||null,tmdb_id:r.id,tmdb_media_type:r.media_type,tmdb_year:(r.release_date||r.first_air_date||'').slice(0,4),tmdb_genres:(r.genre_ids||[]),estrellas:0,formato:'',visual:''};
}
async function tmdbOverview(id,mt){
  try{const r=await fetch(`${TMDB_BASE}/${mt==='tv'?'tv':'movie'}/${id}?language=${TMDB_CONFIG.language}`,{headers:tmdbH()});if(!r.ok)return null;return(await r.json()).overview||null;}catch{return null;}
}
async function tmdbDiscover(params){
  try{const url=`${TMDB_BASE}/discover/${params.mt||'movie'}?language=${TMDB_CONFIG.language}&sort_by=popularity.desc&${params.query||''}&page=${params.page||1}`;const r=await fetch(url,{headers:tmdbH()});if(!r.ok)return[];const d=await r.json();return(d.results||[]).map(x=>mkItem({...x,media_type:params.mt||'movie'}));}catch{return[];}
}
async function tmdbTrending(mt='movie'){
  try{const r=await fetch(`${TMDB_BASE}/trending/${mt}/week?language=${TMDB_CONFIG.language}`,{headers:tmdbH()});if(!r.ok)return[];return((await r.json()).results||[]).map(x=>mkItem({...x,media_type:mt}));}catch{return[];}
}

let biblioteca=JSON.parse(localStorage.getItem('pocketvault')||'null')||{favoritas:[],pendientes:[],viendo:[],vistas:[]};
CARPETAS_FIJAS.forEach(k=>{if(!biblioteca[k])biblioteca[k]=[];});

let carpetaActual='favoritas';
let vistaActual='carpeta';
let modoSearch=false;
let tarjetaAbierta=null;

let dragSrc=null,dragSrcIdx=null;

let reorderState={dragging:false,item:null,ghost:null,srcIdx:null,srcList:null,startX:0,startY:0,longPressTimer:null};

function iniciarReorder(card,item,idx,lista,e){
  const posterSrc=getPosterOrSVG(item);
  const rect=card.getBoundingClientRect();
  const ghost=document.createElement('div');
  ghost.className='tarjeta reorder-ghost';
  ghost.style.cssText=`width:${rect.width}px;height:${rect.height}px;position:fixed;top:${rect.top}px;left:${rect.left}px;z-index:9999;pointer-events:none;opacity:0.85;transform:scale(1.06) rotate(2deg);transition:transform 0.1s;`;
  ghost.innerHTML=`<img src="${posterSrc}" alt="">`;
  document.body.appendChild(ghost);
  card.classList.add('reorder-src');
  reorderState={dragging:true,item,ghost,srcIdx:idx,srcList:lista,card,startX:e.clientX,startY:e.clientY,longPressTimer:null};
  document.addEventListener('pointermove',onReorderMove,{passive:false});
  document.addEventListener('pointerup',onReorderEnd);
}

function onReorderMove(e){
  if(!reorderState.dragging)return;
  e.preventDefault();
  const g=reorderState.ghost;
  const dx=e.clientX-reorderState.startX;
  const dy=e.clientY-reorderState.startY;
  const rect=reorderState.card.getBoundingClientRect();
  g.style.top=(rect.top+dy)+'px';
  g.style.left=(rect.left+dx)+'px';
  document.querySelectorAll('.tarjeta.reorder-over').forEach(c=>c.classList.remove('reorder-over'));
  const els=document.elementsFromPoint(e.clientX,e.clientY);
  const target=els.find(el=>el.classList.contains('tarjeta')&&el!==reorderState.card&&el!==g);
  if(target)target.classList.add('reorder-over');
}

function onReorderEnd(e){
  if(!reorderState.dragging)return;
  document.removeEventListener('pointermove',onReorderMove);
  document.removeEventListener('pointerup',onReorderEnd);
  reorderState.ghost.remove();
  reorderState.card.classList.remove('reorder-src');
  document.querySelectorAll('.tarjeta.reorder-over').forEach(c=>c.classList.remove('reorder-over'));
  const els=document.elementsFromPoint(e.clientX,e.clientY);
  const target=els.find(el=>el.classList.contains('tarjeta')&&el!==reorderState.card&&el.dataset.idx!==undefined);
  if(target&&target.dataset.idx!==undefined){
    const fi=reorderState.srcIdx;
    const ti=parseInt(target.dataset.idx);
    if(fi!==ti){
      const lista=reorderState.srcList;
      const[m]=lista.splice(fi,1);lista.splice(ti,0,m);guardar();
      renderGrid(biblioteca[carpetaActual]);
      reorderState={dragging:false,item:null,ghost:null,srcIdx:null,srcList:null,startX:0,startY:0,longPressTimer:null};
      return;
    }
  }
  reorderState={dragging:false,item:null,ghost:null,srcIdx:null,srcList:null,startX:0,startY:0,longPressTimer:null};
}

let interacciones=JSON.parse(localStorage.getItem('pv_interact')||'{}');
function registrarInteraccion(tmdb_id,accion){
  if(!tmdb_id)return;
  if(!interacciones[tmdb_id])interacciones[tmdb_id]={score:0,accion:null};
  const mapa={ver:2,favorita:3,pendiente:1,visto:-1,ignorar:-0.5};
  interacciones[tmdb_id].score=(interacciones[tmdb_id].score||0)+(mapa[accion]||0);
  interacciones[tmdb_id].accion=accion;
  localStorage.setItem('pv_interact',JSON.stringify(interacciones));
}

function guardar(){
  (biblioteca.favoritas||[]).forEach(fav=>{
    const yaEnVistas=biblioteca.vistas.some(v=>v.tmdb_id&&v.tmdb_id===fav.tmdb_id);
    if(!yaEnVistas)biblioteca.vistas.push({...fav,id:Date.now()+Math.random()});
  });
  const clean={};
  Object.keys(biblioteca).forEach(k=>{if(k!=='_subcarpetas')clean[k]=biblioteca[k];});
  localStorage.setItem('pocketvault',JSON.stringify(clean));
}

function todosLosItems(){
  const vistos=new Set();const all=[];
  Object.keys(biblioteca).forEach(k=>{
    (biblioteca[k]||[]).forEach(item=>{
      if(!vistos.has(item.tmdb_id||item.id)){vistos.add(item.tmdb_id||item.id);all.push(item);}
    });
  });
  return all;
}
function estaEnCarpeta(k,tmdb_id){return(biblioteca[k]||[]).some(p=>p.tmdb_id===tmdb_id);}
function estaEnAlguna(tmdb_id){return CARPETAS_FIJAS.some(k=>estaEnCarpeta(k,tmdb_id));}

function renderTabs(){
  const bar=document.getElementById('tabs-bar');
  bar.innerHTML='';

  Object.keys(biblioteca).forEach(key=>{
    const isFija=CARPETAS_FIJAS.includes(key);
    const btn=document.createElement('button');
    btn.className='tab-btn'+(key===carpetaActual&&vistaActual==='carpeta'?' active':'')+(isFija?' tab-fija':'');
    const icon=isFija?`<span class="tab-icon">${QA_ICONS[key]}</span>`:'';
    btn.innerHTML=`${icon}<span>${key}</span>`;
    btn.addEventListener('click',()=>{
      if(key===carpetaActual&&vistaActual==='carpeta'){if(!isFija)abrirModalCarpeta(key);return;}
      carpetaActual=key;vistaActual='carpeta';modoSearch=false;tarjetaAbierta=null;
      document.getElementById('search-info').style.display='none';
      document.getElementById('titulo-seccion').textContent=key;
      renderTabs();renderGrid(biblioteca[carpetaActual]);
    });
    bar.appendChild(btn);
  });

  const btnNueva=document.createElement('button');
  btnNueva.className='btn-nueva-carpeta';btnNueva.title='Nueva carpeta';btnNueva.textContent='+';
  btnNueva.addEventListener('click',()=>{document.getElementById('input-nueva-carpeta').value='';abrirModal('modal-nueva-carpeta');});
  bar.appendChild(btnNueva);
}

let inicioItems={};

async function mostrarInicio(){
  vistaActual='inicio';
  document.getElementById('search-info').style.display='none';
  document.getElementById('titulo-seccion').textContent='Para vos';
  const grid=document.getElementById('grid-contenido');
  grid.innerHTML='<p class="vacio">Cargando recomendaciones…</p>';

  let trending_m=[],trending_tv=[],byGenre1=[],byGenre2=[],classics=[];
  try{
    const generoCount={};
    todosLosItems().forEach(item=>{
      (item.tmdb_genres||[]).forEach(g=>{generoCount[g]=(generoCount[g]||0)+1;});
    });
    const topGeneros=Object.entries(generoCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);

    [trending_m,trending_tv,byGenre1,byGenre2,classics]=await Promise.all([
      tmdbTrending('movie'),
      tmdbTrending('tv'),
      topGeneros[0]?tmdbDiscover({mt:'movie',query:`with_genres=${topGeneros[0]}`,page:1}):[],
      topGeneros[1]?tmdbDiscover({mt:'movie',query:`with_genres=${topGeneros[1]}`,page:1}):[],
      tmdbDiscover({mt:'movie',query:'primary_release_date.lte=2000-01-01&vote_count.gte=500&sort_by=vote_average.desc',page:1}),
    ]);
  }catch(err){
    grid.innerHTML=`<p class="vacio">Error cargando recomendaciones.</p>`;return;
  }

  function filtrarYPuntar(items){
    return items
      .filter(i=>!estaEnCarpeta('vistas',i.tmdb_id))
      .map(i=>{
        const sc=interacciones[i.tmdb_id]?.score||0;
        const enPend=estaEnCarpeta('pendientes',i.tmdb_id)?2:0;
        return{...i,_score:sc+enPend};
      })
      .sort((a,b)=>b._score-a._score)
      .slice(0,12);
  }

  const novedades=filtrarYPuntar([...trending_m,...trending_tv].sort(()=>Math.random()-0.5));
  const clasicos=filtrarYPuntar(classics);

  const generoCount2={};
  todosLosItems().forEach(item=>{(item.tmdb_genres||[]).forEach(g=>{generoCount2[g]=(generoCount2[g]||0)+1;});});
  const topGeneros2=Object.entries(generoCount2).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const porGenero1=filtrarYPuntar(byGenre1);
  const porGenero2=filtrarYPuntar(byGenre2);

  const GENRE_NAMES={28:'Acción',12:'Aventura',16:'Animación',35:'Comedia',80:'Crimen',99:'Documental',18:'Drama',10751:'Familia',14:'Fantasía',36:'Historia',27:'Horror',10402:'Música',9648:'Misterio',10749:'Romance',878:'Ciencia Ficción',10770:'Película de TV',53:'Thriller',10752:'Guerra',37:'Western',10759:'Acción & Aventura',10762:'Kids',10763:'Noticias',10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'Guerra & Política',10769:'Western'};

  grid.innerHTML='';

  const secciones=[
    {titulo:'Novedades para vos', items:novedades},
    {titulo:'Para decir "ya la vi"', items:clasicos},
  ];
  if(porGenero1.length>0&&topGeneros2[0])secciones.push({titulo:`${GENRE_NAMES[topGeneros2[0]]||'Tu género favorito'}`,items:porGenero1});
  if(porGenero2.length>0&&topGeneros2[1])secciones.push({titulo:`${GENRE_NAMES[topGeneros2[1]]||'Otro género'}`,items:porGenero2});

  renderInicioSecciones(grid,secciones);
}

function renderInicioSecciones(grid,secciones){
  secciones.forEach(sec=>{
    if(!sec.items.length)return;
    const secEl=document.createElement('div');secEl.className='inicio-seccion';
    const h=document.createElement('h3');h.className='inicio-sec-titulo';h.textContent=sec.titulo;
    secEl.appendChild(h);
    const row=document.createElement('div');row.className='inicio-row';
    sec.items.slice(0,10).forEach(item=>{
      row.appendChild(crearTarjetaBusqueda(item,{muestraTitulo:true}));
    });
    secEl.appendChild(row);
    grid.appendChild(secEl);
  });
}

function renderGrid(lista){
  const grid=document.getElementById('grid-contenido');
  grid.innerHTML='';

  const conPortada=(lista||[]).filter(tienePoster);
  const sinPortada=(lista||[]).filter(i=>!tienePoster(i));

  if(!(lista||[]).length){
    const p=document.createElement('p');p.className='vacio';p.textContent='Esta lista está vacía.';grid.appendChild(p);
  } else {
    conPortada.forEach((item,i)=>grid.appendChild(crearTarjetaBiblioteca(item,(lista||[]).indexOf(item))));
    if(sinPortada.length>0){
      const sep=mkSep('poca documentación');grid.appendChild(sep);
      const sub=document.createElement('div');sub.className='grid grid-sin-portada';
      sinPortada.forEach(item=>sub.appendChild(crearTarjetaBiblioteca(item,(lista||[]).indexOf(item))));
      grid.appendChild(sub);
    }
  }

  if(!modoSearch&&vistaActual==='carpeta'){
    const addCard=document.createElement('div');addCard.className='tarjeta-add';
    addCard.innerHTML=`<span class="tarjeta-add-icon">+</span><span>Añadir</span>`;
    addCard.addEventListener('click',()=>abrirModalAddChoice());
    grid.appendChild(addCard);
  }
}

function mkSep(texto){
  const sep=document.createElement('div');sep.className='grid-separator';
  sep.innerHTML=`<span>${texto}</span>`;return sep;
}

function crearTarjetaBiblioteca(item,idx){
  const card=document.createElement('div');card.className='tarjeta';
  card.dataset.idx=idx;card.dataset.itemId=item.id;
  const posterSrc=getPosterOrSVG(item);
  const lista=biblioteca[carpetaActual];

  card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;

  card.addEventListener('pointerdown',e=>{
    if(card.classList.contains('flipped'))return;
    if(e.button&&e.button!==0)return;
    reorderState.longPressTimer=setTimeout(()=>{
      card.setPointerCapture(e.pointerId);
      iniciarReorder(card,item,idx,lista,e);
    },300);
  });
  card.addEventListener('pointerup',()=>{clearTimeout(reorderState.longPressTimer);});
  card.addEventListener('pointermove',e=>{
    if(!reorderState.dragging){
      const dx=Math.abs(e.clientX-(reorderState.startX||e.clientX));
      const dy=Math.abs(e.clientY-(reorderState.startY||e.clientY));
      if(dx>8||dy>8)clearTimeout(reorderState.longPressTimer);
    }
  });

  card.addEventListener('click',e=>{
    if(reorderState.dragging)return;
    if(card.classList.contains('flipped')){
      card.classList.remove('flipped');
      card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;
      return;
    }
    card.classList.add('flipped');
    const stars=item.estrellas>0?`★ ${item.estrellas}/10`:'Sin calificar';
    card.innerHTML=`<div class="tarjeta-inner"><div><h3>${item.titulo}</h3><div class="tarjeta-tipo">${item.tipo}${item.tmdb_year?' · '+item.tmdb_year:''}</div><div class="tarjeta-stars">${stars}</div></div><div class="tarjeta-actions"><button class="btn-card primary" data-id="${item.id}">Editar</button><button class="btn-card ghost" data-back="1">Volver</button></div></div>`;
    card.querySelector('[data-id]').addEventListener('click',()=>abrirModalPeli(item.id));
    card.querySelector('[data-back]').addEventListener('click',ev=>{
      ev.stopPropagation();card.classList.remove('flipped');
      card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;
    });
  });
  return card;
}

let ultimosResultados=[];

function crearTarjetaBusqueda(item,opts={}){
  const{muestraTitulo=true}=opts;
  const wrapper=document.createElement('div');wrapper.className='tarjeta-wrapper';
  const card=document.createElement('div');card.className='tarjeta';
  const posterSrc=getPosterOrSVG(item);
  card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;

  if(muestraTitulo){
    const tit=document.createElement('div');tit.className='tarjeta-titulo-abajo';
    tit.textContent=item.titulo;wrapper.appendChild(card);wrapper.appendChild(tit);
  } else {
    wrapper.appendChild(card);
  }

  const qaBar=document.createElement('div');qaBar.className='qa-bar';
  CARPETAS_FIJAS.forEach(key=>{
    const btnWrap=document.createElement('div');btnWrap.className='qa-btn-wrap';
    const btn=document.createElement('button');btn.className='qa-btn';
    btn.innerHTML=QA_ICONS[key];
    const tooltip=document.createElement('span');tooltip.className='qa-tooltip';tooltip.textContent=QA_LABELS[key];
    btnWrap.appendChild(btn);btnWrap.appendChild(tooltip);

    const updateBtn=()=>{
      const en=estaEnCarpeta(key,item.tmdb_id);
      btn.classList.toggle('added',en);
      btn.title='';
    };
    updateBtn();

    btn.addEventListener('click',ev=>{
      ev.stopPropagation();
      const en=estaEnCarpeta(key,item.tmdb_id);
      if(en){
        biblioteca[key]=biblioteca[key].filter(p=>p.tmdb_id!==item.tmdb_id);
        guardar();
      } else {
        biblioteca[key].push({...item,id:Date.now()});
        guardar();
        registrarInteraccion(item.tmdb_id,key==='vistas'?'visto':key==='pendientes'?'pendiente':key==='favoritas'?'favorita':'ver');
      }
      updateBtn();
    });
    qaBar.appendChild(btnWrap);
  });
  wrapper.appendChild(qaBar);

  card.addEventListener('click',e=>{
    if(e.target.tagName==='BUTTON'||e.target.closest('.qa-bar'))return;
    if(card.classList.contains('flipped')){
      card.classList.remove('flipped');card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;tarjetaAbierta=null;return;
    }
    cerrarTarjetaAbierta();
    tarjetaAbierta={card,posterSrc,titulo:item.titulo};
    card.classList.add('flipped');
    buildSearchCard(card,item,posterSrc);
  });
  return wrapper;
}

function cerrarTarjetaAbierta(){
  if(tarjetaAbierta&&tarjetaAbierta.card?.classList.contains('flipped')){
    tarjetaAbierta.card.classList.remove('flipped');
    tarjetaAbierta.card.innerHTML=`<img src="${tarjetaAbierta.posterSrc}" alt="">`;
    tarjetaAbierta=null;
  }
}

function buildCardStars(container,cur,onSel){
  container.innerHTML='';
  for(let i=1;i<=10;i++){
    const s=document.createElement('span');s.className='card-star'+(i<=cur?' on':'');s.textContent='★';
    s.addEventListener('click',ev=>{ev.stopPropagation();onSel(i);container.querySelectorAll('.card-star').forEach((st,j)=>st.classList.toggle('on',j<i));});
    container.appendChild(s);
  }
}

function buildSearchCard(card,item,posterSrc){
  const uid=`c${item.tmdb_id}`;const yearStr=item.tmdb_year?` · ${item.tmdb_year}`:'';
  card.innerHTML=`<div class="tarjeta-inner sc-inner">
    <div class="sc-header"><h3>${item.titulo}</h3><div class="tarjeta-tipo">${item.tipo}${yearStr}</div></div>
    <div class="sc-actions">
      <button class="sc-tab-btn" data-panel="clasificar" title="Clasificar">★</button>
      <button class="sc-tab-btn" data-panel="aniadir" title="Añadir a carpeta">＋</button>
      <button class="sc-tab-btn" data-panel="descripcion" title="Descripción">≡</button>
    </div>
    <div class="sc-panel" id="panel-clasificar-${uid}" style="display:none"><div class="sc-stars-row" id="stars-${uid}"></div><button class="sc-confirm-btn" id="confirm-${uid}">Guardar</button></div>
    <div class="sc-panel" id="panel-aniadir-${uid}" style="display:none"><div class="sc-folder-list" id="folders-${uid}"></div></div>
    <div class="sc-panel" id="panel-descripcion-${uid}" style="display:none"><p class="sc-overview" id="ov-${uid}"><span class="overview-loading">Cargando…</span></p></div>
    <button class="sc-close-btn" data-back="1">✕</button>
  </div>`;
  card.querySelector('[data-back]').addEventListener('click',ev=>{ev.stopPropagation();card.classList.remove('flipped');card.innerHTML=`<img src="${posterSrc}" alt="${item.titulo}">`;tarjetaAbierta=null;});
  let panelAbierto=null,ovCargado=false,ratingCard=0;
  card.querySelectorAll('.sc-tab-btn').forEach(btn=>{
    btn.addEventListener('click',async ev=>{
      ev.stopPropagation();const which=btn.dataset.panel;
      if(panelAbierto===which){document.getElementById(`panel-${which}-${uid}`).style.display='none';btn.classList.remove('active');panelAbierto=null;return;}
      if(panelAbierto){document.getElementById(`panel-${panelAbierto}-${uid}`).style.display='none';card.querySelector(`[data-panel="${panelAbierto}"]`).classList.remove('active');}
      document.getElementById(`panel-${which}-${uid}`).style.display='block';btn.classList.add('active');panelAbierto=which;
      if(which==='clasificar'){
        buildCardStars(document.getElementById(`stars-${uid}`),ratingCard,v=>{ratingCard=v;});
        const cb=document.getElementById(`confirm-${uid}`);const nc=cb.cloneNode(true);cb.parentNode.replaceChild(nc,cb);
        nc.addEventListener('click',ev2=>{ev2.stopPropagation();let g=false;Object.keys(biblioteca).forEach(k=>{if(Array.isArray(biblioteca[k])){const i=biblioteca[k].findIndex(p=>p.tmdb_id===item.tmdb_id);if(i!==-1){biblioteca[k][i].estrellas=ratingCard;g=true;}}});guardar();nc.textContent=g?`✓ ${ratingCard}/10`:'✓';nc.disabled=true;setTimeout(()=>{nc.textContent='Guardar';nc.disabled=false;},2000);});
      }
      if(which==='aniadir'){
        const fe=document.getElementById(`folders-${uid}`);fe.innerHTML='';
        const carpetasExtra=Object.keys(biblioteca).filter(k=>Array.isArray(biblioteca[k])&&!CARPETAS_FIJAS.includes(k));
        if(!carpetasExtra.length){
          fe.innerHTML='<p style="font-size:0.72rem;color:var(--muted);font-style:italic">No hay secciones personalizadas.<br>Usá los botones de abajo para las carpetas fijas.</p>';
        } else {
          carpetasExtra.forEach(k=>{
            const row=document.createElement('div');row.className='sc-folder-row';
            const ya=biblioteca[k].some(p=>p.tmdb_id===item.tmdb_id);
            row.innerHTML=`<span class="sc-folder-name">${k}</span><button class="sc-add-folder-btn${ya?' added':''}" ${ya?'disabled':''}>${ya?'✓ Añadido':'+ Añadir'}</button>`;
            if(!ya)row.querySelector('button').addEventListener('click',ev2=>{ev2.stopPropagation();biblioteca[k].push({...item,id:Date.now()});guardar();const b=row.querySelector('button');b.textContent='✓ Añadido';b.disabled=true;b.classList.add('added');});
            fe.appendChild(row);
          });
        }
      }
      if(which==='descripcion'&&!ovCargado){
        ovCargado=true;const oe=document.getElementById(`ov-${uid}`);
        const ov=await tmdbOverview(item.tmdb_id,item.tmdb_media_type);
        if(oe&&card.classList.contains('flipped'))oe.innerHTML=ov?ov:'<em>Sin descripción.</em>';
      }
    });
  });
}

function abrirModalAddChoice(){
  const ex=document.getElementById('modal-add-choice');if(ex)ex.remove();
  const overlay=document.createElement('div');overlay.className='modal-overlay open';overlay.id='modal-add-choice';
  overlay.innerHTML=`<div class="modal-box"><h3>Añadir a <em>${carpetaActual}</em></h3><div class="choice-btns"><button class="choice-btn" id="choice-existente"><span class="choice-icon">🔍</span><span class="choice-label">Existente</span><span class="choice-sub">Buscar en TMDB</span></button><button class="choice-btn" id="choice-manual"><span class="choice-icon">✏️</span><span class="choice-label">No registrada</span><span class="choice-sub">Añadir manualmente</span></button></div><button class="btn-modal secondary" id="choice-cancel" style="margin-top:12px">Cancelar</button></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.getElementById('choice-cancel').addEventListener('click',()=>overlay.remove());
  document.getElementById('choice-manual').addEventListener('click',()=>{overlay.remove();document.getElementById('input-add-titulo').value='';document.getElementById('input-add-poster').value='';abrirModal('modal-add-item');});
  document.getElementById('choice-existente').addEventListener('click',()=>{overlay.remove();abrirMiniSearch();});
}

function abrirMiniSearch(){
  const ex=document.getElementById('modal-mini-search');if(ex)ex.remove();
  const overlay=document.createElement('div');overlay.className='modal-overlay open';overlay.id='modal-mini-search';
  overlay.innerHTML=`<div class="modal-box modal-wide"><h3>Buscar para añadir a <em>${carpetaActual}</em></h3><input type="text" id="mini-search-input" class="modal-input" placeholder="Buscar en TMDB…" style="margin-top:12px;margin-bottom:0"><div id="mini-search-results" class="mini-results"></div><button class="btn-modal secondary" id="mini-search-cancel" style="margin-top:12px">Cerrar</button></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.getElementById('mini-search-cancel').addEventListener('click',()=>overlay.remove());
  let timer=null;const inp=document.getElementById('mini-search-input');inp.focus();
  inp.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>runMiniSearch(inp.value.trim()),400);});
}

async function runMiniSearch(q){
  const el=document.getElementById('mini-search-results');if(!el)return;
  if(!q){el.innerHTML='';return;}
  el.innerHTML='<p class="mini-loading">Buscando…</p>';
  let items=[];try{items=await tmdbSearch(q,1);}catch{el.innerHTML='<p class="mini-loading">Error.</p>';return;}
  if(!items.length){el.innerHTML='<p class="mini-loading">Sin resultados.</p>';return;}
  el.innerHTML='';
  items.slice(0,15).forEach(item=>{
    const row=document.createElement('div');row.className='mini-result-row';
    const ps=item.tmdb_poster?`https://image.tmdb.org/t/p/w92${item.tmdb_poster}`:makePosterSVG(item.titulo,item.tipo);
    const ya=biblioteca[carpetaActual]?.some(p=>p.tmdb_id===item.tmdb_id);
    row.innerHTML=`<img src="${ps}" class="mini-poster" alt=""><div class="mini-info"><div class="mini-title">${item.titulo}</div><div class="mini-meta">${item.tipo}${item.tmdb_year?' · '+item.tmdb_year:''}</div></div><button class="mini-add-btn${ya?' added':''}" ${ya?'disabled':''}>${ya?'✓':'＋'}</button>`;
    if(!ya)row.querySelector('button').addEventListener('click',e=>{
      e.stopPropagation();biblioteca[carpetaActual].push({...item,id:Date.now()});guardar();
      const b=row.querySelector('button');b.textContent='✓';b.disabled=true;b.classList.add('added');
      renderGrid(biblioteca[carpetaActual]);
    });
    el.appendChild(row);
  });
}

function abrirModalConfirmar(mensaje,onConfirm){
  const ex=document.getElementById('modal-confirmar');if(ex)ex.remove();
  const overlay=document.createElement('div');overlay.className='modal-overlay open';overlay.id='modal-confirmar';
  overlay.innerHTML=`<div class="modal-box"><h3 style="font-size:1rem;margin-bottom:16px">${mensaje}</h3><div class="modal-actions"><button class="btn-modal danger" id="btn-si-confirmar">Eliminar</button><button class="btn-modal secondary" id="btn-no-confirmar">Cancelar</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#btn-si-confirmar').addEventListener('click',()=>{overlay.remove();onConfirm();});
  overlay.querySelector('#btn-no-confirmar').addEventListener('click',()=>overlay.remove());
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
}

function abrirModal(id){document.getElementById(id).classList.add('open');}
function cerrarModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)cerrarModal(o.id);}));

let peliId=null,ratingTemp=0;
function abrirModalPeli(id){
  peliId=id;const peli=biblioteca[carpetaActual]?.find(p=>p.id===id);if(!peli)return;
  document.getElementById('modal-peli-titulo').textContent=peli.titulo;
  ratingTemp=peli.estrellas||0;renderStars(ratingTemp);
  const sel=document.getElementById('modal-select-carpeta');sel.innerHTML='';
  Object.keys(biblioteca).filter(k=>Array.isArray(biblioteca[k])).forEach(k=>{
    const o=document.createElement('option');o.value=k;o.textContent=k;if(k===carpetaActual)o.selected=true;sel.appendChild(o);
  });
  abrirModal('modal-peli');
}
const starsContainer=document.getElementById('stars-container');
for(let i=1;i<=10;i++){const s=document.createElement('span');s.className='star';s.textContent='★';s.dataset.v=i;s.addEventListener('click',()=>{ratingTemp=i;renderStars(i);});starsContainer.appendChild(s);}
function renderStars(n){starsContainer.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('on',i<n));}
document.getElementById('btn-guardar-peli').addEventListener('click',()=>{
  const dest=document.getElementById('modal-select-carpeta').value;
  const idx=biblioteca[carpetaActual].findIndex(p=>p.id===peliId);
  if(idx!==-1){const[p]=biblioteca[carpetaActual].splice(idx,1);p.estrellas=ratingTemp;biblioteca[dest].push(p);guardar();}
  cerrarModal('modal-peli');renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-eliminar-peli').addEventListener('click',()=>{
  biblioteca[carpetaActual]=biblioteca[carpetaActual].filter(p=>p.id!==peliId);guardar();
  cerrarModal('modal-peli');renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-cerrar-modal-peli').addEventListener('click',()=>cerrarModal('modal-peli'));

let carpetaEditando='';
function abrirModalCarpeta(key){carpetaEditando=key;document.getElementById('modal-carpeta-titulo').textContent=`"${key}"`;document.getElementById('input-nombre-carpeta').value=key;abrirModal('modal-carpeta');}
document.getElementById('btn-confirmar-renombrar').addEventListener('click',()=>{
  const nuevo=document.getElementById('input-nombre-carpeta').value.trim().toLowerCase();
  if(!nuevo||nuevo===carpetaEditando){cerrarModal('modal-carpeta');return;}
  if(biblioteca[nuevo]){alert('Ya existe.');return;}
  biblioteca[nuevo]=biblioteca[carpetaEditando];delete biblioteca[carpetaEditando];
  if(carpetaActual===carpetaEditando)carpetaActual=nuevo;guardar();cerrarModal('modal-carpeta');
  document.getElementById('titulo-seccion').textContent=carpetaActual;renderTabs();renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-confirmar-borrar').addEventListener('click',()=>{
  delete biblioteca[carpetaEditando];carpetaActual=Object.keys(biblioteca).find(k=>Array.isArray(biblioteca[k]))||'';
  guardar();cerrarModal('modal-carpeta');document.getElementById('titulo-seccion').textContent=carpetaActual;renderTabs();
  if(carpetaActual)renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-cerrar-modal-carpeta').addEventListener('click',()=>cerrarModal('modal-carpeta'));
document.getElementById('btn-confirmar-nueva-carpeta').addEventListener('click',()=>{
  const nombre=document.getElementById('input-nueva-carpeta').value.trim().toLowerCase();
  if(!nombre)return;if(biblioteca[nombre]){alert('Ya existe.');return;}
  biblioteca[nombre]=[];carpetaActual=nombre;vistaActual='carpeta';guardar();
  cerrarModal('modal-nueva-carpeta');document.getElementById('titulo-seccion').textContent=nombre;renderTabs();renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-cerrar-nueva-carpeta').addEventListener('click',()=>cerrarModal('modal-nueva-carpeta'));
document.getElementById('input-nueva-carpeta').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btn-confirmar-nueva-carpeta').click();});
document.getElementById('btn-confirmar-add-item').addEventListener('click',()=>{
  const titulo=document.getElementById('input-add-titulo').value.trim();if(!titulo)return;
  const tipo=document.getElementById('input-add-tipo').value;
  const poster=document.getElementById('input-add-poster').value.trim();
  biblioteca[carpetaActual].push({id:Date.now(),titulo,tipo,poster:poster||null,estrellas:0});guardar();
  cerrarModal('modal-add-item');renderGrid(biblioteca[carpetaActual]);
});
document.getElementById('btn-cerrar-add-item').addEventListener('click',()=>cerrarModal('modal-add-item'));
document.getElementById('input-add-titulo').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btn-confirmar-add-item').click();});

async function buscar(){
  const q=document.getElementById('input-busqueda').value.trim();if(!q)return;
  modoSearch=true;vistaActual='busqueda';tarjetaAbierta=null;
  document.getElementById('titulo-seccion').textContent=`Resultados`;

  const infoEl=document.getElementById('search-info');infoEl.style.display='block';
  infoEl.innerHTML=`<div class="search-badge">Buscando: <strong>${q}</strong><button id="btn-clear-search">✕</button></div>`;
  document.getElementById('btn-clear-search').addEventListener('click',limpiarBusqueda);

  const grid=document.getElementById('grid-contenido');
  grid.innerHTML='<p class="vacio">Buscando en TMDB…</p>';
  let resultados=[];
  try{resultados=await tmdbSearch(q);}
  catch{grid.innerHTML=`<p class="vacio">Error TMDB.</p>`;return;}
  if(!resultados.length){grid.innerHTML=`<p class="vacio">Sin resultados para "${q}".</p>`;return;}
  renderSearchResults(resultados);
}

function renderSearchResults(resultados){
  ultimosResultados=resultados;
  const grid=document.getElementById('grid-contenido');
  grid.innerHTML='';

  const conPortada=resultados.filter(i=>i.tmdb_poster);
  const sinPortada=resultados.filter(i=>!i.tmdb_poster);

  if(!resultados.length){const p=document.createElement('p');p.className='vacio';p.textContent='Sin resultados.';grid.appendChild(p);return;}

  conPortada.forEach(item=>grid.appendChild(crearTarjetaBusqueda(item,{muestraTitulo:true})));

  if(sinPortada.length>0){
    grid.appendChild(mkSep('poca documentación'));
    sinPortada.forEach(item=>{const w=crearTarjetaBusqueda(item,{muestraTitulo:true});w.style.opacity='0.6';grid.appendChild(w);});
  }
}

function limpiarBusqueda(){
  modoSearch=false;vistaActual='carpeta';tarjetaAbierta=null;ultimosResultados=[];
  document.getElementById('input-busqueda').value='';
  document.getElementById('search-info').style.display='none';
  document.getElementById('titulo-seccion').textContent=carpetaActual;
  renderTabs();renderGrid(biblioteca[carpetaActual]);
}

document.getElementById('btn-buscar').addEventListener('click',buscar);
document.getElementById('input-busqueda').addEventListener('keydown',e=>{if(e.key==='Enter')buscar();});

document.getElementById('titulo-seccion').textContent=carpetaActual;
renderTabs();
renderGrid(biblioteca[carpetaActual]);
