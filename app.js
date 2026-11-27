(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const defaults = structuredClone(window.LEDGER_DATA);
  const storageKey = 'ledger-art-content-v4-compensation-serif';
  let data = structuredClone(defaults), lastFocus, toastTimer;
  const palette = {rust:'#bd6748',slate:'#89969c',teal:'#4c7a73'};
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const text = (x,y,value,size=10,attrs='') => `<text x="${x}" y="${y}" font-size="${size}" ${/\d/.test(String(value))?'class="has-numbers" ':''}${attrs}>${esc(value)}</text>`;
  const lines = (x,y,value,size=10,leading=12,attrs='') => String(value).split('\n').map((s,i)=>text(x,y+i*leading,s,size,attrs)).join('');
  const line = (x1,y1,x2,y2,attrs='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#786e57" stroke-width=".55" ${attrs}/>`;
  let seed=3427;
  function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  function boundary(y){let d=`M 294 ${y}`;for(let x=299;x<=378;x+=5)d+=` L ${x} ${(y+(rand()-.5)*3).toFixed(2)}`;return d;}
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  function wrapped(value,width,size){
    ctx.font=`400 ${size}px "Ledger Serif SC", "Ledger Serif SC Full", serif`;const out=[];
    for(const paragraph of String(value).split('\n')){
      const raw=paragraph.match(/\[[\d,，—–\- ]+\]|[A-Za-z0-9£]+(?:[.,:/—–\-][A-Za-z0-9]+)*|./gu)||[];
      const units=[];let opener='';
      for(const token of raw){
        if(/^[“《（「『【]$/u.test(token)){opener+=token;continue;}
        if((/^[，。；：！？、）》”」』】.!?,;:]$/u.test(token)||/^\[[\d,，—–\- ]+\]$/.test(token))&&units.length){units[units.length-1]+=opener+token;opener='';}
        else{units.push(opener+token);opener='';}
      }
      if(opener)units.push(opener);
      let current='';
      for(const unit of units){if(ctx.measureText(current+unit).width>width&&current.trim()){out.push(current.trim());current=unit.trimStart();}else current+=unit;}
      if(current||!paragraph)out.push(current.trim());
    }
    return out;
  }
  function validate(d){
    if(!d||typeof d!=='object')throw Error('请输入有效的数据对象。');
    for(const key of ['title','subtitle','deck','intro','quote'])if(typeof d[key]!=='string'||!d[key].trim()||d[key].length>4000)throw Error('标题和说明需要填写文字，单项不超过 4000 字。');
    if(!Array.isArray(d.layers)||d.layers.length<1||d.layers.length>30)throw Error('layers 需要包含 1–30 个地层。');
    d.layers.forEach(l=>{if(typeof l.text!=='string'||typeof l.year!=='string'||!Number.isFinite(l.y)||!Number.isFinite(l.bottom)||l.y<82||l.bottom>868||l.bottom<=l.y||!/^#[\da-f]{6}$/i.test(l.color))throw Error('地层需要 year、text、六位 HEX color，以及 82–868 之间递增的 y / bottom。');});
    if(!Array.isArray(d.sectors)||!d.sectors.length||d.sectors.length>21)throw Error('sectors 需要包含 1–21 个补偿分配项目。');
    d.sectors.forEach(s=>{if(typeof s.name!=='string'||!Number.isFinite(s.value)||s.value<0||!Object.hasOwn(palette,s.color))throw Error('分配项目需要 name、非负 value，以及 rust / slate / teal 之一的 color。');});
    if(!Array.isArray(d.flows)||d.flows.length>80)throw Error('flows 需要是数组，最多 80 条流线。');
    if(!Array.isArray(d.cases)||d.cases.length!==4||!d.cases.every(c=>typeof c.name==='string'&&typeof c.institution==='string'&&typeof c.detail==='string'&&typeof c.short==='string'&&Object.hasOwn(palette,c.color)))throw Error('cases 需保留 4 个机构案例，包含名称、机构、说明和有效颜色。');
    d.flows.forEach(f=>{if(!Number.isInteger(f.sector)||f.sector<0||f.sector>=d.sectors.length||!['x','top','end','base'].every(k=>Number.isFinite(f[k]))||f.x<405||f.x>507||Math.min(f.top,f.end)<90||Math.max(f.top,f.end)>850||f.base<90||f.base>860)throw Error('流线需指向有效的 sector，x 为 405–507，其余坐标为 90–860。');});
    if(!Array.isArray(d.area)||d.area.length<2||d.area.length>500||!d.area.every((n,i)=>Number.isInteger(n.year)&&Number.isFinite(n.embarked)&&n.embarked>=0&&Number.isFinite(n.disembarked)&&n.disembarked>=0&&(!i||n.year>d.area[i-1].year)))throw Error('area 需要按年递增的数据对象，包含 year、embarked、disembarked，人数需为非负数。');
    if(!Array.isArray(d.sources)||!d.sources.every(s=>Number.isInteger(s.id)&&typeof s.title==='string'&&typeof s.note==='string'&&/^https:\/\//.test(s.url)))throw Error('sources 需保留资料编号、标题、说明与 https 链接。');
    d.labels={...defaults.labels,...d.labels};
    return d;
  }
  try{const saved=localStorage.getItem(storageKey);if(saved)data=validate(JSON.parse(saved));}catch{data=structuredClone(defaults);}
  function render(){
    seed=3427;
    let introSize=10.2;
    while(wrapped(data.intro,207,introSize).length*introSize*1.4>141&&introSize>8.8)introSize-=.1;
    const introLeading=introSize*1.4;
    let stains='';
    for(let i=0;i<60;i++){
      const x=rand()*768,y=rand()*1024,r=8+rand()*60;
      stains+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r*(.3+rand())).toFixed(1)}" fill="${i%3===0?'#9f7639':'#fffdf3'}" opacity="${(.025+rand()*.045).toFixed(3)}"/>`;
    }
    const defs=`<defs>
      <radialGradient id="paper"><stop offset="0" stop-color="#f8f0dc"/><stop offset=".73" stop-color="#f2e8cf"/><stop offset="1" stop-color="#e6d8b8"/></radialGradient>
      <filter id="paper-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".58" numOctaves="3" stitchTiles="stitch" seed="18"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".45" intercept=".3"/><feFuncG type="linear" slope=".4" intercept=".27"/><feFuncB type="linear" slope=".3" intercept=".2"/><feFuncA type="linear" slope=".26"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
      <filter id="wash"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="3" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="2"/></filter>
      <pattern id="stipples" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx=".7" cy="1" r=".35" fill="#8c4b30"/><circle cx="2.6" cy="3.2" r=".3" fill="#8c4b30"/></pattern>
      <pattern id="strata-grain" width="5" height="6" patternUnits="userSpaceOnUse"><path d="M.5 1l1 .5m2 2 .8-.5M1 5h.5" stroke="#3c2d1b" stroke-width=".4" opacity=".22"/></pattern>
      <pattern id="area-dots" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".6" r=".32" fill="#a64a2d"/><circle cx="2" cy="2.2" r=".26" fill="#a64a2d"/></pattern>
      <style>.interactive{cursor:help}.flow-group{transition:opacity .18s}.has-focus .flow-group{opacity:.17}.has-focus .flow-group.is-active{opacity:1}.interactive:focus{outline:none}.interactive:focus .sector-bar{stroke:#713d29;stroke-width:1}.interactive:focus .layer-fill{stroke:#713d29;stroke-width:1.5}text{font-family:'Ledger Serif SC','Ledger Serif SC Full',serif;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:'lnum' 1,'tnum' 1,'onum' 0,'pnum' 0,'palt' 0;letter-spacing:0;font-synthesis:none}</style>
    </defs>`;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 1024" class="artwork" role="group" aria-labelledby="art-title art-desc"><title id="art-title">${esc(data.title)} — ${esc(data.subtitle)}</title><desc id="art-desc">跨大西洋奴隶贸易与制度遗产。法律地层为非等距编排；中间流线与右侧柱图为1835年英国补偿金的殖民地初始配额，圆面积和柱长编码同一金额；底部年度人数来自SlaveVoyages估计数据库。资料详见网页下方。</desc>${defs}
    <rect width="768" height="1024" fill="url(#paper)"/>
    <g filter="url(#wash)">${stains}<path d="M0 0h768v19Q600 6 500 18T280 9T0 24Z M0 0v1024h22Q5 810 17 660T8 400T20 0Z M768 400Q741 450 752 520T744 700l24 60Z M0 1024h768v-19Q600 1019 470 1008T230 1014T0 999Z" fill="#b3945a" opacity=".08"/></g>
    <rect width="768" height="1024" fill="#b29a72" filter="url(#paper-grain)" opacity=".12" pointer-events="none"/>
    <rect x="16.5" y="17.5" width="735" height="985" fill="none" stroke="#79745e" stroke-width=".6"/>
    <rect x="20" y="21" width="728" height="978" fill="none" stroke="#9d9174" stroke-width=".3" opacity=".45"/>
    <g fill="#2d2c25">
    ${text(39,37,'THE LEDGER / AN INHERITED HISTORY',7.8,'fill="#a4472d" letter-spacing=".65"')}
    ${text(38,73,data.title,35,'fill="#ae3e26" letter-spacing="2"')}
    ${text(40,96,data.subtitle,13.5)}
    ${text(40,115,data.deck,9.8)}
    <g id="chinese-reading-panel" lang="zh-CN" aria-label="中文导读与读图指南">
    ${lines(35,134,wrapped(data.intro,207,introSize).join('\n'),introSize,introLeading,'fill="#5f5b4e"')}
    ${thisLegend()}
    ${profitDiagram()}
    </g>
    ${text(291,46,data.labels.laws,11,'font-weight="600"')}
    ${lines(291,59,data.labels.lawsSub,8.4,10)}
    ${lines(395,45,data.labels.debt,9,12,'font-weight="600" text-anchor="middle"')}
    ${text(457,46,data.labels.flows,11,'font-weight="600" text-anchor="middle"')}
    ${lines(464,59,data.labels.flowsSub,8.4,10,'text-anchor="middle" fill="#736b59"')}
    ${lines(542,46,data.labels.credit,10,13,'text-anchor="middle" font-weight="600"')}
    ${line(290,81,742,81,'opacity=".5"')}
    ${[378,515,571].map(x=>line(x,35,x,868,'opacity=".7"')).join('')}
    ${data.layers.map((l,i)=>{
      const path=boundary(l.y),bottom=boundary(l.bottom);
      const topSegments=path.replace('M ','').split(' L ');
      const bottomSegments=bottom.replace('M ','').split(' L ').reverse();
      const d='M '+topSegments.join(' L ')+' L '+bottomSegments.join(' L ')+' Z';
      const mid=(l.y+l.bottom)/2;
      const dark=l.color==='#af543a';
      return `<g class="stratum interactive" data-layer="${i}" tabindex="0" role="img" aria-label="${esc(l.year+': '+l.text.replaceAll('\n',' '))}"><path class="layer-fill" d="${d}" fill="${l.color}" fill-opacity=".83"/><path d="${d}" fill="url(#strata-grain)"/><path d="${path}" fill="none" stroke="#6d614b" stroke-width=".65"/>${text(287,l.y+((i===0)?34:18),l.year,10.5,'text-anchor="end" font-weight="400" data-number-role="year"')}${lines(300,mid-(l.text.split('\n').length-1)*6.4+3,l.text,9.2,12.8,`fill="${dark?'#fff3d8':'#302c25'}"`)}</g>`;
    }).join('')}
    ${line(294,868,571,868,'opacity=".65"')}
    ${line(394.5,64,394.5,868,'stroke="#5a7784" stroke-width="1.5" stroke-dasharray="5 3"')}
    ${creditColumn()}
    ${renderFlows()}
    ${text(581,46,data.labels.ranking,12.5,'font-weight="600"')}
    ${lines(581,62,data.labels.rankingSub,8.8,12)}
    ${renderSectors()}
    ${memorial()}
    ${renderArea()}
    ${text(39,991,data.labels.note,7.6)}
    </g></svg>`;
    $('#poster').innerHTML=svg;
    document.title=`${data.title} — ${data.subtitle}`;
    setupInteractions();
    renderSources();
  }
  function thisLegend(){return `<g><rect x="34" y="283" width="208" height="436" fill="#eee5cf" fill-opacity=".23" stroke="#756d58" stroke-width=".65"/>
    ${text(41,304,'读图指南',14,'font-weight="600"')}
    ${text(41,325,'一、地层记录法律与权利的转变',10.7)}
    <path d="M60 337h58v43H60Z" fill="#c9b492" stroke="#413f32" stroke-width=".7"/>
    ${[345,354,363,372].map(y=>`<path d="M60 ${y}Q85 ${y-1} 118 ${y+.5}" stroke="#574f3e" stroke-width=".65" fill="none"/>`).join('')}
    ${line(118,345,143,345,'stroke-dasharray="1 1"')}${line(118,371,143,371,'stroke-dasharray="1 1"')}
    ${text(149,348,'较近的年代',9.8)}${text(149,374,'较早的年代',9.8)}
    ${text(41,404,'二、层厚服务叙事，不代表年数',10.7)}
    <path d="M57 418h78v21H57Zm0 33h78v9H57Z" fill="#c9b99b" fill-opacity=".5" stroke="#514b3c" stroke-width=".7"/>
    ${lines(149,426,'非等距时间轴\n以年份标注为准',9.4,13)}
    ${text(41,484,'三、圆面积表示补偿配额的大小',10.7)}
    ${line(70,509,70,537,'stroke="#77858c"')}${line(138,509,138,537,'stroke="#4c7a73"')}${line(205,509,205,537,'stroke="#4c7a73"')}
    <circle cx="70" cy="509" r="12" fill="#87939a"/><circle cx="138" cy="509" r="8" fill="#4c7a73"/><circle cx="205" cy="509" r="3" fill="#547b78"/>
    ${text(70,552,'较大配额',9.8,'text-anchor="middle"')}${text(138,552,'较小配额',9.8,'text-anchor="middle"')}${text(205,552,'小额配额',9.8,'text-anchor="middle"')}
    ${lines(43,573,'每条线对应一个殖民地分配项目；\n圆面积与金额成正比，线长不代表年数。',9.7,13,'fill="#665c48"')}
    ${text(41,610,'四、虚线延伸的是历史的追问',10.7)}
    ${line(57,625,57,655,'stroke="#5a7784" stroke-dasharray="3 2" stroke-width="1.1"')}
    ${lines(78,635,'法律的废止之后，\n财富与责任如何被继承？',10,14)}
    ${text(41,683,'五、补偿与运输采用不同的单位',10.7)}
    ${lines(43,701,'横条：万英镑 [18]；底图：人数 [1]。',9.5,12)}</g>`;}
  function profitDiagram(){return `<g>${text(34,740,'解放时，谁得到补偿？',13.5,'font-weight="600"')}
    ${text(34,758,'英国 1833 年废奴方案 [12,17]',10,'fill="#6a604d"')}
    ${line(137,778,137,821,'opacity=".4"')}
    ${text(85,794,'£2000万',23,'fill="#a9472f" text-anchor="middle"')}${text(190,794,'0',28,'text-anchor="middle"')}
    ${text(85,816,'前奴隶主',10.5,'text-anchor="middle"')}${text(190,816,'被奴役者',10.5,'text-anchor="middle"')}
    ${lines(34,840,'补偿的是所谓“财产损失”。\n被奴役者未从这项方案获得补偿。\n金额为当时英镑，不作今日币值换算。',9.8,13,'fill="#5f5747"')}</g>`;}
  function creditColumn(){return `<g>
    ${text(542,123,'未作总额估算',6.9,'text-anchor="middle" fill="#766a54"')}
    ${lines(542,169,'十点\n计划',9,12,'text-anchor="middle" fill="#4c7a73"')}
    ${[248,297,352,545,680,820].map(y=>text(542,y,'—',12,'text-anchor="middle" fill="#85775d"')).join('')}
    <rect x="519" y="392" width="48" height="99" fill="#dfd2b8" opacity=".35"/>
    ${text(543,405,'1833 方案',7.2,'text-anchor="middle"')}
    ${text(543,423,'奴隶主',8,'text-anchor="middle"')}${text(543,438,'£2000万',9,'text-anchor="middle" fill="#9c402a"')}
    ${text(543,458,'被奴役者',7.8,'text-anchor="middle"')}${text(543,478,'0',15,'text-anchor="middle"')}
    ${lines(542,751,'横线不等于零\n不同方案\n不作统一汇总',7.4,12,'text-anchor="middle" fill="#786c56"')}</g>`;}
  function renderFlows(){
    const max=Math.max(...data.sectors.map(s=>s.value));
    return data.flows.map((f,i)=>{
      const s=data.sectors[f.sector],fraction=Math.sqrt(s.value/max),r=13.5*fraction;
      const c=i<4?palette.slate:palette.teal,bend=(i%2?1:-1)*(3+i%5*2);
      let threads='';
      for(let j=0;j<3;j++){const dx=(j-1)*(1.6+fraction*2);threads+=`<path d="M${f.x+dx} ${f.top+r} C${f.x+dx+bend} ${f.top+95},${f.x+dx-bend} ${f.end-60},${f.x+dx} ${f.end}" fill="none" stroke="${c}" stroke-opacity="${j===1?.72:.3}" stroke-width="${j===1?.55+.3*fraction:.35}"/>`;}
      return `<g class="flow-group interactive" data-flow="${i}" data-sector="${f.sector}" tabindex="0" role="img" aria-label="${esc(s.name+'补偿初始配额约'+(s.value/10000).toFixed(1)+'万英镑，1835年')}"><path d="M${f.x} ${f.end} C${f.x+10} ${f.base-45},${411+(i%5)*16} ${f.base-30},${394+(i%5)*18} ${f.base}" fill="none" stroke="${c}" stroke-width=".55" stroke-dasharray="1.6 2" opacity=".6"/>${threads}<path d="M${f.x} ${f.top}V${f.end}" stroke="${c}" stroke-width=".55" opacity=".6"/><circle cx="${f.x}" cy="${f.top}" r="${r}" fill="${c}" opacity=".92"/><circle cx="${f.x}" cy="${f.end}" r="1.5" fill="${c}" opacity=".8"/><path d="M${f.x} ${Math.min(f.top,f.end)}V${Math.max(f.top,f.end)}" stroke="transparent" stroke-width="8"/></g>`;
    }).join('')+lines(454,839,'十九个殖民地分配项目\n线长和位置不表示年代',7.6,12,'text-anchor="middle" fill="#776b56"');
  }
  function renderSectors(){const max=Math.max(1,...data.sectors.map(s=>s.value));return data.sectors.map((s,i)=>{const y=99+i*20;return `<g class="sector-row interactive" data-sector="${i}" tabindex="0" role="img" aria-label="${esc(s.name+'初始补偿配额约'+(s.value/10000).toFixed(1)+'万英镑')}"><rect x="579" y="${y-9}" width="157" height="20" fill="transparent"/>${line(647,y,706,y,'opacity=".4"')}${text(581,y+3,s.name,8.3)}<rect class="sector-bar" x="647" y="${y-5.5}" width="${s.value/max*56}" height="10.5" fill="${palette[s.color]}" opacity=".83"/>${text(736,y+3,(s.value/10000).toFixed(1),8.5,'text-anchor="end" data-number-role="allocation"')}</g>`;}).join('')+lines(581,486,'初始配额，非最终实付；款项给奴隶主。\n据原始公报，按万英镑保留一位小数。[18]',7.4,11,'fill="#776b56"');}
  function memorial(){return `<g><rect x="580" y="519" width="162" height="349" fill="none" stroke="#81755d" stroke-width=".6"/>
    ${text(592,545,'财富如何继续流转？',12,'font-weight="600"')}${text(592,561,'TRACING THE LEGACIES',7.2,'letter-spacing=".8" fill="#8c7d61"')}
    ${data.cases.map((c,i)=>{const y=584+i*53;return `<g class="case-note interactive" data-case="${i}" tabindex="0" role="img" aria-label="${esc(c.institution+'：'+c.detail)}"><rect x="591" y="${y-11}" width="140" height="51" fill="transparent"/>${text(592,y,`${c.institution} [${c.source}]`,9,'fill="#465f59" font-weight="600"')}${lines(592,y+16,wrapped(c.short,138,8.4).join('\n'),8.4,12,'fill="#655b49"')}</g>`;}).join('')}
    ${line(592,790,730,790,'opacity=".4"')}${lines(592,807,'这些案例记录不同的财富关联，\n不与上方殖民地配额逐项对应。',8.2,12,'fill="#776b56"')}
    ${text(661,845,'被记录的金额，不等于偿还的伤害。',8.2,'text-anchor="middle" fill="#5e5544"')}
    </g>`;}
  function renderArea(){
    const start=data.area[0].year,end=data.area.at(-1).year;
    const max=Math.max(...data.area.map(r=>r.embarked)),ceiling=Math.ceil(max/20000)*20000;
    const x=year=>60+(year-start)/(end-start)*662;
    let path='M60 958';data.area.forEach(r=>{path+=` L${x(r.year).toFixed(2)} ${(958-r.embarked/ceiling*75).toFixed(2)}`;});path+=' L722 958 Z';
    const ticks=[...new Set([start,...[1550,1600,1650,1700,1750,1800,1850].filter(y=>y>start&&y<end),end])];
    return `<g class="area-chart interactive" tabindex="0" role="img" data-area="true" aria-label="${start} 至 ${end} 年逐年登船人数估计，单位人每年，资料一">
    ${text(384,880,'每年被迫登船人数',9.7,'text-anchor="middle"')}${text(721,880,`${start}—${end} · 未平滑的年度估计 [1]`,8,'text-anchor="end" fill="#776b56"')}
    ${[0,.5,1].map(f=>line(60,958-f*75,722,958-f*75,'opacity=".2" stroke-dasharray="1 2"')+text(53,961-f*75,f?ceiling*f/10000+'万':'0',7.4,'text-anchor="end" fill="#817459"')).join('')}
    <path d="${path}" fill="#c58e60" fill-opacity=".10"/><path d="${path}" fill="url(#area-dots)"/><path d="${path}" fill="none" stroke="#af482b" stroke-width=".9" stroke-linejoin="round"/>
    ${line(60,958,722,958,'stroke="#443d30" stroke-width=".8"')}${ticks.map(year=>line(x(year),957,x(year),962)+text(x(year),974,year,9,'text-anchor="middle"')).join('')}</g>`;
  }
  function sourceLabel(ids){return '资料 '+ids.map(id=>'['+id+']').join('、')+' · 网页下方可查看原文';}
  function renderSources(){
    const holder=$('#sources-content');if(!holder)return;
    holder.replaceChildren();
    const p=document.createElement('p');p.className='source-method';p.textContent='查证日期：2026 年 11 月 25 日。中间资金线与右侧柱图使用1835年7月7日补偿委员会公告的19个殖民地初始配额。圆面积和柱长与金额成正比；线长和纵向位置不表示年份。金额按万英镑保留一位。原表另列先令、便士，项目底层记录整英镑部分，因此整数和略低于名义总额2000万英镑。配额归当地奴隶主，不是付给殖民地政府或被奴役者的赔款，也不是最终实付。底部曲线独立使用1501—1866年的366条年度登船估计，法律地层为非等距时间轴。';holder.append(p);
    const list=document.createElement('ol');list.className='sources-list';
    data.sources.forEach(s=>{const li=document.createElement('li');li.id='source-'+s.id;const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='['+s.id+'] '+s.title;const note=document.createElement('p');note.textContent=s.note;li.append(a,note);list.append(li);});holder.append(list);
  }
  function setupInteractions(){
    const art=$('.artwork');
    const show=(target,e)=>{
      const tip=$('#tooltip');let title='',body='',small='';
      art.classList.remove('has-focus');art.querySelectorAll('.is-active').forEach(g=>g.classList.remove('is-active'));
      if(target.dataset.layer!==undefined){const l=data.layers[+target.dataset.layer];title=l.year;body=l.detail||l.text.replaceAll('\n',' ');small=sourceLabel(l.sources||[]);}
      else if(target.dataset.case!==undefined){const c=data.cases[+target.dataset.case];title=c.institution;body=c.detail;small=sourceLabel([c.source])+'；与殖民地配额不是逐项对应关系。';}
      else if(target.dataset.sector!==undefined){const s=data.sectors[+target.dataset.sector];title=s.name+' · 1835年初始配额';body=`约 ${(s.value/10000).toFixed(1)} 万英镑，分配给当地奴隶主。不是最终实付或政府收款。${s.historicalName==='Honduras'?'此处洪都拉斯指英属洪都拉斯，今伯利兹。':''}`;small=sourceLabel([18]);art.classList.add('has-focus');art.querySelectorAll('.flow-group').forEach(g=>g.classList.toggle('is-active',g.dataset.sector===target.dataset.sector));}
      else {const r=areaRecord(e?.clientX);title=r.year+' 年';body=`估计登船约 ${Math.round(r.embarked/100)*100} 人，抵岸约 ${Math.round(r.disembarked/100)*100} 人。`;small=sourceLabel([1])+'；数值取整至百人。';}
      tip.replaceChildren();const strong=document.createElement('strong');strong.textContent=title;const span=document.createElement('span');span.textContent=body;const note=document.createElement('small');note.textContent=small;tip.append(strong,span,note);tip.hidden=false;
      const r=target.getBoundingClientRect();place(e?.clientX??r.right,e?.clientY??r.top);
    };
    const hide=()=>{$('#tooltip').hidden=true;art.classList.remove('has-focus');art.querySelectorAll('.is-active').forEach(g=>g.classList.remove('is-active'));};
    art.querySelectorAll('.interactive').forEach(el=>{el.addEventListener('pointerenter',e=>show(el,e));el.addEventListener('pointermove',e=>{if(el.dataset.area)show(el,e);else place(e.clientX,e.clientY);});el.addEventListener('pointerleave',hide);el.addEventListener('focus',()=>show(el));el.addEventListener('blur',hide);if(el.dataset.area)el.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();areaFocus=Math.max(0,Math.min(data.area.length-1,areaFocus+(e.key==='ArrowRight'?1:-1)));show(el);}});});
  }
  let areaFocus=0;
  function areaRecord(clientX){if(clientX===undefined)return data.area[areaFocus];const box=$('.artwork').getBoundingClientRect();const svgX=(clientX-box.left)/box.width*768;const first=data.area[0].year,last=data.area.at(-1).year;const year=first+Math.max(0,Math.min(1,(svgX-60)/662))*(last-first);return data.area.reduce((a,b)=>Math.abs(a.year-year)<Math.abs(b.year-year)?a:b);}
  function place(x,y){const tip=$('#tooltip');tip.style.left=Math.max(8,Math.min(x+17,innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(8,Math.min(y+17,innerHeight-tip.offsetHeight-12))+'px';}
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2800);}
  function fillEditor(){const form=$('#content-form');for(const key of ['title','subtitle','deck','intro','quote'])form.elements[key].value=data[key];$('#data-editor').value=JSON.stringify({labels:data.labels,layers:data.layers,sectors:data.sectors,flows:data.flows,area:data.area,cases:data.cases,sources:data.sources,methodology:data.methodology},null,2);$('#editor-error').textContent='';}
  function closeEditor(){$('#editor').hidden=true;$('#editor-backdrop').hidden=true;document.body.style.overflow='';lastFocus?.focus();}
  $('#edit-button').addEventListener('click',()=>{lastFocus=document.activeElement;fillEditor();$('#editor').hidden=false;$('#editor-backdrop').hidden=false;document.body.style.overflow='hidden';$('#close-editor').focus();});
  $('#close-editor').addEventListener('click',closeEditor);$('#editor-backdrop').addEventListener('click',closeEditor);
  document.addEventListener('keydown',e=>{if($('#editor').hidden)return;if(e.key==='Escape'){e.preventDefault();closeEditor();}if(e.key==='Tab'){const els=[...$('#editor').querySelectorAll('button,input,textarea,summary')].filter(el=>el.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  $('#content-form').addEventListener('submit',e=>{e.preventDefault();try{const next={...data,...JSON.parse($('#data-editor').value)};for(const key of ['title','subtitle','deck','intro','quote'])next[key]=e.target.elements[key].value.trim();data=validate(next);render();let saved=true;try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{saved=false;}closeEditor();toast(saved?'内容已更新，并保存到当前浏览器':'内容已更新；当前浏览器无法保存，请导出 SVG 留存');}catch(error){$('#editor-error').textContent=error instanceof SyntaxError?'JSON 格式有误，请检查逗号和引号。':error.message;}});
  $('#reset-button').addEventListener('click',()=>{data=structuredClone(defaults);try{localStorage.removeItem(storageKey);}catch{}render();fillEditor();toast('已恢复考证版内容');});
  let viewMode='page',zoom=1;
  const main=$('main'),poster=$('#poster'),stage=$('#poster-stage');
  function availableWidth(){return Math.min(innerWidth>=1500?1250:1192,innerWidth)-(innerWidth<=700?24:76);}
  function applyZoom(mode,value){
    viewMode=mode;
    if(mode==='page')zoom=Math.min(availableWidth()/768,Math.max(180,innerHeight-$('.toolbar').getBoundingClientRect().height-116)/1024);
    else if(mode==='width')zoom=availableWidth()/768;
    else zoom=Math.min(2,Math.max(.15,value));
    const width=768*zoom,padding=innerWidth<=700?24:76;
    poster.style.width=width+'px';stage.style.width=width+'px';
    main.style.width=width>availableWidth()?width+padding+'px':'';
    main.style.maxWidth=width>availableWidth()?'none':'';
    $('#zoom-value').textContent=Math.round(zoom*100)+'%';
    $('#fit-button').setAttribute('aria-pressed',String(mode==='page'));
    $('#width-button').setAttribute('aria-pressed',String(mode==='width'));
    $('#zoom-out').disabled=zoom<=.15;$('#zoom-in').disabled=zoom>=2;
    $('#tooltip').hidden=true;
  }
  $('#zoom-out').onclick=()=>applyZoom('manual',Math.round((zoom-.1)*100)/100);
  $('#zoom-in').onclick=()=>applyZoom('manual',Math.round((zoom+.1)*100)/100);
  $('#zoom-reset').onclick=()=>applyZoom('manual',1);
  $('#fit-button').onclick=()=>{applyZoom('page');window.scrollTo({top:0,left:0,behavior:'instant'});};
  $('#width-button').onclick=()=>{applyZoom('width');window.scrollTo({top:0,left:0,behavior:'instant'});};
  window.addEventListener('resize',()=>applyZoom(viewMode,zoom));
  applyZoom('page');
  $('#export-button').addEventListener('click',()=>{const clone=$('.artwork').cloneNode(true);clone.classList.remove('has-focus');clone.querySelectorAll('.is-active').forEach(g=>g.classList.remove('is-active'));clone.setAttribute('width','1536');clone.setAttribute('height','2048');if(window.LEDGER_FONT_CSS){const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=window.LEDGER_FONT_CSS;clone.querySelector('defs').prepend(style);}const blob=new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n',new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='the-ledger.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已导出可编辑的 SVG 矢量海报');});
  async function start(){
    $('#poster').textContent='正在载入思源宋体…';
    $('#poster').setAttribute('aria-busy','true');
    try{
      await Promise.all([
        document.fonts.load('400 12px "Ledger Serif SC"','中文0123456789'),
        document.fonts.load('600 12px "Ledger Serif SC"','中文0123456789')
      ]);
      await document.fonts.ready;
    }finally{
      render();
      $('#poster').removeAttribute('aria-busy');
    }
  }
  start();
})();
