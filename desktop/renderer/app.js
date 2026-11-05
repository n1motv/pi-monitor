/* Pi Monitor : fenetre principale (Electron et navigateur). Donnees, alertes et reglages viennent de window.pi. */
let S={},lastHist=null,theme=null,now=null,HIST=null,view='home',metric='temp',part='soc',bdPart=null,paused=false,zoom=null,procSort='mem',svcFilter='all';
const L={t:[],cpu:[],temp:[],rx:[],tx:[]};
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const tick=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch{}};
let toastT;const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2400)};
const SNZ={get:()=>LS.get('snooze',{}),set:(k,ms)=>{const z=SNZ.get();z[k]=Date.now()+ms;LS.set('snooze',z)}};
const vis=l=>{const z=SNZ.get(),n=Date.now();return(l||[]).filter(x=>!(z[x.k]>n))};
setTheme('auto');
metric=LS.get('metric','temp');

/* ---------- icones ---------- */
$('logo').innerHTML=ic('logo');$('palBtn').innerHTML=ic('search');$('orb').innerHTML=statusIcon();$('n_theme').innerHTML=themeIcon();
[['home','home'],['temp','temp'],['perf','cpu'],['net','net'],['svc','server'],['alerts','bell']].forEach(([k,i])=>$('n_'+k).innerHTML=ic(i));
const H3={h_ro:['gauge','Mesures en direct'],h_svc:['server','Services'],h_disk:['disk','Stockage'],h_t1:['temp','Température du processeur'],h_t2:['warn','Alimentation et bridage'],h_t3:['gauge','Détails'],
 h_p1:['cpu','Processeur'],h_p2:['ram','Mémoire'],h_p3:['cpu','Cœurs'],h_p4:['list','Processus les plus gourmands'],h_p5:['zap','Consommation estimée'],
 h_n1:['net','Trafic (période choisie, hors Tailscale)'],h_n2:['pulse','Trafic en direct (5 dernières minutes)'],h_s1:['disk','Stockage'],h_a1:['bell','Journal des alertes'],h_a2:['gauge','Seuils et préférences'],h_w:['monitor','Widgets de bureau'],h_c:['link','Connexion au Pi']};
for(const k in H3)$(k).innerHTML=ic(H3[k][0])+H3[k][1];

/* ---------- vues, adresse et navigation ---------- */
const TITLES={home:["Accueil","Vue d'ensemble de ton Raspberry Pi"],temp:['Chaleur','Température, bridage et alimentation'],perf:['Performances','Processeur, mémoire, processus et énergie'],net:['Réseau','Débit par interface et historique'],svc:['Services','État des services et du stockage'],alerts:['Alertes','Journal, widgets et réglages']};
const VIEWS=Object.keys(TITLES);
function placeInd(){const b=document.querySelector('.nav.on[data-v]'),i=$('ind');if(!b)return;
  i.style.setProperty('--iy',b.offsetTop);i.style.setProperty('--ih',b.offsetHeight);i.style.setProperty('--ix',b.offsetLeft);i.style.setProperty('--iw',b.offsetWidth)}
function go(v,push=true){
  if(!TITLES[v])v='home';view=v;LS.set('view',v);
  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v_'+v));
  document.querySelectorAll('.nav[data-v]').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $('title').textContent=TITLES[v][0];$('subtitle').textContent=TITLES[v][1];document.title=TITLES[v][0]+' · Pi Monitor';
  if(push){tick();try{const u=new URL(location.href);if(u.searchParams.get('v')!==v){u.searchParams.set('v',v);history.pushState({v},'',u)}}catch{}}
  $('main').scrollTo({top:0,behavior:'instant'});placeInd();requestAnimationFrame(drawAll)}
document.querySelectorAll('.nav[data-v]').forEach(b=>b.onclick=()=>go(b.dataset.v));
addEventListener('popstate',()=>go(new URLSearchParams(location.search).get('v')||'home',false));
addEventListener('resize',placeInd);
document.addEventListener('click',e=>{const a=e.target.closest('a[data-go]');if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();go(a.dataset.go)}});
/* balayage horizontal : alternative tactile a la barre de navigation */
let sx=0,sy=0,sk=0;
$('main').addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;sk=e.target.closest('.chart,.parts,.tabs')?1:0},{passive:true});
$('main').addEventListener('touchend',e=>{if(sk)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(Math.abs(dx)>80&&Math.abs(dy)<40){const i=VIEWS.indexOf(view)+(dx<0?1:-1);if(VIEWS[i])go(VIEWS[i])}},{passive:true});

$('seg').onclick=e=>{const b=e.target.closest('[data-r]');if(b){tick();pi.set({range:b.dataset.r})}};
$('themeBtn').onclick=()=>pi.set({theme:document.documentElement.dataset.theme==='dark'?'light':'dark'});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palOpen();return}
  if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();const v=VIEWS[+k-1];
  if(v)go(v);else if(k==='t')$('themeBtn').click();else if(k==='r')pi.refresh()});
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}});

/* ---------- palette de commandes ---------- */
const CMDS=()=>[...Object.entries(TITLES).map(([k,t],i)=>({n:'Aller à '+t[0],k:String(i+1),f:()=>go(k)})),
  {n:'Changer de thème',k:'T',f:()=>$('themeBtn').click()},{n:'Actualiser',k:'R',f:()=>pi.refresh()},
  ...Object.entries(METRICS).map(([k,m])=>({n:'Courbe : '+m.l,k:'',f:()=>{go('home');setMetric(k)}})),
  {n:paused?'Reprendre l’affichage en direct':'Figer l’affichage',k:'',f:()=>$('pauseBtn').click()},{n:'Réinitialiser le zoom',k:'',f:()=>$('zoomReset').click()},
  ...['1h','6h','24h','7d'].map(r=>({n:'Période : '+r.replace('h',' h').replace('d',' j'),k:'',f:()=>pi.set({range:r})}))];
let palSel=0,palList=[];
function palDraw(){const q=$('palIn').value.toLowerCase();palList=CMDS().filter(c=>c.n.toLowerCase().includes(q));palSel=Math.min(palSel,Math.max(0,palList.length-1));
  $('palList').innerHTML=palList.map((c,i)=>`<li data-i="${i}" class="${i===palSel?'sel':''}">${c.n}${c.k?'<kbd>'+c.k+'</kbd>':''}</li>`).join('')||'<li>Aucun résultat</li>'}
function palOpen(){$('pal').classList.add('on');$('palIn').value='';palSel=0;palDraw();$('palIn').focus()}
function palClose(){$('pal').classList.remove('on')}
function palRun(i){const c=palList[i];palClose();if(c)c.f()}
$('palBtn').onclick=palOpen;$('pal').onclick=e=>{if(e.target===$('pal'))palClose()};
$('palIn').oninput=()=>{palSel=0;palDraw()};
$('palIn').onkeydown=e=>{if(e.key==='Escape')palClose();else if(e.key==='ArrowDown'){palSel=Math.min(palSel+1,palList.length-1);palDraw()}
  else if(e.key==='ArrowUp'){palSel=Math.max(0,palSel-1);palDraw()}else if(e.key==='Enter')palRun(palSel)};
$('palList').onclick=e=>{const l=e.target.closest('li[data-i]');if(l)palRun(+l.dataset.i)};
/* appairage + installation (navigateur) */
$('pairGo').onclick=()=>{const t=$('pairTok').value.trim();if(t)pi.set({conn:{token:t,routes:[{name:'Pi',url:location.origin}]}})};
$('pairTok').onkeydown=e=>{if(e.key==='Enter')$('pairGo').click()};
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('install').hidden=false});
$('install').onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;$('install').hidden=true}};
$('testNotif').onclick=()=>pi.testNotif();
$('clearLog').onclick=()=>pi.clearLog();

/* ---------- widgets bureau (Electron) ---------- */
const WK={gauges:['Jauges','gauge'],bar:['Barre','list'],temp:['Température','temp']};
$('wbtns').innerHTML=Object.entries(WK).map(([k,v])=>`<button class="svc" data-w="${k}" style="text-align:left"><div class="ic" style="--c:var(--acc)">${ic(v[1])}</div><div><b>${v[0]}</b><small class="ws">fermé</small></div></button>`).join('');
$('wbtns').onclick=e=>{const b=e.target.closest('[data-w]');if(b)pi.widget('toggle',b.dataset.w)};

/* ---------- reglages ---------- */
['t_warn','t_bad','t_ram','t_disk','t_cpu','t_price'].forEach(id=>{$(id).onchange=()=>pi.set({th:{[id==='t_price'?'price':id]:+$(id).value}})});
[['t_notif',s=>s.notif,v=>({notif:v})],['t_auto',s=>s.autostart,v=>({autostart:v})],['t_top',s=>s.widgets.onTop,v=>({widgets:{onTop:v}})]].forEach(([id,get,mk])=>{
  $(id).onclick=()=>pi.set(mk(!get(S.settings)))});
$('c_save').onclick=()=>{const u=s=>s.trim().replace(/\/$/,'');
  pi.set({conn:{token:$('c_tok').value.trim(),routes:[{name:'Réseau local',url:u($('c_lan').value)},{name:'Tailscale',url:u($('c_ts').value)}]}});
  toast('Connexion enregistrée');$('c_save').textContent='Enregistré';setTimeout(()=>$('c_save').textContent='Enregistrer la connexion',1500)};
let inputsInit=false;
function syncInputs(st){
  const t2=st.th,map={t_warn:t2.t_warn,t_bad:t2.t_bad,t_ram:t2.t_ram,t_disk:t2.t_disk,t_cpu:t2.t_cpu,t_price:t2.price};
  for(const id in map)if(document.activeElement!==$(id))$(id).value=map[id];
  [['t_notif',st.notif],['t_auto',st.autostart],['t_top',st.widgets.onTop]].forEach(([id,on])=>{$(id).classList.toggle('on',on);$(id).setAttribute('aria-checked',on)});
  document.querySelectorAll('[data-w]').forEach(b=>{const on=st.widgets.open.includes(b.dataset.w);b.querySelector('.ws').textContent=on?'ouvert':'fermé';b.querySelector('.ic').style.setProperty('--c',on?'var(--ok)':'var(--acc)')});
  if(!inputsInit&&S.conn){inputsInit=true;$('c_lan').value=S.conn.routes[0].url;$('c_ts').value=(S.conn.routes[1]||{url:''}).url;$('c_tok').value=S.conn.token}}

function showAlerts(list){
  $('alerts').innerHTML=list.map(x=>`<div class="al ${x.lv}" role="status">${ic(x.lv==='bad'?'bad':'warn')}<span>${x.m}</span><button class="snz" data-k="${x.k}" aria-label="Ignorer cette alerte pendant 1 heure">Ignorer 1 h</button></div>`).join('');
  const b=$('badge');b.style.display=list.length?'grid':'none';b.textContent=list.length;
  document.querySelector('.nav[data-v=alerts]').classList.toggle('ring',list.length>0)}
$('alerts').onclick=e=>{const b=e.target.closest('.snz');if(!b)return;SNZ.set(b.dataset.k,3600e3);toast('Alerte ignorée pendant 1 h');tick();if(now)render(now);else showAlerts(vis(S.alerts))};
function renderLog(log){$('log').innerHTML=log.length?log.slice(0,40).map(l=>`<div class="row"><span class="lvl" style="background:var(--${l.lv})"></span><div class="l" style="display:block">${l.m}<br><small>${fmtDT(l.t0)} ${l.t1?'· résolu '+fmtDT(l.t1):'· en cours'}</small></div></div>`).join(''):'<div class="empty">Aucune alerte enregistrée. Tout va bien.</div>'}

const SV={'crous-bot':['bot','Bot Telegram CROUS'],'pihole-FTL':['shield','Pi-hole (DNS, pubs)'],'pi-wol':['power','Réveil du PC gamer'],'tailscaled':['link','Tailscale (accès distant)'],
 'docker':['box','Docker'],'db-backup.timer':['archive','Sauvegardes quotidiennes'],'nextcloud':['cloud','Nextcloud']};

/* ====================================================================
   Carte du Pi : chaque composant reflete une vraie mesure et se touche
   ==================================================================== */
const CORES=[[208,128],[264,128],[208,184],[264,184]];
const pins=(y,cls)=>Array.from({length:20},(_,i)=>`<rect class="pin ${cls||''}" ${cls?`id="pin${i}"`:''} x="${77+13.2*i}" y="${y}" width="7" height="7" rx="1.5"/>`).join('');
const arc=r=>`M${121-r*.75} ${162-r*.66}A${r} ${r} 0 0 1 ${121+r*.75} ${162-r*.66}`;
const ring=(x,y,w,h)=>`<rect class="ring-sel" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
$('board').innerHTML=`<svg class="pcb-svg" viewBox="0 0 640 380" role="img" aria-label="Schéma du Raspberry Pi avec ses mesures en direct">
<defs><radialGradient id="heatg"><stop offset="0" style="stop-color:var(--hc,#57e38d)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--hc,#57e38d)" stop-opacity="0"/></radialGradient></defs>
<rect class="pcb" x="10" y="10" width="620" height="360" rx="22"/>
<g class="traces" aria-hidden="true"><path d="M60 215H196M324 150H340M324 205H340M424 175H514M424 215H514M260 252V340M96 182V256H116M380 242V330H440M470 40V120H514"/></g>
${[[36,32],[36,346],[459,32],[459,346]].map(([x,y])=>`<circle class="hole" cx="${x}" cy="${y}" r="9" aria-hidden="true"/>`).join('')}
<circle class="heat" id="heat" cx="260" cy="180" r="170"/>
<g class="part" data-p="gpio" aria-hidden="true">${ring(64,12,288,44)}<rect class="hdr" x="70" y="18" width="276" height="32" rx="3"/>${pins(23,'s')}${pins(38)}</g>
<g class="part" data-p="net" aria-hidden="true">${ring(78,112,86,68)}<path class="wf w1" id="wf1" d="${arc(14)}"/><path class="wf w2" id="wf2" d="${arc(26)}"/><path class="wf w3" id="wf3" d="${arc(38)}"/><circle cx="121" cy="162" r="4.5" fill="var(--acc)"/></g>
<g class="part sel" data-p="soc" aria-hidden="true">${ring(190,110,140,140)}<rect class="soc" x="200" y="120" width="120" height="120" rx="8"/>
${CORES.map(([x,y],i)=>`<rect class="cb" x="${x}" y="${y}" width="48" height="48" rx="5"/><rect class="cf" id="cf${i}" x="${x}" y="${y}" width="48" height="48" rx="5" style="transform:scaleY(0)"/><text class="ct" id="ct${i}" x="${x+24}" y="${y+29}">0</text>`).join('')}</g>
<g class="part" data-p="ram" aria-hidden="true">${ring(338,116,88,128)}<rect class="chipb" x="346" y="126" width="72" height="108" rx="6"/><rect class="rf" id="rf" x="350" y="130" width="64" height="100" rx="4" style="transform:scaleY(0)"/></g>
<g class="part" data-p="net" aria-hidden="true">${ring(514,30,122,108)}<rect class="metal" x="520" y="36" width="110" height="96" rx="6"/><rect class="dark" x="544" y="50" width="76" height="68" rx="4"/><circle class="led g" id="ledA" cx="531" cy="50" r="4"/><circle class="led a" id="ledB" cx="531" cy="64" r="4"/></g>
<g aria-hidden="true"><rect class="metal" x="520" y="150" width="110" height="84" rx="6"/><rect class="dark" x="544" y="160" width="76" height="26" rx="3"/><rect class="dark" x="544" y="198" width="76" height="26" rx="3"/></g>
<g class="part" data-p="stor" aria-hidden="true">${ring(514,244,122,96)}<rect class="metal" x="520" y="250" width="110" height="84" rx="6"/><rect class="dark" x="544" y="260" width="76" height="26" rx="3"/><rect class="chipb" x="544" y="298" width="76" height="26" rx="3"/><rect class="ssdf" id="ssdf" x="544" y="298" width="76" height="26" rx="3" style="transform:scaleX(0)"/></g>
<g class="part" data-p="stor" aria-hidden="true">${ring(0,248,68,84)}<path class="sdb" d="M2 262h42a6 6 0 0 1 6 6v46a6 6 0 0 1-6 6H2z"/><rect class="sdf" id="sdf" x="9" y="270" width="32" height="42" rx="3" style="transform:scaleY(0)"/></g>
<g class="part" data-p="pwr" aria-hidden="true">${ring(112,334,112,44)}<rect class="metal" x="124" y="346" width="58" height="24" rx="12"/><rect class="dark" x="134" y="353" width="38" height="10" rx="5"/><circle class="led r" id="ledP" cx="206" cy="358" r="5"/></g>
<g aria-hidden="true"><rect class="metal" x="246" y="346" width="40" height="24" rx="4"/><rect class="metal" x="298" y="346" width="40" height="24" rx="4"/><circle class="metal" cx="372" cy="358" r="11"/>
<text x="486" y="352" fill="var(--tx)" opacity=".28" font-size="12" font-family="Geist,sans-serif" translate="no">Raspberry Pi 4 Model B</text></g>
</svg>`;
const PARTS=[{id:'soc',label:'Processeur',icon:'cpu'},{id:'ram',label:'Mémoire',icon:'ram'},{id:'net',label:'Réseau',icon:'net'},{id:'pwr',label:'Alimentation',icon:'zap'},{id:'stor',label:'Stockage',icon:'disk'},{id:'gpio',label:'Services',icon:'server'}];
$('parts').innerHTML=PARTS.map(p=>`<button class="pt" data-p="${p.id}" aria-pressed="${p.id===part}">${ic(p.icon)}${p.label}</button>`).join('');
$('bd').innerHTML=`<div class="bi" id="bdi"></div><div class="bt" id="bdt"></div><div class="bs" id="bds"></div>`;
function selectPart(id,user){
  part=id;if(user)tick();
  document.querySelectorAll('.part[data-p]').forEach(g=>g.classList.toggle('sel',g.dataset.p===id));
  document.querySelectorAll('.pt').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===id));
  renderDetail()}
$('parts').onclick=e=>{const b=e.target.closest('[data-p]');if(b)selectPart(b.dataset.p,true)};
$('board').onclick=e=>{const g=e.target.closest('.part[data-p]');if(g)selectPart(g.dataset.p,true)};
const lk=(v,t)=>`<a class="lnk" href="?v=${v}" data-go="${v}">${t}${ic('arrow')}</a>`;
const st=(b,t)=>`<span><b>${b}</b> ${t}</span>`;
function detailFor(n){
  const d=n.disks||[],sd=d.find(x=>x.name==='Carte SD')||{},ssd=d.find(x=>x.name==='SSD')||{};
  const eth=n.net.find(i=>i.iface==='eth0')||{rx_bps:0,tx_bps:0},wl=n.net.find(i=>i.iface==='wlan0')||{rx_bps:0,tx_bps:0};
  const sv=n.services||[],down=sv.filter(s=>!s.ok),t=n.throttle;
  /* le panneau ne repete jamais les valeurs de la liste de mesures : il montre le detail en plus */
  switch(part){
  case 'soc':return{i:'cpu',t:'Processeur · BCM2711',lv:n.cpu.pct/100,s:st(n.cpu.freq_mhz,'MHz')+st(n.cpu.volts,'V')+st(n.load.join(' / '),'charge 1, 5, 15 min')+(t.throttled_now?'<span style="color:var(--bad)"><b>bridé</b></span>':t.throttled_past?'<span style="color:var(--warn)">bridé depuis le démarrage</span>':st('pas','de bridage'))+lk('temp','Chaleur')+lk('perf','Performances')};
  case 'ram':return{i:'ram',t:'Mémoire · LPDDR4',lv:n.mem.pct/100,s:st(n.mem.avail_mb,'Mo disponibles')+st(n.mem.swap_used_mb+' / '+n.mem.swap_total_mb,'Mo de swap')+lk('perf','Performances')};
  case 'net':return{i:'net',t:'Réseau · Ethernet et Wi-Fi',lv:.5,s:st('↓ '+fmtB(eth.rx_bps)+' ↑ '+fmtB(eth.tx_bps),'Ethernet')+st('↓ '+fmtB(wl.rx_bps)+' ↑ '+fmtB(wl.tx_bps),'Wi-Fi')+lk('net','Réseau')};
  case 'pwr':return{i:'zap',t:'Alimentation · USB-C',lv:(n.power.watts_est-3)/4.5,s:(t.undervolt_now?'<span style="color:var(--bad)"><b>Sous-tension</b> en cours</span>':t.undervolt_past?'<span style="color:var(--warn)">sous-tension depuis le démarrage</span>':st('tension','stable'))+st(n.cpu.volts,'V cœur')+'<span>estimation, le Pi n’a pas de wattmètre</span>'+lk('perf','Performances')};
  case 'stor':return{i:'disk',t:'Stockage · carte SD et SSD',lv:(sd.pct||0)/100,s:st('SD '+(sd.used_gb||'--')+' / '+(sd.total_gb||'--'),'Go ('+(sd.pct||'--')+' %)')+st('SSD '+(ssd.used_gb||'--')+' / '+(ssd.total_gb||'--'),'Go ('+(ssd.pct||'--')+' %)')+lk('svc','Services')};
  default:return{i:'server',t:'Services · broches GPIO',lv:sv.length?(sv.length-down.length)/sv.length:.5,s:(down.length?down.map(x=>`<span style="color:var(--bad)"><b>${x.name}</b> arrêté</span>`).join(''):sv.map(x=>`<span><span class="dot ok" style="display:inline-block;margin-right:5px"></span>${x.name}</span>`).join(''))+lk('svc','Services')}}
}
function renderDetail(){
  if(!now)return;const d=detailFor(now);
  if(bdPart!==part){bdPart=part;$('bdi').innerHTML=ic(d.i);$('bdt').textContent=d.t}
  setV($('bdi').firstChild,d.lv);$('bds').innerHTML=d.s}
const ledRate=r=>r<300?0:Math.max(.12,1.5-Math.log10(r+1)*.25);
function setLed(id,rate){const e=$(id);if(!e)return;const b=ledRate(rate);e.classList.toggle('on',b>0);if(b>0)e.style.setProperty('--bl',b.toFixed(2)+'s')}
function updateBoard(n){
  const T=n.temp,B=$('board');
  B.style.setProperty('--hc',T!=null?tcol(T):'var(--ok)');
  $('heat').style.opacity=T!=null?(.08+Math.max(0,Math.min(1,(T-40)/45))*.5).toFixed(2):.08;
  n.cpu.cores.forEach((c,i)=>{const f=$('cf'+i);if(!f)return;f.style.transform=`scaleY(${Math.max(.02,c/100)})`;f.style.fill=c>=th.t_cpu?'var(--warn)':'';$('ct'+i).textContent=Math.round(c)});
  $('rf').style.transform=`scaleY(${Math.max(.02,n.mem.pct/100)})`;
  const eth=n.net.find(i=>i.iface==='eth0')||{rx_bps:0,tx_bps:0},wl=n.net.find(i=>i.iface==='wlan0')||{rx_bps:0,tx_bps:0};
  setLed('ledA',eth.rx_bps);setLed('ledB',eth.tx_bps);
  ['wf1','wf2','wf3'].forEach(id=>$(id).classList.toggle('on',wl.rx_bps+wl.tx_bps>500));
  $('ledP').classList.toggle('on',!!n.throttle.undervolt_now);
  const d=n.disks||[],sd=d.find(x=>x.name==='Carte SD'),ssd=d.find(x=>x.name==='SSD');
  if(sd)$('sdf').style.transform=`scaleY(${Math.max(.02,sd.pct/100)})`;if(ssd)$('ssdf').style.transform=`scaleX(${Math.max(.02,ssd.pct/100)})`;
  (n.services||[]).forEach((s,i)=>{const p=$('pin'+i);if(p)p.setAttribute('class','pin '+(s.ok?'ok':'bad'))})}

/* ---------- mesures en direct ---------- */
const RO=[{id:'temp',l:'Température',i:'temp',v:'temp',c:'var(--s-temp)',u:'°C'},{id:'cpu',l:'Processeur',i:'cpu',v:'perf',c:'var(--s-cpu)',u:'%'},{id:'ram',l:'Mémoire',i:'ram',v:'perf',c:'var(--s-ram)',u:'%'},
  {id:'pw',l:'Consommation',i:'zap',v:'perf',c:'var(--s-pw)',u:'W'},{id:'net',l:'Réseau',i:'net',v:'net',c:'var(--mut)',u:''}];
$('ros').innerHTML=RO.map(r=>`<div class="ro" role="button" tabindex="0" data-m="${r.id}" style="--c:${r.c}" id="ro_${r.id}" aria-label="Afficher la courbe : ${r.l}"><span class="ri">${ic(r.i)}</span><span class="rt">${r.l}</span><span class="rv"><span id="rv_${r.id}">--</span><small>${r.u}</small></span><span class="rs" id="rs_${r.id}">&nbsp;</span><span class="spk"><div class="chart" id="sp_${r.id}"></div></span><a class="rgo" href="?v=${r.v}" data-go="${r.v}" aria-label="Détails : ${r.l}">${ic('arrow')}</a></div>`).join('');
const pickRo=r=>{setMetric(r.dataset.m);if(matchMedia('(max-width:900px)').matches)$('c_home').scrollIntoView({behavior:'smooth',block:'center'})};
$('ros').addEventListener('click',e=>{if(e.target.closest('a'))return;const r=e.target.closest('.ro[data-m]');if(r)pickRo(r)});
$('ros').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const r=e.target.closest('.ro[data-m]');if(r&&e.target===r){e.preventDefault();pickRo(r)}});
const roV=(id,v,d)=>{setV(document.querySelector('#ro_'+id+' svg.i'),v)};
function updateRows(n){
  const T=n.temp,kwh=n.power.watts_est*24*30/1000,eth=n.net.filter(i=>i.iface!=='tailscale0'),rx=eth.reduce((a,i)=>a+i.rx_bps,0),tx=eth.reduce((a,i)=>a+i.tx_bps,0);
  num($('rv_temp'),T,1);roV('temp',T!=null?T/90:.5);$('rs_temp').innerHTML=HIST&&HIST.temp_max!=null?`max ${HIST.temp_max} °C · ${n.throttle.throttled_past?'bridé':'pas de bridage'}`:'&nbsp;';
  num($('rv_cpu'),n.cpu.pct,0);roV('cpu',n.cpu.pct/100);$('rs_cpu').textContent=`${n.cpu.freq_mhz} MHz · charge ${n.load[0]}`;
  num($('rv_ram'),n.mem.pct,0);roV('ram',n.mem.pct/100);$('rs_ram').textContent=`${n.mem.used_mb} / ${n.mem.total_mb} Mo · swap ${n.mem.swap_used_mb} Mo`;
  num($('rv_pw'),n.power.watts_est,2);roV('pw',(n.power.watts_est-3)/4.5);$("rs_pw").textContent="estimation, sans wattmètre";
  $('rv_net').textContent=fmtB(rx);$('rs_net').textContent=`↑ ${fmtB(tx)}`;
  const act=rx+tx>500;$('ro_net').classList.toggle('act',act);document.querySelector('.nav[data-v=net]').classList.toggle('act',act);
  document.querySelectorAll('.pt').forEach(b=>{const v={soc:T!=null?T/90:.5,ram:n.mem.pct/100,net:.5,pwr:(n.power.watts_est-3)/4.5,stor:.5,gpio:.5}[b.dataset.p];setV(b.firstChild,v)});
  document.querySelector('.pt[data-p=net]').classList.toggle('act',act)}

/* ---------- courbe principale a onglets ---------- */
const METRICS={
 temp:{l:'Température',i:'temp',c:'var(--s-temp)',cols:[3],names:['Température'],fmt:v=>v.toFixed(0)+'°',tip:v=>v.toFixed(1)+' °C',lines:()=>[{y:th.t_warn,color:'var(--warn)',label:'alerte'},{y:th.t_bad,color:'var(--bad)',label:'critique'}],u:' °C',d:1},
 cpu:{l:'Processeur',i:'cpu',c:'var(--s-cpu)',cols:[1],names:['CPU'],min:0,max:100,fmt:v=>v.toFixed(0)+'%',u:' %',d:0},
 ram:{l:'Mémoire',i:'ram',c:'var(--s-ram)',cols:[2],names:['RAM'],min:0,max:100,fmt:v=>v.toFixed(0)+'%',u:' %',d:0},
 pw:{l:'Consommation',i:'zap',c:'var(--s-pw)',cols:[6],names:['Puissance'],fmt:v=>v.toFixed(2)+' W',u:' W',d:2},
 net:{l:'Réseau',i:'net',c:'var(--acc)',cols:[4,5],names:['Réception','Émission'],colors:['var(--acc)','var(--acc2)'],min:0,fmt:fmtB,u:'',d:0,net:true}};
const syncTabs=()=>{$('ctitle').textContent=METRICS[metric].l;document.querySelectorAll('.ro').forEach(r=>r.classList.toggle('on',r.dataset.m===metric))};syncTabs();
function setMetric(k){if(k===metric)return;metric=k;LS.set('metric',k);tick();syncTabs();drawHome(true)}
function drawHome(anim){
  if(!HIST)return;let P=HIST.points;if(zoom){P=P.filter(p=>p[0]>=zoom[0]&&p[0]<=zoom[1]);if(P.length<3){zoom=null;P=HIST.points}}
  $('zoomReset').hidden=!zoom;const col=i=>P.map(p=>p[i]),t=col(0),m=METRICS[metric];
  const series=m.cols.map((c,i)=>({name:m.names[i],v:col(c),color:m.colors?m.colors[i]:m.c}));
  chart('c_home',{t,series,min:m.min,max:m.max,fmt:m.fmt,tip:m.tip,h:250,label:'Courbe : '+m.l,lines:m.lines&&m.lines(),areaAll:m.net,anim});
  const v=series[0].v.filter(x=>x!=null);if(!v.length){$('tstat').innerHTML='';return}
  const mn=Math.min(...v),mx=Math.max(...v),av=v.reduce((a,b)=>a+b,0)/v.length,f=m.net?fmtB:x=>x.toFixed(m.d)+m.u;
  $('tstat').innerHTML=[['minimum',mn],['moyenne',av],['maximum',mx]].map(([k,x])=>`<div><b>${f(x)}</b><span>${m.net?'réception ':''}${k}</span></div>`).join('')}

/* courbe : glisser = zoom, double-clic = retour, lignes de seuil deplacables (souris) */
(()=>{const ch=$('c_home');let d=null,selEl=null;
  const geo=()=>CH.c_home&&CH.c_home._g,yOf=(g,v)=>g.pt+(g.Hh-g.pt-g.pb)*(1-(v-g.mn)/(g.mx-g.mn));
  const near=(g,y)=>metric==='temp'&&['t_warn','t_bad'].find(k=>Math.abs(y-yOf(g,th[k]))<9);
  ch.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;const g=geo();if(!g)return;const r=ch.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,k=near(g,y);
    if(k){d={k};ch.setPointerCapture(e.pointerId);return}
    if(x>g.pl&&x<g.W-g.pr){d={x0:x,x1:x};ch.setPointerCapture(e.pointerId);selEl=document.createElement('div');selEl.className='zsel';ch.appendChild(selEl)}});
  ch.addEventListener('pointermove',e=>{const g=geo();if(!g||e.pointerType!=='mouse')return;const r=ch.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    if(!d){ch.style.cursor=near(g,y)?'ns-resize':'crosshair';return}
    if(d.k){let v=Math.round(g.mn+(g.mx-g.mn)*(1-(y-g.pt)/(g.Hh-g.pt-g.pb)));
      v=d.k==='t_warn'?Math.max(30,Math.min(th.t_bad-1,v)):Math.min(95,Math.max(th.t_warn+1,v));d.v=v;th[d.k]=v;CH.c_home.lines=METRICS.temp.lines();draw('c_home')}
    else{d.x1=x;const a=Math.min(d.x0,d.x1),b=Math.max(d.x0,d.x1);selEl.style.left=a+'px';selEl.style.width=(b-a)+'px'}});
  ch.addEventListener('pointerup',()=>{if(!d)return;const g=geo();
    if(d.k){if(d.v!=null){pi.set({th:{[d.k]:d.v}});toast((d.k==='t_warn'?'Seuil d’alerte':'Seuil critique')+' réglé à '+d.v+' °C');tick()}}
    else{if(selEl)selEl.remove();const a=Math.min(d.x0,d.x1),b=Math.max(d.x0,d.x1);
      if(g&&b-a>14){const f=x=>g.t0+(Math.max(g.pl,Math.min(g.W-g.pr,x))-g.pl)/(g.W-g.pl-g.pr)*(g.t1-g.t0);zoom=[f(a),f(b)];tick();drawHome(true)}}
    d=null;selEl=null});
  ch.addEventListener('dblclick',()=>{if(zoom){zoom=null;drawHome(true)}});
  $('zoomReset').onclick=()=>{zoom=null;drawHome(true);tick()}})();

/* bulle au survol de la carte */
(()=>{const B=$('board'),bt=document.createElement('div');bt.className='ptt';B.style.position='relative';B.appendChild(bt);
  const short=id=>{const n=now;if(!n)return'';const d=n.disks||[],sd=d.find(x=>x.name==='Carte SD'),ssd=d.find(x=>x.name==='SSD'),sv=n.services||[];
    return{soc:(n.temp!=null?n.temp+' °C · ':'')+n.cpu.pct+' %',ram:n.mem.pct+' %',net:'↓ '+fmtB(n.net.filter(i=>i.iface!=='tailscale0').reduce((a,i)=>a+i.rx_bps,0)),pwr:n.power.watts_est+' W',stor:'SD '+(sd?sd.pct:'--')+' % · SSD '+(ssd?ssd.pct:'--')+' %',gpio:sv.filter(x=>x.ok).length+'/'+sv.length+' actifs'}[id]};
  B.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const g=e.target.closest('.part[data-p]');if(!g||!now){bt.style.opacity=0;return}
    const r=B.getBoundingClientRect();bt.textContent=PARTS.find(p=>p.id===g.dataset.p).label+' · '+short(g.dataset.p);bt.style.opacity=1;bt.style.transform=`translate(${e.clientX-r.left+14}px,${e.clientY-r.top+14}px)`});
  B.addEventListener('pointerleave',()=>bt.style.opacity=0)})();

/* pause, tri, filtre, fleches clavier, tirer pour actualiser */
$('pauseBtn').onclick=()=>{paused=!paused;const b=$('pauseBtn');b.setAttribute('aria-pressed',paused);b.innerHTML=paused?ic('pause')+'En pause':'<span class="dot ok"></span>En direct';tick();
  if(!paused&&S.now){render(S.now);if(S.hist)drawHist(S.hist)}toast(paused?'Affichage figé':'Affichage en direct')};
const segSet=(id,fn)=>$(id).addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;[...$(id).children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});tick();fn(b.dataset.s);if(now)render(now)});
segSet('procSeg',v=>procSort=v);segSet('svcSeg',v=>svcFilter=v);
const rove=(id,act)=>$(id).addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const b=[...$(id).querySelectorAll('button')],i=b.indexOf(document.activeElement);if(i<0)return;e.preventDefault();
  const n=b[(i+(e.key==='ArrowRight'?1:b.length-1))%b.length];n.focus();if(act)n.click()});
rove('parts',1);rove('seg',0);rove('procSeg',0);rove('svcSeg',0);
(()=>{const M=$('main'),p=$('ptr');let y0=null;
  M.addEventListener('touchstart',e=>{y0=M.scrollTop===0?e.touches[0].clientY:null},{passive:true});
  M.addEventListener('touchmove',e=>{if(y0==null)return;const d=Math.max(0,Math.min(90,(e.touches[0].clientY-y0)*.5));p.style.transform=`translate(-50%,${d-40}px)`;p.style.opacity=Math.min(1,d/60);p.classList.toggle('rdy',d>=45)},{passive:true});
  M.addEventListener('touchend',()=>{if(y0==null)return;const r=p.classList.contains('rdy');p.style.transform='';p.style.opacity='';p.classList.remove('rdy');y0=null;if(r){pi.refresh();toast('Actualisé');tick()}},{passive:true})})();

/* ---------- rendu ---------- */
function render(n){
  now=n;const T=n.temp;
  const al=vis(S.alerts),bad=al.some(x=>x.lv==='bad'),warn=al.length>0,state=bad?'bad':warn?'warn':'ok';
  $('hero').style.setProperty('--hc',`var(--${state})`);$('orb').firstChild.dataset.s=state;
  const hh=bad?'Attention requise':warn?'À surveiller':'Tout est normal';if($('hh').textContent!==hh){$('hh').textContent=hh;$('live').textContent=hh}
  const okS=(n.services||[]).filter(s=>s.ok).length;
  $('hp').textContent=`${okS} services sur ${(n.services||[]).length} actifs`;
  const kwhMonth=n.power.watts_est*24*30/1000;
  $('k_cost').textContent=(kwhMonth*th.price).toFixed(2)+' €';$('k_kwh').textContent=HIST?HIST.energy_kwh_est:'--';$('k_up').textContent=fmtUp(n.uptime_s);
  $('upChip').innerHTML=ic('clock')+'Allumé depuis '+fmtUp(n.uptime_s);
  showAlerts(al);
  updateBoard(n);updateRows(n);renderDetail();
  $('svcMini').innerHTML=(n.services||[]).map(s=>`<span class="chip" style="color:var(--tx)"><span class="dot ${s.ok?'ok':'bad'}"></span>${s.name}</span>`).join('');
  const dk=(n.disks||[]).map(d=>`<div style="margin-bottom:12px"><div class="row" style="border:0;padding:0 0 6px"><span class="l">${ic('disk')}${d.name}</span><span>${d.used_gb} / ${d.total_gb} Go · <b>${d.pct} %</b></span></div><div class="bar"><i style="width:${d.pct}%;${d.pct>=th.t_disk?'background:var(--bad)':''}"></i></div></div>`).join('');
  $('disksMini').innerHTML=dk;$('disks').innerHTML=dk;
  /* chaleur */
  const f=(k,l,past)=>`<div class="flag ${past?'past':''} ${n.throttle[k]?'on':''}">${ic(n.throttle[k]?'warn':'ok')}${l}</div>`;
  $('flags').innerHTML=f('undervolt_now','Sous-tension (maintenant)')+f('undervolt_past','Sous-tension (passé)',1)+f('throttled_now','Bridage (maintenant)')+f('throttled_past','Bridage (passé)',1)+f('freq_capped_now','Fréquence limitée (maintenant)')+f('freq_capped_past','Fréquence limitée (passé)',1)+f('soft_limit_now','Limite douce (maintenant)')+f('soft_limit_past','Limite douce (passé)',1);
  $('tinfo').innerHTML=[['Fréquence CPU',n.cpu.freq_mhz+' MHz (max 1800)'],['Tension cœur',n.cpu.volts+' V'],['Charge 1 / 5 / 15 min',n.load.join(' / ')],['Marge avant bridage (80 °C)',T!=null?Math.max(0,80-T).toFixed(1)+' °C':'--']].map(r=>`<div class="row"><span class="l">${r[0]}</span><b>${r[1]}</b></div>`).join('');
  /* perfs */
  $('cores').innerHTML=n.cpu.cores.map((c,i)=>`<div class="core"><span>Cœur ${i+1}</span><b>${c.toFixed(0)} %</b><div class="bar"><i style="width:${c}%"></i></div></div>`).join('');
  const pr=[...(n.procs||[])].sort((a,b)=>procSort==='cpu'?b.cpu-a.cpu:b.rss_mb-a.rss_mb),val=p=>procSort==='cpu'?p.cpu:p.rss_mb,mx=Math.max(1,...pr.map(val));
  $('procs').innerHTML=pr.map(p=>`<div class="row"><span class="l" style="flex:0 0 130px;overflow:hidden;text-overflow:ellipsis">${p.name}</span><div class="bar" style="flex:1"><i style="width:${100*val(p)/mx}%"></i></div><span style="min-width:110px;text-align:right">${p.rss_mb} Mo · ${p.cpu} %</span></div>`).join('');
  /* reseau */
  $('ifaces').innerHTML=n.net.map(i=>`<div class="card"><h3>${ic(i.iface==='wlan0'?'wifi':i.iface==='eth0'?'eth':'link')}${i.label}</h3>
    <div class="row" style="border:0"><span class="l">${ic('down')}Réception</span><b style="font-size:18px">${fmtB(i.rx_bps)}</b></div><div class="row" style="border:0"><span class="l">${ic('up')}Émission</span><b style="font-size:18px">${fmtB(i.tx_bps)}</b></div></div>`).join('');
  /* services */
  const sl=(n.services||[]).filter(s=>svcFilter==='all'||!s.ok);
  $('svcs').innerHTML=!sl.length?'<div class="empty" style="grid-column:1/-1">Aucun service arrêté. Tout fonctionne.</div>':sl.map(s=>{const m=SV[s.name]||['server',s.name];return `<div class="svc ${s.ok?'':'down'}"><div class="ic">${ic(m[0])}</div><div><b>${m[1]}</b><small>${s.name} · ${s.ok?'actif':s.state}</small></div></div>`}).join('');
  /* tampon direct */
  L.t.push(n.ts);L.cpu.push(n.cpu.pct);L.temp.push(T);
  const ne=n.net.filter(i=>i.iface!=='tailscale0');L.rx.push(ne.reduce((a,i)=>a+i.rx_bps,0));L.tx.push(ne.reduce((a,i)=>a+i.tx_bps,0));
  Object.values(L).forEach(a=>{if(a.length>150)a.shift()});
  chart('c_netlive',{t:L.t,series:[{name:'Réception',v:L.rx,color:'var(--acc)'},{name:'Émission',v:L.tx,color:'var(--acc2)'}],min:0,fmt:fmtB,h:170,area:true,areaAll:true,label:'Trafic réseau en direct'});
}

function drawHist(h){
  HIST=h;const P=h.points,col=i=>P.map(p=>p[i]),t=col(0);
  const sp=(id,i,color,fmt)=>chart('sp_'+id,{t,series:[{name:id,v:col(i),color}],mini:true,h:22,fmt,label:'Tendance'});
  sp('temp',3,'var(--s-temp)',v=>v.toFixed(1)+' °C');sp('cpu',1,'var(--s-cpu)',v=>v.toFixed(0)+' %');sp('ram',2,'var(--s-ram)',v=>v.toFixed(0)+' %');sp('pw',6,'var(--s-pw)',v=>v.toFixed(2)+' W');
  chart('sp_net',{t,series:[{name:'Réception',v:col(4),color:'var(--acc)'}],mini:true,h:22,min:0,fmt:fmtB,label:'Tendance'});
  chart('c_temp',{t,series:[{name:'Température',v:col(3),color:'var(--s-temp)'}],h:260,fmt:v=>v.toFixed(0)+'°',tip:v=>v.toFixed(1)+' °C',label:'Température du processeur',
    lines:[{y:th.t_warn,color:'var(--warn)',label:'alerte'},{y:th.t_bad,color:'var(--bad)',label:'critique'}]});
  chart('c_cpu',{t,series:[{name:'CPU',v:col(1),color:'var(--s-cpu)'}],min:0,max:100,fmt:v=>v.toFixed(0)+'%',h:190,label:'Charge du processeur'});
  chart('c_ram',{t,series:[{name:'RAM',v:col(2),color:'var(--s-ram)'}],min:0,max:100,fmt:v=>v.toFixed(0)+'%',h:190,label:'Mémoire utilisée'});
  chart('c_pw',{t,series:[{name:'Puissance',v:col(6),color:'var(--s-pw)'}],fmt:v=>v.toFixed(2)+' W',h:190,label:'Consommation estimée'});
  chart('c_net',{t,series:[{name:'Réception',v:col(4),color:'var(--acc)'},{name:'Émission',v:col(5),color:'var(--acc2)'}],min:0,fmt:fmtB,h:200,areaAll:true,label:'Trafic réseau'});
  $('tstats').innerHTML=[['Actuelle',now&&now.temp!=null?now.temp+' °C':'--'],['Minimum',h.temp_min!=null?h.temp_min+' °C':'--'],['Moyenne',h.temp_avg!=null?h.temp_avg+' °C':'--'],['Maximum',h.temp_max!=null?h.temp_max+' °C':'--']].map(s=>`<div class="stat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');
  drawHome(!lastDrawn);lastDrawn=true;
  if(now)render(now)}
let lastDrawn=false;

function applyState(s){
  S=s;Object.assign(th,s.settings.th);const stt=s.settings;
  if(theme!==stt.theme){theme=stt.theme;setTheme(theme);drawAll()}
  if(stt.range!==range){range=stt.range;lastHist=null;lastDrawn=false;zoom=null}
  [...$('seg').children].forEach(b=>b.classList.toggle('on',b.dataset.r===range));
  syncInputs(stt);
  $('pair').classList.toggle('on',document.documentElement.classList.contains('web')&&(s.status==='auth'||!(s.conn&&s.conn.token)));
  $('dot').className='dot '+(s.connected?'ok':'bad');
  $('route').textContent=s.connected?`${s.route} · ${s.lat} ms`:s.status==='auth'?'jeton refusé':s.status==='connecting'?'connexion…':'Pi injoignable';
  document.querySelector('.scroll').classList.toggle('off',!s.connected&&s.status!=='connecting');
  if(s.hist&&s.hist.range===range&&s.hist!==lastHist&&!paused){lastHist=s.hist;drawHist(s.hist)}
  if(s.connected&&s.now){if(!paused)render(s.now)}
  else if(s.status!=='connecting'){const hh=s.status==='auth'?'Jeton refusé':'Pi injoignable';$('hh').textContent=hh;$('live').textContent=hh;
    $('hp').textContent=s.status==='auth'?'Vérifie le jeton dans Alertes, rubrique Connexion.':'Ni le réseau local ni Tailscale ne répondent. Le Pi est peut-être éteint ou hors ligne.';
    $('hero').style.setProperty('--hc','var(--bad)');$('orb').firstChild.dataset.s='bad';showAlerts(vis(s.alerts))}
  renderLog(s.log)}

pi.onState(applyState);pi.onGo(v=>go(v));
pi.state().then(s=>{applyState(s);const q=new URLSearchParams(location.search).get('v');go(TITLES[q]?q:LS.get('view','home'),false)});
