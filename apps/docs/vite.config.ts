import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/dbnexus/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5180,
    },
});
