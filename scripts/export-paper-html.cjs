#!/usr/bin/env node
/**
 * Generate Paper-compatible HTML chunks from v1 home + project pages.
 * Output: exports/paper/chunks.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "exports/paper/chunks.json");

const projectsCode = fs.readFileSync(path.join(ROOT, "javascripts/projects.js"), "utf8");
const PROJECTS = Function(
  "window",
  projectsCode.replace(/^[\s\S]*?window\.PROJECTS\s*=\s*/, "return ") + ";"
)({});

const W = 1440;
const PAD = 40;
const GAP = 4;
const ROW = 89;
const COL = (W - 8 - GAP * 5) / 6;

function asset(src) {
  const rel = src.replace(/^\//, "");
  return "paper-asset://" + path.join(ROOT, rel);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gridRect(c1, c2, r1, r2) {
  const left = 4 + (c1 - 1) * (COL + GAP);
  const top = 4 + (r1 - 1) * (ROW + GAP);
  const width = (c2 - c1) * COL + (c2 - c1 - 1) * GAP;
  const height = (r2 - r1) * ROW + (r2 - r1 - 1) * GAP;
  return { left, top, width, height };
}

const TILE_LAYOUT = {
  "quest-people": [1, 4, 1, 5],
  "horizon-chat": [4, 7, 1, 5],
  "horizon-mobile": [1, 3, 5, 13],
  "portal-voice": [3, 5, 5, 8],
  "portal-household": [5, 7, 5, 8],
  "mk-play": [3, 5, 8, 13],
  "life360-messaging": [5, 7, 8, 13],
};

function tileHtml(p) {
  const [c1, c2, r1, r2] = TILE_LAYOUT[p.id];
  const rect = gridRect(c1, c2, r1, r2);
  const m = p.tile || {};
  const fit = m.fit || "cover";
  const media =
    m.type === "video"
      ? `<video src="${asset(m.src)}" style="display: block; width: 100%; height: 100%; object-fit: ${fit};" loop playsinline></video>`
      : `<img src="${asset(m.src)}" alt="${esc(p.title)}" style="display: block; width: 100%; height: 100%; object-fit: ${fit};" />`;
  const containBg =
    fit === "contain"
      ? "background: radial-gradient(120% 100% at 50% 0%, #2c2336, #14101c);"
      : "";

  return `<div layer-name="Tile — ${esc(p.title)}" style="position: absolute; left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px; border-radius: 8px; overflow: hidden; background-color: #07060a; border: 1px solid transparent;">
  <div style="position: absolute; inset: 0; overflow: hidden; ${containBg}">${media}</div>
  <div style="position: absolute; inset: 0; background: linear-gradient(15deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.34) 28%, transparent 50%); opacity: 0.72;"></div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 18px; display: flex; flex-direction: column; gap: 5px;">
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; letter-spacing: 0.03em; color: rgba(255,255,255,0.8);">${esc(p.product)}</p>
    <h2 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 22px; line-height: 1.02; letter-spacing: -0.01em; color: #ffffff;">${esc(p.title)}</h2>
  </div>
</div>`;
}

function homeChunks() {
  const gridHeight = 4 + 12 * ROW + 11 * GAP;
  const tiles = PROJECTS.map(tileHtml).join("\n");

  return [
    {
      name: "Page shell",
      html: `<div layer-name="Home shell" style="display: flex; flex-direction: column; width: ${W}px; background-color: #07060a; position: relative; overflow: hidden;">
  <div layer-name="Home background" style="position: absolute; inset: 0; background: radial-gradient(ellipse 100% 85% at 50% 100%, #2a2130 0%, #151118 50%, #0a080c 75%, #000 100%); pointer-events: none;"></div>
</div>`,
    },
    {
      name: "Portfolio grid",
      html: `<div layer-name="Portfolio grid" style="position: relative; width: ${W}px; height: ${gridHeight}px; padding: 0 0 48px 0;">
${tiles}
</div>`,
    },
    {
      name: "About header",
      html: `<div layer-name="About" style="display: flex; flex-direction: column; width: ${W}px; padding: 96px ${PAD}px 116px ${PAD}px; box-sizing: border-box; gap: 56px;">
  <h1 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 98px; line-height: 0.98; letter-spacing: -0.01em; color: #ffffff;">About</h1>
</div>`,
    },
    {
      name: "About intro",
      html: `<div layer-name="About intro" style="display: flex; flex-direction: row; width: ${W - PAD * 2}px; gap: 48px; padding: 0 ${PAD}px; box-sizing: border-box; align-items: flex-start;">
  <div style="width: 280px; flex-shrink: 0; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.16); background-color: #17131f; box-shadow: 0 30px 80px -40px rgba(0,0,0,0.85);">
    <img src="${asset("images/jesse-ochapo-portrait.jpg")}" alt="Portrait of Jesse O'Chapo" style="display: block; width: 100%; height: auto; aspect-ratio: 4/5; object-fit: cover;" />
  </div>
  <div style="display: flex; flex-direction: column; gap: 22px; flex: 1; min-width: 0;">
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 19px; line-height: 1.65; color: rgba(255,255,255,1);">Hello! I'm Jesse O'Chapo, a Principal Product Designer at Meta, based in Santa Cruz, CA. Previously, I designed at Life360, Fanpics, and MTV.</p>
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 17px; line-height: 1.65; color: rgba(255,255,255,0.8);">I built my first website in 1998 to host my Starcraft maps (twinkling star GIF background and all). That turned into a career that started in 2006, ran through early-stage startups, and landed me at Meta in 2017.</p>
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 17px; line-height: 1.65; color: rgba(255,255,255,0.8);">During my 9+ years at Meta I've grown from Product Designer to Senior, Staff, and now Principal. I specialize in turning ambiguous zero-to-one initiatives into clear product direction.</p>
  </div>
</div>`,
    },
    {
      name: "How I work",
      html: `<div layer-name="How I work" style="display: flex; flex-direction: column; width: ${W}px; padding: 48px ${PAD}px 0 ${PAD}px; box-sizing: border-box; gap: 40px; border-top: 1px solid rgba(255,255,255,0.08);">
  <h2 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 42px; line-height: 1.05; color: #ffffff;">How I work</h2>
  <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px; width: 100%;">
    ${[
      ["Systems thinker.", "My happy place is ambiguous problems that require orchestrating across multiple teams."],
      ["Full stack designer.", "My days range from developing product strategy to sweating visual polish."],
      ["Mentor.", "I get a lot of joy from scaling my experiences through mentorship and coaching."],
      ["Growth mindset.", "I cringe at all my old work and enjoy reflecting on how to improve."],
      ["Get it done.", "Not knowing how to do something does not stop me figuring it out and getting it done."],
      ["Inclusive process.", "My best work materializes by sharing, discussing, and seeking new perspectives."],
    ]
      .map(
        ([t, b]) =>
          `<div style="width: calc(33.333% - 3px); padding: 28px; border-radius: 8px; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;">
      <h3 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 18px; line-height: 1.15; color: #ffffff;">${esc(t)}</h3>
      <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 15px; line-height: 1.55; color: #847e96;">${esc(b)}</p>
    </div>`
      )
      .join("")}
  </div>
</div>`,
    },
    {
      name: "About links + dock",
      html: `<div layer-name="Footer area" style="display: flex; flex-direction: column; width: ${W}px; padding: 72px ${PAD}px 125px ${PAD}px; box-sizing: border-box; gap: 48px;">
  <div style="display: flex; flex-direction: row; gap: 36px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.08);">
    <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.55);">LinkedIn</span>
    <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.55);">GitHub</span>
    <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.55);">jesse@chapolito.com</span>
  </div>
  <div style="display: flex; flex-direction: row; align-items: flex-end; justify-content: space-between; width: 100%; height: 72px; padding-bottom: 24px; border-top: 1px solid rgba(255,255,255,0.08); background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.62) 100%);">
    <img src="${asset("images/chapolito-logo-footer.svg")}" alt="Chapolito" style="display: block; height: 26px; width: auto;" />
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 12px; color: rgba(255,255,255,0.55); text-align: center;">
      <span style="font-weight: 700; color: rgba(255,255,255,1);">Jesse O'Chapo</span>
      <span style="opacity: 0.38;"> · </span>
      <span>Principal Product Designer</span>
      <span style="opacity: 0.38;"> · </span>
      <span>Santa Cruz, CA</span>
    </p>
    <div style="display: flex; flex-direction: row; gap: 28px;">
      <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.88);">Portfolio</span>
      <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.55);">About</span>
    </div>
  </div>
</div>`,
    },
  ];
}

function metaRow(k, v, border) {
  return `<div style="display: flex; flex-direction: row; align-items: baseline; gap: 56px; padding: ${border ? "20px 0 20px 0" : "0 0 20px 0"}; ${border ? "border-top: 1px solid rgba(255,255,255,0.08);" : ""}">
  <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.6); width: 88px; flex-shrink: 0;">${esc(k)}</span>
  <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 16px; line-height: 1.35; color: rgba(255,255,255,0.8);">${esc(v)}</span>
</div>`;
}

function mediaFig(m) {
  const fit = m.fit || "cover";
  const inner =
    m.type === "video"
      ? `<video src="${asset(m.src)}" style="display: block; width: 100%; height: 100%; object-fit: ${fit};" loop playsinline></video>`
      : `<img src="${asset(m.src)}" alt="${esc(m.alt || "")}" style="display: block; width: 100%; height: 100%; object-fit: ${fit};" />`;
  return `<div style="position: relative; width: 100%; height: 100%; border-radius: 14px; overflow: hidden; background-color: #2a2130; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.8);">${inner}</div>`;
}

function householdChunks() {
  const p = PROJECTS.find((x) => x.id === "portal-household");
  const d = p.detail;
  const unit = 89;
  const maxW = 1200;
  const sidePad = (W - maxW) / 2;

  const showcase = `<div layer-name="Bento media" style="position: relative; width: ${W}px; height: ${unit * 4 + GAP * 3}px; padding: 0 4px; box-sizing: border-box;">
  <div style="position: absolute; left: 4px; top: 0; width: ${COL}px; height: ${unit * 4 + GAP * 3}px;">${mediaFig(d.bentoTiles[0].media)}</div>
  <div style="position: absolute; left: ${4 + COL + GAP + COL + GAP}px; top: 0; width: ${COL * 3 + GAP * 2}px; height: ${unit * 4 + GAP * 3}px;">${mediaFig(d.hero)}</div>
  <div style="position: absolute; left: ${4 + (COL + GAP) * 4}px; top: 0; width: ${COL * 2 + GAP}px; height: ${unit * 2 + GAP}px;">${mediaFig(d.bentoTiles[1].media)}</div>
  <div style="position: absolute; left: ${4 + (COL + GAP) * 4}px; top: ${unit * 2 + GAP * 2}px; width: ${COL * 2 + GAP}px; height: ${unit * 2 + GAP}px;">${mediaFig(d.bentoTiles[2].media)}</div>
</div>`;

  return [
    {
      name: "Shell + back button",
      html: `<div layer-name="Household shell" style="display: flex; flex-direction: column; width: ${W}px; background-color: #07060a; padding-top: 96px; box-sizing: border-box; position: relative;">
  <div style="display: flex; flex-direction: row; justify-content: center; width: 100%; padding-bottom: 32px;">
    <div style="display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.45); background: linear-gradient(96deg, #d6b6f0 0%, #f3c2ce 46%, #ffc59e 100%); box-shadow: 0 4px 24px rgba(214,182,240,0.35);">
      <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #1a1320;">Back to Home</span>
    </div>
  </div>
</div>`,
    },
    {
      name: "Header",
      html: `<div layer-name="Project header" style="display: flex; flex-direction: row; align-items: flex-end; justify-content: space-between; width: ${maxW}px; padding: 0 ${PAD}px 40px ${PAD}px; box-sizing: border-box; gap: 80px;">
  <div style="display: flex; flex-direction: column; gap: 24px; flex: 1; min-width: 0;">
    <h1 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 98px; line-height: 0.98; letter-spacing: -0.01em; color: #ffffff;">${esc(p.title)}</h1>
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 19px; line-height: 1.58; color: rgba(255,255,255,0.8); max-width: 72ch;">${esc(d.lede)}</p>
  </div>
  <div style="display: flex; flex-direction: column; width: 320px; flex-shrink: 0;">
    ${metaRow("Project", p.product, false)}
    ${d.meta.map((m, i) => metaRow(m.k, m.v, true)).join("")}
  </div>
</div>`,
    },
    { name: "Bento media", html: showcase },
    ...d.sections.map((s, i) => ({
      name: `Section — ${s.title}`,
      html: `<div layer-name="${esc(s.title)}" style="display: flex; flex-direction: column; width: ${maxW}px; padding: 56px ${PAD}px 0 ${PAD}px; box-sizing: border-box; gap: 28px;">
  <div style="display: flex; flex-direction: column; gap: 14px;">
    <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; background: linear-gradient(96deg, #d6b6f0 0%, #f3c2ce 46%, #ffc59e 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">${esc(s.kicker)}</span>
    <h2 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 42px; line-height: 1.05; color: #ffffff;">${esc(s.title)}</h2>
    <p style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 17px; line-height: 1.6; color: rgba(255,255,255,0.8); max-width: 60ch;">${esc(s.body)}</p>
  </div>
  <div style="display: flex; flex-direction: ${s.layout === "grid2" ? "row" : s.layout === "grid3" ? "row" : "column"}; gap: 14px; width: 100%;">
    ${s.media
      .map((m) => {
        const h =
          s.layout === "full"
            ? "aspect-ratio: 16/9; width: 100%;"
            : s.layout === "grid2"
              ? "width: calc(50% - 7px); aspect-ratio: 4/5;"
              : "width: calc(33.333% - 10px); aspect-ratio: 3/4;";
        return `<div style="${h}">${mediaFig(m)}</div>`;
      })
      .join("")}
  </div>
</div>`,
    })),
    {
      name: "CTA + dock",
      html: `<div layer-name="CTA" style="display: flex; flex-direction: column; width: ${maxW}px; padding: 72px ${PAD}px 125px ${PAD}px; box-sizing: border-box; gap: 24px;">
  <h2 style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 42px; color: #ffffff;">Let's talk.</h2>
  <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 16px; color: rgba(255,255,255,0.8);">jesse@chapolito.com</span>
</div>`,
    },
  ];
}

const output = {
  home: {
    name: "Home — V1",
    width: W,
    height: "fit-content",
    chunks: homeChunks(),
  },
  household: {
    name: "Household Mode — V1",
    width: W,
    height: "fit-content",
    chunks: householdChunks(),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
console.log("Wrote", OUT);
console.log("Home chunks:", output.home.chunks.length);
console.log("Household chunks:", output.household.chunks.length);
