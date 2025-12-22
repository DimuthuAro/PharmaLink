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
<<<<<<< HEAD
    port: 3000,
=======
    port: 5173,
>>>>>>> origin/main
    open: true,
    cors: true,
    hmr: {
      overlay: true
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
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['@heroicons/react']
        }
      }
    },

    // Optimize bundle size
    chunkSizeWarningLimit: 1000
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
