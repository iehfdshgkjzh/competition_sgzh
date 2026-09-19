import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    open: "/index.html", // 默认打开上传页
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        upload: resolve(__dirname, "upload.html"),
        summary: resolve(__dirname, "summary.html"),
      },
    },
  },
});
