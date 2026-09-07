(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  const playerScoreEl = document.getElementById("playerScore");
  const cpuScoreEl = document.getElementById("cpuScore");
  const statusText = document.getElementById("statusText");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");
  const difficultySelect = document.getElementById("difficulty");

  const WIN_SCORE = 5;
  const PADDLE_W = 12;
  const PADDLE_H = 90;
  const BALL_SIZE = 12;

  const DIFFICULTIES = {
    easy: { cpuSpeed: 4.2, cpuReaction: 0.06 },
    normal: { cpuSpeed: 5.6, cpuReaction: 0.1 },
    hard: { cpuSpeed: 7.2, cpuReaction: 0.16 },
  };

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    difficulty: "normal",
    player: { y: H / 2 - PADDLE_H / 2, score: 0 },
    cpu: { y: H / 2 - PADDLE_H / 2, score: 0 },
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 6 },
    keys: { up: false, down: false },
    lastRallyHitCount: 0,
  };

  function resetBall(direction) {
    state.ball.x = W / 2;
    state.ball.y = H / 2;
    state.ball.speed = 6;
    const angle = (Math.random() * 0.6 - 0.3);
    state.ball.vx = direction * state.ball.speed * Math.cos(angle);
    state.ball.vy = state.ball.speed * Math.sin(angle);
    state.lastRallyHitCount = 0;
  }

  function resetMatch() {
    state.player.score = 0;
    state.cpu.score = 0;
    state.player.y = H / 2 - PADDLE_H / 2;
    state.cpu.y = H / 2 - PADDLE_H / 2;
    state.gameOver = false;
    updateScoreUI();
    resetBall(Math.random() < 0.5 ? 1 : -1);
  }

  function updateScoreUI() {
    playerScoreEl.textContent = state.player.score;
    cpuScoreEl.textContent = state.cpu.score;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Input: keyboard
  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") state.keys.up = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") state.keys.down = true;
    if (e.code === "Space") {
      e.preventDefault();
      if (!state.running) startGame();
      else togglePause();
    }
    if (e.code === "KeyP") togglePause();
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") state.keys.up = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") state.keys.down = false;
  });

  // Input: mouse
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    const y = (e.clientY - rect.top) * scaleY;
    state.player.y = clamp(y - PADDLE_H / 2, 0, H - PADDLE_H);
  });

  // Input: mouse wheel
  const WHEEL_SENSITIVITY = 0.6;
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      state.player.y = clamp(state.player.y + e.deltaY * WHEEL_SENSITIVITY, 0, H - PADDLE_H);
    },
    { passive: false }
  );

  startBtn.addEventListener("click", () => startGame());

  function startGame() {
    state.difficulty = difficultySelect.value;
    resetMatch();
    state.running = true;
    state.paused = false;
    overlay.hidden = true;
    statusText.textContent = "プレイ中";
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    state.paused = !state.paused;
    statusText.textContent = state.paused ? "一時停止中 (P)" : "プレイ中";
  }

  function endGame() {
    state.running = false;
    state.gameOver = true;
    const playerWon = state.player.score >= WIN_SCORE;
    overlayTitle.textContent = playerWon ? "🎉 あなたの勝ち！" : "CPUの勝ち";
    overlayText.innerHTML = `最終スコア ${state.player.score} - ${state.cpu.score}<br>もう一度プレイしますか？`;
    startBtn.textContent = "もう一度 (Space)";
    overlay.hidden = false;
    statusText.textContent = "ゲーム終了";
  }

  function updatePlayer() {
    const speed = 8;
    if (state.keys.up) state.player.y -= speed;
    if (state.keys.down) state.player.y += speed;
    state.player.y = clamp(state.player.y, 0, H - PADDLE_H);
  }

  function updateCpu() {
    const diff = DIFFICULTIES[state.difficulty];
    const targetY = state.ball.y - PADDLE_H / 2;
    const center = state.cpu.y + (targetY - state.cpu.y) * diff.cpuReaction;
    const dy = clamp(center - state.cpu.y, -diff.cpuSpeed, diff.cpuSpeed);
    state.cpu.y = clamp(state.cpu.y + dy, 0, H - PADDLE_H);
  }

  function updateBall() {
    const b = state.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.y <= 0) {
      b.y = 0;
      b.vy *= -1;
    } else if (b.y + BALL_SIZE >= H) {
      b.y = H - BALL_SIZE;
      b.vy *= -1;
    }

    // Player paddle (left side)
    if (
      b.vx < 0 &&
      b.x <= PADDLE_W + 20 &&
      b.x + BALL_SIZE >= 20 &&
      b.y + BALL_SIZE >= state.player.y &&
      b.y <= state.player.y + PADDLE_H
    ) {
      b.x = 20 + PADDLE_W;
      const hitPos = (b.y + BALL_SIZE / 2 - (state.player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      b.speed = Math.min(b.speed + 0.4, 14);
      const angle = hitPos * 0.9;
      b.vx = b.speed * Math.cos(angle);
      b.vy = b.speed * Math.sin(angle);
      state.lastRallyHitCount++;
    }

    // CPU paddle (right side)
    if (
      b.vx > 0 &&
      b.x + BALL_SIZE >= W - PADDLE_W - 20 &&
      b.x <= W - 20 &&
      b.y + BALL_SIZE >= state.cpu.y &&
      b.y <= state.cpu.y + PADDLE_H
    ) {
      b.x = W - 20 - PADDLE_W - BALL_SIZE;
      const hitPos = (b.y + BALL_SIZE / 2 - (state.cpu.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      b.speed = Math.min(b.speed + 0.4, 14);
      const angle = hitPos * 0.9;
      b.vx = -b.speed * Math.cos(angle);
      b.vy = b.speed * Math.sin(angle);
      state.lastRallyHitCount++;
    }

    if (b.x < -BALL_SIZE) {
      state.cpu.score++;
      updateScoreUI();
      if (state.cpu.score >= WIN_SCORE) endGame();
      else resetBall(1);
    } else if (b.x > W + BALL_SIZE) {
      state.player.score++;
      updateScoreUI();
      if (state.player.score >= WIN_SCORE) endGame();
      else resetBall(-1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // center line
    ctx.strokeStyle = "rgba(142,160,194,0.35)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // paddles
    ctx.fillStyle = "#5eead4";
    ctx.fillRect(20, state.player.y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = "#f472b6";
    ctx.fillRect(W - 20 - PADDLE_W, state.cpu.y, PADDLE_W, PADDLE_H);

    // ball
    ctx.fillStyle = "#e6edf7";
    ctx.beginPath();
    ctx.arc(state.ball.x + BALL_SIZE / 2, state.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    if (state.paused) {
      ctx.fillStyle = "rgba(6,10,20,0.5)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e6edf7";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("一時停止中", W / 2, H / 2);
    }
  }

  function loop() {
    if (state.running && !state.paused && !state.gameOver) {
      updatePlayer();
      updateCpu();
      updateBall();
    }
    draw();
    requestAnimationFrame(loop);
  }

  // initial static draw
  draw();
  requestAnimationFrame(loop);
})();
