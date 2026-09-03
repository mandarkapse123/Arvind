window.Magazine = (function() {
  let pageFlip = null;
  let isInitialized = false;
  let hasReachedBirthdayPage = false;
  let hasTriggeredFinale = false;
  
  let flipbook = null;
  let magazineContainer = null;
  let finaleModal = null;
  let resizeTimeout = null;

  function playPageTurn() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        const decay = Math.sin((i / bufferSize) * Math.PI);
        data[i] = lastOut * decay * 3.5;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start();
    } catch (e) { /* silent */ }
  }

  function playBirthdayChime() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const notes = [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.15 }, // E5
        { freq: 783.99, time: 0.3 },  // G5
        { freq: 1046.50, time: 0.45 } // C6
      ];

      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + 0.22);
      });
    } catch (e) { /* silent */ }
  }

  let songAudio = null;
  let isSongPlaying = false;

  function playSong() {
    try {
      if (!songAudio) {
        songAudio = document.getElementById('magazine-song-audio');
        if (!songAudio) {
          songAudio = new Audio('assets/sounds/youre-beautiful.mp3');
          songAudio.id = 'magazine-song-audio';
          document.body.appendChild(songAudio);
        }
      }

      songAudio.loop = false; // Play once only, not on loop
      
      songAudio.onended = () => {
        isSongPlaying = false;
        const toggle = document.querySelector('.audio-toggle');
        if (toggle) toggle.classList.add('paused');
      };

      isSongPlaying = true;
      songAudio.volume = 0;
      
      const playPromise = songAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (window.gsap) {
            gsap.to(songAudio, { volume: 0.85, duration: 2.0, ease: 'power1.out' });
          } else {
            songAudio.volume = 0.85;
          }
        }).catch((e) => {
          console.log("Audio play blocked pending user interaction:", e);
        });
      }
    } catch (e) {
      console.warn("Song play error:", e);
    }
  }

  function stopSong() {
    isSongPlaying = false;
    if (songAudio) {
      if (window.gsap) {
        gsap.to(songAudio, {
          volume: 0,
          duration: 0.8,
          ease: 'power1.out',
          onComplete: () => {
            songAudio.pause();
            songAudio.currentTime = 0;
          }
        });
      } else {
        songAudio.pause();
        songAudio.currentTime = 0;
      }
    }
  }

  function toggleSong(enable) {
    if (enable) {
      playSong();
    } else {
      stopSong();
    }
  }

  function playFlashSound() {
    const ctx = getMagAudioCtx();
    if (!ctx) return;
    
    try {
      if (ctx.state === 'suspended') ctx.resume();
      
      // Rising ethereal chime
      [440, 554.37, 659.25, 880, 1108.7].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.32);
      });
    } catch (e) { /* silent */ }
  }

  function triggerFinaleReveal() {
    finaleModal = document.getElementById('finale-superpower-modal');
    if (!finaleModal) return;

    playFlashSound();

    if (window.confetti) {
      confetti({ particleCount: 160, spread: 110, origin: { y: 0.4 }, colors: ['#f5a623', '#e94560', '#00d2d3', '#ffffff'] });
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 120, origin: { y: 0.5 }, colors: ['#f5a623', '#ffffff'] });
      }, 300);
    }

    const flashOverlay = document.getElementById('flash-overlay');
    if (flashOverlay) {
      flashOverlay.style.display = 'block';
      gsap.fromTo(flashOverlay, { opacity: 0.9 }, { opacity: 0, duration: 1.0, onComplete: () => { flashOverlay.style.display = 'none'; } });
    }

    // Ensure photo element is refreshed and displayed
    const photoImg = document.getElementById('superpower-photo-img');
    if (photoImg) {
      photoImg.src = 'assets/images/arvind.jpg';
    }

    finaleModal.style.display = 'flex';
    finaleModal.style.zIndex = '999999';
    gsap.killTweensOf(finaleModal);
    gsap.fromTo(finaleModal, 
      { opacity: 0, scale: 0.85, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.4)', delay: 0.15 }
    );
  }

  function closeFinaleModal() {
    if (!finaleModal) return;
    gsap.killTweensOf(finaleModal);
    gsap.to(finaleModal, {
      opacity: 0,
      scale: 0.9,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        finaleModal.style.display = 'none';
        hasTriggeredFinale = false;
      }
    });
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeFinaleModal();
      return;
    }

    if (!pageFlip) return;
    
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      pageFlip.flipNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      pageFlip.flipPrev();
    }
  }

  function handleResize() {
    if (!isInitialized || !pageFlip) return;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (pageFlip) {
        pageFlip.update();
      }
    }, 200);
  }

  return {
    init: function() {
      flipbook = document.getElementById('flipbook');
      magazineContainer = document.getElementById('magazine-container');
      finaleModal = document.getElementById('finale-superpower-modal');
      
      document.getElementById('replay-btn')?.addEventListener('click', function() {
        closeFinaleModal();
        if (window.App && window.App.replay) window.App.replay();
      });

      document.getElementById('close-finale-btn')?.addEventListener('click', closeFinaleModal);

      // Close modal on clicking outer backdrop
      finaleModal?.addEventListener('click', function(e) {
        if (e.target === finaleModal) {
          closeFinaleModal();
        }
      });

      document.getElementById('finale-replay-btn')?.addEventListener('click', function() {
        closeFinaleModal();
        if (window.App && window.App.replay) window.App.replay();
      });

      // Interactive Reveal buttons
      document.getElementById('reveal-superpower-btn-p9')?.addEventListener('click', triggerFinaleReveal);
      document.getElementById('reveal-superpower-btn-p10')?.addEventListener('click', triggerFinaleReveal);
      document.getElementById('reveal-superpower-nav-btn')?.addEventListener('click', triggerFinaleReveal);

      // Mobile / Desktop Flip Next & Previous buttons
      document.getElementById('mag-prev-btn')?.addEventListener('click', function() {
        if (pageFlip) pageFlip.flipPrev();
      });
      document.getElementById('mag-next-btn')?.addEventListener('click', function() {
        if (pageFlip) pageFlip.flipNext();
      });

      // Back cover click to reveal finale anytime
      document.querySelector('.page-back-cover')?.addEventListener('click', function() {
        triggerFinaleReveal();
      });

      // User interaction listener to resume audio if browser delayed it
      document.getElementById('stage-magazine')?.addEventListener('click', function() {
        if (!songAudio || songAudio.paused) {
          playSong();
        }
      });

      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('resize', handleResize);
    },

    show: function() {
      const self = this;
      const stageMagazine = document.getElementById('stage-magazine');
      if (stageMagazine) {
        stageMagazine.style.display = 'flex';
        stageMagazine.style.opacity = '1';
      }

      // Directly play the real James Blunt - You're Beautiful MP3 (plays once)
      playSong();

      // Initialize flipbook directly
      requestAnimationFrame(() => {
        self.initFlipbook();
      });
    },
    
    initFlipbook: function() {
      if (!flipbook) return;
      if (isInitialized && pageFlip) return;
      
      try {
        const isMobile = window.innerWidth <= 768;
        const baseWidth = isMobile ? Math.min(480, window.innerWidth - 20) : 550;
        const baseHeight = isMobile ? Math.min(680, window.innerHeight * 0.72) : 720;

        pageFlip = new St.PageFlip(flipbook, {
          width: baseWidth,
          height: baseHeight,
          size: isMobile ? 'fixed' : 'stretch',
          minWidth: 280,
          maxWidth: 700,
          minHeight: 400,
          maxHeight: 900,
          maxShadowOpacity: 0.4,
          showCover: true,
          mobileScrollSupport: true,
          flippingTime: 650,
          usePortrait: isMobile,
          startZIndex: 0,
          autoSize: true,
          drawShadow: true,
          useMouseEvents: true,
          swipeDistance: 20,
          showPageCorners: true,
          disableFlipByClick: false
        });

        pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));
        
        pageFlip.on('flip', (e) => {
          playPageTurn();
          
          // Ensure music is active on page turning
          if (!songAudio || songAudio.paused) {
            playSong();
          }
          
          if (e.data === 9 && !hasReachedBirthdayPage) {
            hasReachedBirthdayPage = true;
            if (window.confetti) {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.35 }, colors: ['#e94560', '#f5a623', '#27ae60'] });
            }
            playBirthdayChime();
          }

          // Finale page reached
          if (e.data >= 9) {
            setTimeout(triggerFinaleReveal, 700);
          }
        });

        isInitialized = true;

        if (magazineContainer) {
          gsap.fromTo(magazineContainer,
            { opacity: 0, scale: 0.94 },
            { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }
          );
        }
        
        const magazineNav = document.querySelector('.magazine-navigation');
        if (magazineNav) {
          magazineNav.style.display = 'block';
          gsap.fromTo(magazineNav, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.3 });
        }

      } catch (err) {
        console.error("Error initializing PageFlip:", err);
      }
    },

    playSong: function() {
      playSong();
    },

    stopSong: function() {
      stopSong();
    },

    playMelody: function() {
      playSong();
    },

    stopMelody: function() {
      stopSong();
    },

    reset: function() {
      stopSong();

      if (pageFlip) {
        try { pageFlip.destroy(); } catch(e) {}
        pageFlip = null;
      }
      isInitialized = false;
      hasReachedBirthdayPage = false;
      hasTriggeredFinale = false;
      
      const stageMagazine = document.getElementById('stage-magazine');
      if (stageMagazine) {
        stageMagazine.style.display = 'none';
      }
      
      const magazineNav = document.querySelector('.magazine-navigation');
      if (magazineNav) {
        magazineNav.style.display = 'none';
      }

      if (finaleModal) {
        finaleModal.style.display = 'none';
        finaleModal.style.opacity = '0';
      }
    }
  };
})();

