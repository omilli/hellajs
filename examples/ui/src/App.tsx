import { mount, type HellaProps } from "@hellajs/dom";
import { css, } from "@hellajs/css";
import { size } from "./lib/utils";
import { buttonModule } from "./lib/button";
import { colors, colorKeys } from "./color";
import { Colors } from "./components/Colors";
import { Buttons } from "./components/Buttons";

buttonModule(colorKeys)

css({
  body: {
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    backgroundColor: colors.neutral[100],
    color: colors.neutral[900],
    margin: 0,
    fontFamily: "sans-serif",
    fontSize: size(16, "px"),
    fontWeight: 400
  },
}, { global: true });

const Wrapper = (props: HellaProps) => {
  return <div class={css({
    display: "flex",
    flexDirection: "column",
    maxWidth: size(40),
    margin: "auto",
    gap: size(1),
    padding: size(2),
  }, { name: "wrapper" })}>
    {props.children}
  </div>
}


mount(() => {
  return (
    <Wrapper>
      <Buttons />
      <Colors />
    </Wrapper>
  );
})