/* eslint-disable node/prefer-global/process */
import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import fg from "fast-glob";
import minimist from "minimist";
import { defineConfig, loadEnv } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const pluginInfo = require("./plugin.json");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const args = minimist(process.argv.slice(2));
  const isWatch = args.watch || args.w || false;
  const workspacePluginDir = env.VITE_SIYUAN_WORKSPACE_PATH
    ? `${env.VITE_SIYUAN_WORKSPACE_PATH}/data/plugins/${pluginInfo.name}`
    : "";
  const distDir = workspacePluginDir || (isWatch ? "dev" : "dist");

  return {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    plugins: [
      vue(),
      viteStaticCopy({
        targets: [
          {
            src: "./README*.md",
            dest: "./",
          },
          {
            src: "./icon.png",
            dest: "./",
          },
          {
            src: "./preview.png",
            dest: "./",
          },
          {
            src: "./plugin.json",
            dest: "./",
          },
          {
            src: "./src/i18n/**",
            dest: "./i18n/",
          },
        ],
      }),
    ],
    define: {
      "process.env.DEV_MODE": `"${isWatch}"`,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      outDir: distDir,
      emptyOutDir: !isWatch,
      sourcemap: false,
      minify: !isWatch,
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        fileName: "index",
        formats: ["cjs"],
      },
      rollupOptions: {
        plugins: [
          ...(isWatch
            ? [
                {
                  name: "watch-external",
                  async buildStart() {
                    const files = await fg([
                      "src/i18n/*.json",
                      "./README*.md",
                      "./plugin.json",
                    ]);
                    for (const file of files) {
                      this.addWatchFile(file);
                    }
                  },
                },
              ]
            : []),
        ],
        external: ["siyuan", "process"],
        output: {
          entryFileNames: "[name].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === "style.css") {
              return "index.css";
            }
            return assetInfo.name;
          },
        },
      },
    },
  };
});
