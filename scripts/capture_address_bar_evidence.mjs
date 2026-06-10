import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const run = promisify(execFile);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.argv[2] || "http://127.0.0.1:8000";
const profileDir = `/tmp/cars-dealership-address-bar-${process.pid}`;
const debugPort = 9223;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const chrome = spawn(chromePath, [
  "--no-first-run",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "--new-window",
  "--window-position=0,0",
  "--window-size=1440,1000",
  "about:blank",
], { stdio: "ignore" });

async function waitForPage() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const pages = await response.json();
      const page = pages.find((entry) => entry.type === "page");
      if (page) return page;
    } catch {
      // Chrome may still be starting.
    }
    await sleep(100);
  }
  throw new Error("Chrome did not expose a page target");
}

const page = await waitForPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done, reject) => {
  socket.addEventListener("open", done, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message));
  else handler.resolve(message.result);
});

function command(method, params = {}) {
  sequence += 1;
  return new Promise((done, reject) => {
    pending.set(sequence, { resolve: done, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
}

async function evaluate(expression) {
  return command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function navigate(path) {
  await command("Page.navigate", { url: `${baseUrl}${path}` });
  await sleep(7000);
}

async function capture(filename) {
  await run("osascript", [
    "-e",
    'tell application "Google Chrome" to activate',
  ]);
  await sleep(800);
  await run("screencapture", [
    "-x",
    resolve("evidence", filename),
  ]);
  console.log(`Captured ${filename}`);
}

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await navigate("/dealers");
  await evaluate(`fetch("/djangoapp/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({userName: "demouser", password: "DemoPass123!"})
  }).then(response => response.json()).then(user => {
    sessionStorage.setItem("username", user.userName);
    sessionStorage.setItem("firstname", user.firstName);
    sessionStorage.setItem("lastname", user.lastName);
  })`);

  await navigate("/dealers");
  await capture("get_dealers_loggedin.png");

  await navigate("/dealers?state=Kansas");
  await capture("dealersbystate.png");

  await navigate("/dealer/15");
  await capture("dealer_id_reviews.png");
} finally {
  socket.close();
  chrome.kill("SIGTERM");
  await sleep(500);
  await rm(profileDir, { recursive: true, force: true });
}
