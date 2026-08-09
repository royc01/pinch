import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import zipPack from "vite-plugin-zip-pack";

const pluginInfo = require("./plugin.json");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');
  const workspacePluginDir = env.VITE_SIYUAN_WORKSPACE_PATH
    ? `${env.VITE_SIYUAN_WORKSPACE_PATH}/data/plugins/${pluginInfo.name}`
    : "";
  const distDir = workspacePluginDir || (isWatch ? "dev" : "dist");
  const shouldZipPackage = !isWatch && !workspacePluginDir;

  return {
    plugins: [
      ...(shouldZipPackage
        ? [
            zipPack({
              inDir: "./dist",
              outDir: "./",
              outFileName: "package.zip",
            }),
          ]
        : []),
    ],
    build: {
      outDir: distDir,
      emptyOutDir: false,
      sourcemap: false,
      minify: !isWatch,
      lib: {
        entry: resolve(__dirname, "src/kernel.ts"),
        fileName: "kernel",
        formats: ["iife"],
        name: "PinchKernel",
      },
      rollupOptions: {
        output: {
          entryFileNames: "kernel.js",
        },
      },
    },
  };
});
