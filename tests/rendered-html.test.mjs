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

test("starts the lightweight invitation only after extraction completes", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /event\.animationName !== "extractInvitation"/);
  assert.match(page, /phase === "revealed" && \(/);
  assert.match(
    page,
    /data=\{`invitation-choose\.svg\?v=2&animation=\$\{animationRun\}`\}/,
  );
  assert.match(page, /src="invitation-poster\.webp"/);
  assert.match(page, /src="invitation-base\.webp"/);
  assert.match(page, /HYBRID_RASTER_ASSET_COUNT = 7/);
  assert.match(page, /href="https:\/\/forms\.gle\/ouv3ACJxg21uFDa9A"/);
  assert.match(page, /Fill out this form!/);
  assert.match(page, /phase === "revealed" && formReady && \(/);
  assert.match(page, /#mask-choose-letter-5 animate:last-of-type/);
  assert.match(page, /4425/);
  assert.match(css, /animation:\s*extractInvitation 2\.55s/);
  assert.match(css, /animation:\s*waveFlag 4\.8s/);
  assert.match(css, /animation:\s*swayCouple 2\.4s 1\.2s/);
  assert.match(css, /\.form-button\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  const animatedChooseOverlay = await readFile(
    new URL("../public/invitation-choose.svg", import.meta.url),
    "utf8",
  );
  assert.match(animatedChooseOverlay, /<animate\b/);
  assert.match(animatedChooseOverlay, /id="choose-overlay"/);
  assert.match(animatedChooseOverlay, /stroke-opacity="0"/);
  assert.match(
    animatedChooseOverlay,
    /<set attributeName="stroke-opacity" to="1" begin="[\d.]+s" fill="freeze"/,
  );
});
