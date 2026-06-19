(function () {
  var wall = document.getElementById("wall");
  var projects = window.PROJECTS || [];

  projects.forEach(function (p, i) {
    var a = document.createElement("a");
    a.className = "cell";
    a.href = "../project.html?id=" + encodeURIComponent(p.id) + "&from=v2";
    a.dataset.id = p.id;
    a.dataset.fit = (p.tile && p.tile.fit) || "cover";
    a.setAttribute("aria-label", p.title + " — " + p.product);

    var media = document.createElement("div");
    media.className = "cell__media";
    var m = p.tile || {};
    if (m.type === "video") {
      var v = document.createElement("video");
      v.src = m.src;
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "metadata";
      v.setAttribute("data-inview", "");
      media.appendChild(v);
    } else {
      var img = document.createElement("img");
      img.src = m.src; img.alt = p.title; img.loading = "lazy";
      media.appendChild(img);
    }

    var cap = document.createElement("div");
    cap.className = "cell__cap";
    var num = document.createElement("span");
    num.className = "cell__num";
    num.textContent = String(i + 1).padStart(2, "0") + " · " + p.product;
    var t = document.createElement("h2");
    t.className = "cell__title";
    t.textContent = p.title;
    cap.appendChild(num);
    cap.appendChild(t);

    a.appendChild(media);
    a.appendChild(cap);
    wall.appendChild(a);

    /* tag the clicked element so the View Transition morphs it into
       the project hero (graceful no-op where unsupported) */
    a.addEventListener("click", function () {
      wall.querySelectorAll(".cell.is-going").forEach(function (n) {
        n.classList.remove("is-going");
      });
      a.classList.add("is-going");
    });
  });

  window.initInview(wall);
})();
