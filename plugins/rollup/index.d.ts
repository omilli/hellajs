interface RollupPlugin {
  name: string;
  enforce: "pre";
  resolveId(source: string, importer?: string): Promise<string | null> | null;
  load(id: string): { code: string; map?: unknown } | null;
  transform(code: string, id: string): { code: string; map?: unknown } | null;
}

export default function rollupHellaJS(): RollupPlugin;
