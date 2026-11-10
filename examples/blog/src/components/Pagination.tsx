import { computed } from "@hellajs/core";
import { style } from "@hellajs/css";
import { navigate } from "@hellajs/router";
import { appStore, postsResource } from "../state";
import { theme } from "../theme";

const pagination = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "1rem",
});

const pageInfo = style({
  fontSize: "0.85rem",
  color: theme.color.subtle,
  padding: "0 0.5rem",
});

const { data } = postsResource;
const { page } = appStore;

const totalPages = computed(() => {
  const posts = data();
  return posts ? Math.ceil(posts.total / 10) : 0;
});

const goToPage = (p: number) =>
  navigate("/posts", {
    query: {
      page: String(p),
    },
  });

export const Pagination = () => {
  const pages = totalPages();

  return (
    <>
      {pages > 1 && (
        <div class={pagination}>
          <button on:click={() => goToPage(Math.max(1, page() - 1))} disabled={() => page() <= 1}>
            Prev
          </button>
          <span class={pageInfo}>
            Page {page} of {pages}
          </span>
          <button
            on:click={() => goToPage(Math.min(pages, page() + 1))}
            disabled={() => page() >= pages}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
};
