import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh configuration
      fastRefresh: true,
      // Include .jsx files
      include: "**/*.{jsx,tsx}",
    }), 
    tailwindcss()
  ],
  
  // Development server configuration
  server: {
    port: 5173,
    open: true,
    cors: true,
    hmr: {
      overlay: true
    },
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Build configuration
  build: {
    // Target modern browsers for better performance
    target: 'esnext',
    
    // Enable minification
    minify: 'terser',
    
    // Generate sourcemaps for debugging
    sourcemap: true,
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@heroicons')) return 'vendor-icons';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('tesseract') || id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-heavy';
          }
        }
      }
    },

    chunkSizeWarningLimit: 600
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@assets': resolve(__dirname, './src/assets')
    }
  },

  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid'
    ]
  },

  // Preview configuration for production builds
  preview: {
    port: 4173,
    open: true
  },

  // Environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
})
