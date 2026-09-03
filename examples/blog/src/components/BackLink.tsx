import { style } from "@hellajs/css";
import { navigate } from "@hellajs/router";
import { theme } from "../theme.ts";

const backLink = style({
  display: "inline-block",
  marginBottom: "1rem",
  color: theme.color.link,
  cursor: "pointer",
  fontSize: "0.9rem",
}, { label: "back-link" });

export const BackLink = () => (
  <a class={backLink} on:click={e => { e.preventDefault(); navigate("/posts"); }}>
    &larr; Back to posts
  </a>
);
