(function () {
  var roll = document.getElementById("roll");
  var projects = window.PROJECTS || [];
  var total = projects.length;
  var openPiece = null;

  var placard = document.getElementById("placard");
  var plIdx = document.getElementById("pl-idx");
  var plTitle = document.getElementById("pl-title");
  var plSub = document.getElementById("pl-sub");

  function firstSentence(s) {
    if (!s) return "";
    var m = s.match(/^.*?[.!?](\s|$)/);
    return m ? m[0].trim() : s;
  }

  projects.forEach(function (p, i) {
    var piece = document.createElement("section");
    piece.className = "piece";
    piece.dataset.id = p.id;
    piece.dataset.orient = p.orientation || "landscape";
    piece.dataset.fit = (p.tile && p.tile.fit) || "cover";

    var head = document.createElement("div");
    head.className = "piece__head";
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.setAttribute("aria-expanded", "false");

    var media = document.createElement("div");
    media.className = "piece__media";
    var m = p.tile || {};
    if (m.type === "video") {
      var v = document.createElement("video");
      v.src = m.src; v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute("playsinline", ""); v.preload = "metadata";
      v.setAttribute("data-inview", "");
      media.appendChild(v);
    } else {
      var img = document.createElement("img");
      img.src = m.src; img.alt = p.title; img.loading = "lazy";
      media.appendChild(img);
    }

    var meta = document.createElement("div");
    meta.className = "piece__meta";
    meta.innerHTML =
      '<span class="piece__idx">' + String(i + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0") + "</span>" +
      '<span class="piece__product">' + p.product + "</span>" +
      '<h2 class="piece__title t-display">' + p.title + "</h2>" +
      '<p class="piece__blurb">' + firstSentence(p.detail && p.detail.lede) + "</p>";
    var open = document.createElement("span");
    open.className = "piece__open";
    open.innerHTML =
      "<span>Open</span><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6'><path d='M9 6l6 6-6 6' stroke-linecap='round' stroke-linejoin='round'/></svg>";
    meta.appendChild(open);

    head.appendChild(media);
    head.appendChild(meta);

    var more = document.createElement("div");
    more.className = "piece__more";
    var moreInner = document.createElement("div");
    var docEl = document.createElement("div");
    docEl.className = "pj-doc";
    moreInner.appendChild(docEl);
    more.appendChild(moreInner);

    piece.appendChild(head);
    piece.appendChild(more);
    roll.appendChild(piece);

    function toggle() {
      if (piece.classList.contains("is-open")) collapse(piece);
      else expand(piece, p, docEl);
    }
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });

    piece._idx = i;
    piece._p = p;
  });

  function expand(piece, p, docEl) {
    if (openPiece && openPiece !== piece) collapse(openPiece);
    if (!docEl.dataset.built) {
      window.renderProject(docEl, p);
      docEl.dataset.built = "1";
      window.initInview(docEl);
      docEl.querySelectorAll(".pj-sec, .pj-cta").forEach(function (n) { n.classList.add("reveal"); });
      requestAnimationFrame(function () { window.initReveal(docEl); });
    }
    piece.classList.add("is-open");
    piece.querySelector(".piece__head").setAttribute("aria-expanded", "true");
    openPiece = piece;
    history.pushState({ id: p.id }, "", "../project.html?id=" + encodeURIComponent(p.id) + "&from=v3");
    document.title = p.title + " — Jesse O'Chapo";
    setTimeout(function () {
      piece.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function collapse(piece, skipPop) {
    piece.classList.remove("is-open");
    piece.querySelector(".piece__head").setAttribute("aria-expanded", "false");
    if (openPiece === piece) openPiece = null;
    document.title = "Jesse O'Chapo — Principal Product Designer";
    if (!skipPop && history.state && history.state.id) history.back();
  }

  window.addEventListener("popstate", function (e) {
    var id = e.state && e.state.id;
    if (openPiece) collapse(openPiece, true);
    if (id) {
      var target = roll.querySelector('.piece[data-id="' + id + '"]');
      if (target) expand(target, target._p, target.querySelector(".pj-doc"));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openPiece) collapse(openPiece);
  });

  window.initInview(roll);

  /* live placard — track the piece nearest viewport center */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var p = e.target._p;
          var i = e.target._idx;
          plIdx.textContent = String(i + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
          plTitle.textContent = p.title;
          plSub.textContent = p.product;
          placard.classList.add("is-on");
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  roll.querySelectorAll(".piece").forEach(function (n) { io.observe(n); });

  /* deep link */
  var initial = new URLSearchParams(location.search).get("id");
  if (initial) {
    var t = roll.querySelector('.piece[data-id="' + initial + '"]');
    if (t) expand(t, t._p, t.querySelector(".pj-doc"));
  }
})();
