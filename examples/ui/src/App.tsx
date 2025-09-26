import { mount, type HellaProps } from "@hellajs/dom";
import { css, } from "@hellajs/css";
import { size } from "./utils";
import { btnColor, btnOutline, btnScale, btnSoft } from "./button";
import { colorKeys } from "./color";
import { Colors } from "./components/Colors";
import { Buttons } from "./components/Buttons";

btnColor(colorKeys);
btnOutline(colorKeys);
btnSoft(colorKeys);
btnScale("sm");
btnScale("lg");

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