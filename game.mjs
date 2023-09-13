import {
  keyPressed,
  init,
  initKeys,
  initGesture,
  Sprite,
  GameLoop,
  initPointer,
  SpriteSheet,
  loadImage,
  getWorldRect,
  Text,
} from "./kontra.min.mjs";
import { levels } from "./levels.mjs";

const aspectRatio =
  window.c.getAttribute("width") / window.c.getAttribute("height");
const deviceAr = window.innerWidth / window.innerHeight;
const scale = 1;
const W = window.innerWidth / scale;
const H = window.innerHeight / scale;
window.c.setAttribute("width", W);
window.c.setAttribute("height", H);
// window.c.style.width = W * scale;
// window.c.style.height = "100dvh";

function collides(sprite1, sprite2) {
  return (
    sprite1.x < sprite2.x + sprite2.width &&
    sprite1.x + sprite1.width > sprite2.x &&
    sprite1.y < sprite2.y + sprite2.height &&
    sprite1.y + sprite1.height > sprite2.y
  );
}

let { canvas } = init();
initKeys();
initPointer();
initGesture();

const G = 0.4;
const FRICTION_X = 1;
const JUMP_FORCE = -10;
const WALK_SPEED = 1.8;

let scrollingSpeed = 0;
const JUMP_DISTANCE = 120;
let stopGravity = false;
let score = 0;

Promise.all([loadImage("player.png"), loadImage("spikes.png")]).then(
  ([playerImg, spikesImg]) => {
    initSetup(playerImg, spikesImg);
  }
);

let platforms = [];

let player = Sprite({});
let spikeSpriteSheet;

function getPlayerRect() {
  const rect = getWorldRect(player);
  rect.x += 5;
  rect.width -= 10;
  rect.y += 5;
  rect.height -= 10;
  return rect;
}

let scoreText = Text({
  text: "Score: 0",
  font: "28px Arial",
  color: "white",
  x: 20,
  y: 20,
});

let fireballs = [];
let playerLives = 3; // Or however many you want to start with

let npcs = [];

let loop = GameLoop({
  // create the main game loop
  update: function () {
    // update the game state
    player.update();

    if (!stopGravity) {
      player.dy += G; // Gravity pulling down
    }

    if (!player.isDead) {
      player.y += G;
    }

    if (player.y > canvas.height - player.height / 2 && !player.isDead) {
      // If on ground
      player.y = canvas.height - player.height / 2;
      player.dy = 0;
      if (!player.onGround) {
        // fireBlast();
      }
      player.onGround = true;
      player.rotation = 0;

      player.playAnimation("walk");
    }

    if (!player.onGround) {
      if (!player.isDead) {
        player.rotation += 0.14;
      } else {
        player.rotation -= 0.05;
      }
    } else {
      createWalkParticles(1);
    }

    //  Collision check
    if (!player.isDead) {
      npcs.forEach((npc) => {
        if (npc.type === "ring") {
          // npc.x -= scrollingSpeed;

          if (collides(npc, getPlayerRect(player))) {
            console.log("collide");
            player.isDead = true;
            jump();
            blood();
            player.playAnimation("dead");
            setTimeout(() => {
              reset();
            }, 2000);
          }
        }
      });
    }

    if (keyPressed("z")) {
      jump();
    }
    if (keyPressed("arrowleft") || player.walkingDirection === "left") {
      walk(-1);
    }
    if (keyPressed("arrowright") || player.walkingDirection === "right") {
      walk(1);
    }

    if (player.y >= canvas.height * 0.8 && scrollingSpeed) {
      console.log("move stop");
      // scrollingSpeed = 0;
    }

    const lastRing = npcs.findLast((npc) => npc.type === "ring");
    if (lastRing && lastRing.x < canvas.width / 2) {
      generateRings();
    }

    npcs = npcs.filter((npc) => npc.x > 0);

    // fireballs.forEach((fireball) => fireball.update());
    npcs.forEach((npc) => npc.update());

    if (!player.isDead) {
      score += 0.1;
    }
    scoreText.text = `Score: ${Math.floor(score)}`;
  },
  render: function () {
    // render the game state
    player.render();
    platforms.forEach((platform) => platform.render());
    npcs.forEach((npc) => npc.render());
    scoreText.render();
  },
});

function jump() {
  if (player.onGround || player.isDead) {
    player.onGround = false;
    // If on ground
    player.dy = JUMP_FORCE;
    player.playAnimation("jump");
  }
}
function walk(dir) {
  player.playAnimation("walk");

  createWalkParticles(dir);
}

function blood() {
  const count = 10;
  for (let i = 0; i < count; i++) {
    npcs.push(
      Sprite({
        x: player.x,
        y: player.y,
        width: 10,
        height: 10,
        dx: Math.random() * 2 - 1,
        dy: -(Math.random() * 3 + 1),
        ddy: 0.2,
        ttl: 4,
        anchor: { x: 0.5, y: 0.5 },
        color: "#f00",
        update() {
          this.advance();
          // reduce opacity
          // this.opacity -= 0.05;
          // this.rotation += 0.1;
          // if (this.opacity < 0) {
          // this.ttl = 0;
          // }
        },
      })
    );
  }
}
function createWalkParticles(dir = 1) {
  const count = 1;
  if (Math.random() > 0.1 || !player.onGround) return;
  for (let i = 0; i < count; i++) {
    npcs.push(
      Sprite({
        x: player.x - player.width / 2,
        y: player.y + player.height / 2 - 10,
        width: 15,
        height: 15,
        dx: (Math.random() * 1 + 0.5) * -dir,
        dy: -(Math.random() * 2 + 0.5),
        ttl: 3,
        anchor: { x: 0.5, y: 0.5 },
        color: "#ccc5",
        update() {
          this.advance();
          // reduce opacity
          this.opacity -= 0.05;
          this.rotation += 0.1;
          if (this.opacity < 0) {
            this.ttl = 0;
          }
        },
      })
    );
  }
}

// implement swipe gesture detection
let start;
window.addEventListener("click", function (e) {
  jump();
});

window.addEventListener("touchend", function (e) {
  jump();
});

function startLevel(levelId) {
  const level = levels[levelId];
  level.objects.forEach((obj) => {
    if (obj.type === "ring") {
      npcs.push(
        Sprite({
          ...ringObj,
          x: level.startX + obj.x * 200,
          y: level.props.ring.y,
          dx: level.props.ring.dx,
        })
      );
    }
  });
}

function initSetup(playerImg, spikesImg) {
  let spriteSheet = SpriteSheet({
    image: playerImg,
    frameWidth: 10,
    frameHeight: 10,
    frameMargin: 0,
    animations: {
      // create a named animation: walk
      idle: {
        frames: "0..1", // frames 0 through 9
        frameRate: 2,
      },
      walk: {
        frames: "2..4", // frames 0 through 9
        frameRate: 8,
      },
      jump: {
        frames: "5", // frames 0 through 9
        frameRate: 6,
      },
      dead: {
        frames: "6", // frames 0 through 9
        frameRate: 1,
      },
    },
  });
  player = Sprite({
    width: 50,
    height: 50,
    anchor: { x: 0.5, y: 0.5 },
    onGround: false,
    // use the sprite sheet animations for the sprite
    animations: spriteSheet.animations,
  });

  player.x = 100;
  // platforms[0].x + platforms[0].width / 2;
  player.y = canvas.height - player.height / 2;
  player.playAnimation("walk");

  spikeSpriteSheet = SpriteSheet({
    image: spikesImg,
    frameWidth: 10,
    frameHeight: 10,
    animations: {
      idle: {
        frames: "0",
      },
    },
  });

  ringObj.animations = spikeSpriteSheet.animations;
  // ringObj.animations = ringSpriteSheet.animations;

  setTimeout(() => {
    startLevel(0);
  }, 100);
}
const ringObj = {
  type: "ring",
  y: H - 50,
  width: 50,
  height: 50,
  dx: levels[0].props.ring.dx,
};

function generateRings() {
  const type = Math.random();

  if (type > 0.8) {
    npcs.push(
      Sprite({
        ...ringObj,
        x: canvas.width + 100,
      })
    );
    npcs.push(
      Sprite({
        ...ringObj,
        x: canvas.width + 400,
      })
    );
    npcs.push(
      Sprite({
        ...ringObj,
        x: canvas.width + 600,
      })
    );
  } else {
    npcs.push(
      Sprite({
        ...ringObj,
        x: canvas.width + 100,
      })
    );
  }
}

function reset() {
  player.isDead = false;
  score = 0;
  npcs = [];
  speedFactor = 0;
  ringObj.dx = -2.8;
  startLevel(0);
}
loop.start(); // start the game

function levelUp() {
  ringObj.dx -= 0.3;
  setTimeout(levelUp, 5000);
}

levelUp();
