import { mount } from "@hellajs/dom";
import { css, } from "../../../packages/css";
import { size } from "./utils";
import { btnColor, btnOutline, btnScale, btnSoft, Buttons } from "./button";
import { colorKeys, Colors } from "./color";

btnColor(colorKeys);
btnOutline(colorKeys);
btnSoft(colorKeys);
btnScale("sm");
btnScale("lg");

mount(() => {
  return <div class={css({
    display: "flex",
    flexDirection: "column",
    maxWidth: size(40),
    margin: "auto",
    gap: size(1),
    padding: size(2),
  }, { name: "wrapper" })}>
    <Buttons />
    <Colors />
  </div>
})