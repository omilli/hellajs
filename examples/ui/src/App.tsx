import { mount, type HellaProps } from "@hellajs/dom";
import { css, } from "@hellajs/css";
import { size } from "./lib/utils";
import { buttonModule } from "./lib/button";
import { inputModule } from "./lib/input";
import { selectModule } from "./lib/select";
import { labelModule } from "./lib/label";
import { checkboxModule } from "./lib/checkbox";
import { switchModule } from "./lib/switch";
import { tableModule } from "./lib/table";
import { colors, colorKeys } from "./color";
import { Colors } from "./components/Colors";
import { Buttons } from "./components/Buttons";
import { Forms } from "./components/Forms";
import { Table } from "./components/Table";

buttonModule(colorKeys)
inputModule(colorKeys)
selectModule(colorKeys)
labelModule()
checkboxModule(colorKeys)
switchModule(colorKeys)
tableModule(colorKeys)

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
      <Forms />
      <Buttons />
      <Table />
      <Colors />
    </Wrapper>
  );
})
