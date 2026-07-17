// Hand-written minimal types (no `astro` import, so the plugin typechecks without `astro` installed).
// Astro's real types live in `astro` (peerDependency); these mirror the surface this integration uses.
interface AstroRendererConfig {
  name: string;
  clientEntrypoint: string;
  serverEntrypoint: string;
}

interface AstroConfigSetupOptions {
  updateConfig(config: { vite: { plugins: unknown[] } }): void;
  addRenderer(renderer: AstroRendererConfig): void;
}

interface AstroIntegration {
  name: string;
  hooks: {
    "astro:config:setup"?(options: AstroConfigSetupOptions): void;
  };
}

export default function hellajs(): AstroIntegration;
