const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
const rollBtn=document.getElementById('roll');
const diceEl=document.getElementById('dice');
const messageEl=document.getElementById('message');
const tileInfo=document.getElementById('tileInfo');
const goldEl=document.getElementById('gold');
const hpEl=document.getElementById('hp');
const turnEl=document.getElementById('turn');
const waveEl=document.getElementById('wave');
const prepEl=document.getElementById('prep');
const attackEl=document.getElementById('attack');
const defenseEl=document.getElementById('defense');
const evasionEl=document.getElementById('evasion');
const statsEl=document.getElementById('stats');
const modal=document.getElementById('modal');
const modalTitle=document.getElementById('modalTitle');
const modalBody=document.getElementById('modalBody');
const modalActions=document.getElementById('modalActions');

// 40칸짜리 가로 사다리형 지그재그 경로를 만듭니다.
const types=['hunt','key','merchant','gamble','upgrade','hunt','branch','key'];
const tiles=[];
for(let row=0;row<5;row++)for(let col=0;col<8;col++){
  const index=row*8+col;
  const x=row%2===0?90+col*100:790-col*100;
  const y=90+row*120;
  let type=types[index%types.length];
  let name={hunt:'사냥',key:'황금열쇠',merchant:'상인',gamble:'도박',upgrade:'강화',branch:'갈림길'}[type];
  if(index===0){type='start';name='출발'}
  if(index===39){type='end';name='끝'}
  tiles.push({x,y,type,name});
}

// 갈림길에 도착한 뒤 다음 주사위의 첫 이동에서만 연결길을 사용합니다.
const forced={6:9,15:18,22:25,31:34};
let pos=0,turn=0,gold=100,hp=100,wave=1,rolling=false,phase='board';
let playerX=tiles[0].x,playerY=tiles[0].y-38;
const stats={attack:0,defense:0,evasion:0,crit:0,critDamage:0};
let accumulatedGold=0;

// 칸별 색상과 아이콘을 반환합니다.
function tileStyle(t){return{start:['#4c9a62','▶'],hunt:['#a95151','⚔'],key:['#c59b32','🔑'],upgrade:['#7656b5','⚒'],merchant:['#3c79ad','🛒'],gamble:['#9a4c91','🎲'],branch:['#526d7e','↘'],end:['#bd6b35','🏰']}[t.type]}

// 보드와 말을 그립니다.
function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#6fa64c';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<100;i++){ctx.fillStyle=i%2?'#6aa047':'#74ad50';ctx.beginPath();ctx.arc((i*113)%900,(i*71)%650,2,0,Math.PI*2);ctx.fill()}
 ctx.strokeStyle='#e1c47d';ctx.lineWidth=42;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(tiles[0].x,tiles[0].y);for(let i=1;i<tiles.length;i++)ctx.lineTo(tiles[i].x,tiles[i].y);ctx.stroke();
 ctx.strokeStyle='#bba26a';ctx.lineWidth=20;ctx.beginPath();for(const [a,b] of Object.entries(forced)){const A=tiles[+a],B=tiles[b];ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y)}ctx.stroke();
 tiles.forEach((t,i)=>{const s=tileStyle(t);ctx.fillStyle=s[0];ctx.beginPath();ctx.arc(t.x,t.y,29,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff9';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='22px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s[1],t.x,t.y);ctx.font='11px Arial';ctx.fillText(String(i),t.x,t.y+45)});
 ctx.fillStyle='#f7d34b';ctx.beginPath();ctx.arc(playerX,playerY,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6e5511';ctx.lineWidth=3;ctx.stroke();
}

// 화면의 자원과 능력치를 갱신합니다.
function updateUI(){goldEl.textContent=gold;hpEl.textContent=hp;turnEl.textContent=turn;attackEl.textContent=stats.attack;defenseEl.textContent=stats.defense;evasionEl.textContent=stats.evasion;statsEl.innerHTML='공격력 '+stats.attack+' · 방어력 '+stats.defense+' · 회피력 '+stats.evasion+'<br>치명타 확률 '+stats.crit+'% · 치명타 피해 '+stats.critDamage+'%'}

// 이벤트 모달을 표시합니다.
function showModal(title,body,buttons){modalTitle.textContent=title;modalBody.innerHTML=body;modalActions.innerHTML='';buttons.forEach(b=>{const el=document.createElement('button');el.textContent=b.text;el.className=b.className||'';el.onclick=b.onClick;modalActions.appendChild(el)});modal.classList.remove('hidden')}
function closeModal(){modal.classList.add('hidden');modalActions.innerHTML=''}
function finishEvent(){updateUI();if(phase==='board'){rollBtn.disabled=false}}

// 사냥 보상과 광고 2배 선택을 처리합니다.
function huntReward(){const base=25+Math.floor(Math.random()*26);showModal('⚔️ 사냥 성공','기본 보상 <b>골드 +'+base+'</b><p>광고를 보면 보상이 2배가 됩니다.</p>',[
 {text:'기본 보상',className:'secondary',onClick:()=>{gold+=base;accumulatedGold+=base;closeModal();finishEvent()}},
 {text:'광고 보고 2배',onClick:()=>{gold+=base*2;accumulatedGold+=base*2;closeModal();finishEvent()}}
])}

// 간단한 턴제 사냥 전투를 진행합니다.
function startHunt(){let enemy=35+Math.floor(Math.random()*26),playerHp=40+stats.defense*2;
 function battle(){
  if(enemy<=0){huntReward();return}
  if(playerHp<=0){messageEl.textContent='사냥에서 패배했습니다.';closeModal();finishEvent();return}
  showModal('⚔️ 턴제 전투','몬스터 HP: <b>'+enemy+'</b><br>내 HP: <b>'+playerHp+'</b>',[
   {text:'공격',onClick:()=>{enemy-=10+stats.attack*2;if(enemy>0)playerHp-=Math.max(1,5-stats.defense);battle()}},
   {text:'회피',className:'secondary',onClick:()=>{if(Math.random()>=0.25+stats.evasion/100)playerHp-=5;battle()}}
  ])
 }
 battle()
}

// 상인에게서 최대 3개까지 구매할 수 있게 합니다.
function startMerchant(){let count=0;const items=[['공격력 +2',30,()=>stats.attack+=2],['방어력 +2',30,()=>stats.defense+=2],['회피력 +2',35,()=>stats.evasion+=2],['회복 +25',25,()=>hp=Math.min(100,hp+25)]];
 function shop(){const buttons=items.map(i=>({text:i[0]+' / '+i[1]+'G',className:'secondary',onClick:()=>{if(count>=3||gold<i[1])return;gold-=i[1];i[2]();count++;shop()}}));buttons.push({text:'구매 종료',onClick:()=>{closeModal();finishEvent()}});showModal('🛒 상인','최대 3개 구매 가능<br>구매: '+count+'/3<br>보유 골드: '+gold,buttons)}shop()}

// 황금열쇠의 힌트 또는 버프/디버프를 처리합니다. 효과를 보기 전 광고를 선택하면 3배 기믹이 적용됩니다.
function startKey(){
 const kind=Math.random()<0.45?'hint':'effect';
 if(kind==='hint'){showModal('🔑 황금열쇠','힌트: 다음 사냥 칸의 몬스터는 일반 몬스터입니다.',[
  {text:'힌트 확인',className:'secondary',onClick:()=>{closeModal();finishEvent()}},
  {text:'광고 보고 힌트 보상 2배',onClick:()=>{messageEl.textContent='힌트 보상이 2배가 되었습니다.';closeModal();finishEvent()}}
 ]);return}
 const names=['attack','defense','evasion','crit','critDamage'],labels={attack:'공격력',defense:'방어력',evasion:'회피력',crit:'크리티컬 확률',critDamage:'크리티컬 데미지'};
 const stat=names[Math.floor(Math.random()*names.length)],isBuff=Math.random()<0.5,value=1+Math.floor(Math.random()*2),sign=isBuff?1:-1;
 const apply=m=>stats[stat]+=sign*value*m;
 const effectText=m=>'<div class="reward">'+(isBuff?'버프 ':'디버프 ')+labels[stat]+' '+(sign>0?'+':'-')+(value*m)+'</div>';
 const revealEffect=()=>showModal('🔑 황금열쇠 효과',effectText(1)+'<p>'+(isBuff?'광고를 보면 효과가 2배입니다.':'디버프입니다. 광고를 보면 효과를 막을 수 있습니다.')+'</p>',
  isBuff?[
   {text:'기본 적용',className:'secondary',onClick:()=>{apply(1);closeModal();finishEvent()}},
   {text:'광고 보고 2배',onClick:()=>{apply(2);closeModal();finishEvent()}}
  ]:[
   {text:'디버프 적용',className:'secondary',onClick:()=>{apply(1);closeModal();finishEvent()}},
   {text:'광고 보고 막기',onClick:()=>{messageEl.textContent='광고로 디버프를 막았습니다.';closeModal();finishEvent()}}
  ]);
 showModal('🔑 황금열쇠','효과를 확인하시겠습니까?<p>효과를 확인하지 않고 광고를 먼저 보면 히든 기믹이 발동합니다. 광고 시청 후 효과가 공개되며 효과가 3배 적용됩니다.</p>',[
  {text:'효과 확인',className:'secondary',onClick:revealEffect},
  {text:'광고 먼저 보기',onClick:()=>{apply(3);showModal('🔑 황금열쇠 효과','<p>광고 시청 완료! 히든 기믹이 발동했습니다.</p>'+effectText(3),[
   {text:'효과 확인',onClick:()=>{messageEl.textContent='히든 기믹 발동! 효과 3배!';closeModal();finishEvent()}}
  ])}}
 ])
}
// 강화는 5종 능력치 중 1~5종을 랜덤 선택합니다.
function startUpgrade(){const names=['attack','defense','evasion','crit','critDamage'],labels={attack:'공격력',defense:'방어력',evasion:'회피력',crit:'크리티컬 확률',critDamage:'크리티컬 데미지'};const count=1+Math.floor(Math.random()*5);const chosen=[...names].sort(()=>Math.random()-0.5).slice(0,count);const apply=m=>chosen.forEach(k=>stats[k]+=m);showModal('⚒ 강화','선택된 능력치 '+count+'종:<div class="reward">'+chosen.map(k=>labels[k]+' +1').join('<br>')+'</div><p>광고를 보면 선택된 능력치가 각각 +2 증가합니다.</p>',[
 {text:'기본 +1',className:'secondary',onClick:()=>{apply(1);closeModal();finishEvent()}},
 {text:'광고 보고 +2',onClick:()=>{apply(2);closeModal();finishEvent()}}
])}

// 마지막 칸에서 지금까지 누적한 보상을 광고 도박에 사용할 수 있게 합니다.
function finalGamble(){const base=Math.max(0,accumulatedGold);showModal('🎰 마지막 보상 도박','현재 누적 보상 <div class="reward">'+base+'G</div><p>광고를 보고 도박하면 낮은 확률로 누적 보상이 0.5~10배가 됩니다.</p>',[
 {text:'도박하지 않기',className:'secondary',onClick:()=>{closeModal();startDefense()}},
 {text:'광고 보고 도박',onClick:()=>{const r=Math.random();const mult=r<0.65?1:r<0.82?0.5:r<0.94?2:r<0.985?5:10;gold=Math.floor(base*mult);messageEl.textContent='최종 도박 결과: '+mult+'배';closeModal();startDefense()}}
])}
function startDefense(){phase='defense';prepEl.style.width='100%';rollBtn.disabled=true;messageEl.textContent='🏰 끝 지점 도착! 디펜스 준비가 완료되었습니다.';updateUI()}

// 도착한 칸의 이벤트를 실행합니다.
function resolveTile(){const t=tiles[pos];tileInfo.textContent=t.name+' (칸 '+pos+')';if(t.type==='hunt'){messageEl.textContent='몬스터가 나타났습니다!';startHunt();return}if(t.type==='merchant'){startMerchant();return}if(t.type==='key'){startKey();return}if(t.type==='upgrade'){startUpgrade();return}if(t.type==='gamble'){const reward=15+Math.floor(Math.random()*16);gold+=reward;accumulatedGold+=reward;messageEl.textContent='보상 획득! 골드 +'+reward;finishEvent();return}if(t.type==='branch'){messageEl.textContent='갈림길에 멈췄습니다. 다음 주사위부터 연결 통로를 따라 이동합니다.';finishEvent();return}if(t.type==='end'){finalGamble();return}messageEl.textContent='일반 칸입니다. 아무 일도 일어나지 않습니다.';finishEvent()}

// 각 칸 바로 위에서 말이 내려와 착지합니다.
function dropToTile(nextPos,done){const target=tiles[nextPos],startX=target.x,startY=target.y-105,endY=target.y-38,duration=420,started=performance.now();function animate(now){const p=Math.min((now-started)/duration,1),e=1-Math.pow(1-p,3);playerX=startX;playerY=startY+(endY-startY)*e;draw();if(p<1)requestAnimationFrame(animate);else{playerY=endY;draw();setTimeout(done,120)}}requestAnimationFrame(animate)}
function moveOneStep(done,useBranchRoute){if(pos>=tiles.length-1){done(useBranchRoute);return}if(useBranchRoute){pos=forced[pos];useBranchRoute=false}else pos++;tileInfo.textContent=tiles[pos].name+' (칸 '+pos+')';messageEl.textContent='말이 '+tiles[pos].name+' 칸으로 내려오는 중...';dropToTile(pos,()=>done(useBranchRoute))}

rollBtn.onclick=()=>{if(rolling||phase!=='board')return;rolling=true;rollBtn.disabled=true;const n=1+Math.floor(Math.random()*6);const timer=setInterval(()=>diceEl.textContent=1+Math.floor(Math.random()*6),70);setTimeout(()=>{clearInterval(timer);diceEl.textContent=n;let steps=n,useBranchRoute=forced[pos]!==undefined;const next=branchRoute=>{if(steps<=0){turn++;resolveTile();turnEl.textContent=turn;updateUI();rolling=false;return}steps--;moveOneStep(next,branchRoute)};next(useBranchRoute)},500)};

draw();updateUI();