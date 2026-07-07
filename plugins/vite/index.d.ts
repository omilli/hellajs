interface VitePlugin {
  name: string;
  enforce: "pre";
  transform(code: string, id: string): Promise<{ code: string; map?: unknown } | null>;
}

export default function viteHellaJS(): VitePlugin;
