/* ------------------------------------------------------------------
   Shared project renderer.
   Header → bento media strip → sections.
------------------------------------------------------------------ */
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function media(m) {
    var fig = el("figure", "pj-fig pj-fig--" + (m.fit || "cover"));
    var node;
    if (m.type === "video") {
      node = document.createElement("video");
      node.src = m.src;
      node.muted = true;
      node.loop = true;
      node.playsInline = true;
      node.setAttribute("playsinline", "");
      node.preload = "metadata";
      node.setAttribute("data-inview", "");
    } else {
      node = document.createElement("img");
      node.src = m.src;
      node.alt = m.alt || "";
      node.loading = "lazy";
    }
    fig.appendChild(node);
    return fig;
  }

  function resolveBentoMedia(p, d) {
    if (d.bentoMedia) return d.bentoMedia;
    if (d.bentoTiles && d.bentoTiles.length) return "showcase";
    return p.orientation === "portrait" ? "hero-portrait" : "hero-center";
  }

  function buildHead(p, d) {
    var head = el("header", "pj-head pj-bento__head");
    var copy = el("div", "pj-head__copy");
    copy.appendChild(el("h1", "pj-title t-display", p.title));
    if (d.lede) copy.appendChild(el("p", "pj-lede", d.lede));
    head.appendChild(copy);

    var metaItems = [];
    if (p.product) metaItems.push({ k: "Project", v: p.product });
    if (d.meta && d.meta.length) metaItems = metaItems.concat(d.meta);

    if (metaItems.length) {
      var metaCol = el("div", "pj-head__meta");
      var dl = el("dl", "pj-meta");
      metaItems.forEach(function (m) {
        var wrap = el("div", "pj-meta__item");
        wrap.appendChild(el("dt", "pj-meta__k t-label is-caps", m.k));
        wrap.appendChild(el("dd", "pj-meta__v", m.v));
        dl.appendChild(wrap);
      });
      metaCol.appendChild(dl);
      head.appendChild(metaCol);
    }

    return head;
  }

  function buildBentoMedia(d, layout) {
    var wrap = el("div", "pj-bento__media pj-bento-media pj-bento-media--" + layout);
    var tiles = d.bentoTiles || [];

    tiles.forEach(function (tile) {
      var cell = el("div", "pj-bento-media__tile pj-bento-media__tile--" + tile.area);
      cell.appendChild(media(tile.media));
      wrap.appendChild(cell);
    });

    if (d.hero) {
      var hero = el("div", "pj-hero pj-bento-media__hero pj-hero--" + (d.hero.fit || "cover"));
      hero.appendChild(media(d.hero));
      wrap.appendChild(hero);
    }

    return wrap;
  }

  window.getProject = function (id) {
    return (window.PROJECTS || []).filter(function (p) {
      return p.id === id;
    })[0];
  };

  window.renderProject = function (root, p) {
    if (!root || !p) return;
    var d = p.detail || {};
    var mediaLayout = resolveBentoMedia(p, d);

    root.className = "pj-doc detail-split";
    root.innerHTML = "";

    var bento = el("div", "pj-bento");
    bento.appendChild(buildHead(p, d));

    if (d.hero || (d.bentoTiles && d.bentoTiles.length)) {
      bento.appendChild(buildBentoMedia(d, mediaLayout));
    }

    (d.sections || []).forEach(function (s) {
      var sec = el("section", "pj-sec pj-bento__sec");
      if (s.title || s.body || s.kicker) {
        var sh = el("div", "pj-sechead");
        if (s.kicker) sh.appendChild(el("span", "pj-kicker t-grad", s.kicker));
        if (s.title) sh.appendChild(el("h2", "pj-sectitle t-display", s.title));
        if (s.body) sh.appendChild(el("p", "pj-body", s.body));
        sec.appendChild(sh);
      }
      var grid = el("div", "pj-grid pj-grid--" + (s.layout || "full"));
      (s.media || []).forEach(function (m) {
        grid.appendChild(media(m));
      });
      sec.appendChild(grid);
      bento.appendChild(sec);
    });

    root.appendChild(bento);
  };

  window.initInview = function (scope) {
    var vids = (scope || document).querySelectorAll("video[data-inview]");
    if (!vids.length) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          var detailActive =
            document.body.classList.contains("is-detail-opening") ||
            document.body.classList.contains("is-detail-open") ||
            document.body.classList.contains("is-detail-closing");
          var bulgeGrid =
            document.body.classList.contains("bento-bulge-page") && v.closest("#grid");
          if (bulgeGrid) return;
          if (e.isIntersecting) {
            if (v.closest("#grid") && detailActive) return;
            v.play().catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: "12% 0px" }
    );
    vids.forEach(function (v) {
      io.observe(v);
    });
  };

  window.initReveal = function (scope) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var root = scope || document;
    var items = root.querySelectorAll(".reveal");
    if (reduce || coarse) {
      items.forEach(function (n) {
        n.classList.add("in");
      });
      return;
    }
    var scrollRoot = root.closest ? root.closest(".reader__panel") : null;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      {
        root: scrollRoot || null,
        threshold: 0,
        rootMargin: "0px 0px -4% 0px",
      }
    );
    items.forEach(function (n) {
      io.observe(n);
    });
  };
})();
