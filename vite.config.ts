import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // Tách thư viện ra file riêng: ít thay đổi nên trình duyệt giữ cache lâu, cập nhật app tải lại ít hơn
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/@supabase/') || id.includes('/iceberg-js/')) return 'vendor-supabase';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react';
            if (id.includes('/lucide-react/')) return 'vendor-icons';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
