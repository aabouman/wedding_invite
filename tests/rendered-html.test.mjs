import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the finished wedding invitation shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sophie &amp; Alex \| Save the Date<\/title>/i);
  assert.match(html, /aria-label="Open Sophie and Alex/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/i);
});

test("starts the SVG only after the extraction completes", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /event\.animationName !== "extractInvitation"/);
  assert.match(page, /phase === "revealed" && \(/);
  assert.match(page, /data=\{`invitation\.svg\?animation=\$\{animationRun\}`\}/);
  assert.match(page, /href="https:\/\/forms\.gle\/ouv3ACJxg21uFDa9A"/);
  assert.match(page, /Fill out this form!/);
  assert.match(page, /phase === "revealed" && formReady && \(/);
  assert.match(page, /#mask-choose-letter-5 animate:last-of-type/);
  assert.match(page, /4425/);
  assert.match(css, /animation:\s*extractInvitation 2\.55s/);
  assert.match(css, /\.form-button\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  const animatedSvg = await readFile(
    new URL("../public/invitation.svg", import.meta.url),
    "utf8",
  );
  assert.match(animatedSvg, /<animate(?:Transform)?\b/);
});
