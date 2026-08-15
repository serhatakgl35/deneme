import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fontSizeBoost = {
  postcssPlugin: 'pbys-font-size-boost',
  Declaration(decl: { prop: string; value: string }) {
    if (decl.prop !== 'font-size') return;
    const value = decl.value.trim();
    if (/^\d*\.?\d+(px|pt|rem|em|%)$/i.test(value)) {
      decl.value = `calc(${value} + 2pt)`;
    }
  }
};

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [fontSizeBoost]
    }
  },
  server: { port: 5173 },
  preview: { port: 4173 }
});
