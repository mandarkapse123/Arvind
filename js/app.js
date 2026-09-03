/**
 * App.js — Main Orchestrator
 * Manages the 3-stage flow: Hidden Object → Quiz → Magazine
 * Handles loading screen, audio toggle, stage transitions, and replay.
 */
window.App = (function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────
  let currentStage = 0; // 0 = loading, 1 = hidden object, 2 = quiz, 3 = magazine
  let audioContext = null;
  let isMuted = true;
  let ambientOsc = null;
  let ambientGain = null;

  // ─── DOM Cache ────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Loading Screen ──────────────────────────────────────────────────
  function initLoading() {
    const fill = $('.loading-bar-fill');
    const loadingScreen = $('#loading-screen');
    if (!fill || !loadingScreen) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        fill.style.width = '100%';
        setTimeout(() => {
          loadingScreen.classList.add('loaded');
          setTimeout(() => {
            loadingScreen.style.display = 'none';
            enterStage(1);
          }, 800);
        }, 400);
      } else {
        fill.style.width = progress + '%';
      }
    }, 200);
  }

  // ─── Shared Global Audio System ───────────────────────────────────────
  window.getSharedAudioContext = function() {
    if (!window._sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        window._sharedAudioCtx = new AudioCtx();
      }
    }
    if (window._sharedAudioCtx && window._sharedAudioCtx.state === 'suspended') {
      window._sharedAudioCtx.resume().catch(() => {});
    }
    return window._sharedAudioCtx;
  };

  function initAudio() {
    // Global user-gesture audio unlocking
    ['click', 'touchstart', 'keydown', 'mousedown'].forEach(evt => {
      document.addEventListener(evt, () => {
        window.getSharedAudioContext();
      }, { passive: true });
    });

    const toggle = $('.audio-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      isMuted = !isMuted;
      toggle.classList.toggle('paused', isMuted);

      if (isMuted) {
        if (window.Magazine && window.Magazine.stopMelody) {
          window.Magazine.stopMelody();
        }
        stopAmbient();
      } else {
        if (currentStage === 3 && window.Magazine && window.Magazine.playMelody) {
          window.Magazine.playMelody();
        } else {
          playAmbient();
        }
      }
    });
  }

  function getAudioContext() {
    return window.getSharedAudioContext();
  }

  function playAmbient() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      // Create a warm ambient pad
      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0, ctx.currentTime);
      ambientGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
      ambientGain.connect(ctx.destination);

      // Layered sine waves for a warm pad
      const freqs = [130.81, 164.81, 196.00, 261.63]; // C3, E3, G3, C4
      ambientOsc = freqs.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.25;

        osc.connect(oscGain);
        oscGain.connect(ambientGain);
        osc.start();
        return osc;
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  function stopAmbient() {
    try {
      if (ambientGain) {
        const ctx = getAudioContext();
        if (ctx) ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => {
          if (ambientOsc) {
            ambientOsc.forEach((osc) => {
              try { osc.stop(); } catch (e) { /* already stopped */ }
            });
            ambientOsc = null;
          }
          ambientGain = null;
        }, 1200);
      }
    } catch (e) {
      console.warn('Error stopping audio:', e);
    }
  }

  // ─── Stage Transitions ──────────────────────────────────────────────
  function enterStage(stage) {
    currentStage = stage;

    switch (stage) {
      case 1:
        showStage1();
        break;
      case 2:
        showStage2();
        break;
      case 3:
        showStage3();
        break;
    }
  }

  function showStage1() {
    const el = $('#stage-hidden-object');
    if (!el) return;
    el.style.display = 'block';
    el.style.opacity = '0';

    gsap.to(el, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
    });

    // Initialize hidden object game
    if (window.HiddenObjectGame) {
      window.HiddenObjectGame.onComplete = () => {
        transitionToStage(2);
      };
      window.HiddenObjectGame.init();
    }
  }

  function showStage2() {
    if (window.QuizGame) {
      window.QuizGame.init(() => {
        transitionToStage(3);
      });
      window.QuizGame.show();
    }
  }

  function showStage3() {
    // Unmute audio indicator for magazine music
    const toggle = $('.audio-toggle');
    if (toggle) {
      toggle.classList.remove('paused');
      isMuted = false;
    }

    if (window.Magazine) {
      window.Magazine.init();
      window.Magazine.show();
    }
  }

  function transitionToStage(nextStage) {
    if (nextStage === 3) {
      // Stage 2 has already faded out its own UI cleanly
      const quizEl = $('#stage-quiz');
      if (quizEl) {
        quizEl.style.display = 'none';
      }
      enterStage(3);
      return;
    }

    // Get current stage element
    let currentEl = null;
    switch (currentStage) {
      case 1:
        currentEl = $('#stage-hidden-object');
        break;
      case 2:
        currentEl = $('#stage-quiz');
        break;
    }

    if (currentEl) {
      gsap.to(currentEl, {
        opacity: 0,
        scale: 0.95,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          currentEl.style.display = 'none';
          currentEl.style.transform = '';
          currentEl.style.opacity = '';
          enterStage(nextStage);
        },
      });
    } else {
      enterStage(nextStage);
    }
  }

  // ─── Replay ──────────────────────────────────────────────────────────
  function replay() {
    // Hide all stages
    ['#stage-hidden-object', '#stage-quiz', '#stage-magazine'].forEach((sel) => {
      const el = $(sel);
      if (el) {
        el.style.display = 'none';
        el.style.opacity = '';
        el.style.transform = '';
      }
    });

    // Reset modules
    if (window.HiddenObjectGame) window.HiddenObjectGame.reset();
    if (window.QuizGame) window.QuizGame.reset();
    if (window.Magazine) window.Magazine.reset();

    // Start over
    currentStage = 0;
    enterStage(1);
  }

  // ─── Grain Effect ────────────────────────────────────────────────────
  function initGrain() {
    const grain = $('.grain-overlay');
    if (!grain) return;

    // Animate grain by shifting background position for a subtle flicker
    let frame = 0;
    function animateGrain() {
      frame++;
      grain.style.transform = `translate(${Math.random() * 10}px, ${Math.random() * 10}px)`;
      if (frame % 3 === 0) {
        requestAnimationFrame(animateGrain);
      } else {
        setTimeout(() => requestAnimationFrame(animateGrain), 50);
      }
    }
    animateGrain();
  }

  // ─── Cursor Effects ──────────────────────────────────────────────────
  function initCursorEffects() {
    // Subtle glow that follows the cursor on dark backgrounds
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.cssText = `
      position: fixed;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(233,69,96,0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 1;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
      gsap.to(glow, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.6,
        ease: 'power2.out',
      });
    });
  }

  // ─── Initialize ──────────────────────────────────────────────────────
  function init() {
    initGrain();
    initAudio();
    initCursorEffects();
    initLoading();
  }

  // ─── DOM Ready ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    replay: replay,
    enterStage: enterStage,
    getAudioContext: getAudioContext,
    get isMuted() { return isMuted; },
  };
})();
