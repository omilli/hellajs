import { Suspense } from '@hellajs/dom';
import { dashboard, grid, card, bone } from './theme';

// Simulated async fetch — resolves with `data` after `ms`. Deterministic (no backend),
// so the streamed shape is reproducible. Each card uses a distinct latency: the shell and
// every skeleton paints at TTFB, then the cards fill in as their data resolves (fast → slow).
function after<T>(data: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// A static placeholder — the <Suspense> fallback. It ships in the first flushed chunk, so
// the layout is stable before the real card resolves.
const Skeleton = ({ label }: { label: string }) => (
  <section class={card}>
    <h2>{label}</h2>
    <span class={bone} />
    <span class={bone} />
    <span class={bone} />
  </section>
);

// Each card wraps its async fetch in <Suspense>: the skeleton flushes inline immediately,
// then the resolved body streams as <template id="hsN">…</template> + an inline $hs swap
// script that swaps it in on arrival. Regions are ordered fast → slow so the page fills
// top-to-bottom.

const StatsCard = () => (
  <Suspense fallback={<Skeleton label="Stats" />}>
    {() =>
      after({ revenue: '$48.2k', visitors: '12,904', churn: '2.1%' }, 120).then((d) => (
        <section class={card}>
          <h2>Stats</h2>
          <dl>
            <dt>Revenue</dt><dd>{d.revenue}</dd>
            <dt>Visitors</dt><dd>{d.visitors}</dd>
            <dt>Churn</dt><dd>{d.churn}</dd>
          </dl>
        </section>
      ))
    }
  </Suspense>
);

const ActivityCard = () => (
  <Suspense fallback={<Skeleton label="Recent activity" />}>
    {() =>
      after(['Ada upgraded to Pro', 'Build #281 deployed', 'Grace closed 3 tickets'], 600).then(
        (items) => (
          <section class={card}>
            <h2>Recent activity</h2>
            <ul>{items.map((t) => <li>{t}</li>)}</ul>
          </section>
        ),
      )
    }
  </Suspense>
);

const TopCard = () => (
  <Suspense fallback={<Skeleton label="Top items" />}>
    {() =>
      after(['Accounting', 'Design system', 'Mobile app'], 1200).then((items) => (
        <section class={card}>
          <h2>Top items</h2>
          <ol>{items.map((t) => <li>{t}</li>)}</ol>
        </section>
      ))
    }
  </Suspense>
);

// The static shell renders synchronously, so it paints at TTFB — before any card resolves.
// Three independent <Suspense> regions make streaming's value obvious: the page is useful
// immediately, and each card streams in as its own data lands (no waiting on the slowest).
export const Dashboard = () => (
  <div class={dashboard}>
    <header>
      <h1>Dashboard</h1>
      <span class="user">Ada Lovelace</span>
    </header>
    <main class={grid}>
      <StatsCard />
      <ActivityCard />
      <TopCard />
    </main>
  </div>
);
