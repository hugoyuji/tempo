let isExtensionActive = true;

function isDarkMode() {
  return document.documentElement.hasAttribute('dark') ||
         document.body.classList.contains('dark-theme') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function injectStyles() {
  if (document.getElementById('speed-extension-styles')) return;
  const style = document.createElement('style');
  style.id = 'speed-extension-styles';
  style.textContent = `
    .speed-panel-overlay {
      position: absolute;
      top: 15px;
      left: 15px;
      z-index: 2147483647 !important;
      padding: 5px 8px;
      border-radius: 12px;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
      user-select: none;
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      transition: opacity 0.3s ease, background 0.3s, color 0.3s;
      opacity: 1;
      display: inline-block;
      pointer-events: auto !important;
    }

    .speed-panel-overlay.hidden-autohide {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .speed-panel-overlay.dark-mode {
      background-color: rgba(18, 20, 24, 0.18);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      color: rgba(255, 255, 255, 0.85);
    }
    .speed-panel-overlay.dark-mode .ctrl-btn {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .speed-panel-overlay.light-mode {
      background-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      color: #ffffff;
    }
    .speed-panel-overlay.light-mode .ctrl-btn {
      background: rgba(255, 255, 255, 0.35);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .main-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;
    }

    .speed-panel-overlay .ctrl-btn {
      border: none;
      width: 24px;
      height: 24px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 0;
      opacity: 0;
      margin: 0;
      padding: 0;
      transform: scale(0.6);
      overflow: hidden;
      pointer-events: none;
      transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                  opacity 0.25s ease, 
                  margin 0.3s ease, 
                  transform 0.3s ease;
    }

    .speed-panel-overlay:hover .ctrl-btn {
      max-width: 28px;
      opacity: 1;
      margin: 0 2px;
      transform: scale(1);
      pointer-events: auto !important;
    }

    .ctrl-btn:active {
      color: #0088ff !important;
    }

    .speed-display {
      font-size: 13px;
      font-weight: bold;
      min-width: 38px;
      text-align: center;
      cursor: move;
      padding: 2px 6px;
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
  `;
  document.head.appendChild(style);
}

function getMediaElements() {
  return Array.from(document.querySelectorAll('video, audio'));
}

function getPlayerContainer(media) {
  return media.closest('#movie_player, .html5-video-player, .video-js, [class*="player-container"], [class*="player"]') || media.parentElement;
}

function syncYouTubeUI(rate) {
  if (!window.location.hostname.includes('youtube.com')) return;

  const formattedRate = Number(rate.toFixed(2));

  try {
    const moviePlayer = document.getElementById('movie_player');
    if (moviePlayer && typeof moviePlayer.setPlaybackRate === 'function') {
      moviePlayer.setPlaybackRate(formattedRate);
    }
  } catch (e) {}

  try {
    sessionStorage.setItem('yt-player-playback-rate', JSON.stringify({
      data: formattedRate.toString(),
      creation: Date.now()
    }));
  } catch (e) {}

  const speedItem = Array.from(document.querySelectorAll('.ytp-menuitem')).find(item => {
    const icon = item.querySelector('.ytp-menuitem-icon');
    return icon && icon.innerHTML.includes('path') && item.textContent.toLowerCase().includes('velocidade');
  });

  if (speedItem) {
    const content = speedItem.querySelector('.ytp-menuitem-content');
    if (content) {
      content.innerText = formattedRate === 1 ? 'Normal' : `${formattedRate}x`;
    }
  }
}

function handleMediaAction(media, action) {
  if (!isExtensionActive) return;

  if (action === 'increase') {
    media.playbackRate = Math.min(media.playbackRate + 0.1, 16);
  } else if (action === 'decrease') {
    media.playbackRate = Math.max(media.playbackRate - 0.1, 0.1);
  } else if (action === 'rewind') {
    media.currentTime = Math.max(media.currentTime - 10, 0);
  } else if (action === 'forward') {
    media.currentTime = Math.min(media.currentTime + 10, media.duration || 0);
  }
  
  syncYouTubeUI(media.playbackRate);
  updateDisplay(media);
}

function createPanel(media) {
  if (!isExtensionActive) return;
  injectStyles();

  const container = getPlayerContainer(media);
  if (!container || container.querySelector('.speed-panel-overlay')) return;

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const panel = document.createElement('div');
  const themeClass = isDarkMode() ? 'dark-mode' : 'light-mode';
  panel.className = `speed-panel-overlay ${themeClass}`;

  panel.innerHTML = `
    <div class="main-bar">
      <button class="ctrl-btn" data-act="rewind">«</button>
      <button class="ctrl-btn" data-act="decrease">-</button>
      <span class="speed-display">${media.playbackRate.toFixed(2)}</span>
      <button class="ctrl-btn" data-act="increase">+</button>
      <button class="ctrl-btn" data-act="forward">»</button>
    </div>
  `;

  container.appendChild(panel);
  makeDraggable(panel);

  panel.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const action = btn.getAttribute('data-act');
      handleMediaAction(media, action);
    });
  });

  setupAutoHide(container, panel);
}

function makeDraggable(el) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = el.querySelector('.main-bar');

  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;

    e.stopPropagation();
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;

    const onMouseMove = (e) => {
      e.stopPropagation();
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      el.style.top = (el.offsetTop - pos2) + "px";
      el.style.left = (el.offsetLeft - pos1) + "px";
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function setupAutoHide(container, panel) {
  panel._isHovered = false;

  panel.addEventListener('mouseenter', () => {
    panel._isHovered = true;
    panel.classList.remove('hidden-autohide');
    if (panel._autohideTimer) clearTimeout(panel._autohideTimer);
  });

  panel.addEventListener('mouseleave', () => {
    panel._isHovered = false;
    resetTimer();
  });

  const resetTimer = () => {
    if (!isExtensionActive) return;
    panel.classList.remove('hidden-autohide');

    if (panel._autohideTimer) clearTimeout(panel._autohideTimer);

    panel._autohideTimer = setTimeout(() => {
      if (isExtensionActive && !panel._isHovered) {
        panel.classList.add('hidden-autohide');
      }
    }, 3000);
  };

  if (!container._hasSpeedOverlayEvents) {
    container._hasSpeedOverlayEvents = true;

    container.addEventListener('mousemove', () => {
      const panels = container.querySelectorAll('.speed-panel-overlay');
      panels.forEach(p => {
        if (p._resetTimer) p._resetTimer();
      });
    });

    container.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget && container.contains(e.relatedTarget)) return;

      if (!isExtensionActive) return;
      const panels = container.querySelectorAll('.speed-panel-overlay');
      panels.forEach(p => {
        if (!p._isHovered) {
          p.classList.add('hidden-autohide');
        }
      });
    });
  }

  panel._resetTimer = resetTimer;
  resetTimer();
}

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) return;

  const key = e.key.toLowerCase();

  if (key === 'h') {
    isExtensionActive = !isExtensionActive;
    if (!isExtensionActive) {
      document.querySelectorAll('.speed-panel-overlay').forEach(p => {
        if (p._autohideTimer) clearTimeout(p._autohideTimer);
        p.remove();
      });
    } else {
      getMediaElements().forEach(createPanel);
    }
    return;
  }

  if (!isExtensionActive) return;

  const mediaElements = getMediaElements();
  if (key === 'a') {
    mediaElements.forEach(m => handleMediaAction(m, 'decrease'));
  } else if (key === 'd') {
    mediaElements.forEach(m => handleMediaAction(m, 'increase'));
  }
});

function updateDisplay(media) {
  const container = getPlayerContainer(media);
  if (!container) return;
  const display = container.querySelector('.speed-display');
  if (display) display.innerText = media.playbackRate.toFixed(2);
  
  chrome.runtime.sendMessage({ speed: media.playbackRate.toFixed(2) }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message) => {
  if (!isExtensionActive) return;
  if (message.action) {
    const mediaElements = getMediaElements();
    mediaElements.forEach(media => handleMediaAction(media, message.action));
  }
});

setInterval(() => {
  if (!isExtensionActive) return;
  const dark = isDarkMode();
  document.querySelectorAll('.speed-panel-overlay').forEach(p => {
    p.classList.toggle('dark-mode', dark);
    p.classList.toggle('light-mode', !dark);
  });
  getMediaElements().forEach(createPanel);
}, 1000);