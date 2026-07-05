import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tasks = [
  ["frontend", ["run", "dev:frontend"]],
  ["kernel", ["run", "dev:kernel"]],
];

const children = tasks.map(([name, args]) => {
  const child = spawn(npmCommand, args, {
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      return;
    }
    if (code !== 0) {
      console.error(`[dev:${name}] exited with code ${code}`);
      stopAll();
      process.exit(code ?? 1);
    }
  });

  return child;
});

let stopping = false;

function stopAll() {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});
