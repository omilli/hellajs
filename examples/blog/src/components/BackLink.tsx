import { style } from "@hellajs/css";

const link = style({
  display: "inline-block",
  marginBottom: "1rem",
});

export const BackLink = () => (
  <a class={link} href="/posts">
    &larr; Back to posts
  </a>
);
