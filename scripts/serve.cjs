#!/usr/bin/env node
/**
 * Static server with directory index support (like S3/Apache).
 * SmoothState fetches paths like /about — needs /about/index.html.
 * Concept v1 project URLs (/concepts/v1/{id}/) fall back to v1 shell.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 8080;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".ai": "application/postscript",
  ".txt": "text/plain",
};

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const stripped = decoded.replace(/\/+$/, "") || "/";
  const rel = stripped === "/" ? "/index.html" : stripped;
  const candidates = [];

  if (path.extname(rel)) {
    candidates.push(rel);
  } else {
    candidates.push(rel + "/index.html", rel + ".html");
  }

  for (const candidate of candidates) {
    const file = path.join(root, candidate);
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return file;
    }
  }

  const v1Project = stripped.match(/^\/concepts\/v1\/([^/]+)$/);
  if (v1Project && v1Project[1] !== "index.html") {
    const projectIndex = path.join(root, "concepts/v1", v1Project[1], "index.html");
    if (fs.existsSync(projectIndex)) return projectIndex;
    const v1Index = path.join(root, "concepts/v1/index.html");
    if (fs.existsSync(v1Index)) return v1Index;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(url.parse(req.url).pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end(String(err));
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Serving ${root}`);
  console.log(`Open http://localhost:${port}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other server or run PORT=8090 npm start`);
    process.exit(1);
  }
  throw err;
});
