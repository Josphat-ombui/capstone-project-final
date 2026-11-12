/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built folder works from any static host or a sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
