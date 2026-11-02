(() => {
  'use strict';

  const HOSTNAME = window.location.hostname;
  const IS_YOUTUBE = HOSTNAME.includes('youtube.com');
  const IS_TIKTOK = HOSTNAME.endsWith('tiktok.com');

  const HOST_TAG = 'tempo-panel';
  const RATE_STEP = 0.1;
  const RATE_MIN = 0.1;
  const RATE_MAX = 16;
  const SEEK_SECONDS = 10;
  const AUTOHIDE_MS = 3000;
  const SCAN_DELAY_MS = 150;
  const MIN_VIDEO_WIDTH = 160;
  const MIN_VIDEO_HEIGHT = 90;
  const PANEL_MARGIN = 15;
  const PANEL_MAX_WIDTH = 180;
  const UI_SCALE = 1;

  let isExtensionActive = true;
  let savedOffset = null;
  const controllers = new Map();

  const HOST_STYLE = {
    all: 'initial',
    display: 'block',
    position: 'fixed',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    margin: '0',
    padding: '0',
    border: '0',
    overflow: 'hidden',
    contain: 'layout style',
    'z-index': '2147483647',
    'pointer-events': 'none'
  };

  const PANEL_CSS = `
    *, *::before, *::after { box-sizing: border-box; }

    .panel {
      --s: 1;
      position: absolute;
      left: 0;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(5px * var(--s)) calc(8px * var(--s));
      border-radius: calc(12px * var(--s));
      font-family: Arial, sans-serif;
      cursor: move;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
      transition: opacity 0.3s ease, background 0.3s, color 0.3s;
      opacity: 1;
      pointer-events: auto;
    }

    .panel.hidden { opacity: 0; pointer-events: none; }

    .panel.dark-mode {
      background-color: rgba(18, 20, 24, 0.18);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      color: rgba(255, 255, 255, 0.85);
      --btn-bg: rgba(255, 255, 255, 0.1);
      --btn-fg: rgba(255, 255, 255, 0.8);
      --btn-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .panel.light-mode {
      background-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      color: #ffffff;
      --btn-bg: rgba(255, 255, 255, 0.35);
      --btn-fg: #ffffff;
      --btn-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .display {
      min-width: calc(38px * var(--s));
      padding: calc(2px * var(--s)) calc(6px * var(--s));
      font-size: calc(13px * var(--s));
      font-weight: bold;
      text-align: center;
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
      cursor: move;
    }

    button {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(24px * var(--s));
      height: calc(24px * var(--s));
      max-width: 0;
      margin: 0;
      padding: 0;
      overflow: hidden;
      border-radius: calc(6px * var(--s));
      background: var(--btn-bg);
      color: var(--btn-fg);
      box-shadow: var(--btn-shadow);
      font-family: system-ui, sans-serif;
      font-size: calc(11px * var(--s));
      font-weight: bold;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.6);
      pointer-events: none;
      transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease,
        margin 0.3s ease, transform 0.3s ease;
    }

    .panel:hover button,
    .panel:focus-within button {
      max-width: calc(28px * var(--s));
      margin: 0 calc(2px * var(--s));
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }

    button:active { color: #0088ff; }
    button:focus-visible { outline: 2px solid #0088ff; outline-offset: 1px; }

    @media (prefers-reduced-motion: reduce) {
      .panel, button { transition: none; }
    }
  `;

  let sharedSheet = null;

  function adoptStyles(root) {
    try {
      if (!sharedSheet) {
        sharedSheet = new CSSStyleSheet();
        sharedSheet.replaceSync(PANEL_CSS);
      }
      root.adoptedStyleSheets = [sharedSheet];
    } catch (error) {
      const style = document.createElement('style');
      style.textContent = PANEL_CSS;
      root.appendChild(style);
    }
  }

  function applyImportant(element, styles) {
    for (const [property, value] of Object.entries(styles)) {
      element.style.setProperty(property, value, 'important');
    }
  }

  function isDarkMode() {
    return document.documentElement.hasAttribute('dark') ||
      document.body?.classList.contains('dark-theme') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function refreshTheme() {
    if (!controllers.size) return;
    const dark = isDarkMode();
    for (const controller of controllers.values()) {
      controller.panel.classList.toggle('dark-mode', dark);
      controller.panel.classList.toggle('light-mode', !dark);
    }
  }

  function formatPlaybackRate(rate) {
    const formattedRate = Number(rate.toFixed(2)).toString();
    return formattedRate.includes('.') ? formattedRate : `${formattedRate}.0`;
  }

  function clampRate(rate) {
    return Math.round(Math.min(Math.max(rate, RATE_MIN), RATE_MAX) * 10) / 10;
  }

  function containsDeep(ancestor, node) {
    for (let current = node; current; current = current.parentNode || current.host) {
      if (current === ancestor) return true;
    }
    return false;
  }

  function isUsableRect(rect) {
    return (
      rect.width >= MIN_VIDEO_WIDTH &&
      rect.height >= MIN_VIDEO_HEIGHT &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  function visibleArea(rect) {
    const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    return Math.max(width, 0) * Math.max(height, 0);
  }

  function overlapRatio(a, b) {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (width <= 0 || height <= 0) return 0;
    return (width * height) / (a.width * a.height);
  }

  function measureOrigin(host) {
    host.style.setProperty('transform', 'none', 'important');
    const rect = host.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  function isEditableTarget(event) {
    const target = event.composedPath?.()[0] ?? event.target;
    if (!(target instanceof Element)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }

  function syncYouTubeUI(rate) {
    if (!IS_YOUTUBE) return;
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

  class Controller {
    constructor(media) {
      this.media = media;
      this.offset = savedOffset ? { ...savedOffset } : { x: PANEL_MARGIN, y: PANEL_MARGIN };
      this.origin = { x: 0, y: 0 };
      this.size = { width: 0, height: 0 };
      this.area = 0;
      this.shown = false;
      this.hovered = false;
      this.dragging = false;
      this.hostVisible = true;
      this.timer = 0;
      this.onRateChange = () => this.updateDisplay();

      this.host = document.createElement(HOST_TAG);
      applyImportant(this.host, HOST_STYLE);
      this.root = this.host.attachShadow({ mode: 'closed' });
      adoptStyles(this.root);
      this.buildPanel();
    }

    buildPanel() {
      const panel = document.createElement('div');
      panel.className = `panel ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', 'Controle de velocidade');
      panel.style.setProperty('--s', String(UI_SCALE));
      this.panel = panel;

      const controls = [
        ['rewind', '«', 'Voltar 10 segundos'],
        ['decrease', '-', 'Diminuir velocidade'],
        ['display', formatPlaybackRate(this.media.playbackRate), 'Velocidade atual'],
        ['increase', '+', 'Aumentar velocidade'],
        ['forward', '»', 'Avançar 10 segundos']
      ];

      for (const [action, label, accessibleName] of controls) {
        if (action === 'display') {
          const display = document.createElement('span');
          display.className = 'display';
          display.textContent = label;
          display.setAttribute('aria-label', accessibleName);
          panel.appendChild(display);
          this.display = display;
          continue;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-label', accessibleName);
        button.addEventListener('click', () => this.act(action));
        panel.appendChild(button);
      }

      for (const type of ['click', 'dblclick', 'mouseup']) {
        panel.addEventListener(type, (event) => event.stopPropagation());
      }
      panel.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        event.preventDefault();
      });

      panel.addEventListener('pointerenter', () => {
        this.hovered = true;
        clearTimeout(this.timer);
      });
      panel.addEventListener('pointerleave', () => {
        this.hovered = false;
        this.armTimer();
      });
      panel.addEventListener('pointerdown', (event) => this.startDrag(event));

      this.root.appendChild(panel);
    }

    startDrag(event) {
      event.stopPropagation();
      if (event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();

      const { panel } = this;
      const startX = event.clientX;
      const startY = event.clientY;
      const startOffset = { ...this.offset };
      this.dragging = true;
      panel.setPointerCapture(event.pointerId);

      const onMove = (moveEvent) => {
        this.offset = this.clampOffset({
          x: startOffset.x + moveEvent.clientX - startX,
          y: startOffset.y + moveEvent.clientY - startY
        });
        this.applyOffset();
      };
      const onEnd = (endEvent) => {
        this.dragging = false;
        savedOffset = { ...this.offset };
        try {
          panel.releasePointerCapture(endEvent.pointerId);
        } catch (error) {}
        panel.removeEventListener('pointermove', onMove);
        panel.removeEventListener('pointerup', onEnd);
        panel.removeEventListener('pointercancel', onEnd);
        this.armTimer();
      };

      panel.addEventListener('pointermove', onMove);
      panel.addEventListener('pointerup', onEnd);
      panel.addEventListener('pointercancel', onEnd);
    }

    mount() {
      controllers.set(this.media, this);
      this.media.addEventListener('ratechange', this.onRateChange);
      this.reveal();
    }

    destroy() {
      clearTimeout(this.timer);
      this.media.removeEventListener('ratechange', this.onRateChange);
      this.host.remove();
      controllers.delete(this.media);
    }

    setHostVisible(visible) {
      if (this.hostVisible === visible) return;
      this.hostVisible = visible;
      this.host.style.setProperty('display', visible ? 'block' : 'none', 'important');
    }

    place() {
      const { media, host } = this;
      const rect = media.isConnected ? media.getBoundingClientRect() : null;
      const fullscreen = document.fullscreenElement;
      const hiddenByFullscreen = fullscreen &&
        (fullscreen instanceof HTMLMediaElement || !containsDeep(fullscreen, media));

      if (!rect || hiddenByFullscreen || !isUsableRect(rect)) {
        this.setHostVisible(false);
        return;
      }

      this.setHostVisible(true);
      const parent = fullscreen || document.documentElement;
      if (host.parentNode !== parent) {
        parent.appendChild(host);
        this.origin = measureOrigin(host);
      }

      host.style.setProperty('width', `${rect.width}px`, 'important');
      host.style.setProperty('height', `${rect.height}px`, 'important');
      host.style.setProperty(
        'transform',
        `translate3d(${rect.left - this.origin.x}px, ${rect.top - this.origin.y}px, 0)`,
        'important'
      );

      this.size = { width: rect.width, height: rect.height };
      this.area = visibleArea(rect);
      this.applyOffset();
    }

    clampOffset({ x, y }) {
      const panelWidth = Math.max(this.panel.offsetWidth, PANEL_MAX_WIDTH * UI_SCALE);
      const maxX = Math.max(this.size.width - panelWidth, 0);
      const maxY = Math.max(this.size.height - this.panel.offsetHeight, 0);
      return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) };
    }

    applyOffset() {
      const { x, y } = this.clampOffset(this.offset);
      this.panel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    reveal() {
      if (!isExtensionActive) return;
      this.shown = true;
      this.panel.classList.remove('hidden');
      this.place();
      ensureFrameLoop();
      this.armTimer();
    }

    conceal() {
      this.shown = false;
      this.panel.classList.add('hidden');
    }

    armTimer() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.hovered && !this.dragging) this.conceal();
      }, AUTOHIDE_MS);
    }

    handlePointer(point) {
      const rect = this.media.getBoundingClientRect();
      const inside = point.x >= rect.left && point.x <= rect.right &&
        point.y >= rect.top && point.y <= rect.bottom;
      if (inside) {
        this.reveal();
      } else if (this.shown && !this.hovered && !this.dragging) {
        this.conceal();
      }
    }

    updateDisplay() {
      this.display.textContent = formatPlaybackRate(this.media.playbackRate);
    }

    act(action) {
      const { media } = this;
      if (!isExtensionActive || !media.isConnected) return;

      if (action === 'increase') {
        media.playbackRate = clampRate(media.playbackRate + RATE_STEP);
      } else if (action === 'decrease') {
        media.playbackRate = clampRate(media.playbackRate - RATE_STEP);
      } else if (action === 'rewind') {
        media.currentTime = Math.max(media.currentTime - SEEK_SECONDS, 0);
      } else if (action === 'forward') {
        const target = media.currentTime + SEEK_SECONDS;
        media.currentTime = Number.isFinite(media.duration) ? Math.min(target, media.duration) : target;
      }

      syncYouTubeUI(media.playbackRate);
      this.updateDisplay();
      this.reveal();
    }
  }

  let frameId = 0;

  function frame() {
    frameId = 0;
    let anyShown = false;
    for (const controller of controllers.values()) {
      if (!controller.shown) continue;
      controller.place();
      anyShown = true;
    }
    if (anyShown) frameId = requestAnimationFrame(frame);
  }

  function ensureFrameLoop() {
    if (!frameId) frameId = requestAnimationFrame(frame);
  }

  const sizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => scheduleScan())
    : null;
  const observedMedia = new WeakSet();

  function observeSize(media) {
    if (!sizeObserver || observedMedia.has(media)) return;
    observedMedia.add(media);
    sizeObserver.observe(media);
  }

  function selectTargets() {
    const candidates = [];
    for (const media of document.querySelectorAll('video')) {
      observeSize(media);
      if (!media.isConnected) continue;
      const rect = media.getBoundingClientRect();
      if (!isUsableRect(rect)) continue;
      if (getComputedStyle(media).visibility === 'hidden') continue;
      candidates.push({ media, rect, area: visibleArea(rect) });
    }

    candidates.sort((a, b) => b.area - a.area || Number(a.media.paused) - Number(b.media.paused));
    if (IS_TIKTOK) return candidates.slice(0, 1).map((candidate) => candidate.media);

    const kept = [];
    for (const candidate of candidates) {
      if (!kept.some((other) => overlapRatio(candidate.rect, other.rect) > 0.6)) kept.push(candidate);
    }
    return kept.map((candidate) => candidate.media);
  }

  let scanTimer = 0;

  function scheduleScan() {
    if (!scanTimer) scanTimer = setTimeout(scan, SCAN_DELAY_MS);
  }

  function scan() {
    scanTimer = 0;
    if (!isExtensionActive) return;

    const targets = new Set(selectTargets());
    for (const [media, controller] of [...controllers]) {
      if (!targets.has(media)) controller.destroy();
    }
    for (const media of targets) {
      if (!controllers.has(media)) new Controller(media).mount();
    }
  }

  function getActiveController() {
    let best = null;
    let bestScore = -1;
    for (const controller of controllers.values()) {
      const score = (controller.media.paused ? 0 : 1e12) + controller.area;
      if (score > bestScore) {
        best = controller;
        bestScore = score;
      }
    }
    return best;
  }

  function toggleExtension() {
    isExtensionActive = !isExtensionActive;
    if (isExtensionActive) {
      scan();
    } else {
      for (const controller of [...controllers.values()]) controller.destroy();
    }
  }

  window.addEventListener('keydown', (event) => {
    if (!event.isTrusted || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isEditableTarget(event)) return;

    const key = event.key.toLowerCase();
    if (key === 'h') {
      if (!event.repeat) toggleExtension();
      return;
    }
    if (!isExtensionActive || (key !== 'a' && key !== 'd')) return;
    getActiveController()?.act(key === 'a' ? 'decrease' : 'increase');
  }, true);

  let pointerPoint = null;
  let pointerFrame = 0;

  window.addEventListener('pointermove', (event) => {
    if (!controllers.size) return;
    pointerPoint = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      for (const controller of controllers.values()) controller.handlePointer(pointerPoint);
    });
  }, { capture: true, passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    for (const controller of controllers.values()) {
      if (controller.shown && !controller.hovered && !controller.dragging) controller.conceal();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    for (const controller of controllers.values()) controller.place();
    scheduleScan();
  });

  for (const type of ['loadedmetadata', 'playing', 'emptied']) {
    document.addEventListener(type, scheduleScan, true);
  }
  window.addEventListener('resize', scheduleScan);
  window.addEventListener('scroll', scheduleScan, { capture: true, passive: true });

  function touchesVideo(nodes) {
    for (const node of nodes) {
      if (node.nodeType !== Node.ELEMENT_NODE || node.localName === HOST_TAG) continue;
      if (node.localName === 'video' || node.querySelector('video')) return true;
    }
    return false;
  }

  new MutationObserver((mutations) => {
    for (const { addedNodes, removedNodes } of mutations) {
      if (touchesVideo(addedNodes) || touchesVideo(removedNodes)) {
        scheduleScan();
        return;
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', refreshTheme);
  const themeObserver = new MutationObserver(refreshTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'dark'] });
  if (document.body) themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'dark'] });

  scan();
})();