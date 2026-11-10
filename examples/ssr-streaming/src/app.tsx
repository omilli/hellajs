import { Suspense } from "@hellajs/dom";
import { dashboard, grid, card, bone } from "./theme";

function after<T>(data: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const Skeleton = ({ label }: { label: string }) => (
  <section class={card}>
    <h2>{label}</h2>
    <span class={bone} />
    <span class={bone} />
    <span class={bone} />
  </section>
);

const StatsCard = () => (
  <Suspense fallback={<Skeleton label="Stats" />}>
    {() =>
      after({ revenue: "$48.2k", visitors: "12,904", churn: "2.1%" }, 120).then((d) => (
        <section class={card}>
          <h2>Stats</h2>
          <dl>
            <dt>Revenue</dt>
            <dd>{d.revenue}</dd>
            <dt>Visitors</dt>
            <dd>{d.visitors}</dd>
            <dt>Churn</dt>
            <dd>{d.churn}</dd>
          </dl>
        </section>
      ))
    }
  </Suspense>
);

const ActivityCard = () => (
  <Suspense fallback={<Skeleton label="Recent activity" />}>
    {() =>
      after(["Ada upgraded to Pro", "Build #281 deployed", "Grace closed 3 tickets"], 600).then(
        (items) => (
          <section class={card}>
            <h2>Recent activity</h2>
            <ul>
              {items.map((t) => (
                <li>{t}</li>
              ))}
            </ul>
          </section>
        ),
      )
    }
  </Suspense>
);

const TopCard = () => (
  <Suspense fallback={<Skeleton label="Top items" />}>
    {() =>
      after(["Accounting", "Design system", "Mobile app"], 1200).then((items) => (
        <section class={card}>
          <h2>Top items</h2>
          <ol>
            {items.map((t) => (
              <li>{t}</li>
            ))}
          </ol>
        </section>
      ))
    }
  </Suspense>
);

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
