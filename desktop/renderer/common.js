const $=id=>document.getElementById(id);
/* ---------- icones (style trait, 24x24) ---------- */
const P={
 logo:'<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
 home:'<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
 temp:'<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><rect class="merc" x="11.25" y="6" width="1.5" height="11.5" rx=".75" fill="currentColor" stroke="none"/><circle cx="12" cy="17.5" r="1.9" fill="currentColor" stroke="none"/>',
 cpu:'<rect x="4" y="4" width="16" height="16" rx="3"/><rect class="core" x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/><path class="pins" d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
 ram:'<rect x="2" y="6" width="20" height="12" rx="2"/><path class="b b1" d="M6 10v4"/><path class="b b2" d="M10 10v4"/><path class="b b3" d="M14 10v4"/><path class="b b4" d="M18 10v4"/><path d="M6 18v2M18 18v2"/>',
 zap:'<path class="bolt" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
 pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 net:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><ellipse class="mer" cx="12" cy="12" rx="4.2" ry="10"/>',
 disk:'<path d="M22 12H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><path d="M6 16h.01M10 16h.01"/>',
 server:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path class="led l1" d="M6 6h.01"/><path class="led l2" d="M6 18h.01"/>',
 bell:'<g class="bw"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></g><path class="clap" d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
 ok:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>',
 warn:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
 bad:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
 down:'<path d="M12 5v14M19 12l-7 7-7-7"/>',
 up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
 wifi:'<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
 eth:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 17v3M12 17v3M17 17v3M7 11v2M11 11v2M15 11v2"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
 cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
 bot:'<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>',
 power:'<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.77.04"/>',
 box:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 archive:'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
 link:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-3.6M8.2 13l7.6 3.6"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 play:'<path d="m7 4 13 8-13 8z"/>',
 gauge:'<path d="M3.34 19a10 10 0 1 1 17.32 0"/><path class="needle" d="m12 14 4-4"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 arrow:'<path d="M7 17 17 7M8 7h9v9"/>'
};
const ic=(n,c='')=>`<svg class="i ic-${n} ${c}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n]}</svg>`;
/* icone qui se transforme avec la mesure (0..1) : --v est lu par le CSS */
const setV=(el,v)=>{if(el&&v!=null)el.style.setProperty('--v',Math.max(0,Math.min(1,v)).toFixed(3))};
/* pastille d'etat : carre arrondi -> losange -> croix, transitions CSS selon data-s */
const statusIcon=()=>'<svg class="i st" viewBox="0 0 24 24" data-s="ok" aria-hidden="true" focusable="false"><rect class="ring" x="3" y="3" width="18" height="18" rx="7"/><path class="g g-ok" d="m7.8 12.4 3 3 5.6-6.2"/><path class="g g-warn" d="M12 7.6v5M12 16.4h.01"/><path class="g g-bad" d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4"/></svg>';
/* soleil <-> lune : le disque est decoupe par un masque qui glisse, les rayons tournent et rentrent */
const themeIcon=()=>'<svg class="i th" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><mask id="thm"><rect width="24" height="24" fill="#fff"/><circle class="cut" cx="24" cy="0" r="6.5" fill="#000"/></mask><circle class="sunc" cx="12" cy="12" r="4.4" mask="url(#thm)"/><g class="rays"><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></g></svg>';
let range="1h";
const th={t_warn:70,t_bad:80,t_ram:85,t_disk:90,t_cpu:90,price:0.25};
function setTheme(t){document.documentElement.dataset.theme=t==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t}
/* ---------- formats ---------- */
const fmtB=b=>b>=1e6?(b/1e6).toFixed(1)+' Mo/s':b>=1e3?(b/1e3).toFixed(0)+' Ko/s':Math.round(b)+' o/s';
const fmtUp=s=>{const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?`${d} j ${h} h`:h?`${h} h ${m} min`:`${m} min`};
const pad=n=>String(n).padStart(2,'0');
const fmtT=(ts,long)=>{const d=new Date(ts*1000);return (long?['dim','lun','mar','mer','jeu','ven','sam'][d.getDay()]+' ':'')+pad(d.getHours())+':'+pad(d.getMinutes())};
const fmtDT=ts=>{const d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const tcol=t=>t>=th.t_bad?'var(--bad)':t>=th.t_warn?'var(--warn)':'var(--ok)';
const pcol=(v,w)=>v>=w?'var(--warn)':'var(--acc)';

/* ---------- nombres animes ---------- */
function num(el,v,d=0){if(!el)return;if(v==null){el.textContent='--';return}
  const from=+el.dataset.v||0;el.dataset.v=v;const t0=performance.now();
  (function s(t){const k=Math.min(1,(t-t0)/500),e=1-Math.pow(1-k,3);el.textContent=(from+(v-from)*e).toFixed(d);if(k<1)requestAnimationFrame(s)})(t0)}

const C=2*Math.PI*66,ARC=C*0.75;
function gauge(id,v,max,color){const e=$('g_'+id);if(v==null)return;e.setAttribute('stroke-dasharray',`${Math.max(0.5,Math.min(1,v/max))*ARC} ${C}`);if(color)e.style.stroke=color;else e.style.stroke=''}

/* ---------- graphiques SVG interactifs ---------- */
const CH={};
function chart(id,cfg){CH[id]=cfg;draw(id)}
function draw(id){
  const el=$(id),c=CH[id];if(!el||!c||!el.clientWidth)return;
  const W=el.clientWidth,Hh=c.h||(c.mini?56:200),pl=c.mini?2:44,pr=c.mini?2:8,pt=c.mini?4:10,pb=c.mini?2:22;
  const t=c.t,n=t.length;
  if(n<2){el.innerHTML='<div class="empty skel" style="height:'+Hh+'px">Collecte des données en cours...</div>';return}
  const vals=c.series.flatMap(s=>s.v.filter(x=>x!=null));if(!vals.length){el.innerHTML='';return}
  let mn=c.min!=null?c.min:Math.min(...vals),mx=c.max!=null?c.max:Math.max(...vals);
  (c.lines||[]).forEach(l=>{if(c.max==null)mx=Math.max(mx,l.y+2);if(c.min==null)mn=Math.min(mn,l.y)});
  if(c.min==null){const p=(mx-mn||1)*.12;mn-=p}if(c.max==null){const p=(mx-mn||1)*.12;mx+=p}if(mx===mn)mx=mn+1;
  const t0=t[0],t1=t[n-1]||t0+1,X=ts=>pl+(W-pl-pr)*(ts-t0)/((t1-t0)||1),Y=v=>pt+(Hh-pt-pb)*(1-(v-mn)/(mx-mn));
  c._g={pl,pr,pt,pb,W,Hh,mn,mx,t0,t1};const cs=getComputedStyle(document.documentElement);const col=v=>v.startsWith('var(')?cs.getPropertyValue(v.slice(4,-1)).trim():v;
  let s=`<svg viewBox="0 0 ${W} ${Hh}" height="${Hh}" role="img" aria-label="${c.label||'Graphique'}"><defs>`;
  c.series.forEach((se,i)=>{const cl=col(se.color);s+=`<linearGradient id="${id}g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cl}" stop-opacity="${c.mini?.3:.28}"/><stop offset="1" stop-color="${cl}" stop-opacity="0"/></linearGradient>`});
  s+='</defs>';
  if(!c.mini){const fmt=c.fmt||(v=>Math.round(v));for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,y=Y(v);s+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="${col('var(--line)')}" stroke-dasharray="${i?'2 4':''}"/><text class="axis" x="${pl-8}" y="${y+3.5}" text-anchor="end">${fmt(v)}</text>`}
    for(let i=0;i<=4;i++){const ts=t0+(t1-t0)*i/4;s+=`<text class="axis" x="${Math.min(W-pr-14,Math.max(pl+14,X(ts)))}" y="${Hh-5}" text-anchor="middle">${fmtT(ts,range==="7d")}</text>`}}
  (c.lines||[]).forEach(l=>{const y=Y(l.y);s+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="${col(l.color)}" stroke-dasharray="5 4" opacity=".7"/>`+(c.mini?'':`<text class="axis" x="${W-pr-2}" y="${y-4}" text-anchor="end" fill="${col(l.color)}" style="fill:${col(l.color)}">${l.label}</text>`)});
  c.series.forEach((se,i)=>{let d='',seg=[];const flush=()=>{if(seg.length){const p=seg.map((q,j)=>(j?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('');
      if(c.area!==false&&(i===0||c.areaAll))s+=`<path d="${p}L${seg[seg.length-1][0]} ${Hh-pb}L${seg[0][0]} ${Hh-pb}Z" fill="url(#${id}g${i})"/>`;
      s+=`<path class="ln${c.anim?' draw':''}" pathLength="1" d="${p}" fill="none" stroke="${col(se.color)}" stroke-width="${c.mini?1.8:2.2}" stroke-linejoin="round" stroke-linecap="round"/>`;if(!c.mini&&i===0){const q=seg[seg.length-1];s+=`<circle class="now" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5" fill="${col(se.color)}"/>`}seg=[]}};
    se.v.forEach((v,j)=>{if(v==null)flush();else seg.push([X(t[j]),Y(v)])});flush()});
  s+=`<g class="hv" style="display:none"><line y1="${pt}" y2="${Hh-pb}" stroke="${col('var(--mut)')}" stroke-dasharray="3 3"/>${c.series.map(se=>`<circle r="4.5" fill="${col(se.color)}" stroke="${col('var(--card)')}" stroke-width="2"/>`).join('')}</g></svg><div class="tt"></div>`;
  el.innerHTML=s;
  const g=el.querySelector('.hv'),tt=el.querySelector('.tt'),ln=g.querySelector('line'),cr=g.querySelectorAll('circle');
  el.onpointermove=e=>{const r=el.getBoundingClientRect(),px=e.clientX-r.left;let i=0,bd=1e9;t.forEach((ts,j)=>{const d=Math.abs(X(ts)-px);if(d<bd){bd=d;i=j}});
    g.style.display='';ln.setAttribute('x1',X(t[i]));ln.setAttribute('x2',X(t[i]));
    c.series.forEach((se,k)=>{const v=se.v[i];cr[k].style.display=v==null?'none':'';if(v!=null){cr[k].setAttribute('cx',X(t[i]));cr[k].setAttribute('cy',Y(v))}});
    const f=c.tip||c.fmt||(v=>v);tt.innerHTML=`<div class="t">${fmtT(t[i],true)}</div>`+c.series.map(se=>`<div><i style="background:${col(se.color)}"></i>${se.name}: <b>${se.v[i]==null?'--':f(se.v[i])}</b></div>`).join('');
    tt.style.display='block';const w=tt.offsetWidth;tt.style.left=Math.max(0,Math.min(W-w,X(t[i])+14>W-w?X(t[i])-w-14:X(t[i])+14))+'px';tt.style.top='6px'};
  el.onpointerdown=el.onpointermove;
  el.onpointerleave=()=>{g.style.display='none';tt.style.display='none'};
  delete c.anim;
}
function drawAll(){Object.keys(CH).forEach(draw)}
new ResizeObserver(()=>drawAll()).observe(document.body);

