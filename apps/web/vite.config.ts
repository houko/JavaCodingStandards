import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ogCards } from './og/plugin';

export default defineConfig({
	plugins: [ogCards(), tailwindcss(), cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart(), react()],
});
