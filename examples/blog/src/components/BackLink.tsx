import { css } from "@hellajs/css";
import { navigate } from "@hellajs/router";
import { theme } from "../theme";

export const BackLink = () => (
  <a class="back-link" on:click={e => { e.preventDefault(); navigate("/posts"); }}>
    &larr; Back to posts
  </a>
);

css({
  ".back-link": {
    display: "inline-block",
    marginBottom: "1rem",
    color: theme.color.link,
    cursor: "pointer",
    fontSize: "0.9rem",
  }
});