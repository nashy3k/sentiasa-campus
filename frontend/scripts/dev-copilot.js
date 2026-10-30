const { spawn } = require("child_process");

process.env.PORT = "3002";
process.env.NEXT_DIST_DIR = ".next-copilot";

const isWindows = process.platform === "win32";
const cmd = isWindows ? "npx.cmd" : "npx";

console.log("[SENTIASA] Launching CopilotKit CoAgent Dev Server on Port 3002 (distDir: .next-copilot)...");

const child = spawn(cmd, ["next", "dev", "-p", "3002"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
