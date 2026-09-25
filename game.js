const canvas=document.getElementById('board');const ctx=canvas.getContext('2d');const rollBtn=document.getElementById('roll');const diceEl=document.getElementById('dice');const messageEl=document.getElementById('message');const tileInfo=document.getElementById('tileInfo');const goldEl=document.getElementById('gold');const hpEl=document.getElementById('hp');const turnEl=document.getElementById('turn');const waveEl=document.getElementById('wave');const prepEl=document.getElementById('prep');

// 지그재그 메인 경로와 중간 연결길을 정의합니다.
const tiles=[
{x:90,y:90,type:'start',name:'출발'},
{x:220,y:90,type:'hunt',name:'사냥'},
{x:350,y:90,type:'key',name:'황금열쇠'},
{x:480,y:90,type:'merchant',name:'상인'},
{x:610,y:90,type:'branch',name:'갈림길'},
{x:740,y:90,type:'gamble',name:'도박'},
{x:740,y:220,type:'upgrade',name:'강화'},
{x:610,y:220,type:'hunt',name:'사냥'},
{x:480,y:220,type:'key',name:'황금열쇠'},
{x:350,y:220,type:'merchant',name:'상인'},
{x:220,y:220,type:'gamble',name:'도박'},
{x:90,y:220,type:'branch',name:'갈림길'},
{x:90,y:350,type:'hunt',name:'사냥'},
{x:220,y:350,type:'upgrade',name:'강화'},
{x:350,y:350,type:'key',name:'황금열쇠'},
{x:480,y:350,type:'merchant',name:'상인'},
{x:610,y:350,type:'hunt',name:'사냥'},
{x:740,y:350,type:'branch',name:'갈림길'},
{x:740,y:480,type:'upgrade',name:'강화'},
{x:610,y:480,type:'key',name:'황금열쇠'},
{x:480,y:480,type:'gamble',name:'도박'},
{x:350,y:480,type:'merchant',name:'상인'},
{x:220,y:480,type:'hunt',name:'사냥'},
{x:90,y:480,type:'end',name:'끝'}
];

// 갈림길에서 강제로 연결되는 다음 칸을 정의합니다.
const forced={4:7,11:14,17:20};
let pos=0,turn=0,gold=100,hp=100,wave=1,rolling=false,phase='board';

// 칸의 색상과 아이콘을 반환합니다.
function tileStyle(t){return{start:['#4c9a62','▶'],hunt:['#a95151','⚔'],key:['#c59b32','🔑'],upgrade:['#7656b5','⚒'],merchant:['#3c79ad','🛒'],gamble:['#9a4c91','🎲'],branch:['#526d7e','↘'],end:['#bd6b35','🏰']}[t.type]}

// 보드의 모든 경로와 칸을 그립니다.
function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#6fa64c';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<80;i++){ctx.fillStyle=i%2?'#6aa047':'#74ad50';ctx.beginPath();ctx.arc((i*113)%900,(i*71)%650,2,0,Math.PI*2);ctx.fill()}
 // 메인 경로를 연결합니다.
 ctx.strokeStyle='#e1c47d';ctx.lineWidth=42;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(tiles[0].x,tiles[0].y);for(let i=1;i<tiles.length;i++)ctx.lineTo(tiles[i].x,tiles[i].y);ctx.stroke();
 // 연결길은 메인 경로와 별도로 표시합니다.
 ctx.strokeStyle='#bba26a';ctx.lineWidth=20;ctx.beginPath();for(const [a,b] of Object.entries(forced)){const A=tiles[+a],B=tiles[b];ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y)}ctx.stroke();
 // 칸을 그립니다.
 tiles.forEach((t,i)=>{const s=tileStyle(t);ctx.fillStyle=s[0];ctx.beginPath();ctx.arc(t.x,t.y,29,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff9';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='22px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s[1],t.x,t.y);ctx.font='11px Arial';ctx.fillText(String(i),t.x,t.y+45)});
 // 플레이어 말을 그립니다.
 const p=tiles[pos];ctx.fillStyle='#f7d34b';ctx.beginPath();ctx.arc(p.x,p.y-38,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6e5511';ctx.lineWidth=3;ctx.stroke();
}

// 현재 칸의 효과를 적용합니다.
function resolveTile(){
 const t=tiles[pos];tileInfo.textContent=t.name+' (칸 '+pos+')';
 let text='';
 if(t.type==='hunt'){const reward=20+Math.floor(Math.random()*21);gold+=reward;text='사냥 성공! 골드 +'+reward}
 if(t.type==='key'){const reward=30+Math.floor(Math.random()*31);gold+=reward;text='황금열쇠! 디펜스 준비 자원 +'+reward}
 if(t.type==='upgrade'){gold+=5;text='강화! 다음 디펜스에 사용할 강화 자원 +5'}
 if(t.type==='merchant'){const cost=20;if(gold>=cost){gold-=cost;hp=Math.min(100,hp+25);text='상인에게서 방어 자원을 구매했습니다. 골드 -20 / 방어력 +25'}else{text='상인: 골드가 부족합니다.'}}
 if(t.type==='gamble'){const stake=15;if(gold<stake)text='도박: 골드가 부족합니다.';else if(Math.random()<.5){gold+=stake; text='도박 성공! 골드 +'+stake}else{gold-=stake; text='도박 실패! 골드 -'+stake}}
 if(t.type==='branch'){text='갈림길에 멈췄습니다. 연결길을 따라 강제로 이동합니다.';pos=forced[pos]}
 if(t.type==='end'){phase='defense';text='🏰 끝 지점 도착! 디펜스 웨이브 '+wave+'가 시작됩니다.';prepEl.style.width='100%';rollBtn.disabled=true}
 messageEl.textContent=text||'이동했습니다.';
}

// 주사위를 굴리고 말을 이동시킵니다.
function moveOneStep(done){if(pos>=tiles.length-1){done();return}pos++;draw();tileInfo.textContent=tiles[pos].name+' (칸 '+pos+')';messageEl.textContent='말이 '+tiles[pos].name+' 칸으로 이동 중...';setTimeout(done,520)}
rollBtn.onclick=()=>{if(rolling||phase!=='board')return;rolling=true;rollBtn.disabled=true;const n=1+Math.floor(Math.random()*6);const timer=setInterval(()=>{diceEl.textContent=1+Math.floor(Math.random()*6)},70);setTimeout(()=>{clearInterval(timer);diceEl.textContent=n;let steps=n;const next=()=>{if(steps<=0){turn++;if(forced[pos]!==undefined){messageEl.textContent='갈림길에 도착했습니다. 다음 주사위부터 연결 통로를 따라 이동합니다.'}resolveTile();if(phase==='board')rollBtn.disabled=false;turnEl.textContent=turn;goldEl.textContent=gold;hpEl.textContent=hp;rolling=false;return}steps--;moveOneStep(next)};next()},500)};

draw();