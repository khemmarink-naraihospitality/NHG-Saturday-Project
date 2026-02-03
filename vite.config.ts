import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit (default is 500 KB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks to split vendor libraries
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'framer-motion', '@tanstack/react-virtual'],
          // DnD Kit
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // State management
          'state-vendor': ['zustand'],
          // Date utilities
          'date-vendor': ['date-fns', 'react-day-picker'],
        },
      },
    },
  },
})
