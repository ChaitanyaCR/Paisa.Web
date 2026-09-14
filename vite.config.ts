import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Avoid watch polling because it can spuriously refresh a preview when tool
// metadata changes; a stable review screen matters more than instant HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: false } }
    : undefined,
  // better-sqlite3 is a native addon: it must be loaded from node_modules at
  // runtime rather than bundled, or the compiled `.node` binary is lost.
  ssr: { external: ['better-sqlite3'] },
  optimizeDeps: { exclude: ['better-sqlite3'] },
  plugins: [tailwindcss(), vinext(), nitro()],
});
