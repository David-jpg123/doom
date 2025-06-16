const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const fov = Math.PI / 3; // 60 grados
const numRays = canvas.width; // Un rayo por columna de píxeles
const rayAngleStep = fov / numRays;

const mobs = [
  {
    x: 485, // posición en el mundo
    y: 485,
    radius: 16,
    sprite: new Image()
  }
];

mobs[0].sprite.src = "mob1.png";

const texturesToLoad = 3;
let texturesLoaded = 0;

let floorData, ceilingData;
let floorWidth, floorHeight;
let ceilingWidth, ceilingHeight;

function loadTexture(image, callback) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    callback(ctx.getImageData(0, 0, image.width, image.height));
  };
}

// wall
const wallTexture = new Image();
wallTexture.src = 'wall.png';
wallTexture.onload = onTextureLoad;

// floor
const floorTexture = new Image();
floorTexture.src = 'floor.png';
loadTexture(floorTexture, data => {
  console.log('floor loaded', data);
  floorData = data.data;
  floorWidth = floorTexture.width;
  floorHeight = floorTexture.height;
  onTextureLoad();
});

// ceiling
const ceilingTexture = new Image();
ceilingTexture.src = 'ceiling.png';
loadTexture(ceilingTexture, data => {
  console.log('ceiling loaded', data);
  ceilingData = data.data;
  ceilingWidth = ceilingTexture.width;
  ceilingHeight = ceilingTexture.height;
  onTextureLoad();
});

function onTextureLoad() {
  texturesLoaded++;
  if (texturesLoaded === texturesToLoad) {
    gameLoop(); // ¡Cuando todo esté cargado!
  }
}


const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,0,0,0,1,1,1,1,1,1],
  [1,0,1,0,0,1,1,0,1,1,0,0,0,0,1],
  [1,0,1,0,1,1,0,0,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,1,0,0,1],
  [1,1,0,1,0,1,0,0,0,1,0,1,1,1,1],
  [1,0,0,1,0,1,1,1,1,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,0,0,1,0,1,1],
  [1,0,0,1,0,1,0,0,0,1,0,1,0,0,1],
  [1,1,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const tileSize = 64;
const mapWidth = map[0].length;
const mapHeight = map.length;

let player = {
  x: 485,
  y: 485,
  angle: 0,
  height: 32,
  hp: 100,
  ammo: 10,
  speed: 3,
  turnSpeed: 0.05
};

const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function movePlayer() {
  if (keys['ArrowLeft'])  player.angle -= player.turnSpeed;
  if (keys['ArrowRight']) player.angle += player.turnSpeed;

  let moveStep = 0;
  if (keys['ArrowUp'])    moveStep = player.speed;
  if (keys['ArrowDown'])  moveStep = -player.speed;

  let newX = player.x + Math.cos(player.angle) * moveStep;
  let newY = player.y + Math.sin(player.angle) * moveStep;

  let col = Math.floor(newX / tileSize);
  let row = Math.floor(newY / tileSize);

  if (map[row] && map[row][col] === 0) {
    player.x = newX;
    player.y = newY;
  }
}

function renderFloorAndCeiling() {
  const image = ctx.createImageData(canvas.width, canvas.height);
  const data = image.data;

  const halfHeight = canvas.height / 2;
  const screenWidth = canvas.width;
  const screenHeight = canvas.height;
  const projectionPlane = (canvas.width / 2) / Math.tan(fov / 2);
  const textureScale = 25;  // mantiene tamaño original

  const rayDirX0 = Math.cos(player.angle - fov / 2);
  const rayDirY0 = Math.sin(player.angle - fov / 2);
  const rayDirX1 = Math.cos(player.angle + fov / 2);
  const rayDirY1 = Math.sin(player.angle + fov / 2);

  const slowFactor = 0.06;  // factor para desacelerar movimiento

  // Usamos versión desacelerada de la posición del jugador para suelo/techo
  const floorPlayerX = player.x * slowFactor;
  const floorPlayerY = player.y * slowFactor;

  for (let y = halfHeight; y < screenHeight; y++) {
    const p = y - halfHeight;
    const rowDistance = projectionPlane / p;

    const stepX = rowDistance * (rayDirX1 - rayDirX0) / screenWidth;
    const stepY = rowDistance * (rayDirY1 - rayDirY0) / screenWidth;

    let floorX = floorPlayerX + rowDistance * rayDirX0;
    let floorY = floorPlayerY + rowDistance * rayDirY0;

    for (let x = 0; x < screenWidth; x++) {
      const tx = Math.floor(((floorX * textureScale) % tileSize + tileSize) % tileSize * floorTexture.width / tileSize);
      const ty = Math.floor(((floorY * textureScale) % tileSize + tileSize) % tileSize * floorTexture.height / tileSize);

      const floorIdx = 4 * (ty * floorWidth + tx);
      const screenIdx = 4 * (y * screenWidth + x);

      data[screenIdx] = floorData[floorIdx];
      data[screenIdx + 1] = floorData[floorIdx + 1];
      data[screenIdx + 2] = floorData[floorIdx + 2];
      data[screenIdx + 3] = 255;

      // Techo simétrico
      const topY = screenHeight - y - 1;
      const ceilIdx = 4 * (ty * ceilingWidth + tx);
      const topIdx = 4 * (topY * screenWidth + x);

      data[topIdx] = ceilingData[ceilIdx];
      data[topIdx + 1] = ceilingData[ceilIdx + 1];
      data[topIdx + 2] = ceilingData[ceilIdx + 2];
      data[topIdx + 3] = 255;

      floorX += stepX;
      floorY += stepY;
    }
  }

  ctx.putImageData(image, 0, 0);
}

function drawMobs() {
  for (const mob of mobs) {
    const dx = mob.x - player.x;
    const dy = mob.y - player.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angleToMob = Math.atan2(dy, dx);

    let relativeAngle = angleToMob - player.angle;
    // Aseguramos que esté entre -π y π
    if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
    if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;

    // Si está dentro del campo de visión
    if (Math.abs(relativeAngle) < fov / 2) {
      const screenX = (relativeAngle + fov / 2) / fov * canvas.width;
  
      // Escala según la distancia
      const scale = 20000 / distance;
      const spriteSize = Math.min(scale, canvas.height);
  
      ctx.drawImage(
        mob.sprite,
        screenX - spriteSize / 2,         // X centrado
        (canvas.height - spriteSize + 100) / 2, // Y centrado vertical
        spriteSize,
        spriteSize
      );
    }
  }
}


function drawHUD() {
  
  // Fondo
  console.log("Dibujando HUD. Vida actual:", player.hp);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, 1280, 40);
  
  //Texto
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText("Vida", 20, 25);
  ctx.fillText("Munición: " + player.ammo, 320, 25);

  const barWidth = 200;
  const barHeight = 20;
  const barX = 80;
  const barY = 10;

  //Dibujos
  // Fondo gris
  ctx.fillStyle = "gray";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Parte roja según vida
  const lifePercent = Math.max(0, player.hp / 100);
  ctx.fillStyle = "red";
  ctx.fillRect(barX, barY, barWidth * lifePercent, barHeight);

  // Borde negro
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // === MINIMAPA ===
  const miniScale = 0.2; // Tamaño del minimapa
  const mapX = canvas.width - mapWidth * tileSize * miniScale - 20; // esquina derecha
  const mapY = 700;

  // Dibuja el mapa
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = map[y][x];
      ctx.fillStyle = tile === 1 ? "gray" : "black";
      ctx.fillRect(
        mapX + x * tileSize * miniScale,
        mapY + y * tileSize * miniScale,
        tileSize * miniScale,
        tileSize * miniScale
      );
    }
  }

  // Dibuja al jugador en el minimapa
  const playerMiniX = mapX + (player.x / tileSize) * tileSize * miniScale;
  const playerMiniY = mapY + (player.y / tileSize) * tileSize * miniScale;
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(playerMiniX, playerMiniY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Línea de dirección
  const dirLength = 10;
  const dirX = Math.cos(player.angle) * dirLength;
  const dirY = Math.sin(player.angle) * dirLength;

  ctx.strokeStyle = "rgba(100, 0, 0, 0.7)";
  ctx.beginPath();
  ctx.moveTo(playerMiniX, playerMiniY);
  ctx.lineTo(playerMiniX + dirX, playerMiniY + dirY);
  ctx.stroke();
}


function castRays() {
  renderFloorAndCeiling();
    for (let i = 0; i < numRays; i++) {
        let rayAngle = (player.angle - fov / 2) + i * rayAngleStep;
        let dist = 0;
        let hit = false;
        let rayX, rayY;

        while (!hit && dist < 500) {
            dist += 1;
            rayX = player.x + Math.cos(rayAngle) * dist;
            rayY = player.y + Math.sin(rayAngle) * dist;

            let mapX = Math.floor((rayX + 0.0001) / tileSize);
            let mapY = Math.floor((rayY + 0.0001) / tileSize);

            if (mapY >= 0 && mapY < mapHeight &&
                mapX >= 0 && mapX < mapWidth &&
                map[mapY][mapX] === 1) {
                hit = true;
            }
            if (mapY < 0 || mapY >= mapHeight || mapX < 0 || mapX >= mapWidth) {
                hit = true;
                dist = 500; // Limitar distancia para bordes del mapa
            }
        }

        const correctedDist = dist * Math.cos(rayAngle - player.angle);
        const wallHeight = Math.min(30000 / correctedDist, canvas.height);
        const wallY = (canvas.height - wallHeight) / 2;

        if (hit) {
            let hitVertical = false;

              // Comprobar si la celda vecina en X es distinta
              let nextX = Math.floor((rayX - Math.cos(rayAngle)) / tileSize);
              let currX = Math.floor(rayX / tileSize);
              if (nextX !== currX) {
                hitVertical = true;
              }


            let textureX;

              if (hitVertical) {
                textureX = Math.floor(rayY % tileSize);
                if (Math.sin(rayAngle) < 0) {
                  textureX = tileSize - textureX;
                }
              } else {
                  textureX = Math.floor(rayX % tileSize);
                  if (Math.cos(rayAngle) < 0) {
                    textureX = tileSize - textureX;
                  }
              }
            textureX = Math.floor(textureX);
            textureX = Math.max(0, Math.min(tileSize - 1, textureX));

            ctx.drawImage(
                wallTexture,
                textureX, 0,
                1, wallTexture.height,
                i, wallY,
                1, wallHeight
            );
        }
    }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  castRays();
  drawMobs();
  drawHUD();
  requestAnimationFrame(gameLoop);
}
