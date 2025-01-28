import { css } from "../../src";

export const todoStyles = css({
  margin: 10,
  ".filters": {
    marginBottom: 10,
  },
  ".completed": {
    textDecoration: "line-through",
    opacity: 0.6,
  },
  ".date": {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  button: {
    marginRight: 10,
  },
});
