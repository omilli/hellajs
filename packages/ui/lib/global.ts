import { css } from "@hellajs/css";
css({
  "[data-no-animate] *": {
    transition: "none !important",
  }
}, { global: true });