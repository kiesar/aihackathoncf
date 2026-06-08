import { resolve } from "path";
import fs from "fs";

const STATIC_DIR = resolve(".next/static");
const SERVER_DIR = resolve(".next/server");

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Serve static files
    if (pathname.startsWith("/_next/static/")) {
      const filePath = resolve(STATIC_DIR, pathname.replace("/_next/static/", ""));
      try {
        const content = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        return new Response(content, {
          headers: { "Content-Type": contentType },
        });
      } catch (e) {
        return new Response("Not Found", { status: 404 });
      }
    }

    // Serve public assets
    if (!pathname.startsWith("/_next/") && !pathname.startsWith("/api/")) {
      const filePath = resolve(".next/server/chunks/public", pathname);
      try {
        const content = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        return new Response(content, {
          headers: { "Content-Type": contentType },
        });
      } catch (e) {
        // Continue to Next.js handler
      }
    }

    // Handle API routes and pages with Next.js
    const { handleRequest } = await import("./.next/server/index.js");
    return handleRequest(request, env, ctx);
  },
};

function getContentType(filePath) {
  const ext = filePath.split(".").pop();
  const types = {
    js: "application/javascript",
    css: "text/css",
    html: "text/html",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    svg: "image/svg+xml",
    woff: "font/woff",
    woff2: "font/woff2",
  };
  return types[ext] || "application/octet-stream";
}
