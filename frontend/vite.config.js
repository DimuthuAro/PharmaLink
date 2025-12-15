import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      include: "**/*.{jsx,tsx}",
    }),
  ],

  server: {
    port: 3000,
    open: true,
    cors: true,
    hmr: { overlay: true },
  },

  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          icons: ["@heroicons/react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@pages": resolve(__dirname, "./src/pages"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@hooks": resolve(__dirname, "./src/hooks"),
      "@assets": resolve(__dirname, "./src/assets"),
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@heroicons/react/24/outline",
      "@heroicons/react/24/solid",
    ],
  },

  preview: {
    port: 4173,
    open: true,
  },

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
  },
});
