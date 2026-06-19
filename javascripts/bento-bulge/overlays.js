const BASE_PATH = "/concepts/bento-bulge";
const TX_OUT = 400;
const TX_IN = 400;
const TX_DELAY = 150;
const DOCK_EXIT_MS = 340;

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
  let openId = null;
  let aboutOpen = false;
  let activePress = null;
  let disposed = false;
  let isClosing = false;
  let openPhaseTimer = 0;

  function clearOpenPhaseTimer() {
    if (!openPhaseTimer) return;
    window.clearTimeout(openPhaseTimer);
    openPhaseTimer = 0;
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
      });
    };
    if (options.whenBulgeReady) {
      options.whenBulgeReady.then(run).catch(run);
    } else {
      run();
    }
  }

  function idFromLocation() {
    const path = location.pathname.replace(/\/+$/, "");
    const match = path.match(/\/concepts\/bento-bulge\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function homeUrl() {
    return `${BASE_PATH}/`;
  }

  function projectUrl(id) {
    return `${BASE_PATH}/${encodeURIComponent(id)}/`;
  }

  function aboutUrl() {
    return `${BASE_PATH}/#about`;
  }

  function setActiveNav(name) {
    document.querySelectorAll(".dock__nav .dock__link[data-view]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.view === name);
    });
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

  function staggerSections() {
    doc.querySelectorAll(".pj-sec").forEach((sec, i) => {
      sec.style.setProperty("--reveal-i", String(i));
    });
  }

  function startTilePress(tile, id) {
    if (isOverlayActive() || reduceMotion) return;
    activePress = { tile, id };
    tile.classList.add("is-pressed");
    document.body.classList.add("is-grid-pressing");
  }

  function cancelTilePress() {
    if (!activePress) return;
    activePress.tile.classList.remove("is-pressed");
    activePress = null;
    document.body.classList.remove("is-grid-pressing");
  }

  function pauseGridVideos() {
    grid.querySelectorAll("video").forEach((v) => {
      v.pause();
    });
  }

  function resumeGridVideos() {
    grid.querySelectorAll("video").forEach((v) => {
      v.play().catch(() => {});
    });
  }

  function restoreHomeEnter() {
    if (document.body.dataset.homeReady === "true") {
      document.body.classList.add("is-home-enter");
    }
  }

  function teardownReader() {
    clearOpenPhaseTimer();
    if (idFromLocation() || location.hash === "#about") {
      history.replaceState({ home: true }, "", homeUrl());
    }
    panel.classList.remove("is-morphed");
    reader.classList.remove("is-open", "is-exiting", "reader--ov-split");
    reader.setAttribute("aria-hidden", "true");
    reader.setAttribute("hidden", "");
    reader.setAttribute("inert", "");
    reader.setAttribute("aria-label", "Project");
    closeBtn.removeAttribute("aria-hidden");
    document.body.style.overflow = "";
    openId = null;
    aboutOpen = false;
    doc.className = "pj-doc";
    doc.innerHTML = "";
    clearOverlayState();
    resumeGridVideos();
    onClose();
    restoreHomeEnter();
    document.title = "Bento bulge — Jesse O'Chapo";
    setActiveNav("portfolio");
    isClosing = false;
  }

  function clearOverlayState() {
    cancelTilePress();
    reader.classList.remove("is-open", "is-exiting", "reader--ov-split");
    panel.classList.remove("is-morphed");
    doc.classList.remove("is-revealed", "is-instant", "detail-split");
    doc.innerHTML = "";
    document.body.classList.remove(
      "is-detail-opening",
      "is-detail-open",
      "is-detail-enter",
      "is-detail-closing",
      "is-home-enter",
      "is-home-dock-exit",
      "is-home-dock-pending",
      "is-grid-pressing"
    );
    grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
      t.classList.remove("is-pressed");
    });
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

  function openOverlayCommon(instant) {
    clearOpenPhaseTimer();
    reader.removeAttribute("hidden");
    reader.removeAttribute("inert");
    reader.classList.add("reader--ov-split");
    pauseGridVideos();
    onOpen();
    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
    closeBtn.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    panel.classList.add("is-morphed");
    panel.scrollTop = 0;

    if (instant) {
      doc.classList.add("is-revealed", "is-instant");
      document.body.classList.add("is-detail-open", "is-detail-enter");
      closeBtn.focus();
      return;
    }

    doc.classList.add("is-revealed");
    setBodyDetailState("is-detail-opening");
    document.body.classList.add("is-detail-enter");
    openPhaseTimer = window.setTimeout(() => {
      openPhaseTimer = 0;
      if (!isOverlayOpen() || isClosing) return;
      document.body.classList.remove("is-detail-opening");
      document.body.classList.add("is-detail-open");
    }, TX_OUT);
    closeBtn.focus();
  }

  function open(id, skipPush, tile, instant, afterDockExit) {
    const p = window.getProject(id);
    if (!p || isClosing) return;

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      runHomeDockExit(() => {
        open(id, skipPush, tile, instant, true);
      });
      return;
    }

    clearOverlayState();
    aboutOpen = false;
    openId = id;

    window.renderProject(doc, p);
    doc.classList.add("detail-split");
    staggerSections();
    reader.setAttribute("aria-label", "Project");
    openOverlayCommon(instant);

    if (instant) {
      doc.querySelectorAll(".pj-sec, .pj-cta").forEach((n) => {
        n.classList.add("reveal", "in");
      });
      window.initInview(doc);
      if (!skipPush) history.pushState({ id }, "", projectUrl(id));
      else history.replaceState({ id }, "", projectUrl(id));
      document.title = `${p.title} · Jesse O'Chapo`;
      setActiveNav("portfolio");
      return;
    }

    doc.querySelectorAll(".pj-sec, .pj-cta").forEach((n) => {
      n.classList.add("reveal");
    });
    window.initInview(doc);
    requestAnimationFrame(() => {
      window.initReveal(doc);
    });

    if (!skipPush) history.pushState({ id }, "", projectUrl(id));
    document.title = `${p.title} · Jesse O'Chapo`;
    setActiveNav("portfolio");
  }

  function openAbout(skipPush, instant, afterDockExit) {
    if ((aboutOpen && !openId) || isClosing) return;

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      runHomeDockExit(() => {
        openAbout(skipPush, instant, true);
      });
      return;
    }

    clearOverlayState();
    openId = null;
    aboutOpen = true;
    mountAboutContent();
    reader.setAttribute("aria-label", "About");
    openOverlayCommon(instant);

    if (window.initInview) window.initInview(doc);

    if (!skipPush) history.pushState({ about: true }, "", aboutUrl());
    else if (location.hash !== "#about") history.replaceState({ about: true }, "", aboutUrl());
    document.title = "About · Jesse O'Chapo";
    setActiveNav("about");
  }

  function close(skipPop) {
    if (!isOverlayOpen() || isClosing) return;

    isClosing = true;
    clearOpenPhaseTimer();

    doc.classList.remove("is-revealed");
    document.body.classList.remove("is-detail-enter", "is-detail-open", "is-detail-opening", "is-grid-pressing");
    document.body.classList.add("is-detail-closing", "is-home-enter");
    grid.querySelectorAll(".tile.is-pressed").forEach((t) => {
      t.classList.remove("is-pressed");
    });

    if (!skipPop) {
      history.replaceState({ home: true }, "", homeUrl());
    } else if (idFromLocation() || location.hash === "#about") {
      history.replaceState({ home: true }, "", homeUrl());
    }

    reader.classList.add("is-exiting");
    closeBtn.setAttribute("aria-hidden", "true");
    void grid.offsetWidth;
    window.setTimeout(() => {
      teardownReader();
    }, TX_DELAY + TX_IN + 80);
  }

  function onPointerUp(e) {
    if (!activePress) return;
    if (e.target.closest && e.target.closest(".tile") === activePress.tile) {
      activePress.tile.classList.remove("is-pressed");
      document.body.classList.remove("is-grid-pressing");
      activePress = null;
      return;
    }
    cancelTilePress();
  }

  function onGridClick(e) {
    if (isOverlayActive()) return;
    if (e.defaultPrevented) return;
    const tile = e.target.closest && e.target.closest(".tile");
    if (!tile || !grid.contains(tile)) return;
    const id = tile.dataset.id;
    if (!id) return;
    e.preventDefault();
    cancelTilePress();
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
    if (location.hash === "#about" && !idFromLocation()) {
      if (!aboutOpen) openAbout(true, true);
      return;
    }
    if (aboutOpen && location.hash !== "#about") {
      close(true);
    }
  }

  function onPopstate() {
    if (isClosing) return;

    const id = idFromLocation();
    if (id === "about") {
      if (!aboutOpen) openAbout(true, true);
      return;
    }
    if (id && window.getProject(id)) {
      if (openId === id) return;
      const tile = grid.querySelector(`.tile[data-id="${id}"]`);
      open(id, true, tile);
      return;
    }
    if (location.hash === "#about" && !idFromLocation()) {
      if (!aboutOpen) openAbout(true, true);
      return;
    }
    if (isOverlayOpen()) close(true);
  }

  function onNavClick(e) {
    e.preventDefault();
    const view = e.currentTarget.dataset.view;

    if (view === "about") {
      if (aboutOpen && !openId) return;
      if (openId) {
        close(true);
        window.setTimeout(() => {
          openAbout(false);
        }, 120);
        return;
      }
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

  function bootFromLocation() {
    const legacyId = new URLSearchParams(location.search).get("id");
    if (legacyId && window.getProject(legacyId) && !idFromLocation()) {
      history.replaceState({ id: legacyId }, "", projectUrl(legacyId));
    }
    const initial = idFromLocation();
    if (initial === "about") {
      markHomeReady();
      history.replaceState({ about: true }, "", aboutUrl());
      openAbout(true, true);
      return;
    }
    if (initial && window.getProject(initial)) {
      markHomeReady();
      open(initial, true, null, true);
      return;
    }
    if (location.hash === "#about") {
      document.body.classList.remove("is-home-pending");
      markHomeReady();
      openAbout(true, true);
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
      document.removeEventListener("pointerup", onPointerUp);
      grid.removeEventListener("click", onGridClick);
      scrim.removeEventListener("click", onScrimClick);
      closeBtn.removeEventListener("click", onCloseClick);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("popstate", onPopstate);
      window.removeEventListener("hashchange", onHashChange);
      navLinks.forEach((link) => {
        link.removeEventListener("click", onNavClick);
      });
      if (isOverlayOpen()) teardownReader();
    }
  };
}
