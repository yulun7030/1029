let spriteSheet;
let animation = [];
const numFrames = 5; // 圖片精靈中的圖片總數
const spriteSheetWidth = 1020; // 圖片精靈的總寬度
const spriteSheetHeight = 213; // 圖片精靈的總高度
let frameWidth; // 單一畫格的寬度
let currentFrame = 0;
let isLooping = false; // 用來追蹤動畫是否正在播放
let song; // 用來存放音樂的變數

function preload() {
  // 預先載入圖片，請確保路徑和檔名 '1/all.png' 正確
  spriteSheet = loadImage('1/all.png');
  // 預先載入音樂，請將 'music.mp3' 換成您的音樂檔名
  song = loadSound('music.mp3');
}

function setup() {
  // 產生一個全視窗的畫布
  createCanvas(windowWidth, windowHeight);

  // 計算單一畫格的寬度
  frameWidth = spriteSheetWidth / numFrames;

  // 將圖片精靈裁切成個別的畫格並存入陣列
  for (let i = 0; i < numFrames; i++) {
    let frame = spriteSheet.get(i * frameWidth, 0, frameWidth, spriteSheetHeight);
    animation.push(frame);
  }

  // 設定動畫播放速度 (每秒10幀)
  frameRate(10);

  // 初始時暫停動畫
  noLoop();
}

function draw() {
  // 設定畫布背景顏色
  background('#909580');

  // 計算圖片置中的 x 和 y 座標
  let x = (windowWidth - frameWidth) / 2;
  let y = (windowHeight - spriteSheetHeight) / 2;

  // 顯示當前的動畫畫格
  image(animation[currentFrame], x, y);

  // 更新到下一個畫格，實現循環播放
  currentFrame = (currentFrame + 1) % numFrames;
}

// 當滑鼠被按下時，切換動畫的播放/暫停狀態
function mousePressed() {
  if (isLooping) {
    song.pause(); // 暫停音樂
    noLoop();
    isLooping = false;
  } else {
    song.loop(); // 循環播放音樂
    loop();
    isLooping = true;
  }
}

// 當瀏覽器視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
