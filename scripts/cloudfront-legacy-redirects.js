// CloudFront Function (viewer-request) - 301 legacy paths to home.
// Prefixes use a trailing slash or exact match so live routes stay reachable
// (e.g. /portal-voice/, /horizon-chat/, /life360-messaging/, /quest-people/).

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (shouldRedirect(uri)) {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: "/" },
        "cache-control": { value: "public, max-age=3600" },
      },
    };
  }

  return request;
}

function shouldRedirect(uri) {
  if (!uri || uri === "/") return false;

  var legacy = [
    "free-design-resources",
    "fanpics",
    "spritzr",
    "the-wiki-game",
    "quest-for-business",
    "messenger-kids",
    "quest-vr",
    "portal",
    "horizon",
    "life360",
  ];

  for (var i = 0; i < legacy.length; i++) {
    if (matchesLegacyPrefix(uri, legacy[i])) return true;
  }

  return false;
}

function matchesLegacyPrefix(uri, name) {
  if (name === "portal") {
    if (startsWithSegment(uri, "portal-voice") || startsWithSegment(uri, "portal-household")) {
      return false;
    }
    return startsWithSegment(uri, "portal");
  }

  if (name === "horizon") {
    if (startsWithSegment(uri, "horizon-chat") || startsWithSegment(uri, "horizon-mobile")) {
      return false;
    }
    return startsWithSegment(uri, "horizon");
  }

  if (name === "life360") {
    if (startsWithSegment(uri, "life360-messaging")) return false;
    return startsWithSegment(uri, "life360");
  }

  if (name === "quest-vr") {
    if (startsWithSegment(uri, "quest-people")) return false;
    return startsWithSegment(uri, "quest-vr");
  }

  return startsWithSegment(uri, name);
}

function startsWithSegment(uri, segment) {
  return uri === "/" + segment || uri.indexOf("/" + segment + "/") === 0;
}
