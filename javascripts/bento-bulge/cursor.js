export function createCustomCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return { dispose() {} };
  }

  const el = document.createElement("div");
  el.className = "bento-bulge-cursor is-hidden";
  el.setAttribute("aria-hidden", "true");

  const dot = document.createElement("div");
  dot.className = "bento-bulge-cursor__dot";
  el.appendChild(dot);

  document.body.appendChild(el);
  document.body.classList.add("bento-bulge-has-cursor");

  function onPointerMove(event) {
    el.style.setProperty("--x", `${event.clientX}px`);
    el.style.setProperty("--y", `${event.clientY}px`);
    el.classList.remove("is-hidden");
  }

  function onPointerDown() {
    el.classList.add("is-pressed");
  }

  function onPointerUp() {
    el.classList.remove("is-pressed");
  }

  function onPointerLeave() {
    el.classList.add("is-hidden");
    el.classList.remove("is-pressed");
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.documentElement.addEventListener("mouseleave", onPointerLeave);

  return {
    dispose() {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      el.remove();
      document.body.classList.remove("bento-bulge-has-cursor");
    }
  };
}
