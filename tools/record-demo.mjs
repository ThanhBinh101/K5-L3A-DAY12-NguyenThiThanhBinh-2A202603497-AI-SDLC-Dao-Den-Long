import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const width = 1280;
const height = 720;
const require = createRequire(import.meta.url);

function playwrightPackage() {
  if (process.env.DEMO_PLAYWRIGHT) return require(path.resolve(process.env.DEMO_PLAYWRIGHT));
  try {
    return require("playwright");
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    const bundled = path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
    if (existsSync(bundled)) return require(bundled);
    throw new Error("Install Playwright separately or set DEMO_PLAYWRIGHT to its package directory.");
  }
}

function captureCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  return { output: [stdout, stderr].filter(Boolean).join("\n"), status: result.status };
}

async function freePort() {
  const socket = createServer();
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url, server) {
  const limit = performance.now() + 8_000;
  while (performance.now() < limit) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local game server may still be starting.
    }
    await delay(100);
  }
  throw new Error(`Game server unavailable at ${url}.`);
}

async function caption(page, text) {
  await page.evaluate((text) => {
    document.querySelector("#record-demo-caption")?.remove();
    if (!text) return;
    const el = document.createElement("div");
    el.id = "record-demo-caption";
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed", top: "15px", left: "50%", transform: "translateX(-50%)",
      boxSizing: "border-box", width: "max-content", maxWidth: "70vw", padding: "11px 20px",
      borderRadius: "14px", background: "#281a32f2", color: "#fff8f5",
      boxShadow: "0 5px 21px #281a3248", zIndex: "1000", pointerEvents: "none",
      font: "600 18px/1.4 system-ui, sans-serif", textAlign: "center",
    });
    document.body.append(el);
  }, text);
}

async function gameTick(page) {
  const value = await page.locator("#world").getAttribute("data-tick");
  if (value === null || !/^\d+$/.test(value)) throw new Error("Game tick is unavailable in the browser.");
  return Number(value);
}

async function advanceTicks(page, count) {
  const start = await gameTick(page);
  const target = start + count;
  for (let tries = 0; tries < count * 2 + 8; tries++) {
    const current = await gameTick(page);
    if (current === target) return;
    // The virtual animation clock fires every 16ms, shorter than one game tick.
    await page.clock.runFor((target - current) * 16);
    const next = await gameTick(page);
    if (next > target) throw new Error(`Game skipped past tick ${target} to ${next}.`);
  }
  throw new Error(`Game failed to reach tick ${target}.`);
}

async function playScene(page, scene, recorder) {
  await caption(page, scene.caption);
  await recorder.frame();
  for (const action of scene.actions) {
    if (action.click) {
      const button = page.getByRole("button", { name: action.click, exact: true });
      if (!await button.isEnabled()) throw new Error(`Button ${action.click} is disabled.`);
      await button.click({ force: true });
      await recorder.frame();
    }
    if (action.press) {
      await page.keyboard.press(action.press);
      await advanceTicks(page, 1);
      recorder.hold(1000 / 60);
      await recorder.frame();
    }
    if (action.hold) {
      for (const key of action.hold) await page.keyboard.down(key);
      try {
        for (let remaining = action.ticks; remaining > 0; remaining -= 2) {
          const ticks = Math.min(2, remaining);
          await advanceTicks(page, ticks);
          recorder.hold(ticks * (1000 / 60));
          await recorder.frame();
        }
      } finally {
        for (const key of action.hold) await page.keyboard.up(key);
      }
    }
    if (action.wait) recorder.hold(action.wait);
    if (action.visible) await page.getByText(action.visible, { exact: true }).first().waitFor({ timeout: 4_000 });
    if (action.check) {
      const value = await page.locator(action.check.selector).getAttribute(action.check.attribute);
      if (value !== action.check.equals) {
        throw new Error(`Gameplay checkpoint ${action.check.attribute}: expected ${action.check.equals}, got ${value}.`);
      }
    }
  }
}

function shellLines(output, lines) {
  return output.split("\n").slice(-lines).join("\n");
}

async function evidenceCard(page, { label, heading, command, output, footer }) {
  await page.setContent(`
    <!doctype html>
    <html lang="vi">
    <meta charset="UTF-8">
    <title>Bằng chứng thử nghiệm · Đảo Đèn Lồng</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; padding: 48px 92px; color: #40233b; background:
        radial-gradient(circle at 85% 3%, #ffedc9, #ffedc900 30%),
        linear-gradient(150deg, #fff6f5, #f4e3f8); font: 20px system-ui, sans-serif; }
      .label { margin: 0; color: #924168; font-size: 15px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
      h1 { font: bold 42px/1.1 system-ui, sans-serif; margin: 12px 0 25px; letter-spacing: -.035em; }
      .terminal { background: #2d2035; padding: 20px 24px; border-radius: 20px; color: #ffecf6;
        box-shadow: 0 14px 44px #4a194426; overflow: hidden; }
      .command { color: #ffbd9e; font: 700 18px/1.2 ui-monospace, monospace; border-bottom: 1px solid #57425a; padding-bottom: 12px; }
      pre { font: 16px/1.33 ui-monospace, monospace; margin: 12px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
      .footer { color: #79446a; font-size: 17px; margin: 22px 0 0; }
    </style>
    <p class="label"></p><h1></h1>
    <div class="terminal"><div class="command"></div><pre></pre></div>
    <p class="footer"></p>
  `);
  await page.evaluate(({ label, heading, command, output, footer }) => {
    for (const [selector, value] of [
      [".label", label], ["h1", heading], [".command", command], ["pre", output], [".footer", footer],
    ]) {
      document.querySelector(selector).textContent = value;
    }
  }, { label, heading, command, output, footer });
}

function frameCollector(page, temp) {
  const frames = [];
  let time = 0;
  return {
    async frame() {
      if (frames.at(-1)?.time === time) frames.pop();
      const file = `frame-${String(frames.length).padStart(5, "0")}.jpg`;
      await page.screenshot({ path: path.join(temp, file), type: "jpeg", quality: 88 });
      frames.push({ file, time });
    },
    hold(ms) {
      time += ms / 1000;
    },
    finish() {
      if (frames.length < 8) throw new Error("The browser did not produce enough gameplay frames.");
      const index = path.join(temp, "frames.json");
      const durationSeconds = Math.max(frames.at(-1).time + 0.04, time);
      writeFileSync(index, JSON.stringify({ width, height, durationSeconds, frames }));
      console.log(`Captured ${frames.length} real browser frames for ${durationSeconds.toFixed(1)} s.`);
      return index;
    },
  };
}

async function main() {
  if (process.platform !== "darwin") throw new Error("The recording utility uses macOS AVFoundation for MP4 encoding.");
  const [routeArg, outputArg] = process.argv.slice(2);
  const routePath = routeArg ? path.resolve(routeArg) : path.join(root, "tools", "record-demo-route.json");
  const output = outputArg ? path.resolve(outputArg) : path.join(root, "docs", "demo", "demo.mp4");
  const route = JSON.parse(readFileSync(routePath, "utf8"));
  const verification = captureCommand("npm", ["run", "verify"]);
  const harness = readFileSync(path.join(root, "AGENTS.md"), "utf8").trim();
  const temp = mkdtempSync(path.join(tmpdir(), "dao-den-long-demo-"));
  let server;
  let browser;

  try {
    const executablePath = process.env.DEMO_CHROME
      || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    const { chromium } = playwrightPackage();
    const port = await freePort();
    const url = `http://127.0.0.1:${port}/`;
    server = spawn(process.execPath, [path.join(root, "tools", "serve.mjs"), "--port", String(port)], {
      cwd: root, stdio: "inherit",
    });
    await waitForServer(url, server);
    browser = await chromium.launch({
      executablePath, headless: true,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const clockStart = Date.UTC(2026, 0, 1);
    await page.clock.install({ time: clockStart });
    await page.clock.pauseAt(clockStart + 5_000);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#world").waitFor();
    await page.clock.runFor(48);
    const recorder = frameCollector(page, temp);
    const temporaryPoster = path.join(temp, "poster.jpg");
    for (const scene of route.scenes) {
      await playScene(page, scene, recorder);
      if (scene.poster) {
        await caption(page, "");
        await page.screenshot({ path: temporaryPoster, type: "jpeg", quality: 92 });
      }
      console.log(`Captured gameplay: ${scene.caption}`);
    }
    if (pageErrors.length) throw new Error(`Game errors: ${pageErrors.join("; ")}`);

    if (!existsSync(temporaryPoster)) {
      await caption(page, "");
      await page.screenshot({ path: temporaryPoster, type: "jpeg", quality: 92 });
    }
    await evidenceCard(page, {
      label: "Đảo Đèn Lồng · Kiểm chứng cục bộ",
      heading: verification.status === 0 ? "Bộ kiểm chứng bản thử đã đạt" : "Bộ kiểm chứng báo lỗi",
      command: "$ npm run verify",
      output: shellLines(verification.output, 17),
      footer: `Mã thoát: ${verification.status}. Kết quả lấy trực tiếp từ lệnh chạy trước khi quay.`,
    });
    await recorder.frame();
    recorder.hold(7_500);
    await evidenceCard(page, {
      label: "Đảo Đèn Lồng · AI SDLC",
      heading: "Hướng dẫn kiểm chứng cho agent",
      command: "$ cat AGENTS.md",
      output: harness,
      footer: "Xem báo cáo để đối chiếu phạm vi đã kiểm tra và các yêu cầu còn thiếu nguồn.",
    });
    await recorder.frame();
    recorder.hold(6_500);
    const index = recorder.finish();
    await browser.close();
    browser = undefined;

    const encoder = path.join(temp, "encode-mp4");
    const swift = captureCommand("swiftc", [
      "-module-cache-path", path.join(temp, "swift-cache"),
      "-O", "-parse-as-library", "tools/record-demo-encode.swift", "-o", encoder,
    ]);
    if (swift.status !== 0) throw new Error(swift.output);
    const temporaryVideo = path.join(temp, "demo.mp4");
    const encoding = captureCommand(encoder, [index, temporaryVideo]);
    if (encoding.status !== 0) throw new Error(encoding.output);

    mkdirSync(path.dirname(output), { recursive: true });
    renameSync(temporaryVideo, output);
    renameSync(temporaryPoster, path.join(path.dirname(output), "gameplay.jpg"));
    console.log(encoding.output);
    console.log(output);
    if (verification.status !== 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server?.kill();
    rmSync(temp, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
