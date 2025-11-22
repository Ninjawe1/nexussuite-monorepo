import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "NexusSuite/client/src"),
    },
  },
  test: {
    include: [
      "NexusSuite/client/src/tests/**/*.spec.ts",
    ],
    exclude: [
      "**/ui_backup_*/**",
      "**/backup_*/**",
      "NexusSuite/client/src/tests/e2e/**",
      "**/node_modules/**",
      "**/dist/**",
    ],
    environment: "node",
  },
});