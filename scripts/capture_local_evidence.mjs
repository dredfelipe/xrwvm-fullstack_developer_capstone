import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.argv[2] || "http://127.0.0.1:8000";
const evidenceDir = resolve("evidence");
const profileDir = `/tmp/cars-dealership-evidence-${process.pid}`;
const debugPort = 9222;

await mkdir(evidenceDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--hide-scrollbars",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "--window-size=1440,1000",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitForJson(url, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome may still be starting.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const pages = await waitForJson(`http://127.0.0.1:${debugPort}/json`);
const page = pages.find((entry) => entry.type === "page");
if (!page) throw new Error("Chrome did not expose a page target");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolvePromise, reject) => {
  socket.addEventListener("open", resolvePromise, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve: resolvePromise, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolvePromise(message.result);
});

function command(method, params = {}) {
  sequence += 1;
  return new Promise((resolvePromise, reject) => {
    pending.set(sequence, { resolve: resolvePromise, reject });
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

async function navigate(path, waitMs = 7000) {
  await command("Page.navigate", { url: `${baseUrl}${path}` });
  await sleep(waitMs);
}

async function screenshot(filename) {
  const result = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(resolve(evidenceDir, filename), Buffer.from(result.data, "base64"));
  console.log(`Captured ${filename}`);
}

try {
  await command("Page.enable");
  await command("Runtime.enable");

  await navigate("/admin/login/?next=/admin/", 1000);
  await evaluate(`(() => {
    document.querySelector("#id_username").value = "root";
    document.querySelector("#id_password").value = "RootPass123!";
    document.querySelector("form").submit();
  })()`);
  await sleep(1500);
  await screenshot("admin_login.png");

  await navigate("/admin/logout/", 1000);
  await screenshot("admin_logout.png");

  await command("Network.clearBrowserCookies");
  await navigate("/dealers");
  await screenshot("get_dealers.png");

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
  await screenshot("get_dealers_loggedin.png");

  await navigate("/dealers?state=Kansas");
  await screenshot("dealersbystate.png");

  await navigate("/dealer/15");
  await screenshot("dealer_id_reviews.png");

  await navigate("/postreview/8");
  await evaluate(`(() => {
    const textarea = document.querySelector("#review");
    textarea.value = "Fantastic services";
    textarea.dispatchEvent(new Event("input", {bubbles: true}));
    const date = document.querySelector('input[type="date"]');
    date.value = "2026-06-10";
    date.dispatchEvent(new Event("change", {bubbles: true}));
    const select = document.querySelector("#cars");
    select.value = select.options[1].value;
    select.dispatchEvent(new Event("change", {bubbles: true}));
    const year = document.querySelector('input[type="number"]');
    year.value = "2023";
    year.dispatchEvent(new Event("change", {bubbles: true}));
  })()`);
  await sleep(500);
  await screenshot("dealership_review_submission.png");

  await evaluate(`fetch("/djangoapp/add_review", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: "Demo User",
      dealership: 8,
      review: "Fantastic services",
      purchase: true,
      purchase_date: "2026-06-09",
      car_make: "Toyota",
      car_model: "Camry",
      car_year: 2023
    })
  }).then(response => {
    if (!response.ok) throw new Error("Review submission failed");
    return response.json();
  })`);
  await navigate("/dealer/8");
  await screenshot("added_review.png");
} finally {
  socket.close();
  chrome.kill("SIGTERM");
  await sleep(500);
  await rm(profileDir, { recursive: true, force: true });
}
