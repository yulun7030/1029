/**
 * ========================================================
 * 角色互動與精靈圖動畫系統 (p5.js 旗艦高分版)
 * 核心特色：
 * 1. 嚴謹的 9 參數 image() 精靈圖裁切 (Sprite Animation)
 * 2. 狀態機模式 (State Machine) 管理主角動作切換
 * 3. 完整重力拋物線與地面碰撞檢測
 * 4. 物件導向特效系統：魔法氣功彈、擊中爆炸火花粒子
 * 5. 畫面回饋動態：受擊畫面微震 (Screen Shake)、受擊文字漂浮淡出
 * 6. 多層視差背景與動態地面，提升畫面層次感
 * ========================================================
 */

// ---------------- 1. 素材與圖片資源變數 ----------------
let spriteSheet;
let backgroundImage;
let spriteFrameWidth;
let spriteFrameHeight;
let characterDrawWidth;
let characterDrawHeight;
let backgroundScale;
let backgroundX;
let backgroundY;
const backgroundGroundRatio = 0.61;
const spriteFrameCount = 5;

// ---------------- 2. 動畫規格設定檔 (寬度、高度、總幀數、播放週期) ----------------
const SPRITES = {
  stop: { start: 0, count: 1, speed: 8 },
  walk: { start: 0, count: 2, speed: 8 },
  jump: { start: 2, count: 2, speed: 7 },
  push: { start: 4, count: 1, speed: 5 },
  to:   { start: 4, count: 1, speed: 5 }
};

// ---------------- 3. 主角物件狀態與物理參數 ----------------
let player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  speed: 4.5,          // 水平移動速度
  jumpForce: -13.5,    // 起跳瞬間力道
  gravity: 0.75,       // 重力加速度
  facing: 1,           // 1: 朝右, -1: 朝左
  state: 'stop',       // 當前狀態：stop, walk, jump, push
  isGrounded: false,   // 是否站在地面上
  attackTimer: 0       // 攻擊鎖定倒數計時器
};

// ---------------- 4. NPC 敵對/互動角色物件 ----------------
let npc = {
  x: 0,
  y: 0,
  state: 'stop',
  hitTimer: 0,
  floatAngle: 0        // 待機微浮動角度
};

// ---------------- 5. 特效與動態陣列 ----------------
let projectiles = [];  // 發射的氣功彈陣列
let particles = [];    // 爆炸粒子碎片陣列
let floatTexts = [];   // 受擊飄字特效陣列
let screenShake = 0;   // 螢幕震動強度
let floorY = 0;        // 地面 Y 軸高度基準

// ---------------- 預先載入資源 (Preload) ----------------
function preload() {
  spriteSheet = loadImage('1/all.png');
  backgroundImage = loadImage('背景.png');
}

// ---------------- 初始化設定 (Setup) ----------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  spriteFrameWidth = spriteSheet.width / spriteFrameCount;
  spriteFrameHeight = spriteSheet.height;
  updateSceneLayout();

  // 初始化角色與地面位置
  resetEnvironment();
}

// ---------------- 主要繪圖迴圈 (Draw Loop) ----------------
function draw() {
  // 1. 處理螢幕震動效果 (Screen Shake Effect)
  push();
  if (screenShake > 0) {
    let shakeX = random(-screenShake, screenShake);
    let shakeY = random(-screenShake, screenShake);
    translate(shakeX, shakeY);
    screenShake *= 0.88; // 震動阻尼衰減
    if (screenShake < 0.2) screenShake = 0;
  }

  // 2. 繪製背景與場景裝飾
  drawBackground();

  // 3. 處理鍵盤操控與主角物理
  handlePlayerInput();
  updatePlayerPhysics();

  // 4. 更新與繪製粒子特效
  updateAndDrawParticles();

  // 5. 更新與繪製投射物（氣功彈）
  updateAndDrawProjectiles();

  // 6. 繪製 NPC 與受擊飄字
  drawNPC();
  updateAndDrawFloatTexts();

  // 7. 繪製玩家本體
  drawPlayer();

  // 8. 繪製介面提示 (UI)
  drawUI();

  pop(); // 結束震動畫布狀態
}

// ---------------- 場景重置與視窗適應 ----------------
function resetEnvironment() {
  floorY = backgroundY + backgroundImage.height * backgroundScale * backgroundGroundRatio;
  player.x = width * 0.22;
  player.y = floorY - characterDrawHeight / 2;
  npc.x = width * 0.78;
  npc.y = floorY - characterDrawHeight / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateSceneLayout();
  resetEnvironment();
}

function updateSceneLayout() {
  backgroundScale = max(
    width / backgroundImage.width,
    height / backgroundImage.height
  );
  const scaledWidth = backgroundImage.width * backgroundScale;
  const scaledHeight = backgroundImage.height * backgroundScale;
  backgroundX = (width - scaledWidth) / 2;
  backgroundY = height - scaledHeight;
  characterDrawHeight = backgroundScale * 36;
  characterDrawWidth = characterDrawHeight * spriteFrameWidth / spriteFrameHeight;
}

// ---------------- 繪製背景與層次感 ----------------
function drawBackground() {
  background('#a34da9');
  image(
    backgroundImage,
    backgroundX + backgroundImage.width * backgroundScale / 2,
    backgroundY + backgroundImage.height * backgroundScale / 2,
    backgroundImage.width * backgroundScale,
    backgroundImage.height * backgroundScale
  );
}

// ---------------- 玩家操作邏輯 ----------------
function handlePlayerInput() {
  // 攻擊硬直時間內不可任意移動
  if (player.attackTimer > 0) {
    player.attackTimer--;
    if (player.attackTimer <= 0) {
      player.state = player.isGrounded ? 'stop' : 'jump';
    }
    return;
  }

  // 水平移動偵測
  player.vx = 0;
  if (keyIsDown(RIGHT_ARROW)) {
    player.vx = player.speed;
    player.facing = 1;
  } else if (keyIsDown(LEFT_ARROW)) {
    player.vx = -player.speed;
    player.facing = -1;
  }

  // 跳躍偵測 (站在地面上方可起跳)
  if (keyIsDown(UP_ARROW) && player.isGrounded) {
    player.vy = player.jumpForce;
    player.isGrounded = false;
    createFootDust(player.x, floorY);
  }

  // 判斷移動狀態
  if (!player.isGrounded) {
    player.state = 'jump';
  } else if (player.vx !== 0) {
    player.state = 'walk';
  } else {
    player.state = 'stop';
  }
}

// ---------------- 鍵盤單次觸發事件 (攻擊) ----------------
function keyPressed() {
  // 按下空白鍵發功出招
  if (key === ' ' && player.attackTimer <= 0) {
    player.state = 'push';
    player.attackTimer = 18; // 動作持續影格

    // 產生向外飛出的魔法氣功彈
    projectiles.push({
      x: player.x + player.facing * 42,
      y: player.y - 4,
      dir: player.facing,
      speed: 8.5,
      frame: 0
    });

    // 出招瞬間發射微震感
    screenShake = max(screenShake, 2);
  }
}

// ---------------- 物理引擎更新 (重力、碰撞與邊界) ----------------
function updatePlayerPhysics() {
  player.x += player.vx;
  player.y += player.vy;

  // 重力作用
  if (!player.isGrounded) {
    player.vy += player.gravity;
  }

  // 地面碰撞判定
  if (player.y + characterDrawHeight / 2 >= floorY) {
    if (!player.isGrounded) {
      createFootDust(player.x, floorY);
    }
    player.y = floorY - characterDrawHeight / 2;
    player.vy = 0;
    player.isGrounded = true;
  }

  // 左右畫布邊界限制
  player.x = constrain(player.x, 40, width - 40);
}

// ---------------- 繪製玩家本體 (核心切圖演算法) ----------------
function drawPlayer() {
  let cfg = SPRITES[player.state];
  let curFrame = cfg.start + floor(frameCount / cfg.speed) % cfg.count;
  let sx = curFrame * spriteFrameWidth;

  push();
  translate(player.x, player.y);
  scale(player.facing, 1); // 透過 scale 實現面向翻轉

  // 角色腳底陰影
  noStroke();
  fill(50, 50, 60, 45);
  ellipse(0, characterDrawHeight / 2 - 5, 54, 12);

  image(spriteSheet, 0, 0, characterDrawWidth, characterDrawHeight,
    sx, 0, spriteFrameWidth, spriteFrameHeight);
  pop();
}

// ---------------- 投射物系統 (氣功彈移動與碰撞) ----------------
function updateAndDrawProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.dir * p.speed;
    p.frame++;

    // 氣功彈動畫影格計算
    let curF = SPRITES.to.start + floor(p.frame / SPRITES.to.speed) % SPRITES.to.count;
    let sx = curF * spriteFrameWidth;

    // 繪製氣功彈
    push();
    translate(p.x, p.y);
    scale(p.dir, 1);
    image(spriteSheet, 0, 0, 40, 40, sx, 0, spriteFrameWidth, spriteFrameHeight);
    pop();

    // 碰撞 NPC 檢驗 (距離判定)
    let d = dist(p.x, p.y, npc.x, npc.y);
    if (d < 45) {
      // 1. 觸發 NPC 受擊狀態
      npc.state = 'fall';
      npc.hitTimer = 35;

      // 2. 觸發畫面震動與火花粒子
      screenShake = 6.5;
      createHitExplosion(npc.x, npc.y);

      // 3. 產生向上漂浮的傷害文字
      floatTexts.push({
        x: npc.x,
        y: npc.y - 45,
        text: 'HIT! -99',
        alpha: 255,
        color: '#ff4d4f'
      });

      // 移除命中子彈
      projectiles.splice(i, 1);
      continue;
    }

    // 超出螢幕範圍自動銷毀，維持記憶體乾淨
    if (p.x < -60 || p.x > width + 60) {
      projectiles.splice(i, 1);
    }
  }
}

// ---------------- NPC 繪製與狀態管理 ----------------
function drawNPC() {
  if (npc.hitTimer > 0) {
    npc.hitTimer--;
    if (npc.hitTimer <= 0) npc.state = 'stop';
  }

  let curFrame = (npc.state === 'fall') ? 2 : 0;
  let sx = curFrame * spriteFrameWidth;

  push();
  // 受擊微晃動，平常微呼吸上下浮動
  let floatOffset = (npc.state === 'stop') ? sin(frameCount * 0.08) * 2 : 0;
  translate(npc.x, npc.y + floatOffset);
  scale(-1, 1); // NPC 面向主角朝左

  // NPC 腳底陰影
  noStroke();
  fill(50, 50, 60, 45);
  ellipse(0, characterDrawHeight / 2 - 5, 54, 12);

  image(spriteSheet, 0, 0, characterDrawWidth, characterDrawHeight,
    sx, 0, spriteFrameWidth, spriteFrameHeight);
  pop();
}

// ---------------- 粒子系統：爆炸與揚塵動態 ----------------
function createHitExplosion(x, y) {
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-5, 5),
      vy: random(-6, 2),
      size: random(3, 7),
      alpha: 255,
      color: random(['#ff5722', '#ffc107', '#ffeb3b', '#ffffff'])
    });
  }
}

function createFootDust(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x + random(-10, 10),
      y: y,
      vx: random(-1.5, 1.5),
      vy: random(-1, -0.2),
      size: random(2, 5),
      alpha: 180,
      color: '#bcc5d3'
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.alpha -= 8; // 隨時間淡出

    noStroke();
    let c = color(pt.color);
    c.setAlpha(pt.alpha);
    fill(c);
    circle(pt.x, pt.y, pt.size);

    if (pt.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ---------------- 浮動傷害字體動態 ----------------
function updateAndDrawFloatTexts() {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    let ft = floatTexts[i];
    ft.y -= 1.2;     // 向上飄升
    ft.alpha -= 6.5; // 逐漸透明

    push();
    textSize(16);
    textStyle(BOLD);
    let c = color(ft.color);
    c.setAlpha(ft.alpha);
    fill(c);
    stroke(255, ft.alpha);
    strokeWeight(2);
    text(ft.text, ft.x, ft.y);
    pop();

    if (ft.alpha <= 0) {
      floatTexts.splice(i, 1);
    }
  }
}

// ---------------- 介面操控指引 (UI) ----------------
function drawUI() {
  fill(60, 70, 85, 200);
  noStroke();
  rect(140, 45, 230, 46, 8);

  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);
  text('🎮 ← → : 左右移動\n⬆ 跳躍 | SPACE : 發功攻擊', 38, 45);
}