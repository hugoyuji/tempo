let isExtensionActive = true;

const panels = new Set();
const youtubeHost = window.location.hostname.includes('youtube.com');
const isTikTok = window.location.hostname.endsWith('tiktok.com');

const panelStyles = `
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
  .speed-panel-overlay.hidden-autohide { opacity: 0 !important; pointer-events: none !important; }
  .speed-panel-overlay.dark-mode {
    background-color: rgba(18, 20, 24, 0.18);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.85);
  }
  .speed-panel-overlay.dark-mode .speed-panel-ctrl-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .speed-panel-overlay.light-mode {
    background-color: rgba(255, 255, 255, 0.22);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    color: #ffffff;
  }
  .speed-panel-overlay.light-mode .speed-panel-ctrl-btn {
    background: rgba(255, 255, 255, 0.35);
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .speed-panel-overlay .speed-panel-main-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: move;
  }
  .speed-panel-overlay .speed-panel-ctrl-btn {
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
    transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease,
      margin 0.3s ease, transform 0.3s ease;
  }
  .speed-panel-overlay:hover .speed-panel-ctrl-btn,
  .speed-panel-overlay:focus-within .speed-panel-ctrl-btn {
    max-width: 28px;
    opacity: 1;
    margin: 0 2px;
    transform: scale(1);
    pointer-events: auto !important;
  }
  .speed-panel-overlay .speed-panel-ctrl-btn:active { color: #0088ff !important; }
  .speed-panel-overlay .speed-panel-display {
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

function isDarkMode() {
  return document.documentElement.hasAttribute('dark') ||
    document.body?.classList.contains('dark-theme') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function injectStyles() {
  if (document.getElementById('tempo-speed-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'tempo-speed-panel-styles';
  style.textContent = panelStyles;
  (document.head || document.documentElement).appendChild(style);
}

function getMediaElements(root = document) {
  const media = [];
  if (root instanceof HTMLMediaElement) media.push(root);
  if (typeof root.querySelectorAll === 'function') {
    media.push(...root.querySelectorAll('video, audio'));
  }

  if (!isTikTok) return media;

  const visibleVideos = media.filter((element) => {
    if (element.tagName !== 'VIDEO') return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  });
  visibleVideos.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return br.width * br.height - ar.width * ar.height;
  });
  return visibleVideos.slice(0, 1);
}

function getPlayerContainer(media) {
  if (isTikTok) {
    return media.closest('[data-e2e="video-player"], [class*="DivVideoWrapper"], [class*="video-player"]') || media.parentElement;
  }
  return media.closest('#movie_player, .html5-video-player, .video-js, [data-vjs-player], [data-vjs-video]:not(video):not(audio), [class*="player-container"], [class*="player"]') || media.parentElement;
}

function syncYouTubeUI(rate) {
  if (!youtubeHost) return;
  const formattedRate = Number(rate.toFixed(2));

  try {
    const moviePlayer = document.getElementById('movie_player');
    if (typeof moviePlayer?.setPlaybackRate === 'function') moviePlayer.setPlaybackRate(formattedRate);
  } catch (error) {}

  try {
    sessionStorage.setItem('yt-player-playback-rate', JSON.stringify({
      data: formattedRate.toString(),
      creation: Date.now()
    }));
  } catch (error) {}

  const speedItem = Array.from(document.querySelectorAll('.ytp-menuitem')).find((item) => {
    const icon = item.querySelector('.ytp-menuitem-icon');
    return icon && item.textContent.toLowerCase().includes('velocidade');
  });
  const content = speedItem?.querySelector('.ytp-menuitem-content');
  if (content) content.textContent = formattedRate === 1 ? 'Normal' : `${formattedRate}x`;
}

function updateDisplay(media) {
  const panel = media._tempoPanel;
  const display = panel?.querySelector('.speed-panel-display');
  if (display) display.textContent = formatPlaybackRate(media.playbackRate);
}

function formatPlaybackRate(rate) {
  return Number(rate.toFixed(2)).toString();
}

function normalizePlaybackRate(rate) {
  return Math.round(rate * 10) / 10;
}

function handleMediaAction(media, action) {
  if (!isExtensionActive || !media.isConnected) return;

  if (action === 'increase') {
    media.playbackRate = normalizePlaybackRate(Math.min(media.playbackRate + 0.1, 16));
  } else if (action === 'decrease') {
    media.playbackRate = normalizePlaybackRate(Math.max(media.playbackRate - 0.1, 0.1));
  } else if (action === 'rewind') {
    media.currentTime = Math.max(media.currentTime - 10, 0);
  } else if (action === 'forward') {
    media.currentTime = Math.min(media.currentTime + 10, media.duration || 0);
  }

  syncYouTubeUI(media.playbackRate);
  updateDisplay(media);
}

function makeDraggable(panel) {
  const header = panel.querySelector('.speed-panel-main-bar');
  header.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.stopPropagation();
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = panel.offsetLeft;
    const startTop = panel.offsetTop;

    const onPointerMove = (moveEvent) => {
      panel.style.left = `${startLeft + moveEvent.clientX - startX}px`;
      panel.style.top = `${startTop + moveEvent.clientY - startY}px`;
    };
    const onPointerEnd = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerEnd);
    document.addEventListener('pointercancel', onPointerEnd);
  });
}

function setupAutoHide(panel) {
  let timer;
  let isHovered = false;

  const resetTimer = () => {
    if (!isExtensionActive) return;
    panel.classList.remove('hidden-autohide');
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isExtensionActive && !isHovered) panel.classList.add('hidden-autohide');
    }, 3000);
  };

  panel.addEventListener('mouseenter', () => {
    isHovered = true;
    panel.classList.remove('hidden-autohide');
    clearTimeout(timer);
  });
  panel.addEventListener('mouseleave', () => {
    isHovered = false;
    resetTimer();
  });

  const container = panel.parentElement;
  container.addEventListener('mousemove', resetTimer, { passive: true });
  const onContainerLeave = (event) => {
    if (event.relatedTarget && container.contains(event.relatedTarget)) return;
    if (!isHovered && isExtensionActive) panel.classList.add('hidden-autohide');
  };
  container.addEventListener('mouseleave', onContainerLeave);

  panel._tempoCleanup = () => {
    clearTimeout(timer);
    container.removeEventListener('mousemove', resetTimer);
    container.removeEventListener('mouseleave', onContainerLeave);
  };
  resetTimer();
}

function removePanel(panel) {
  panel._tempoCleanup?.();
  if (panel._tempoMedia?._tempoPanel === panel) delete panel._tempoMedia._tempoPanel;
  if (panel._tempoChangedContainerPosition && panel.parentElement && panel.parentElement.style.position === 'relative') {
    panel.parentElement.style.position = panel._tempoOriginalPosition;
  }
  panels.delete(panel);
  panel.remove();
}

function createPanel(media) {
  if (!isExtensionActive || !media.isConnected || media._tempoPanel?.isConnected) return;

  const container = getPlayerContainer(media);
  if (!container || container.querySelector('.speed-panel-overlay')) return;
  injectStyles();

  const originalPosition = getComputedStyle(container).position;
  const originalInlinePosition = container.style.position;
  if (!isTikTok && originalPosition === 'static') {
    container.style.position = 'relative';
  }

  const panel = document.createElement('div');
  panel.className = `speed-panel-overlay ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;
  panel._tempoMedia = media;
  panel._tempoOriginalPosition = originalInlinePosition;
  panel._tempoChangedContainerPosition = !isTikTok && originalPosition === 'static';
  media._tempoPanel = panel;

  const bar = document.createElement('div');
  bar.className = 'speed-panel-main-bar';
  const controls = [
    ['rewind', '«', 'Voltar 10 segundos'],
    ['decrease', '-', 'Diminuir velocidade'],
    ['display', formatPlaybackRate(media.playbackRate), 'Velocidade atual'],
    ['increase', '+', 'Aumentar velocidade'],
    ['forward', '»', 'Avançar 10 segundos']
  ];

  for (const [action, label, accessibleName] of controls) {
    if (action === 'display') {
      const display = document.createElement('span');
      display.className = 'speed-panel-display';
      display.textContent = label;
      display.setAttribute('aria-label', accessibleName);
      bar.appendChild(display);
      continue;
    }

    const button = document.createElement('button');
    button.className = 'speed-panel-ctrl-btn';
    button.type = 'button';
    button.dataset.act = action;
    button.textContent = label;
    button.setAttribute('aria-label', accessibleName);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      handleMediaAction(media, action);
    });
    bar.appendChild(button);
  }

  panel.appendChild(bar);
  container.appendChild(panel);
  panels.add(panel);
  makeDraggable(panel);
  setupAutoHide(panel);
  const onRateChange = () => updateDisplay(media);
  media.addEventListener('ratechange', onRateChange);
  const cleanup = panel._tempoCleanup;
  panel._tempoCleanup = () => {
    cleanup();
    media.removeEventListener('ratechange', onRateChange);
  };
}

function refreshTheme() {
  const dark = isDarkMode();
  panels.forEach((panel) => {
    panel.classList.toggle('dark-mode', dark);
    panel.classList.toggle('light-mode', !dark);
  });
}

function toggleExtension() {
  isExtensionActive = !isExtensionActive;
  if (!isExtensionActive) {
    panels.forEach(removePanel);
    return;
  }
  getMediaElements().forEach(createPanel);
}

window.addEventListener('keydown', (event) => {
  const activeElement = document.activeElement;
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement?.tagName) || activeElement?.isContentEditable) return;

  const key = event.key.toLowerCase();
  if (key === 'h') {
    toggleExtension();
    return;
  }
  if (!isExtensionActive || (key !== 'a' && key !== 'd')) return;
  getMediaElements().forEach((media) => handleMediaAction(media, key === 'a' ? 'decrease' : 'increase'));
});

const mediaObserver = new MutationObserver((mutations) => {
  let foundMedia = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const media = getMediaElements(node);
      if (media.length) foundMedia = true;
      if (!isTikTok) media.forEach(createPanel);
    }
  }

  for (const panel of panels) {
    if (!panel.isConnected || !panel._tempoMedia?.isConnected) removePanel(panel);
  }
  if (foundMedia) getMediaElements().forEach(createPanel);
});

mediaObserver.observe(document.documentElement, { childList: true, subtree: true });
getMediaElements().forEach(createPanel);

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
colorScheme.addEventListener?.('change', refreshTheme);
const themeObserver = new MutationObserver(refreshTheme);
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'dark'] });
if (document.body) themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'dark'] });
