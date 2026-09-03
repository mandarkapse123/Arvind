window.HiddenObjectGame = (function() {
  const totalObjects = 6;
  let foundObjects = new Set();
  let isComplete = false;
  let audioCtx = null;

  function getCtx() {
    if (typeof window.getSharedAudioContext === 'function') {
      return window.getSharedAudioContext();
    }
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playDing() {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* silent */ }
  }

  function playSuccess() {
    try {
      const ctx = getCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const startTime = ctx.currentTime + index * 0.12;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch (e) { /* silent */ }
  }

  function updateProgress() {
    const remaining = totalObjects - foundObjects.size;
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
      if (foundObjects.size === 0) {
        progressText.textContent = `${totalObjects} Hidden Memories Remaining`;
      } else if (remaining > 0) {
        progressText.textContent = `${remaining} Hidden ${remaining === 1 ? 'Memory' : 'Memories'} Remaining`;
      } else {
        progressText.textContent = `All ${totalObjects} Memories Found!`;
      }
    }

    const dots = document.querySelectorAll('.progress-bar .progress-dot');
    dots.forEach((dot, index) => {
      if (index < foundObjects.size) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function onHotspotClick(e) {
    const hotspot = e.currentTarget;
    const id = hotspot.getAttribute('data-id') || hotspot.getAttribute('data-label');

    if (hotspot.classList.contains('found')) return;

    hotspot.classList.add('found');
    playDing();

    if (window.gsap) {
      const icon = hotspot.querySelector('.hotspot-icon') || hotspot;
      gsap.fromTo(
        icon,
        { scale: 0, opacity: 0, rotation: -30 },
        { scale: 1.2, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' }
      );

      const ring = document.createElement('div');
      ring.className = 'ring-effect';
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        transform: translate(-50%, -50%);
        border: 2px solid #f5a623;
        border-radius: 50%;
        pointer-events: none;
      `;
      hotspot.appendChild(ring);

      gsap.fromTo(
        ring,
        { scale: 0.5, opacity: 1 },
        {
          scale: 3,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => ring.remove(),
        }
      );
    }

    if (window.confetti) {
      const rect = hotspot.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 14,
        spread: 45,
        origin: { x: x, y: y },
        colors: ['#f5a623', '#e94560', '#ffffff'],
      });
    }

    foundObjects.add(id);
    updateProgress();

    if (foundObjects.size >= totalObjects) {
      handleComplete();
    }
  }

  function handleComplete() {
    if (isComplete) return;
    isComplete = true;

    setTimeout(() => {
      playSuccess();

      if (window.confetti) {
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#e94560', '#f5a623', '#ffffff', '#27ae60'],
        });
      }

      setTimeout(() => {
        const stage = document.getElementById('stage-hidden-object');
        if (stage && window.gsap) {
          gsap.to(stage, {
            opacity: 0,
            scale: 0.95,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
              if (typeof window.HiddenObjectGame.onComplete === 'function') {
                window.HiddenObjectGame.onComplete();
              }
            },
          });
        } else {
          if (typeof window.HiddenObjectGame.onComplete === 'function') {
            window.HiddenObjectGame.onComplete();
          }
        }
      }, 1400);
    }, 400);
  }

  let isTorchOn = false;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isRafPending = false;
  let torchToggleBtn = null;

  function playTorchSound(isOn) {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      if (isOn) {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.1);
      }
      
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* silent */ }
  }

  function createRippleEffect(container, clickX, clickY) {
    const ripple = document.createElement('span');
    ripple.className = 'toggle-ripple-wave';
    
    const rect = container.getBoundingClientRect();
    const x = clickX ? clickX - rect.left : rect.width / 2;
    const y = clickY ? clickY - rect.top : rect.height / 2;
    
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    container.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  function updateHotspotsIllumination() {
    const container = document.getElementById('scene-container');
    if (!container) return;

    const hotspots = document.querySelectorAll('.hotspot');
    const torchRadius = 280;

    hotspots.forEach(hotspot => {
      const icon = hotspot.querySelector('.hotspot-icon');
      if (!icon) return;

      if (hotspot.classList.contains('found')) {
        icon.style.opacity = '1';
        icon.style.transform = 'scale(1)';
        hotspot.style.background = 'rgba(255, 255, 255, 0.2)';
        hotspot.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        hotspot.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.7)';
        return;
      }

      if (!isTorchOn) {
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0)';
        hotspot.style.background = 'transparent';
        hotspot.style.boxShadow = 'none';
        hotspot.style.borderColor = 'transparent';
        return;
      }

      const rect = hotspot.getBoundingClientRect();
      const hx = rect.left + rect.width / 2;
      const hy = rect.top + rect.height / 2;
      const dist = Math.hypot(mouseX - hx, mouseY - hy);

      if (dist < torchRadius) {
        const intensity = Math.max(0, 1 - (dist / torchRadius));
        const curved = Math.pow(intensity, 0.7);

        icon.style.opacity = curved.toFixed(3);
        icon.style.transform = 'scale(' + (0.6 + 0.55 * curved).toFixed(3) + ')';
        hotspot.style.background = 'rgba(255, 255, 255, ' + (0.35 * curved).toFixed(3) + ')';
        hotspot.style.border = '1.5px solid rgba(255, 255, 255, ' + (0.85 * curved).toFixed(3) + ')';
        hotspot.style.boxShadow = '0 0 ' + (36 * curved).toFixed(0) + 'px rgba(255, 255, 255, ' + (0.85 * curved).toFixed(2) + ')';
      } else {
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0)';
        hotspot.style.background = 'transparent';
        hotspot.style.boxShadow = 'none';
        hotspot.style.border = '1px solid transparent';
      }
    });
  }

  function toggleStage1Torch(e) {
    isTorchOn = !isTorchOn;
    const container = document.getElementById('scene-container');

    if (torchToggleBtn) {
      createRippleEffect(torchToggleBtn, e ? e.clientX : null, e ? e.clientY : null);
      if (isTorchOn) {
        torchToggleBtn.classList.add('active');
        torchToggleBtn.classList.remove('off');
        torchToggleBtn.setAttribute('aria-checked', 'true');
      } else {
        torchToggleBtn.classList.remove('active');
        torchToggleBtn.classList.add('off');
        torchToggleBtn.setAttribute('aria-checked', 'false');
      }
    }

    if (container) {
      if (isTorchOn) {
        container.classList.remove('torch-off');
      } else {
        container.classList.add('torch-off');
      }
    }

    updateHotspotsIllumination();
    playTorchSound(isTorchOn);
  }

  function handleSceneTorchMove(e) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX;
    mouseY = e.clientY;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (!isRafPending) {
      isRafPending = true;
      requestAnimationFrame(() => {
        container.style.setProperty('--torch-x', relX + 'px');
        container.style.setProperty('--torch-y', relY + 'px');
        updateHotspotsIllumination();
        isRafPending = false;
      });
    }
  }

  function setupSceneTorch() {
    const container = document.getElementById('scene-container');
    torchToggleBtn = document.getElementById('stage1-torch-toggle');

    if (torchToggleBtn) {
      torchToggleBtn.addEventListener('click', toggleStage1Torch);
    }

    if (container) {
      container.addEventListener('mousemove', handleSceneTorchMove);
      container.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) handleSceneTorchMove(e.touches[0]);
      }, { passive: true });
      container.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) handleSceneTorchMove(e.touches[0]);
      }, { passive: true });
    }

    updateHotspotsIllumination();
  }

  return {
    onComplete: null,

    init: function() {
      const hotspots = document.querySelectorAll('.hotspot');
      hotspots.forEach(hotspot => {
        hotspot.addEventListener('click', onHotspotClick);
      });

      updateProgress();
      setupSceneTorch();
    },

    reset: function() {
      foundObjects.clear();
      isComplete = false;
      isTorchOn = false;

      const container = document.getElementById('scene-container');
      if (container) {
        container.classList.add('torch-off');
      }

      if (torchToggleBtn) {
        torchToggleBtn.classList.remove('active');
        torchToggleBtn.classList.add('off');
        torchToggleBtn.setAttribute('aria-checked', 'false');
      }

      const hotspots = document.querySelectorAll('.hotspot');
      hotspots.forEach(hotspot => {
        hotspot.classList.remove('found');
        const icon = hotspot.querySelector('.hotspot-icon');
        if (icon) {
          icon.style.opacity = '0';
          icon.style.transform = 'scale(0)';
        }
        hotspot.style.background = 'transparent';
        hotspot.style.boxShadow = 'none';
        hotspot.style.borderColor = 'transparent';
      });

      updateProgress();

      const stage = document.getElementById('stage-hidden-object');
      if (stage && window.gsap) {
        gsap.set(stage, { opacity: 1, scale: 1 });
      }
    },
  };
})();


