/* ------------------------------------------------------------------
   Shared project renderer.
   Header → bento media strip → sections.
   Story layout — editorial sections with full-bleed media (Social VR).
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
    if (m.overlay) fig.classList.add("pj-fig--video-overlay");
    if (m.label) fig.classList.add("pj-fig--labeled");
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
    if (m.overlay && m.overlay.src) {
      var overlay = document.createElement("img");
      overlay.src = m.overlay.src;
      overlay.alt = m.overlay.alt || "";
      overlay.className = "pj-fig__overlay";
      overlay.loading = "lazy";
      fig.appendChild(overlay);
    }
    if (m.label) {
      var badge = el("span", "pj-fig__label t-label", m.label);
      fig.appendChild(badge);
    }
    return fig;
  }

  function resolveBentoMedia(p, d) {
    if (d.bentoMedia) return d.bentoMedia;
    if (d.bentoTiles && d.bentoTiles.length) return "showcase";
    return p.orientation === "portrait" ? "hero-portrait" : "hero-center";
  }

  function normalizeMetaItem(m) {
    if (m.brand || m.k !== "Project" || typeof m.v !== "string") return m;
    var match = m.v.match(/^Meta\s*[·•]\s*(.+)$/);
    if (!match) return m;
    return { k: m.k, brand: "meta", v: match[1] };
  }

  function buildMetaValue(m, valueClass) {
    var item = normalizeMetaItem(m);
    var dd = el("dd", valueClass);
    if (item.brand === "meta") {
      var row = el("span", "pj-meta-brand");
      var logo = document.createElement("img");
      logo.src = "/images/Meta-Logo.svg";
      logo.alt = "Meta";
      logo.className = "pj-meta-brand__logo";
      logo.width = 20;
      logo.height = 14;
      row.appendChild(logo);
      row.appendChild(el("span", "pj-meta-brand__name", item.v));
      dd.appendChild(row);
    } else {
      dd.textContent = item.v;
    }
    return dd;
  }

  function buildHead(p, d) {
    var head = el("header", "pj-head pj-bento__head");
    var copy = el("div", "pj-head__copy");
    copy.appendChild(el("h1", "pj-title t-display", p.title));
    head.appendChild(copy);

    var metaItems = [];
    if (p.product) metaItems.push({ k: "Project", v: p.product });
    if (d.meta && d.meta.length) metaItems = metaItems.concat(d.meta);

    if (metaItems.length) {
      var metaCol = el("div", "pj-head__meta");
      var dl = el("dl", "pj-meta");
      metaItems.forEach(function (m) {
        var wrap = el("div", "pj-meta__item");
        wrap.appendChild(el("dt", "pj-meta__k t-label", m.k));
        wrap.appendChild(buildMetaValue(m, "pj-meta__v"));
        dl.appendChild(wrap);
      });
      metaCol.appendChild(dl);
      head.appendChild(metaCol);
    }

    if (d.lede) appendLedes(head, d.lede, "pj-lede");

    return head;
  }

  function appendLedes(parent, lede, className) {
    var paragraphs = Array.isArray(lede) ? lede : [lede];
    paragraphs.forEach(function (text) {
      parent.appendChild(el("p", className, text));
    });
  }

  function buildStorySectionHead(title, intro) {
    var copy = el("div", "pj-story__section-head");
    if (title) copy.appendChild(el("h2", "pj-story__section-title t-display", title));
    if (intro) appendLedes(copy, intro, "pj-story__section-intro");
    return copy;
  }

  function buildStoryHead(p, d) {
    var head = el("header", "pj-story__head");
    head.appendChild(el("h1", "pj-story__title t-display", p.title));

    if (d.meta && d.meta.length) {
      head.appendChild(el("div", "pj-story__rule", ""));
      var meta = el("dl", "pj-story__meta");
      d.meta.forEach(function (m) {
        var item = el("div", "pj-story__meta-item");
        item.appendChild(el("dt", "pj-story__meta-k t-label", m.k));
        item.appendChild(buildMetaValue(m, "pj-story__meta-v"));
        meta.appendChild(item);
      });
      head.appendChild(meta);
    }

    return head;
  }

  function buildStoryMediaRow(row) {
    var layout = row.layout || ((row.media || []).length === 1 ? "full" : "double");
    var grid = el("div", "pj-story__media pj-story__media--" + layout);
    (row.media || []).forEach(function (m) {
      grid.appendChild(media(m));
    });
    return grid;
  }

  function buildStorySection(s) {
    var sec = el("section", "pj-story__section pj-sec reveal");
    if (s.title || s.intro) {
      sec.appendChild(buildStorySectionHead(s.title, s.intro));
    }

    if (s.mediaRows && s.mediaRows.length) {
      var stack = el("div", "pj-story__media-stack");
      s.mediaRows.forEach(function (row) {
        stack.appendChild(buildStoryMediaRow(row));
      });
      sec.appendChild(stack);
    } else if (s.media && s.media.length) {
      var grid = el("div", "pj-story__media pj-story__media--" + (s.layout || "grid2"));
      s.media.forEach(function (m) {
        grid.appendChild(media(m));
      });
      sec.appendChild(grid);
    }

    if (s.body) {
      var bodyWrap = el("div", "pj-story__body");
      var paragraphs = Array.isArray(s.body) ? s.body : [s.body];
      paragraphs.forEach(function (text) {
        bodyWrap.appendChild(el("p", "pj-story__body-p", text));
      });
      sec.appendChild(bodyWrap);
    }

    return sec;
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

  function buildStoryHero(hero) {
    var wrap = el("div", "pj-story__hero pj-sec reveal");
    wrap.appendChild(media(hero));
    return wrap;
  }

  function buildStoryFootnote(footnote) {
    var wrap = el("div", "pj-story__footnote pj-sec reveal");
    var p = el("p", "pj-story__footnote-p");
    if (footnote && typeof footnote === "object") {
      p.appendChild(el("strong", "pj-story__footnote-lead", footnote.lead));
      p.appendChild(document.createTextNode(" " + footnote.body));
    } else {
      p.textContent = footnote;
    }
    wrap.appendChild(p);
    return wrap;
  }

  function renderStory(root, p, d) {
    root.className = "pj-doc pj-doc--story detail-split";
    root.innerHTML = "";

    var story = el("article", "pj-story");
    if (d.storyColumn === "992") story.classList.add("pj-story--col-992");
    if (d.intro) story.classList.add("pj-story--lead");
    story.appendChild(buildStoryHead(p, d));
    if (d.intro) {
      var lead = el("div", "pj-story__lead pj-sec reveal");
      lead.appendChild(buildStorySectionHead(null, d.intro));
      story.appendChild(lead);
    }
    if (d.hero) story.appendChild(buildStoryHero(d.hero));
    if (d.footnote) story.appendChild(buildStoryFootnote(d.footnote));
    (d.sections || []).forEach(function (s) {
      story.appendChild(buildStorySection(s));
    });
    root.appendChild(story);
  }

  function renderBento(root, p, d) {
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
  }

  window.getProject = function (id) {
    return (window.PROJECTS || []).filter(function (p) {
      return p.id === id;
    })[0];
  };

  window.renderProject = function (root, p) {
    if (!root || !p) return;
    var d = p.detail || {};
    if (d.layout === "story") {
      renderStory(root, p, d);
      return;
    }
    renderBento(root, p, d);
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
