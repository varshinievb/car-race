import React, { useEffect, useRef, useState } from "react";
import "./Game.css";

export default function Game() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  const bgMusicRef = useRef(null);
  const crashRef = useRef(null);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    // Create audio objects once
    bgMusicRef.current = new Audio("/music.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.35;

    crashRef.current = new Audio("/Crash.mp3");
    crashRef.current.volume = 1.0;

    // try to autoplay background music (may be blocked until user gesture)
    bgMusicRef.current.play().catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    // Fullscreen canvas sizing
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Images
    const playerImg = new Image();
    playerImg.src = "/car1.png";

    const enemyImg = new Image();
    enemyImg.src = "/car2.png";

    // Game state (inside effect so we don't re-create loop)
    let rafId = null;
    let lastTime = performance.now();
    let timeScale = 1; // slow-motion factor on collision
    let slowTimeout = null;

    const player = {
      w: 80,
      h: 120,
      x: window.innerWidth / 2 - 40,
      y: window.innerHeight - 180,
      vx: 0,
      vy: 0,
    };

    const enemies = [
      { w: 80, h: 120, x: Math.random() * (canvas.width - 160) + 80, y: -300, speed: 6 },
    ];

    let running = true;

    // Keyboard input
    const keys = {};
    function onKeyDown(e) { keys[e.key] = true; }
    function onKeyUp(e) { keys[e.key] = false; }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // spawn new enemy
    function spawnEnemy() {
      enemies.push({
        w: 80,
        h: 120,
        x: Math.random() * (canvas.width - 160) + 80,
        y: -300 - Math.random() * 400,
        speed: 6 + Math.random() * 4,
      });
    }

    // collision helper
    function rectsIntersect(a, b) {
      return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
    }

    // handle collision: slow-motion then show game over
    function handleCollision() {
      // play crash
      if (crashRef.current) {
        try { crashRef.current.play(); } catch {}
      }

      timeScale = 0.2;
      running = false;

      // after a short slow-motion period, show game over
      slowTimeout = setTimeout(() => {
        setGameOver(true);
        try { bgMusicRef.current && bgMusicRef.current.pause(); } catch {}
      }, 850);
    }

    // update game physics
    function update(dt) {
      const delta = dt / 16.666; // baseline ~60fps step
      const scaled = delta * timeScale;

      // player controls
      const ACC = 0.9;
      const MAX_SPEED = 14;

      if (keys["ArrowLeft"]) player.vx = Math.max(player.vx - ACC * scaled, -MAX_SPEED);
      else if (keys["ArrowRight"]) player.vx = Math.min(player.vx + ACC * scaled, MAX_SPEED);
      else player.vx *= 0.88;

      if (keys["ArrowUp"]) player.vy = Math.max(player.vy - 0.6 * scaled, -8);
      else if (keys["ArrowDown"]) player.vy = Math.min(player.vy + 0.6 * scaled, 8);
      else player.vy *= 0.9;

      player.x += player.vx * scaled;
      player.y += player.vy * scaled;

      // clamp to viewport
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

      // update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += (e.speed * scaled) * (1 + (score * 0.01));

        if (e.y > canvas.height + 200) {
          // award score
          setScore((s) => s + 10);
          enemies.splice(i, 1);
          spawnEnemy();
          if (Math.random() > 0.6) spawnEnemy();
        }
      }
    }

    // drawing
    function draw() {
      // video background (stretched)
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // road overlay (so enemies and player are clear)
      const roadW = Math.min(420, canvas.width * 0.45);
      const roadX = canvas.width / 2 - roadW / 2;
      ctx.fillStyle = "#6d6d6d";
      ctx.fillRect(roadX, 0, roadW, canvas.height);

      // dashed center line
      ctx.strokeStyle = "white";
      ctx.lineWidth = Math.max(6, Math.round(roadW * 0.03));
      ctx.setLineDash([0, 40]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // draw enemies
      enemies.forEach((e) => {
        ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
      });

      // draw player
      ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

      // score HUD
      ctx.fillStyle = "white";
      ctx.font = "28px Arial";
      ctx.fillText(`Score: ${score}`, 20, 40);
    }

    // main loop
    function loop(timeNow) {
      const dt = timeNow - lastTime;
      lastTime = timeNow;

      if (!gameOver) {
        if (running) update(dt);

        // check collisions only while running
        for (const e of enemies) {
          const a = { x: player.x, y: player.y, w: player.w, h: player.h };
          const b = { x: e.x, y: e.y, w: e.w, h: e.h };
          if (rectsIntersect(a, b)) {
            handleCollision();
            break;
          }
        }
      }

      // always draw last frame
      draw();

      if (!gameOver) rafId = requestAnimationFrame(loop);
    }

    // Start playing video (muted) and music (may be blocked)
    if (video) {
      video.play().catch(() => {});
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.play().catch(() => {});
    }

    // One initial enemy if none
    if (enemies.length === 0) spawnEnemy();

    // start RAF
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);

    // cleanup
    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (slowTimeout) clearTimeout(slowTimeout);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      try {
        if (bgMusicRef.current) {
          bgMusicRef.current.pause();
          bgMusicRef.current.currentTime = 0;
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]); // only re-run when gameOver toggles

  // restart: reload page to reset everything simply
  function restart() {
    window.location.reload();
  }

  return (
    <div className="game-root">
      {/* visible video behind canvas — helps autoplay on mobile */}
      <video
        ref={videoRef}
        className="bg-video"
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hud score-hud">Score: {score}</div>

      {gameOver && (
        <div className="game-over-ui">
          <img src="/collision.png" alt="crash" className="crash-img" />
          <h1>GAME OVER</h1>
          <p className="final-score">Score: {score}</p>
          <div className="go-buttons">
            <button className="btn restart" onClick={restart}>
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
