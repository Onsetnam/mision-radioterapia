(()=>{"use strict";

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d",{willReadFrequently:true});
const W=canvas.width,H=canvas.height;
const casePicker=document.getElementById("casePicker");
const gameShell=document.getElementById("gameShell");
const canvasWrap=document.querySelector(".canvas-wrap");
const contourToolbar=document.getElementById("contourToolbar");
const nursingPanel=document.getElementById("nursingPanel");
const selector=document.getElementById("structureSelector");
const roleTabs=[...document.querySelectorAll(".role-tab")];

const COLORS=["#ff6f91","#68dcff","#ffd166","#9dffb0","#c49bff","#ff9f68"];
const CASES={
  head:{
    title:"Cabeza · tumor intracraneal",
    short:"Cabeza",
    text:"Paciente con una lesión intracraneal. Define el volumen blanco y protege estructuras neurológicas y sensoriales críticas.",
    body:{cx:400,cy:410,rx:255,ry:292},
    targetCenter:{x:455,y:405},
    anatomy:"head",
    structures:[
      {key:"target",label:"Tumor",kind:"target",shapes:[{type:"ellipse",x:455,y:405,rx:48,ry:42}]},
      {key:"eyeL",label:"Ojo izquierdo",shapes:[{type:"ellipse",x:322,y:294,rx:31,ry:24}]},
      {key:"eyeR",label:"Ojo derecho",shapes:[{type:"ellipse",x:478,y:294,rx:31,ry:24}]},
      {key:"chiasm",label:"Quiasma óptico",shapes:[{type:"ellipse",x:401,y:348,rx:28,ry:14}]},
      {key:"stem",label:"Tronco encefálico",shapes:[{type:"ellipse",x:397,y:520,rx:34,ry:62}]},
      {key:"cochleas",label:"Cócleas",shapes:[{type:"circle",x:337,y:433,r:19},{type:"circle",x:468,y:433,r:19}]}
    ],
    toxicities:[
      {q:"La paciente presenta eritema leve y piel seca en el campo, sin dolor ni descamación húmeda.",answer:1},
      {q:"Refiere náusea que requiere medicación y reduce algo su ingesta, pero aún puede comer y beber.",answer:2},
      {q:"Presenta fatiga moderada que limita algunas actividades habituales, pero conserva autocuidado.",answer:2}
    ]
  },
  breast:{
    title:"Mama izquierda · radioterapia adyuvante",
    short:"Mama",
    text:"Paciente después de cirugía conservadora. Contornea el volumen mamario y limita dosis a corazón, pulmones, mama contralateral y médula.",
    body:{cx:400,cy:420,rx:292,ry:230},
    targetCenter:{x:535,y:405},
    anatomy:"breast",
    structures:[
      {key:"target",label:"Mama izquierda",kind:"target",shapes:[{type:"ellipse",x:540,y:405,rx:72,ry:112}]},
      {key:"heart",label:"Corazón",shapes:[{type:"ellipse",x:449,y:451,rx:56,ry:77}]},
      {key:"lungL",label:"Pulmón izquierdo",shapes:[{type:"ellipse",x:492,y:395,rx:82,ry:125}]},
      {key:"lungR",label:"Pulmón derecho",shapes:[{type:"ellipse",x:308,y:395,rx:91,ry:128}]},
      {key:"contra",label:"Mama contralateral",shapes:[{type:"ellipse",x:258,y:405,rx:70,ry:108}]},
      {key:"cord",label:"Médula espinal",shapes:[{type:"circle",x:401,y:535,r:23}]}
    ],
    toxicities:[
      {q:"La piel está ligeramente roja y sensible, sin descamación húmeda.",answer:1},
      {q:"Hay descamación húmeda limitada a un pliegue cutáneo y dolor controlable con manejo local.",answer:2},
      {q:"La paciente refiere cansancio que limita tareas instrumentales, pero realiza su autocuidado.",answer:2}
    ]
  },
  cervix:{
    title:"Cérvix · radioterapia pélvica",
    short:"Cérvix",
    text:"Paciente con cáncer cervicouterino. Define el blanco pélvico y protege vejiga, recto, intestino y ambas cabezas femorales.",
    body:{cx:400,cy:420,rx:290,ry:245},
    targetCenter:{x:400,y:438},
    anatomy:"cervix",
    structures:[
      {key:"target",label:"Cérvix / blanco",kind:"target",shapes:[{type:"ellipse",x:400,y:438,rx:54,ry:47}]},
      {key:"bladder",label:"Vejiga",shapes:[{type:"ellipse",x:400,y:346,rx:68,ry:48}]},
      {key:"rectum",label:"Recto",shapes:[{type:"ellipse",x:401,y:520,rx:34,ry:58}]},
      {key:"bowel",label:"Intestino",shapes:[{type:"circle",x:346,y:296,r:37},{type:"circle",x:402,y:283,r:34},{type:"circle",x:459,y:302,r:38}]},
      {key:"femurL",label:"Cabeza femoral izq.",shapes:[{type:"circle",x:274,y:523,r:43}]},
      {key:"femurR",label:"Cabeza femoral der.",shapes:[{type:"circle",x:527,y:523,r:43}]}
    ],
    toxicities:[
      {q:"Presenta aumento leve en frecuencia urinaria, sin dolor importante ni hematuria.",answer:1},
      {q:"Tiene diarrea que requiere medicación y modifica su dieta, pero no necesita hidratación intravenosa.",answer:2},
      {q:"Refiere fatiga moderada y necesita descansar durante el día, pero conserva el autocuidado.",answer:2}
    ]
  }
};

let currentKey=null,currentCase=null,activeRole="doctor",selectedKey=null;
let contourLayers={},contourScores={},contourDone={};
let drawing=false,lastPoint=null,ctCanvas=document.createElement("canvas");
ctCanvas.width=W;ctCanvas.height=H;
let beams=[],dragBeam=-1,planEvaluated=false,lastPlan=null;
let nursingAnswers=[];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2600)}
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return \`rgba(\${(n>>16)&255},\${(n>>8)&255},\${n&255},\${a})\`}
function structureByKey(k){return currentCase.structures.find(s=>s.key===k)}
function contourComplete(){return !!currentCase&&currentCase.structures.every(s=>contourDone[s.key])}
function physicsUnlocked(){return contourComplete()}
function nurseUnlocked(){return !!planEvaluated}
function insideBody(x,y){const b=currentCase.body;return ((x-b.cx)/b.rx)**2+((y-b.cy)/b.ry)**2<=1}
function inShape(x,y,shape){
  if(shape.type==="circle")return Math.hypot(x-shape.x,y-shape.y)<=shape.r;
  return ((x-shape.x)/shape.rx)**2+((y-shape.y)/shape.ry)**2<=1;
}
function inTruth(structure,x,y){return structure.shapes.some(sh=>inShape(x,y,sh))}
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function ellipse(g,x,y,rx,ry,fill,stroke=null,lw=1){
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}
}
function circle(g,x,y,r,fill,stroke=null,lw=1){ellipse(g,x,y,r,r,fill,stroke,lw)}

function buildCT(){
  const g=ctCanvas.getContext("2d");
  g.clearRect(0,0,W,H);
  const b=currentCase.body;
  g.fillStyle="#05080d";g.fillRect(0,0,W,H);
  const bg=g.createRadialGradient(b.cx-40,b.cy-45,20,b.cx,b.cy,Math.max(b.rx,b.ry)+90);
  bg.addColorStop(0,"#59616b");bg.addColorStop(.55,"#303740");bg.addColorStop(1,"#090e14");
  ellipse(g,b.cx,b.cy,b.rx,b.ry,bg,"#d8dde3",8);

  if(currentCase.anatomy==="head"){
    ellipse(g,400,410,230,265,"#717881");
    ellipse(g,400,410,205,238,"#555d66");
    ellipse(g,352,405,74,96,"#454c54");ellipse(g,450,405,74,96,"#474e56");
    ellipse(g,400,474,74,116,"#4a515a");
    circle(g,322,294,31,"#171c23","#d3d9df",6);circle(g,478,294,31,"#171c23","#d3d9df",6);
    circle(g,322,294,12,"#a9b0b8");circle(g,478,294,12,"#a9b0b8");
    ellipse(g,397,520,34,62,"#6a7078");
    circle(g,337,433,19,"#b8bec5");circle(g,468,433,19,"#b8bec5");
  }else if(currentCase.anatomy==="breast"){
    ellipse(g,400,420,265,198,"#747b83");
    ellipse(g,305,395,92,132,"#20262d");ellipse(g,495,395,88,130,"#20262d");
    ellipse(g,448,454,58,78,"#626a73");
    circle(g,400,537,25,"#d6d9dc");circle(g,400,537,13,"#313840");
    ellipse(g,257,404,75,113,"#7c838a");ellipse(g,542,404,77,116,"#7c838a");
    ellipse(g,400,575,63,35,"#c3c7cb");
  }else{
    ellipse(g,400,420,266,218,"#777e86");
    circle(g,273,523,46,"#d7dadd");circle(g,527,523,46,"#d7dadd");
    circle(g,273,523,24,"#aab0b6");circle(g,527,523,24,"#aab0b6");
    ellipse(g,400,346,70,50,"#303740");
    ellipse(g,401,520,36,60,"#343b43");
    circle(g,345,296,39,"#232a31");circle(g,402,283,36,"#252c33");circle(g,459,302,40,"#232a31");
    ellipse(g,400,438,57,50,"#656d75");
    ellipse(g,400,600,86,28,"#c2c6ca");
  }

  const rand=seeded(currentKey==="head"?103:currentKey==="breast"?207:311);
  g.save();g.beginPath();g.ellipse(b.cx,b.cy,b.rx-5,b.ry-5,0,0,Math.PI*2);g.clip();
  for(let i=0;i<3400;i++){
    const x=b.cx+(rand()*2-1)*b.rx,y=b.cy+(rand()*2-1)*b.ry;
    if(!insideBody(x,y))continue;
    const v=Math.floor(120+rand()*80),a=.018+rand()*.035;
    g.fillStyle=\`rgba(\${v},\${v},\${v},\${a})\`;g.fillRect(x,y,1.5+rand()*2,1.5+rand()*2);
  }
  g.restore();

  // Tumor remains visible but intentionally not brightly labeled.
  const target=currentCase.structures[0];
  g.fillStyle="rgba(210,215,220,.23)";
  target.shapes.forEach(sh=>{
    if(sh.type==="circle")circle(g,sh.x,sh.y,sh.r,"rgba(210,215,220,.24)");
    else ellipse(g,sh.x,sh.y,sh.rx,sh.ry,"rgba(210,215,220,.24)");
  });
}

function initContours(){
  contourLayers={};contourScores={};contourDone={};
  currentCase.structures.forEach((s,i)=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;
    contourLayers[s.key]=c;contourScores[s.key]=null;contourDone[s.key]=false;
    s.color=COLORS[i%COLORS.length];
  });
  selectedKey=currentCase.structures[0].key;
}

function buildStructureSelector(){
  selector.innerHTML="";
  currentCase.structures.forEach(s=>{
    const b=document.createElement("button");b.className="structure-btn";b.dataset.key=s.key;
    b.style.borderColor=rgba(s.color,.75);b.innerHTML=\`<span style="color:\${s.color}">●</span> \${s.label}\`;
    b.addEventListener("click",()=>{selectedKey=s.key;updateUI();draw()});
    selector.appendChild(b);
  });
}

function draw(){
  ctx.clearRect(0,0,W,H);ctx.drawImage(ctCanvas,0,0);
  drawContourOverlays();
  if(activeRole==="physics"){drawDose();drawBeamRing();drawBeams()}
  if(activeRole==="doctor")drawBrushHint();
}

function drawContourOverlays(){
  currentCase.structures.forEach(s=>{
    const layer=contourLayers[s.key];if(!layer)return;
    ctx.save();ctx.globalAlpha=.43;ctx.drawImage(tintLayer(layer,s.color),0,0);ctx.restore();
  });
}
const tintCache=new Map();
function tintLayer(layer,color){
  const key=layer+"-"+color;
  // Small temporary canvas; recompute because layer changes while drawing.
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const g=c.getContext("2d");g.drawImage(layer,0,0);g.globalCompositeOperation="source-in";g.fillStyle=color;g.fillRect(0,0,W,H);
  return c;
}
function drawBrushHint(){
  const s=structureByKey(selectedKey);if(!s)return;
  ctx.save();ctx.font="800 16px system-ui";ctx.textAlign="center";
  const txt=\`Colorea: \${s.label}\`;
  ctx.fillStyle="rgba(5,11,20,.82)";roundRect(ctx,250,730,300,42,14);ctx.fill();
  ctx.fillStyle=s.color;ctx.fillText(txt,400,757);ctx.restore();
}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

function beamRingCenter(){return currentCase.targetCenter}
function drawBeamRing(){
  const b=currentCase.body;ctx.save();ctx.strokeStyle="#3b5872";ctx.lineWidth=2;ctx.setLineDash([8,9]);
  ctx.beginPath();ctx.ellipse(b.cx,b.cy,b.rx+42,b.ry+42,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function sourceFor(angle){
  const b=currentCase.body,rx=b.rx+42,ry=b.ry+42;
  return{x:b.cx+Math.cos(angle)*rx,y:b.cy+Math.sin(angle)*ry};
}
function beamGeometry(angle){
  const s=sourceFor(angle),t=beamRingCenter();let dx=t.x-s.x,dy=t.y-s.y;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  return{sx:s.x,sy:s.y,ux:dx,uy:dy};
}
function lineDistance(px,py,g){const vx=px-g.sx,vy=py-g.sy,t=vx*g.ux+vy*g.uy,qx=g.sx+t*g.ux,qy=g.sy+t*g.uy;return Math.hypot(px-qx,py-qy)}
function doseAt(x,y){let d=0;for(const a of beams){const g=beamGeometry(a),dist=lineDistance(x,y,g);d+=Math.exp(-(dist*dist)/(2*30*30))}return d}
function drawDose(){
  if(!beams.length)return;
  ctx.save();const b=currentCase.body;ctx.beginPath();ctx.ellipse(b.cx,b.cy,b.rx-3,b.ry-3,0,0,Math.PI*2);ctx.clip();
  for(let y=b.cy-b.ry;y<=b.cy+b.ry;y+=7)for(let x=b.cx-b.rx;x<=b.cx+b.rx;x+=7){
    if(!insideBody(x,y))continue;const d=doseAt(x,y);if(d<.09)continue;
    const n=d/Math.max(1,beams.length*.72);let col=n>.75?"255,185,90":n>.48?"172,237,111":"83,232,174";
    ctx.fillStyle=\`rgba(\${col},\${clamp(.08+d*.1,.08,.46)})\`;ctx.fillRect(x,y,8,8);
  }ctx.restore();
}
function drawBeams(){
  beams.forEach((a,i)=>{
    const g=beamGeometry(a),len=760,ex=g.sx+g.ux*len,ey=g.sy+g.uy*len;
    const grad=ctx.createLinearGradient(g.sx,g.sy,ex,ey);grad.addColorStop(0,"rgba(105,220,255,.88)");grad.addColorStop(.48,"rgba(105,235,170,.4)");grad.addColorStop(1,"rgba(183,148,255,.06)");
    ctx.strokeStyle=grad;ctx.lineWidth=14;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(g.sx,g.sy);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.fillStyle=dragBeam===i?"#254768":"#081624";ctx.strokeStyle=dragBeam===i?"#fff":"#82e8ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.sx,g.sy,18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="800 13px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(i+1),g.sx,g.sy);
  });ctx.textAlign="start";ctx.textBaseline="alphabetic";
}

function pointFromEvent(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function drawStroke(a,b){
  const layer=contourLayers[selectedKey],g=layer.getContext("2d");
  g.save();g.strokeStyle="#fff";g.fillStyle="#fff";g.lineWidth=28;g.lineCap="round";g.lineJoin="round";
  if(a){g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()}else{g.beginPath();g.arc(b.x,b.y,14,0,Math.PI*2);g.fill()}
  g.restore();
  contourDone[selectedKey]=false;contourScores[selectedKey]=null;planEvaluated=false;lastPlan=null;
}
function nearestBeam(x,y){let best=-1,d0=1e9;beams.forEach((a,i)=>{const s=sourceFor(a),d=Math.hypot(x-s.x,y-s.y);if(d<d0){d0=d;best=i}});return d0<42?best:-1}
function angleFromPoint(x,y){const b=currentCase.body;return Math.atan2((y-b.cy)/(b.ry+42),(x-b.cx)/(b.rx+42))}
function ringHit(x,y){
  const b=currentCase.body,n=Math.sqrt(((x-b.cx)/(b.rx+42))**2+((y-b.cy)/(b.ry+42))**2);return n>.78&&n<1.25
}

canvas.addEventListener("pointerdown",e=>{
  if(!currentCase)return;e.preventDefault();const p=pointFromEvent(e);
  if(activeRole==="doctor"){
    if(!insideBody(p.x,p.y)){toast("Colorea dentro de la imagen de la paciente.");return}
    drawing=true;lastPoint=p;drawStroke(null,p);canvas.setPointerCapture?.(e.pointerId);updateUI();draw();return;
  }
  if(activeRole==="physics"){
    if(!physicsUnlocked()){toast("Completa primero los contornos de la doctora.");return}
    const h=nearestBeam(p.x,p.y);if(h>=0){dragBeam=h;canvas.setPointerCapture?.(e.pointerId);draw();return}
    if(ringHit(p.x,p.y)){
      if(beams.length>=5){toast("Ya tienes 5 haces. Arrastra un número para cambiar su ángulo.");return}
      beams.push(angleFromPoint(p.x,p.y));planEvaluated=false;lastPlan=null;updateUI();draw();
    }else toast("Toca el aro punteado para colocar un haz.");
  }
});
canvas.addEventListener("pointermove",e=>{
  const p=pointFromEvent(e);
  if(activeRole==="doctor"&&drawing){e.preventDefault();drawStroke(lastPoint,p);lastPoint=p;draw();return}
  if(activeRole==="physics"&&dragBeam>=0){e.preventDefault();beams[dragBeam]=angleFromPoint(p.x,p.y);planEvaluated=false;lastPlan=null;updateUI();draw()}
});
function stopPointer(){drawing=false;lastPoint=null;dragBeam=-1;updateUI();draw()}
canvas.addEventListener("pointerup",stopPointer);canvas.addEventListener("pointercancel",stopPointer);

function validateSelectedContour(){
  const s=structureByKey(selectedKey),layer=contourLayers[selectedKey],data=layer.getContext("2d").getImageData(0,0,W,H).data;
  let pred=0,truth=0,inter=0;
  for(let y=100;y<720;y+=6)for(let x=100;x<700;x+=6){
    if(!insideBody(x,y))continue;const t=inTruth(s,x,y),p=data[(y*W+x)*4+3]>20;
    if(t)truth++;if(p)pred++;if(t&&p)inter++;
  }
  const dice=(pred+truth)?2*inter/(pred+truth):0;contourScores[selectedKey]=dice;
  if(dice>=.48){contourDone[selectedKey]=true;toast(\`¡Buen contorno! Coincidencia educativa: \${Math.round(dice*100)}%.\`)}
  else{contourDone[selectedKey]=false;toast(\`Coincidencia \${Math.round(dice*100)}%. Ajusta el volumen y vuelve a validar.\`)}
  if(contourComplete()){toast("¡Contorneo completo! Física médica ya está desbloqueada.");activeRole="physics"}
  updateUI();draw();
}
function clearSelectedContour(){
  const c=contourLayers[selectedKey];c.getContext("2d").clearRect(0,0,W,H);contourDone[selectedKey]=false;contourScores[selectedKey]=null;planEvaluated=false;lastPlan=null;updateUI();draw()
}

function sampleStructureDose(s,step=12){
  let total=0,n=0;
  const b=currentCase.body;
  for(let y=b.cy-b.ry;y<=b.cy+b.ry;y+=step)for(let x=b.cx-b.rx;x<=b.cx+b.rx;x+=step){
    if(inTruth(s,x,y)){total+=doseAt(x,y);n++}
  }return n?total/n:0;
}
function healthyDose(){
  let total=0,n=0,b=currentCase.body;
  for(let y=b.cy-b.ry;y<=b.cy+b.ry;y+=18)for(let x=b.cx-b.rx;x<=b.cx+b.rx;x+=18){
    if(!insideBody(x,y))continue;if(currentCase.structures.some(s=>inTruth(s,x,y)))continue;total+=doseAt(x,y);n++;
  }return n?total/n:0;
}
function angularSpreadBonus(){
  if(beams.length<2)return 0;const p=beams.slice().sort((a,b)=>a-b),g=[];
  for(let i=0;i<p.length;i++){let next=i===p.length-1?p[0]+Math.PI*2:p[i+1];g.push(next-p[i])}
  return clamp((Math.PI*1.35-Math.max(...g))/(Math.PI*.7),0,1);
}
function evaluatePlan(){
  if(!physicsUnlocked()){toast("Falta completar el contorneo.");return}
  if(beams.length<3){toast("Necesitas por lo menos 3 haces.");return}
  const target=currentCase.structures[0],td=sampleStructureDose(target),oars=currentCase.structures.slice(1).map(s=>({label:s.label,dose:sampleStructureDose(s)})),healthy=healthyDose();
  const expected=Math.max(1.75,beams.length*.58),coverage=clamp(td/expected*100,0,100);
  const avgOAR=oars.reduce((a,b)=>a+b.dose,0)/oars.length;
  const penalty=Math.max(0,avgOAR-.48)*30+Math.max(0,healthy-.36)*18;
  const score=Math.round(clamp(coverage-penalty+angularSpreadBonus()*9,0,100));
  lastPlan={coverage,oars,healthy,score};planEvaluated=true;updateUI();draw();
  toast("Plan evaluado. Enfermería ya está desbloqueada.");
}
function renderMetrics(){
  const box=document.getElementById("metrics");box.innerHTML="";
  if(!lastPlan)return;
  const vals=[["Cobertura blanco",Math.round(lastPlan.coverage)+"%"],["Tejido sano",lastPlan.healthy.toFixed(2)]];
  lastPlan.oars.slice(0,4).forEach(o=>vals.push([o.label,o.dose.toFixed(2)]));
  vals.forEach(([a,b])=>{const d=document.createElement("div");d.className="metric";d.innerHTML=\`<span>\${a}</span><b>\${b}</b>\`;box.appendChild(d)});
}

function renderNursing(){
  document.getElementById("nursingIntro").textContent="Lee cada escenario y asigna un grado educativo de severidad de 0 a 3. La intención es practicar observación, documentación y escalamiento clínico.";
  const list=document.getElementById("toxicityQuestions");list.innerHTML="";nursingAnswers=Array(currentCase.toxicities.length).fill(null);
  currentCase.toxicities.forEach((q,i)=>{
    const card=document.createElement("div");card.className="tox-card";
    card.innerHTML=\`<p><b>Situación \${i+1}.</b> \${q.q}</p><div class="tox-options"></div>\`;
    const opts=card.querySelector(".tox-options");
    [0,1,2,3].forEach(g=>{
      const b=document.createElement("button");b.textContent="Grado "+g;b.addEventListener("click",()=>{
        nursingAnswers[i]=g;[...opts.children].forEach(x=>x.classList.remove("selected"));b.classList.add("selected");
      });opts.appendChild(b);
    });list.appendChild(card);
  });
  document.getElementById("nursingResult").classList.add("hidden");
}
function evaluateNursing(){
  if(nursingAnswers.some(v=>v===null)){toast("Responde las tres situaciones antes de evaluar.");return}
  let correct=0;nursingAnswers.forEach((v,i)=>{if(v===currentCase.toxicities[i].answer)correct++});
  const r=document.getElementById("nursingResult");r.classList.remove("hidden");
  r.innerHTML=\`<b>\${correct}/\${currentCase.toxicities.length} correctas.</b> \${correct===currentCase.toxicities.length?"Excelente identificación de severidad.":"Revisa qué síntomas cambian de una toxicidad leve a una que requiere más intervención."} <br><small>Esta escala es una simplificación educativa y no sustituye CTCAE, protocolos institucionales ni valoración clínica.</small>\`;
  document.getElementById("nurseProgress").textContent=correct===currentCase.toxicities.length?"Completado ✓":"Evaluado";
}

function setRole(role){
  if(role==="physics"&&!physicsUnlocked()){toast("La física médica se desbloquea al completar los 6 contornos.");return}
  if(role==="nurse"&&!nurseUnlocked()){toast("Enfermería se desbloquea después de evaluar el plan.");return}
  activeRole=role;
  if(role==="nurse")renderNursing();
  updateUI();draw();
}

function updateUI(){
  if(!currentCase)return;
  roleTabs.forEach(b=>{b.classList.toggle("active",b.dataset.role===activeRole);b.classList.toggle("locked",(b.dataset.role==="physics"&&!physicsUnlocked())||(b.dataset.role==="nurse"&&!nurseUnlocked()))});
  contourToolbar.classList.toggle("hidden",activeRole!=="doctor");
  canvasWrap.classList.toggle("hidden",activeRole==="nurse");
  nursingPanel.classList.toggle("hidden",activeRole!=="nurse");

  document.getElementById("hudCase").textContent=currentCase.short;
  document.getElementById("hudStage").textContent=activeRole==="doctor"?"Doctora · contorneo":activeRole==="physics"?"Física · planeación":"Enfermería · toxicidad";
  document.getElementById("caseTitle").textContent=currentCase.title;document.getElementById("caseText").textContent=currentCase.text;

  [...selector.children].forEach(b=>{const k=b.dataset.key;b.classList.toggle("active",k===selectedKey);b.classList.toggle("done",!!contourDone[k]);const s=structureByKey(k);b.style.background=k===selectedKey?rgba(s.color,.16):"#10213a"});
  document.getElementById("validateContourBtn").disabled=activeRole!=="doctor";document.getElementById("clearContourBtn").disabled=activeRole!=="doctor";

  const status=document.getElementById("roleStatus");status.innerHTML="";
  if(activeRole==="doctor"){
    document.getElementById("missionNum").textContent="1";document.getElementById("missionTitle").textContent="Contorneo médico";
    document.getElementById("missionText").textContent="Selecciona un volumen arriba y coloréalo con el dedo. Valida cada estructura antes de pasar a física.";
    currentCase.structures.forEach(s=>{const r=document.createElement("div");r.className="status-row";const sc=contourScores[s.key];r.innerHTML=\`<span><i style="color:\${s.color}">●</i> \${s.label}</span><b>\${contourDone[s.key]?"✓ "+Math.round(sc*100)+"%":sc===null?"Pendiente":Math.round(sc*100)+"% · ajustar"}</b>\`;status.appendChild(r)});
  }else if(activeRole==="physics"){
    document.getElementById("missionNum").textContent="2";document.getElementById("missionTitle").textContent="Planeación física";
    document.getElementById("missionText").textContent="Distribuye los haces alrededor de la paciente, observa la dosis y busca cobertura del blanco con menor exposición de OAR.";
    status.innerHTML='<div class="status-row"><span>Contornos médicos</span><b>Completos ✓</b></div>';
  }else{
    document.getElementById("missionNum").textContent="3";document.getElementById("missionTitle").textContent="Seguimiento de toxicidad";
    document.getElementById("missionText").textContent="Evalúa síntomas durante radioterapia y reconoce cuándo la severidad aumenta.";
    status.innerHTML='<div class="status-row"><span>Plan de tratamiento</span><b>Evaluado ✓</b></div>';
  }

  document.getElementById("beamCount").textContent=\`\${beams.length} / 5 haces\`;
  const chips=document.getElementById("beamChips");chips.innerHTML="";if(!beams.length){const c=document.createElement("span");c.className="beam-chip";c.textContent="Aún no hay haces";chips.appendChild(c)}
  else beams.forEach((a,i)=>{const c=document.createElement("span");c.className="beam-chip";let deg=Math.round((a*180/Math.PI+360)%360);c.textContent=\`Haz \${i+1}: \${deg}°\`;chips.appendChild(c)});
  document.getElementById("undoBtn").disabled=!beams.length||!physicsUnlocked();document.getElementById("resetPlanBtn").disabled=!beams.length;document.getElementById("evaluatePlanBtn").disabled=!physicsUnlocked()||beams.length<3;
  document.getElementById("score").textContent=lastPlan?lastPlan.score:"—";document.getElementById("meterFill").style.width=(lastPlan?lastPlan.score:0)+"%";
  let grade="Completa primero el contorneo.";if(physicsUnlocked())grade=beams.length<3?"Coloca al menos 3 haces.":"Listo para evaluar.";if(lastPlan)grade=lastPlan.score>=85?"Excelente plan":lastPlan.score>=70?"Buen plan":lastPlan.score>=55?"Plan mejorable":"Replantea los ángulos";
  document.getElementById("grade").textContent=grade;renderMetrics();
  const pr=document.getElementById("planResult");if(lastPlan){pr.classList.remove("hidden");pr.textContent=lastPlan.score>=85?"Muy buena cobertura con una distribución favorable de entradas.":lastPlan.score>=70?"Buen equilibrio. Intenta reducir un poco más la exposición de OAR.":"Prueba separar mejor los ángulos y evitar trayectorias que crucen varios OAR."}else pr.classList.add("hidden");

  document.getElementById("doctorProgress").textContent=contourComplete()?"Completado ✓":\`\${currentCase.structures.filter(s=>contourDone[s.key]).length}/6 contornos\`;
  document.getElementById("physicsProgress").textContent=!physicsUnlocked()?"Bloqueado":planEvaluated?"Completado ✓":"Disponible";
  if(!nurseUnlocked())document.getElementById("nurseProgress").textContent="Bloqueado";
}

function loadCase(key){
  currentKey=key;currentCase=CASES[key];activeRole="doctor";beams=[];dragBeam=-1;planEvaluated=false;lastPlan=null;nursingAnswers=[];
  initContours();buildCT();buildStructureSelector();casePicker.classList.add("hidden");gameShell.classList.remove("hidden");
  updateUI();draw();toast("Empieza como doctora: selecciona un volumen y coloréalo sobre la CT.");
}

document.querySelectorAll(".case-card").forEach(b=>b.addEventListener("click",()=>loadCase(b.dataset.case)));
roleTabs.forEach(b=>b.addEventListener("click",()=>setRole(b.dataset.role)));
document.getElementById("changeCaseBtn").addEventListener("click",()=>{gameShell.classList.add("hidden");casePicker.classList.remove("hidden");currentCase=null});
document.getElementById("validateContourBtn").addEventListener("click",validateSelectedContour);
document.getElementById("clearContourBtn").addEventListener("click",clearSelectedContour);
document.getElementById("undoBtn").addEventListener("click",()=>{beams.pop();planEvaluated=false;lastPlan=null;updateUI();draw()});
document.getElementById("resetPlanBtn").addEventListener("click",()=>{beams=[];planEvaluated=false;lastPlan=null;updateUI();draw();toast("Haces reiniciados.")});
document.getElementById("evaluatePlanBtn").addEventListener("click",evaluatePlan);
document.getElementById("hintBtn").addEventListener("click",()=>toast("Pista: distribuye los haces alrededor de la paciente y evita que muchos recorran los mismos órganos a riesgo."));
document.getElementById("evaluateNursingBtn").addEventListener("click",evaluateNursing);

})();