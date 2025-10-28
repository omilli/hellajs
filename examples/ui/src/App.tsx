import { mount, type HellaProps } from "@hellajs/dom";
import { css, } from "@hellajs/css";
import { size } from "@hellajs/ui";
import { buttonModule } from "@hellajs/ui";
import { inputModule } from "@hellajs/ui";
import { selectModule } from "@hellajs/ui";
import { labelModule } from "@hellajs/ui";
import { checkboxModule } from "@hellajs/ui";
import { switchModule } from "@hellajs/ui";
import { tableModule } from "@hellajs/ui";
import { modalModule } from "@hellajs/ui";
import { tabsModule } from "@hellajs/ui";
import { colors, colorKeys } from "@hellajs/ui";
import { Colors } from "./components/Colors";
import { Buttons } from "./components/Buttons";
import { Forms } from "./components/Forms";
import { Table } from "./components/Table";
import { Modal } from "./components/Modal";
import { Tabs } from "./components/Tabs";

buttonModule(colorKeys)
inputModule(colorKeys)
selectModule(colorKeys)
labelModule()
checkboxModule(colorKeys)
switchModule(colorKeys)
tableModule(colorKeys)
modalModule()
tabsModule(colorKeys)

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
      <Modal />
      <Tabs />
      <Forms />
      <Buttons />
      <Table />
      <Colors />
    </Wrapper>
  );
})
