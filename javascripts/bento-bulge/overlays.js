import { PAGE_META, projectMeta, setPageMeta } from "../page-meta.js";

const TX_OUT = 400;
const TX_IN = 400;
const TX_DELAY = 150;
const DOCK_EXIT_MS = 340;
const READER_TITLE_ID = "reader-overlay-title";

/** Overlay-only sheets — kept off the home critical path. */
const OVERLAY_STYLE_HREFS = {
  detail: "/stylesheets/detail-view.css",
  project: "/stylesheets/project.css",
  about: "/stylesheets/about.css"
};

const overlayStyleLoads = new Map();

function loadOverlayStylesheet(href) {
  const pending = overlayStyleLoads.get(href);
  if (pending) return pending;

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[data-overlay-style="${href}"]`);
    if (existing) {
      if (existing.sheet || existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${href}`)),
        { once: true }
      );
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.overlayStyle = href;
    link.addEventListener(
      "load",
      () => {
        link.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    link.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${href}`)),
      { once: true }
    );
    document.head.appendChild(link);
  });

  overlayStyleLoads.set(href, promise);
  return promise;
}

function ensureOverlayStyles({ about = false } = {}) {
  const hrefs = [OVERLAY_STYLE_HREFS.detail, OVERLAY_STYLE_HREFS.project];
  if (about) hrefs.push(OVERLAY_STYLE_HREFS.about);
  return Promise.all(hrefs.map(loadOverlayStylesheet)).catch((err) => {
    console.warn("[bento-bulge] overlay stylesheet load failed", err);
  });
}

function warmOverlayStyles() {
  const run = () => {
    ensureOverlayStyles({ about: true });
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 1200);
  }
}

export function initBentoBulgeOverlays(options = {}) {
  const grid = document.querySelector(options.grid || "#grid");
  const reader = document.getElementById("reader");
  const panel = document.getElementById("panel");
  const doc = document.getElementById("doc");
  const scrim = document.getElementById("scrim");
  const closeBtn = document.getElementById("close");
  const onOpen = options.onOpen || (() => {});
  const onClose = options.onClose || (() => {});

  if (!grid || !reader || !panel || !doc || !scrim || !closeBtn) {
    console.warn("[bento-bulge] overlay shell missing");
    return { dispose() {} };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let openId = null;
  let aboutOpen = false;
  let activePress = null;
  let disposed = false;
  let isClosing = false;
  let openPhaseTimer = 0;
  let openTransitionStartedAt = 0;

  function clearOpenPhaseTimer() {
    if (!openPhaseTimer) return;
    window.clearTimeout(openPhaseTimer);
    openPhaseTimer = 0;
  }

  function scheduleOpenPhaseComplete() {
    clearOpenPhaseTimer();
    const elapsed = openTransitionStartedAt ? Date.now() - openTransitionStartedAt : 0;
    const remaining = Math.max(0, TX_OUT - elapsed);
    openPhaseTimer = window.setTimeout(() => {
      openPhaseTimer = 0;
      if (isClosing || !document.body.classList.contains("is-detail-opening")) return;
      document.body.classList.remove("is-detail-opening");
      document.body.classList.add("is-detail-open");
    }, remaining);
  }

  function startOpenTransition() {
    if (reduceMotion || isOverlayActive()) return false;
    if (
      document.body.classList.contains("is-detail-opening") ||
      document.body.classList.contains("is-detail-open")
    ) {
      scheduleOpenPhaseComplete();
      return true;
    }
    openTransitionStartedAt = Date.now();
    setBodyDetailState("is-detail-opening");
    document.body.classList.add("is-detail-enter");
    onOpen(false);
    scheduleOpenPhaseComplete();
    return true;
  }

  function isOverlayOpen() {
    return !!(openId || aboutOpen);
  }

  function isOverlayActive() {
    return isOverlayOpen() || isClosing;
  }

  function markHomeReady() {
    document.body.dataset.homeReady = "true";
  }

  function completeInitialHomeEnter() {
    const run = () => {
      requestAnimationFrame(() => {
        document.body.classList.remove("is-home-pending");
        document.body.classList.add("is-home-enter");
        window.setTimeout(markHomeReady, TX_IN + TX_DELAY);
        warmOverlayStyles();
      });
    };
    if (options.whenBulgeReady) {
      options.whenBulgeReady.then(run).catch(run);
    } else {
      run();
    }
  }

  function idFromLocation() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return null;
    const match = path.match(/^\/([^/]+)$/);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    const projects = window.PROJECTS || [];
    return projects.some((p) => p.id === id) ? id : null;
  }

  function homeUrl() {
    return "/";
  }

  function projectUrl(id) {
    return `/${encodeURIComponent(id)}/`;
  }

  function isAboutLocation() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    return path === "/about";
  }

  function aboutUrl() {
    return "/about/";
  }

  /* ---- Dock sliding ink ---- */
  const dockNav = document.querySelector(".dock__nav");
  const dockInk = dockNav?.querySelector(".dock__ink");
  let dockInkReady = false;
  let dockInkHover = null;

  function dockInkTarget() {
    if (!dockNav) return null;
    if (dockInkHover && dockNav.contains(dockInkHover)) return dockInkHover;
    return dockNav.querySelector(".dock__link.is-active") || dockNav.querySelector(".dock__link");
  }

  function moveDockInk(el = dockInkTarget(), { instant = false } = {}) {
    if (!dockInk || !dockNav || !el) return;
    const nr = dockNav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!nr.width || !r.width) return;
    const next = {
      width: `${r.width * 0.8}px`,
      transform: `translateX(${r.left - nr.left + r.width * 0.1}px)`,
    };
    if (instant || !dockInkReady) {
      const prev = dockInk.style.transition;
      dockInk.style.transition = "none";
      dockInk.style.width = next.width;
      dockInk.style.transform = next.transform;
      void dockInk.offsetWidth;
      dockInk.style.transition = prev;
    } else {
      dockInk.style.width = next.width;
      dockInk.style.transform = next.transform;
    }
    if (!dockInkReady) {
      dockInkReady = true;
      dockInk.classList.add("is-ready");
    }
  }

  function initDockInk() {
    if (!dockNav || !dockInk) return;
    const links = [...dockNav.querySelectorAll(".dock__link[data-view]")];
    links.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        dockInkHover = link;
        moveDockInk(link);
      });
      link.addEventListener("focus", () => {
        dockInkHover = link;
        moveDockInk(link);
      });
    });
    dockNav.addEventListener("mouseleave", () => {
      dockInkHover = null;
      moveDockInk();
    });
    dockNav.addEventListener("focusout", (e) => {
      if (dockNav.contains(e.relatedTarget)) return;
      dockInkHover = null;
      moveDockInk();
    });
    window.addEventListener("resize", () => moveDockInk(undefined, { instant: true }));
    // Land after enter animations finish so widths are final
    requestAnimationFrame(() => {
      requestAnimationFrame(() => moveDockInk(undefined, { instant: true }));
    });
    window.setTimeout(() => moveDockInk(undefined, { instant: true }), 700);
  }

  /* ---- Reader scroll progress (content-flexible) ---- */
  const RING_LEN = 2 * Math.PI * 30; // r=30 in the close-button SVG
  const ringPath = closeBtn.querySelector(".detail-close__ring-path");
  let progressRaf = 0;
  let progressObserver = null;

  function readingProgress() {
    const max = panel.scrollHeight - panel.clientHeight;
    if (max <= 1) return 1; // short pages read as complete
    return Math.max(0, Math.min(1, panel.scrollTop / max));
  }

  function updateReadingProgress() {
    progressRaf = 0;
    if (!ringPath) return;
    const p = readingProgress();
    ringPath.style.strokeDashoffset = String(RING_LEN * (1 - p));
    // Hide until scroll starts — round linecaps leave a visible dot at 0%
    closeBtn.classList.toggle("is-reading", p > 0.001);
    closeBtn.classList.toggle("is-read-done", p >= 0.995);
  }

  function scheduleReadingProgress() {
    if (progressRaf) return;
    progressRaf = requestAnimationFrame(updateReadingProgress);
  }

  function resetReadingProgress() {
    if (!ringPath) return;
    ringPath.style.strokeDashoffset = String(RING_LEN);
    closeBtn.classList.remove("is-reading", "is-read-done");
  }

  function bindReadingProgress() {
    resetReadingProgress();
    scheduleReadingProgress();
    if (progressObserver) progressObserver.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      progressObserver = new ResizeObserver(() => scheduleReadingProgress());
      progressObserver.observe(panel);
      if (doc) progressObserver.observe(doc);
    }
  }

  function unbindReadingProgress() {
    if (progressObserver) {
      progressObserver.disconnect();
      progressObserver = null;
    }
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
    resetReadingProgress();
  }

  function setActiveNav(name) {
    document.querySelectorAll(".dock__nav .dock__link[data-view]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.view === name);
    });
    moveDockInk();
  }

  function runHomeDockExit(then) {
    if (
      !document.body.classList.contains("is-home") ||
      document.body.classList.contains("is-detail-open") ||
      isOverlayOpen()
    ) {
      then(false);
      return;
    }
    document.body.classList.remove("is-home-enter");
    document.body.classList.add("is-home-dock-exit");
    window.setTimeout(() => {
      document.body.classList.remove("is-home-dock-exit");
      then(true);
    }, DOCK_EXIT_MS);
  }

  function staggerReveals(selector) {
    doc.querySelectorAll(selector).forEach((el, i) => {
      el.style.setProperty("--reveal-i", String(i));
    });
  }

  function setupReveals(selector, instant) {
    staggerReveals(selector);
    doc.querySelectorAll(selector).forEach((n) => {
      n.classList.add("reveal");
      if (instant || coarsePointer || reduceMotion) n.classList.add("in");
    });
    if (!instant && !coarsePointer && !reduceMotion) {
      requestAnimationFrame(() => {
        window.initReveal(doc);
      });
    }
  }

  function isStatementPassthroughTarget(target) {
    if (!target || !target.closest) return false;
    return Boolean(
      target.closest(".tile__looking") ||
        target.closest(".tile__statement-social-link") ||
        target.closest(".tile__mailpill")
    );
  }

  function isStatementTile(tile) {
    return Boolean(tile && (tile.classList.contains("tile--statement") || tile.dataset.id === "intro"));
  }

  function startTilePress(tile, id, options = {}) {
    if (isOverlayActive() || reduceMotion) return;
    activePress = { tile, id, about: options.about === true };
    tile.classList.add("is-pressed");
    window.BentoBulge?.setTilePress?.(tile, true);
  }

  function cancelTilePress() {
    if (!activePress) return;
    window.BentoBulge?.setTilePress?.(activePress.tile, false);
    activePress.tile.classList.remove("is-pressed");
    activePress = null;
  }

  function restoreHomeEnter() {
    if (document.body.dataset.homeReady === "true") {
      document.body.classList.add("is-home-enter");
    }
  }

  function setReaderProjectLabel() {
    const title = doc.querySelector(".pj-title, .pj-story__title");
    if (!title) {
      reader.setAttribute("aria-label", "Project");
      reader.removeAttribute("aria-labelledby");
      return;
    }
    title.id = READER_TITLE_ID;
    reader.setAttribute("aria-labelledby", READER_TITLE_ID);
    reader.removeAttribute("aria-label");
  }

  function setReaderAboutLabel() {
    reader.setAttribute("aria-label", "About");
    reader.removeAttribute("aria-labelledby");
    const titled = doc.querySelector(`#${READER_TITLE_ID}`);
    if (titled) titled.removeAttribute("id");
  }

  function clearReaderLabel() {
    reader.setAttribute("aria-label", "Project");
    reader.removeAttribute("aria-labelledby");
    const titled = doc.querySelector(`#${READER_TITLE_ID}`);
    if (titled) titled.removeAttribute("id");
  }

  function teardownReader() {
    clearOpenPhaseTimer();
    unbindReadingProgress();
    if (idFromLocation() || isAboutLocation()) {
      history.replaceState({ home: true }, "", homeUrl());
    }
    panel.classList.remove("is-morphed");
    reader.classList.remove("is-open", "is-exiting", "reader--ov-split");
    reader.setAttribute("aria-hidden", "true");
    reader.setAttribute("hidden", "");
    reader.setAttribute("inert", "");
    clearReaderLabel();
    closeBtn.removeAttribute("aria-hidden");
    document.body.style.overflow = "";
    openId = null;
    aboutOpen = false;
    doc.className = "pj-doc";
    doc.innerHTML = "";
    clearOverlayState();
    restoreHomeEnter();
    setPageMeta(PAGE_META.home);
    setActiveNav("portfolio");
    isClosing = false;
  }

  function isDetailTransitionActive() {
    return (
      document.body.classList.contains("is-detail-opening") ||
      document.body.classList.contains("is-detail-open")
    );
  }

  function clearOverlayState(options = {}) {
    const keepDetailTransition = options.keepDetailTransition === true;
    if (!keepDetailTransition) {
      cancelTilePress();
      openTransitionStartedAt = 0;
      document.body.classList.remove(
        "is-detail-opening",
        "is-detail-open",
        "is-detail-enter",
        "is-detail-closing",
        "is-home-enter",
        "is-home-dock-exit",
        "is-home-dock-pending"
      );
    } else {
      grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
        t.classList.remove("is-pressed");
      });
      activePress = null;
    }
    reader.classList.remove("is-open", "is-exiting", "reader--ov-split");
    panel.classList.remove("is-morphed");
    doc.classList.remove("is-revealed", "is-instant", "detail-split");
    doc.innerHTML = "";
    if (!keepDetailTransition) {
      grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
        t.classList.remove("is-pressed");
      });
    }
  }

  function setBodyDetailState(state) {
    document.body.classList.remove(
      "is-detail-opening",
      "is-detail-open",
      "is-detail-enter",
      "is-detail-closing",
      "is-home-enter"
    );
    if (state) document.body.classList.add(state);
  }

  function mountAboutContent() {
    const tpl = document.getElementById("about-template");
    if (!tpl) return;
    doc.className = "about-page about-overlay";
    doc.innerHTML = "";
    doc.appendChild(tpl.content.cloneNode(true));
  }

  function focusProjectClose() {
    if (coarsePointer) return;
    closeBtn.focus({ preventScroll: true });
  }

  function openOverlayCommon(instant, options = {}) {
    const isAbout = options.about === true;
    clearOpenPhaseTimer();
    reader.removeAttribute("hidden");
    reader.removeAttribute("inert");
    reader.classList.add("reader--ov-split");
    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
    if (isAbout) {
      closeBtn.setAttribute("aria-hidden", "true");
    } else {
      closeBtn.removeAttribute("aria-hidden");
    }
    document.body.style.overflow = "hidden";
    panel.classList.add("is-morphed");
    panel.scrollTop = 0;
    bindReadingProgress();

    if (instant) {
      doc.classList.add("is-revealed", "is-instant");
      document.body.classList.add("is-detail-open", "is-detail-enter");
      onOpen(instant);
      return;
    }

    doc.classList.add("is-revealed");
    startOpenTransition();
    if (!instant && !isAbout) focusProjectClose();
  }

  function open(id, skipPush, tile, instant, afterDockExit) {
    const p = window.getProject(id);
    if (!p || isClosing) return;

    ensureOverlayStyles().then(() => {
      openAfterStyles(id, skipPush, tile, instant, afterDockExit);
    });
  }

  function openAfterStyles(id, skipPush, tile, instant, afterDockExit) {
    const p = window.getProject(id);
    if (!p || isClosing) return;

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      startOpenTransition();
      runHomeDockExit(() => {
        openAfterStyles(id, skipPush, tile, instant, true);
      });
      return;
    }

    clearOverlayState({
      keepDetailTransition: afterDockExit || isDetailTransitionActive()
    });
    aboutOpen = false;
    openId = id;

    window.renderProject(doc, p);
    doc.classList.add("detail-split");
    setReaderProjectLabel();
    openOverlayCommon(instant);

    if (instant) {
      setupReveals(".pj-sec", true);
      window.initInview(doc);
      if (window.initMediaFade) window.initMediaFade(doc);
      if (!skipPush) history.pushState({ id }, "", projectUrl(id));
      else history.replaceState({ id }, "", projectUrl(id));
      setPageMeta(projectMeta(p));
      setActiveNav("portfolio");
      return;
    }

    setupReveals(".pj-sec", false);
    window.initInview(doc);
    if (window.initMediaFade) window.initMediaFade(doc);

    if (!skipPush) history.pushState({ id }, "", projectUrl(id));
    setPageMeta(projectMeta(p));
    setActiveNav("portfolio");
  }

  function openAbout(skipPush, instant, afterDockExit) {
    if ((aboutOpen && !openId) || isClosing) return;

    ensureOverlayStyles({ about: true }).then(() => {
      openAboutAfterStyles(skipPush, instant, afterDockExit);
    });
  }

  function openAboutAfterStyles(skipPush, instant, afterDockExit) {
    if ((aboutOpen && !openId) || isClosing) return;

    if (openId) {
      clearOpenPhaseTimer();
      cancelTilePress();
      grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
        t.classList.remove("is-pressed");
      });
      activePress = null;
      openId = null;
      aboutOpen = true;
      mountAboutContent();
      setReaderAboutLabel();
      reader.classList.add("reader--ov-split", "is-open");
      reader.removeAttribute("hidden");
      reader.removeAttribute("inert");
      reader.setAttribute("aria-hidden", "false");
      closeBtn.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "hidden";
      panel.classList.add("is-morphed");
      panel.scrollTop = 0;
      bindReadingProgress();
      doc.classList.remove("detail-split", "is-instant");
      doc.classList.add("is-revealed");
      document.body.classList.remove("is-detail-opening", "is-detail-closing");
      document.body.classList.add("is-detail-open", "is-detail-enter");

      if (window.initInview) window.initInview(doc);
      if (window.initMediaFade) window.initMediaFade(doc);
      setupReveals(".about .reveal", false);

      if (!skipPush) history.pushState({ about: true }, "", aboutUrl());
      else if (!isAboutLocation()) history.replaceState({ about: true }, "", aboutUrl());
      setPageMeta(PAGE_META.about);
      setActiveNav("about");
      return;
    }

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      startOpenTransition();
      runHomeDockExit(() => {
        openAboutAfterStyles(skipPush, instant, true);
      });
      return;
    }

    clearOverlayState({
      keepDetailTransition: afterDockExit || isDetailTransitionActive()
    });
    openId = null;
    aboutOpen = true;
    mountAboutContent();
    setReaderAboutLabel();
    openOverlayCommon(instant, { about: true });

    if (window.initInview) window.initInview(doc);
    if (window.initMediaFade) window.initMediaFade(doc);
    setupReveals(".about .reveal", instant);

    if (!skipPush) history.pushState({ about: true }, "", aboutUrl());
    else if (!isAboutLocation()) history.replaceState({ about: true }, "", aboutUrl());
    setPageMeta(PAGE_META.about);
    setActiveNav("about");
  }

  function close(skipPop) {
    if (!isOverlayOpen() || isClosing) return;

    isClosing = true;
    clearOpenPhaseTimer();
    openTransitionStartedAt = 0;

    // Apply unscaled close styles before bulge remeasure (avoids baking scale(0.95)
    // into WebGL cell rects — that left black gutters between tiles).
    doc.classList.remove("is-revealed");
    document.body.classList.remove("is-detail-enter", "is-detail-open", "is-detail-opening");
    document.body.classList.add("is-detail-closing", "is-home-enter");
    void grid.offsetWidth;

    onClose();

    grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
      t.classList.remove("is-pressed");
    });

    if (!skipPop) {
      history.replaceState({ home: true }, "", homeUrl());
    } else if (idFromLocation() || isAboutLocation()) {
      history.replaceState({ home: true }, "", homeUrl());
    }

    reader.classList.add("is-exiting");
    closeBtn.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      teardownReader();
    }, TX_DELAY + TX_IN + 80);
  }

  function onPointerUp(e) {
    if (!activePress) return;
    const press = activePress;
    if (e.target.closest && e.target.closest(".tile") === press.tile) {
      press.tile.classList.remove("is-pressed");
      window.BentoBulge?.setTilePress?.(press.tile, false);
      activePress = null;
      // Coarse pointer: open on release — startOpenTransition() before click
      // disables grid pointer-events and suppresses the synthetic click on touch.
      if (coarsePointer) {
        if (press.about) {
          if (isStatementPassthroughTarget(e.target)) return;
          openAbout(false);
          return;
        }
        open(press.id, false, press.tile);
        return;
      }
      startOpenTransition();
      return;
    }
    cancelTilePress();
  }

  function onGridClick(e) {
    if (isOverlayActive()) return;
    if (e.defaultPrevented) return;
    // Touch taps are handled in onPointerUp; keep click for mouse + reduced-motion touch.
    if (coarsePointer && !reduceMotion) return;
    const tile = e.target.closest && e.target.closest(".tile");
    if (!tile || !grid.contains(tile)) return;

    if (isStatementTile(tile)) {
      if (isStatementPassthroughTarget(e.target)) return;
      e.preventDefault();
      activePress = null;
      if (
        !document.body.classList.contains("is-detail-opening") &&
        !document.body.classList.contains("is-detail-open")
      ) {
        startOpenTransition();
      }
      openAbout(false);
      return;
    }

    if (tile.dataset.static === "true") return;
    const id = tile.dataset.id;
    if (!id) return;
    e.preventDefault();
    activePress = null;
    if (
      !document.body.classList.contains("is-detail-opening") &&
      !document.body.classList.contains("is-detail-open")
    ) {
      startOpenTransition();
    }
    open(id, false, tile);
  }

  function onScrimClick() {
    close();
  }

  function onCloseClick() {
    close();
  }

  function onKeydown(e) {
    if (e.key === "Escape" && isOverlayOpen()) close();
  }

  function onHashChange() {
    if (isClosing) return;
    if (location.hash === "#about" && !isAboutLocation()) {
      history.replaceState({ about: true }, "", aboutUrl());
      if (!aboutOpen) openAbout(true, true);
    }
  }

  function onPopstate() {
    if (isClosing) return;

    if (isAboutLocation()) {
      if (!aboutOpen) openAbout(true, true);
      return;
    }
    const id = idFromLocation();
    if (id && window.getProject(id)) {
      if (openId === id) return;
      const tile = grid.querySelector(`.tile[data-id="${id}"]`);
      open(id, true, tile);
      return;
    }
    if (isOverlayOpen()) close(true);
  }

  function onNavClick(e) {
    e.preventDefault();
    const view = e.currentTarget.dataset.view;

    if (view === "about") {
      if (aboutOpen && !openId) return;
      openAbout(false);
      return;
    }

    if (isOverlayOpen()) {
      close(false);
      return;
    }

    setActiveNav("portfolio");
    if (location.hash) history.replaceState(null, "", homeUrl());
  }

  grid.addEventListener("click", onGridClick);

  grid.querySelectorAll(".tile").forEach((tile) => {
    const id = tile.dataset.id;
    if (!id) return;

    if (isStatementTile(tile)) {
      tile.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || isOverlayActive()) return;
        if (isStatementPassthroughTarget(e.target)) return;
        startTilePress(tile, id, { about: true });
      });
      tile.addEventListener("pointercancel", () => {
        if (activePress && activePress.tile === tile) cancelTilePress();
      });
      return;
    }

    if (tile.dataset.static === "true") return;

    tile.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || isOverlayActive()) return;
      startTilePress(tile, id);
    });
    tile.addEventListener("pointercancel", () => {
      if (activePress && activePress.tile === tile) cancelTilePress();
    });
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOverlayActive()) open(id, false, tile);
      }
    });
  });

  document.addEventListener("pointerup", onPointerUp);
  scrim.addEventListener("click", onScrimClick);
  closeBtn.addEventListener("click", onCloseClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("popstate", onPopstate);
  window.addEventListener("hashchange", onHashChange);

  const navLinks = document.querySelectorAll(".dock__nav .dock__link[data-view]");
  navLinks.forEach((link) => {
    link.addEventListener("click", onNavClick);
  });

  panel.addEventListener("scroll", scheduleReadingProgress, { passive: true });
  initDockInk();

  function bootFromLocation() {
    const legacyId = new URLSearchParams(location.search).get("id");
    if (legacyId && window.getProject(legacyId) && !idFromLocation()) {
      history.replaceState({ id: legacyId }, "", projectUrl(legacyId));
    }
    if (location.hash === "#about" && !isAboutLocation()) {
      history.replaceState({ about: true }, "", aboutUrl());
    }
    if (isAboutLocation()) {
      markHomeReady();
      history.replaceState({ about: true }, "", aboutUrl());
      openAbout(true, true);
      return;
    }
    const initial = idFromLocation();
    if (initial && window.getProject(initial)) {
      markHomeReady();
      open(initial, true, null, true);
      return;
    }
    history.replaceState({ home: true }, "", homeUrl());
    completeInitialHomeEnter();
  }

  bootFromLocation();

  return {
    open,
    openAbout,
    close,
    isOverlayOpen,
    dispose() {
      if (disposed) return;
      disposed = true;
      unbindReadingProgress();
      document.removeEventListener("pointerup", onPointerUp);
      grid.removeEventListener("click", onGridClick);
      scrim.removeEventListener("click", onScrimClick);
      closeBtn.removeEventListener("click", onCloseClick);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("popstate", onPopstate);
      window.removeEventListener("hashchange", onHashChange);
      panel.removeEventListener("scroll", scheduleReadingProgress);
      navLinks.forEach((link) => {
        link.removeEventListener("click", onNavClick);
      });
      if (isOverlayOpen()) teardownReader();
    }
  };
}
