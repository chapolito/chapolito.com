/**
 * Build v1 editorial grid tiles from PROJECTS (no overlay reader).
 */
export function buildV1Grid(grid, projects) {
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
    } else if (m.src) {
      var img = document.createElement("img");
      img.src = m.src;
      img.alt = p.title;
      img.loading = "eager";
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
  });
}
