const SITE_ORIGIN = "https://www.chapolito.com";

export const PAGE_META = {
  home: {
    title: "Portfolio of Jesse O'Chapo",
    description: "Chapolito.com is the portfolio of Product Designer Jesse O'Chapo.",
    url: `${SITE_ORIGIN}/`,
  },
  about: {
    title: "About · Jesse O'Chapo",
    description:
      "Jesse O'Chapo is a Principal Product Designer at Meta, based in Santa Cruz, CA. Previously Life360, Fanpics, and MTV.",
    url: `${SITE_ORIGIN}/about/`,
  },
};

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
}

export function projectMeta(project) {
  const lede = project.detail?.lede;
  return {
    title: `${project.title} · Jesse O'Chapo`,
    description: lede || `${project.title} — a case study by Product Designer Jesse O'Chapo.`,
    url: `${SITE_ORIGIN}/${encodeURIComponent(project.id)}/`,
  };
}

export function setPageMeta({ title, description, url }) {
  document.title = title;
  upsertMeta('meta[name="description"]', { name: "description", content: description });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
  if (url) {
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
  }
}
