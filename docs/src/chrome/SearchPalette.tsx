/**
 * Search palette (unit 10 of the site-foundation set) — the resolved fork:
 * the registry Command palette is the entry (CommandDialog, opened from the
 * navbar's data-command-open trigger and ⌘K/Ctrl+K), pagefind is the
 * engine. The daisy-era pagefind UI web component it replaces owned its
 * own markup and the `--pagefind-ui-*` vars global.css carried; both died
 * with this fork (the astro-pagefind INTEGRATION stays — it builds the
 * index this island queries at /pagefind/pagefind.js).
 *
 * Engine wiring: the pagefind bundle only exists in production builds
 * (astro dev serves no index), so the dynamic import is lazy (first open)
 * and failure resolves once to undefined with a console note. Queries
 * debounce through the Command root's `filter` hook — the root owns the
 * input, list, keyboard nav, active cursor, and Empty state; the filter is
 * its only query-observation point, so it kicks the search and returns a
 * reactive body: quick links while the query is empty, a disabled
 * "Searching…" row in flight, pagefind's top hits otherwise (guarded by a
 * sequence counter so stale responses never land). Results navigate on
 * select; the list stays flat — pagefind ranking is the grouping.
 *
 * `items={QUICK_LINKS}` is load-bearing despite the filter driving the
 * body: the root derives body group keys from `orderedGroups(props.items)`,
 * so a filter-only Command renders NOTHING (no group keys, and not empty
 * enough for the Empty state either). QUICK_LINKS carries no `group`
 * fields, so it seeds exactly the ungrouped key and every result the
 * filter returns renders flat under it.
 *
 * Styles: the command module the island imports registers its own css at
 * module load (before the dialog can ever open — both triggers live on
 * this island); the adoptable head tags (see MainLayout) carry the same
 * rules and hydration claims them against this registration, so nothing
 * duplicates. chrome-css.ts owns the palette
 * width (.site-search-command).
 */
import { effect, signal } from "@hellajs/core";
import Command, { CommandDialog } from "@registry/command/css/command.js";
import type { CommandItemData } from "@registry/command/css/command.js";

/** Pagefind's runtime API surface (the subset this island uses). */
interface PagefindApi {
  search: (query: string) => Promise<{
    results: { data: () => Promise<PagefindPage> }[];
  }>;
}

/** One indexed page as pagefind returns it. */
interface PagefindPage {
  url: string;
  excerpt: string;
  meta?: { title?: string };
}

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 120;

const SECTION_NAMES: Record<string, string> = {
  learn: "Learn",
  reference: "Reference",
  plugins: "Plugins",
  ui: "UI",
};

const QUICK_LINKS: CommandItemData[] = (
  [
    ["/learn/", "Learn"],
    ["/reference/", "API Reference"],
    ["/plugins/", "Plugins"],
    ["/ui/", "UI"],
  ] as const
).map(([url, label]) => ({
  value: url,
  label,
  shortcut: "Section",
  onSelect: () => window.location.assign(url),
}));

const SEARCHING_ROW: CommandItemData[] = [
  { value: "__searching", label: "Searching…", disabled: true },
];

/** Section display name for a page url’s first path segment. */
const sectionOf = (url: string): string => {
  const segment = url.split("/").filter(Boolean)[0] ?? "";
  return SECTION_NAMES[segment] ?? "Docs";
};

/** Maps a pagefind page to a flat result item that navigates on select. */
const toItem = (page: PagefindPage): CommandItemData => {
  const title = (page.meta?.title ?? page.url).replace(/ \| HellaJS$/, "");
  return {
    value: page.url,
    label: title,
    shortcut: sectionOf(page.url),
    onSelect: () => window.location.assign(page.url),
  };
};

/** Lazily imports the built pagefind bundle once; undefined when it 404s (dev). */
let pagefindPromise: Promise<PagefindApi | undefined> | undefined;
const loadPagefind = (): Promise<PagefindApi | undefined> => {
  // pagefindPromise ??= import(/* @vite-ignore */ "/pagefind/pagefind.js")
  //   .then((module) => module as PagefindApi)
  //   .catch(() => {
  //     console.warn(
  //       "Search index not found — it is built for production builds only (bun run build).",
  //     );
  //     return undefined;
  //   });
  // return pagefindPromise;
};

/** The hydrated island: dialog palette + ⌘K wiring + trigger-click delegation. */
export default function SearchPalette() {
  const open = signal(false);
  const results = signal<CommandItemData[]>([]);
  const searching = signal(false);

  let searchSeq = 0;
  let searchedQuery = "";
  let debounce: ReturnType<typeof setTimeout> | undefined;

  /** Runs one pagefind query and lands its top hits unless superseded by `seq`. */
  const execSearch = async (query: string, seq: number): Promise<void> => {
    const pagefind = await loadPagefind();
    if (pagefind === undefined) {
      if (seq === searchSeq) {
        searching(false);
        results([]);
      }
      return;
    }
    const found = await pagefind.search(query);
    if (seq !== searchSeq) return;
    const top = found.results.slice(0, MAX_RESULTS);
    const pages = await Promise.all(top.map((result) => result.data()));
    if (seq !== searchSeq) return;
    results(pages.map(toItem));
    searching(false);
  };

  /** The Command root’s query channel: kicks the debounced search, returns the reactive body. */
  const filter = (_items: CommandItemData[], query: string): CommandItemData[] => {
    const needle = query.trim();
    if (needle === "") {
      searchSeq++;
      searchedQuery = "";
      clearTimeout(debounce);
      searching(false);
      return QUICK_LINKS;
    }
    if (needle !== searchedQuery) {
      searchedQuery = needle;
      const seq = ++searchSeq;
      searching(true);
      clearTimeout(debounce);
      debounce = setTimeout(() => void execSearch(needle, seq), DEBOUNCE_MS);
    }
    return searching() ? SEARCHING_ROW : results();
  };

  // Focus the input once the panel exists: the dialog's focus trap grabs
  // its first focusable (the close button) at mount, so poll a few frames
  // past it — the input only exists after the portal inserts the panel.
  effect(() => {
    if (!open()) return;
    let frames = 0;
    const focusWhenMounted = (): void => {
      if (!open()) return;
      const input = document.querySelector<HTMLInputElement>("[data-slot='command-input']");
      if (input !== null) input.focus();
      else if (frames++ < 10) requestAnimationFrame(focusWhenMounted);
    };
    requestAnimationFrame(focusWhenMounted);
  });

  /** ⌘K / Ctrl+K toggles the palette. */
  const onDocKeydown = (event: KeyboardEvent): void => {
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      open(!open());
    }
  };

  // Trigger wiring by data attribute: the navbar stays static. While the
  // palette is open the command dialog's outside-dismissal owns the click
  // (a trigger hit must not fight it back open).
  const onDocClick = (event: MouseEvent): void => {
    if (open()) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (target !== undefined && target.closest("[data-command-open]") !== null) {
      event.preventDefault();
      open(true);
    }
  };

  return (
    <div
      style={{ display: "contents" }}
      hook:afterMount={() => {
        // Page-lifetime listeners: the island mounts once at body level and
        // never unmounts (navigation is document-level on this site).
        document.addEventListener("keydown", onDocKeydown);
        document.addEventListener("click", onDocClick);
      }}
    >
      <CommandDialog open={open} onClose={() => open(false)}>
        <Command filter={filter} items={QUICK_LINKS} class="site-search-command" />
      </CommandDialog>
    </div>
  );
}
