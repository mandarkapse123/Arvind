/**
 * Quiz.js — Stage 2: Floating Friendship Quiz with High-Performance Torch
 * Features 120fps RAF tracking and tactile Dribbble-inspired Ripple Toggle
 */
window.QuizGame = (function () {
  'use strict';

  // ─── Object definitions ─────────────────────────────────────────────
  const allObjects = [
    { id: 'bike', emoji: '🏍️', label: 'Stunt Bike' },
    { id: 'music', emoji: '🎵', label: 'Out-of-Tune Anthem' },
    { id: 'fuel', emoji: '⛽', label: 'Empty Petrol Tank' },
    { id: 'cards', emoji: '🃏', label: 'Trump Cards' },
    { id: 'cake', emoji: '🎂', label: 'Birthday Cake' },
    { id: 'clock', emoji: '⏰', label: 'Time Warp' },
  ];

  // ─── Revamped Quiz Questions (5 Punchy Friendship Memories) ─────────
  const questions = [
    {
      question: "What was our legendary stunt chariot for the glorious, gravity-defying fails at Ground Zero?",
      correctId: 'bike',
    },
    {
      question: "What was our unwritten colony tradition to scream out-of-tune at the very top of our lungs?",
      correctId: 'music',
    },
    {
      question: "When the engine sputtered out mid-ride, what ran dry while we paddled coolly with one leg?",
      correctId: 'fuel',
    },
    {
      question: "What was our battlefield weapon of choice to settle afternoon disputes and rule over the juniors?",
      correctId: 'cards',
    },
    {
      question: "What sweet tribute represents celebrating 20 legendary years with the Russian Brother today?",
      correctId: 'cake',
    },
  ];

  // ─── State ──────────────────────────────────────────────────────────
  let currentQuestion = 0;
  let isActive = false;
  let isTorchOn = true;
  let onCompleteCallback = null;

  // ─── RAF Torch Tracking State ───────────────────────────────────────
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isRafPending = false;

  // ─── DOM Cache ──────────────────────────────────────────────────────
  let stageQuiz, questionText, questionNumber;
  let objectGrid, torchContainer, quizFeedback, quizDots, torchToggle;

  // ─── Audio Context ──────────────────────────────────────────────────
  let audioCtx;

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

  // ─── Sound Effects ──────────────────────────────────────────────────
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

  function playCorrect() {
    try {
      const ctx = getCtx();
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch (e) { /* silent */ }
  }

  function playWrong() {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 140;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) { /* silent */ }
  }

  function playUnlock() {
    try {
      const ctx = getCtx();
      const freqs = [392.0, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach(function (freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    } catch (e) { /* silent */ }
  }

  // ─── 120fps Hardware-Synchronized Torch Tracking ────────────────────
  function updateScatteredObjectsIllumination() {
    const items = document.querySelectorAll('.scattered-object-item');
    const torchRadius = 290;

    items.forEach(item => {
      if (item.classList.contains('correct')) {
        item.style.opacity = '1';
        item.style.filter = 'none';
        item.style.background = 'rgba(39, 174, 96, 0.25)';
        item.style.borderColor = '#27ae60';
        item.style.boxShadow = '0 0 35px rgba(39, 174, 96, 0.7)';
        item.style.transform = 'translate(-50%, -50%) scale(1.08)';
        return;
      }

      if (!isTorchOn) {
        item.style.opacity = '0.02';
        item.style.filter = 'blur(6px) grayscale(100%)';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        item.style.boxShadow = 'none';
        item.style.transform = 'translate(-50%, -50%) scale(0.95)';
        return;
      }

      const rect = item.getBoundingClientRect();
      const ix = rect.left + rect.width / 2;
      const iy = rect.top + rect.height / 2;
      const dist = Math.hypot(mouseX - ix, mouseY - iy);

      if (dist < torchRadius) {
        const intensity = Math.max(0, 1 - (dist / torchRadius));
        const curved = Math.pow(intensity, 0.7);

        item.style.opacity = (0.25 + 0.75 * curved).toFixed(3);
        item.style.filter = 'blur(' + (3 * (1 - curved)).toFixed(1) + 'px)';
        item.style.background = 'rgba(255, 255, 255, ' + (0.06 + 0.26 * curved).toFixed(3) + ')';
        item.style.borderColor = 'rgba(255, 255, 255, ' + (0.2 + 0.8 * curved).toFixed(3) + ')';
        item.style.boxShadow = '0 0 ' + (42 * curved).toFixed(0) + 'px rgba(255, 255, 255, ' + (0.75 * curved).toFixed(2) + ')';
        item.style.transform = 'translate(-50%, -50%) scale(' + (0.95 + 0.16 * curved).toFixed(3) + ')';
      } else {
        item.style.opacity = '0.06';
        item.style.filter = 'blur(4px) grayscale(90%)';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        item.style.boxShadow = 'none';
        item.style.transform = 'translate(-50%, -50%) scale(0.95)';
      }
    });
  }

  function handleTorchMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isRafPending) {
      isRafPending = true;
      requestAnimationFrame(updateTorchSpotlight);
    }
  }

  function updateTorchSpotlight() {
    if (torchContainer && isTorchOn) {
      torchContainer.style.setProperty('--torch-x', mouseX + 'px');
      torchContainer.style.setProperty('--torch-y', mouseY + 'px');
    }
    updateScatteredObjectsIllumination();
    isRafPending = false;
  }

  // ─── Ripple Toggle Mechanic (Dribbble-Style) ────────────────────────
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

  function toggleTorch(e) {
    isTorchOn = !isTorchOn;

    if (torchToggle) {
      createRippleEffect(torchToggle, e ? e.clientX : null, e ? e.clientY : null);
      if (isTorchOn) {
        torchToggle.classList.add('active');
        torchToggle.classList.remove('off');
        torchToggle.setAttribute('aria-checked', 'true');
      } else {
        torchToggle.classList.remove('active');
        torchToggle.classList.add('off');
        torchToggle.setAttribute('aria-checked', 'false');
      }
    }

    if (torchContainer) {
      if (isTorchOn) {
        torchContainer.classList.remove('torch-off');
      } else {
        torchContainer.classList.add('torch-off');
      }
    }

    updateScatteredObjectsIllumination();
    playTorchSound(isTorchOn);
  }

  // ─── Scattered Object Placement (Dynamic for Mobile / iPad / Desktop)
  const desktopPositions = [
    { top: '22%', left: '16%' },
    { top: '24%', left: '84%' },
    { top: '56%', left: '16%' },
    { top: '58%', left: '84%' },
    { top: '84%', left: '28%' },
    { top: '84%', left: '72%' }
  ];

  const mobilePositions = [
    { top: '50%', left: '26%' },
    { top: '50%', left: '74%' },
    { top: '65%', left: '26%' },
    { top: '65%', left: '74%' },
    { top: '80%', left: '26%' },
    { top: '80%', left: '74%' }
  ];

  function getScatteredPositions() {
    return (window.innerWidth <= 768) ? mobilePositions : desktopPositions;
  }

  function createObjectGrid() {
    if (!objectGrid) return;
    objectGrid.innerHTML = '';

    // Shuffle objects for dynamic discovery
    const shuffled = allObjects.slice().sort(() => Math.random() - 0.5);
    const positions = getScatteredPositions();

    shuffled.forEach((obj, idx) => {
      const pos = positions[idx % positions.length];
      const item = document.createElement('div');
      item.className = 'scattered-object-item';
      item.setAttribute('data-id', obj.id);
      item.style.top = pos.top;
      item.style.left = pos.left;

      item.innerHTML = `
        <span class="object-emoji">${obj.emoji}</span>
        <span class="object-label">${obj.label}</span>
      `;

      item.addEventListener('click', () => {
        handleObjectClick(obj.id, item);
      });

      objectGrid.appendChild(item);
    });

    updateScatteredObjectsIllumination();
  }

  // ─── Answer Handling ────────────────────────────────────────────────
  function handleObjectClick(objectId, itemEl) {
    if (!isActive) return;

    const correctId = questions[currentQuestion].correctId;

    if (objectId === correctId) {
      // ✓ Correct answer
      itemEl.classList.add('correct');
      playCorrect();
      if (quizFeedback) {
        quizFeedback.textContent = '✓ Correct Memory Recovered!';
        quizFeedback.style.color = '#4CAF50';
      }

      if (quizDots && quizDots[currentQuestion]) {
        quizDots[currentQuestion].classList.remove('active');
        quizDots[currentQuestion].classList.add('completed');
      }

      isActive = false;

      // Advance
      setTimeout(() => {
        currentQuestion++;
        if (currentQuestion >= questions.length) {
          handleComplete();
        } else {
          isActive = true;
          loadQuestion(currentQuestion);
        }
      }, 700);
    } else {
      // ✗ Wrong answer
      itemEl.classList.add('wrong');
      playWrong();
      if (quizFeedback) {
        quizFeedback.textContent = '✗ Search the darkness for another memory!';
        quizFeedback.style.color = '#F44336';
      }

      if (window.gsap && questionText) {
        gsap.fromTo(
          questionText,
          { x: -8 },
          { x: 8, duration: 0.08, yoyo: true, repeat: 4, onComplete: () => gsap.set(questionText, { x: 0 }) }
        );
      }

      setTimeout(() => {
        itemEl.classList.remove('wrong');
        if (quizFeedback) quizFeedback.textContent = '';
      }, 750);
    }
  }

  // ─── Load Question ──────────────────────────────────────────────────
  function loadQuestion(index) {
    if (questionNumber) {
      questionNumber.textContent = `Question ${index + 1} of ${questions.length}`;
    }

    if (window.gsap && questionText) {
      gsap.to(questionText, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        onComplete: () => {
          updateQuestionContent(index);
          gsap.to(questionText, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
        },
      });
    } else {
      updateQuestionContent(index);
    }
  }

  function updateQuestionContent(index) {
    const q = questions[index];
    if (questionText) questionText.textContent = q.question;
    createObjectGrid();

    if (quizFeedback) {
      quizFeedback.textContent = '';
      quizFeedback.className = 'quiz-feedback';
    }

    if (quizDots) {
      quizDots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add('active');
        } else if (i > index) {
          dot.classList.remove('active', 'completed');
        }
      });
    }
  }

  // ─── Complete Handler (Direct Seamless Transition) ──────────────────
  function handleComplete() {
    isActive = false;
    playUnlock();

    if (window.confetti) {
      confetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.45 },
        colors: ['#e94560', '#f5a623', '#27ae60', '#ffffff'],
      });
    }

    // Direct and seamless transition straight to the Magazine!
    if (stageQuiz && window.gsap) {
      gsap.to(stageQuiz, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete: function () {
          stageQuiz.style.display = 'none';
          if (typeof onCompleteCallback === 'function') {
            onCompleteCallback();
          }
        },
      });
    } else {
      if (stageQuiz) stageQuiz.style.display = 'none';
      if (typeof onCompleteCallback === 'function') {
        onCompleteCallback();
      }
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────
  return {
    init: function (onComplete) {
      onCompleteCallback = onComplete;

      stageQuiz = document.getElementById('stage-quiz');
      questionText = document.getElementById('quiz-question-text');
      questionNumber = document.querySelector('.quiz-indicator');
      objectGrid = document.getElementById('object-grid');
      torchContainer = document.getElementById('torch-container');
      quizFeedback = document.getElementById('quiz-feedback');
      quizDots = document.querySelectorAll('.quiz-progress-dots .dot');
      torchToggle = document.getElementById('torch-toggle');

      if (torchContainer) {
        torchContainer.addEventListener('mousemove', handleTorchMove);
        torchContainer.addEventListener('touchstart', function (e) {
          if (e.touches.length > 0) {
            handleTorchMove(e.touches[0]);
          }
        }, { passive: true });
        torchContainer.addEventListener('touchmove', function (e) {
          if (e.touches.length > 0) {
            handleTorchMove(e.touches[0]);
          }
        }, { passive: true });
      }

      if (torchToggle) {
        torchToggle.addEventListener('click', toggleTorch);
      }

      window.addEventListener('resize', function () {
        const items = document.querySelectorAll('.scattered-object-item');
        const positions = getScatteredPositions();
        items.forEach((item, idx) => {
          const pos = positions[idx % positions.length];
          item.style.top = pos.top;
          item.style.left = pos.left;
        });
        updateScatteredObjectsIllumination();
      });
    },

    show: function () {
      if (!stageQuiz) return;
      stageQuiz.style.display = 'flex';
      stageQuiz.style.opacity = '0';

      if (window.gsap) {
        gsap.to(stageQuiz, { opacity: 1, duration: 0.4 });
      } else {
        stageQuiz.style.opacity = '1';
      }

      currentQuestion = 0;
      loadQuestion(currentQuestion);
      isActive = true;
    },

    reset: function () {
      currentQuestion = 0;
      isActive = false;
      isTorchOn = true;

      if (stageQuiz) {
        stageQuiz.style.display = 'none';
      }

      if (quizDots) {
        quizDots.forEach(dot => dot.classList.remove('active', 'completed'));
      }
    },
  };
})();

