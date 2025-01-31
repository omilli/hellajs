import { css } from "../../src";

export const todoStyles = css({
  margin: 10,
  ".filters": {
    marginBottom: 10,
  },
  ".completed": {
    textDecoration: "line-through",
    opacity: 0.6,
    span: {
      fontStyle: "italic",
    },
  },
  ".date": {
    fontSize: 12,
    color: "#999",
    display: "block",
  },
  "[type=checkbox]": {
    border: "1px solid #ccc",
    marginTop: 5,
  },
  ul: {
    padding: 0,
    marginTop: 10,
  },
  button: {
    marginRight: 10,
  },
});
