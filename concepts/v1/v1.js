(function () {
  var grid = document.getElementById("grid");
  var reader = document.getElementById("reader");
  var panel = document.getElementById("panel");
  var doc = document.getElementById("doc");
  var scrim = document.getElementById("scrim");
  var closeBtn = document.getElementById("close");
  var TX_OUT = 400;
  var TX_IN = 400;
  var TX_DELAY = 150;
  var DOCK_EXIT_MS = 340;
  var projects = window.PROJECTS || [];
  var openId = null;
  var openProject = null;
  var aboutOpen = false;
  var originTile = null;
  var activePress = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var EDGE_THRESH = 24;
  var EDGE_NUDGE = 8;

  function measureTileEdges(tile) {
    var r = tile.getBoundingClientRect();
    var vw = window.innerWidth;
    var edges = [];

    if (r.left < EDGE_THRESH) {
      edges.push("left");
      tile.style.setProperty("--edge-hit-left", r.left + "px");
    } else {
      tile.style.removeProperty("--edge-hit-left");
    }

    if (r.right > vw - EDGE_THRESH) {
      edges.push("right");
      tile.style.setProperty("--edge-hit-right", vw - r.right + "px");
    } else {
      tile.style.removeProperty("--edge-hit-right");
    }

    if (r.top < EDGE_THRESH) {
      edges.push("top");
      tile.style.setProperty("--edge-hit-top", r.top + "px");
    } else {
      tile.style.removeProperty("--edge-hit-top");
    }

    if (edges.length) tile.dataset.edgeProx = edges.join(" ");
    else delete tile.dataset.edgeProx;

    return edges;
  }

  function applyTileEdgeProximity(tile) {
    measureTileEdges(tile);
  }

  function applyTileEdgeNudge(tile, surface) {
    var edges = measureTileEdges(tile);
    var ox = "50%";
    var tx = 0;
    var ty = 0;

    if (edges.indexOf("left") >= 0) {
      ox = "0%";
      tx = EDGE_NUDGE;
    } else if (edges.indexOf("right") >= 0) {
      ox = "100%";
      tx = -EDGE_NUDGE;
    }
    if (edges.indexOf("top") >= 0) ty = EDGE_NUDGE;

    surface.style.transformOrigin = ox + " 50%";
    tile.style.setProperty("--edge-x", tx + "px");
    tile.style.setProperty("--edge-y", ty + "px");
  }

  function idFromLocation() {
    var path = location.pathname.replace(/\/+$/, "");
    var match = path.match(/\/concepts\/v1\/([^/]+)$/);
    if (match) return decodeURIComponent(match[1]);
    return null;
  }

  function homeUrl() {
    return idFromLocation() ? "../" : "./";
  }

  function projectUrl(id) {
    return (idFromLocation() ? "../" : "./") + encodeURIComponent(id) + "/";
  }

  function aboutUrl() {
    return homeUrl() + "#about";
  }

  function isOverlayOpen() {
    return !!(openId || aboutOpen);
  }

  function setActiveNav(name) {
    document.querySelectorAll(".dock__nav .dock__link[data-view]").forEach(function (link) {
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
    window.setTimeout(function () {
      document.body.classList.remove("is-home-dock-exit");
      then(true);
    }, DOCK_EXIT_MS);
  }

  function staggerSections() {
    doc.querySelectorAll(".pj-sec").forEach(function (sec, i) {
      sec.style.setProperty("--reveal-i", String(i));
    });
  }

  function startTilePress(tile, id) {
    if (isOverlayOpen() || reduceMotion) return;
    activePress = { tile: tile, id: id };
    tile.classList.add("is-pressed");
    document.body.classList.add("is-grid-pressing");
  }

  function cancelTilePress() {
    if (!activePress) return;
    activePress.tile.classList.remove("is-pressed");
    activePress = null;
    document.body.classList.remove("is-grid-pressing");
  }

  function commitTilePress() {
    if (!activePress) return;
    var tile = activePress.tile;
    var id = activePress.id;
    tile.classList.remove("is-pressed");
    activePress = null;
    open(id, false, tile);
  }

  document.addEventListener("pointerup", function (e) {
    if (!activePress) return;
    if (e.target.closest && e.target.closest(".tile") === activePress.tile) {
      commitTilePress();
    } else {
      cancelTilePress();
    }
  });

  /* ---- build tiles ---- */
  projects.forEach(function (p) {
    var tile = document.createElement("article");
    tile.className = "tile";
    tile.dataset.id = p.id;
    tile.dataset.orient = p.orientation || "landscape";
    tile.dataset.fit = (p.tile && p.tile.fit) || "cover";
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", p.title + ", " + p.product);

    var surface = document.createElement("div");
    surface.className = "tile__surface";

    var media = document.createElement("div");
    media.className = "tile__media";
    var m = p.tile || {};
    if (m.type === "video") {
      var v = document.createElement("video");
      v.src = m.src;
      v.muted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute("autoplay", "");
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      v.setAttribute("data-inview", "");
      media.appendChild(v);
      v.play().catch(function () {});
    } else {
      var img = document.createElement("img");
      img.src = m.src;
      img.alt = p.title;
      img.loading = "lazy";
      media.appendChild(img);
    }

    surface.appendChild(media);
    surface.appendChild(document.createElement("div")).className = "tile__veil";

    var label = document.createElement("div");
    label.className = "tile__label";
    var prod = document.createElement("p");
    prod.className = "tile__product";
    prod.textContent = p.product;
    var title = document.createElement("h2");
    title.className = "tile__title";
    title.textContent = p.title;
    label.appendChild(prod);
    label.appendChild(title);
    surface.appendChild(label);

    tile.appendChild(surface);
    grid.appendChild(tile);

    tile.addEventListener("mouseenter", function () {
      if (!window.matchMedia("(hover: hover)").matches) return;
      applyTileEdgeNudge(tile, surface);
    });
    tile.addEventListener("mouseleave", function () {
      tile.style.removeProperty("--edge-x");
      tile.style.removeProperty("--edge-y");
      surface.style.transformOrigin = "";
    });

    tile.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || isOverlayOpen()) return;
      startTilePress(tile, p.id);
    });
    tile.addEventListener("pointercancel", function () {
      if (activePress && activePress.tile === tile) cancelTilePress();
    });

    tile.addEventListener("click", function () {
      if (reduceMotion) open(p.id, false, tile);
    });
    tile.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(p.id, false, tile);
      }
    });
  });

  grid.querySelectorAll(".tile").forEach(applyTileEdgeProximity);
  window.addEventListener("resize", function () {
    grid.querySelectorAll(".tile").forEach(applyTileEdgeProximity);
  });

  window.initInview(grid);

  function pauseGridVideos() {
    grid.querySelectorAll("video").forEach(function (v) {
      v.pause();
    });
  }

  function resumeGridVideos() {
    grid.querySelectorAll("video").forEach(function (v) {
      v.play().catch(function () {});
    });
  }

  function triggerHomeEnter() {
    if (!document.body.classList.contains("is-home")) return;
    document.body.classList.add("is-home-dock-pending");
    requestAnimationFrame(function () {
      document.body.classList.remove("is-home-dock-pending");
      document.body.classList.add("is-home-enter");
    });
  }

  function clearOverlayState() {
    cancelTilePress();
    reader.className = "reader";
    panel.classList.remove("is-morphed");
    doc.className = "pj-doc";
    doc.classList.remove("is-revealed", "is-instant", "detail-split");
    doc.innerHTML = "";
    aboutOpen = false;
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
    grid.classList.remove("is-rack-focus");
    grid.querySelectorAll(".tile.is-pressed").forEach(function (t) {
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
    var tpl = document.getElementById("about-template");
    if (!tpl) return;
    doc.className = "about-page about-overlay";
    doc.innerHTML = "";
    doc.appendChild(tpl.content.cloneNode(true));
  }

  function openOverlayCommon(instant) {
    reader.classList.add("reader--ov-split");
    pauseGridVideos();
    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
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
    window.setTimeout(function () {
      if (isOverlayOpen()) {
        document.body.classList.remove("is-detail-opening");
        document.body.classList.add("is-detail-open");
      }
    }, TX_OUT);
    closeBtn.focus();
  }

  function open(id, skipPush, tile, instant, afterDockExit) {
    var p = window.getProject(id);
    if (!p) return;

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      runHomeDockExit(function () {
        open(id, skipPush, tile, instant, true);
      });
      return;
    }

    clearOverlayState();
    originTile = tile || null;
    openProject = p;
    openId = id;

    window.renderProject(doc, p);
    doc.classList.add("detail-split");
    staggerSections();
    reader.setAttribute("aria-label", "Project");
    openOverlayCommon(instant);

    if (instant) {
      doc.querySelectorAll(".pj-sec, .pj-cta").forEach(function (n) {
        n.classList.add("reveal", "in");
      });
      window.initInview(doc);
      if (!skipPush) history.pushState({ id: id }, "", projectUrl(id));
      else history.replaceState({ id: id }, "", projectUrl(id));
      document.title = p.title + " · Jesse O'Chapo";
      setActiveNav("portfolio");
      return;
    }

    doc.querySelectorAll(".pj-sec, .pj-cta").forEach(function (n) {
      n.classList.add("reveal");
    });
    window.initInview(doc);
    requestAnimationFrame(function () {
      window.initReveal(doc);
    });

    if (!skipPush) history.pushState({ id: id }, "", projectUrl(id));
    document.title = p.title + " · Jesse O'Chapo";
    setActiveNav("portfolio");
  }

  function openAbout(skipPush, instant, afterDockExit) {
    if (aboutOpen && !openId) return;

    if (!instant && !afterDockExit && document.body.classList.contains("is-home") && !isOverlayOpen()) {
      runHomeDockExit(function () {
        openAbout(skipPush, instant, true);
      });
      return;
    }

    clearOverlayState();
    aboutOpen = true;
    mountAboutContent();
    reader.setAttribute("aria-label", "About");
    openOverlayCommon(instant);

    if (!skipPush) history.pushState({ about: true }, "", aboutUrl());
    else if (location.hash !== "#about") history.replaceState({ about: true }, "", aboutUrl());
    document.title = "About · Jesse O'Chapo";
    setActiveNav("about");
  }

  function teardownReader() {
    panel.classList.remove("is-morphed");
    reader.classList.remove("is-open", "is-exiting");
    reader.setAttribute("aria-hidden", "true");
    reader.setAttribute("aria-label", "Project");
    document.body.style.overflow = "";
    openId = null;
    openProject = null;
    aboutOpen = false;
    originTile = null;
    doc.className = "pj-doc";
    doc.innerHTML = "";
    clearOverlayState();
    resumeGridVideos();
    document.title = "Jesse O'Chapo · Principal Product Designer";
    setActiveNav("portfolio");
    triggerHomeEnter();
  }

  function close(skipPop) {
    if (!isOverlayOpen()) return;

    var wasAbout = aboutOpen;
    openId = null;
    openProject = null;
    aboutOpen = false;
    originTile = null;

    doc.classList.remove("is-revealed");
    document.body.classList.remove("is-detail-enter", "is-detail-open", "is-detail-opening");
    document.body.classList.add("is-detail-closing", "is-home-enter");

    if (!skipPop) {
      if (history.state && (history.state.id || history.state.about)) history.back();
      else if (wasAbout && location.hash === "#about") history.replaceState(null, "", homeUrl());
      else if (idFromLocation()) history.replaceState(null, "", homeUrl());
    }

    reader.classList.add("is-exiting");
    void grid.offsetWidth;
    window.setTimeout(function () {
      teardownReader();
    }, TX_DELAY + TX_IN + 80);
  }

  scrim.addEventListener("click", function () { close(); });
  closeBtn.addEventListener("click", function () { close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOverlayOpen()) close();
  });

  window.addEventListener("popstate", function () {
    var id = idFromLocation();
    if (id && window.getProject(id)) {
      if (openId === id) return;
      var tile = grid.querySelector('.tile[data-id="' + id + '"]');
      open(id, true, tile);
      return;
    }
    if (location.hash === "#about" && !idFromLocation()) {
      if (!aboutOpen) openAbout(true, true);
      return;
    }
    if (isOverlayOpen()) close(true);
  });

  (function bootFromLocation() {
    var legacyId = new URLSearchParams(location.search).get("id");
    if (legacyId && window.getProject(legacyId) && !idFromLocation()) {
      history.replaceState({ id: legacyId }, "", projectUrl(legacyId));
    }
    var initial = idFromLocation();
    if (initial && window.getProject(initial)) {
      open(initial, true, null, true);
      return;
    }
    if (location.hash === "#about") {
      document.body.classList.remove("is-home-pending");
      openAbout(true, true);
      return;
    }
    requestAnimationFrame(function () {
      document.body.classList.remove("is-home-pending");
      document.body.classList.add("is-home-enter");
    });
  })();

  (function initHomeNav() {
    var navLinks = document.querySelectorAll(".dock__nav .dock__link[data-view]");
    if (!navLinks.length) return;

    navLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var view = link.dataset.view;

        if (view === "about") {
          if (aboutOpen && !openId) return;
          if (openId) {
            close(true);
            window.setTimeout(function () {
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
      });
    });
  })();
})();
