import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
    env: {
      NEXT_PUBLIC_API_URL: "http://api.test",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
