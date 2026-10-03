import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Button from "@registry/button/css/button.js";
import Input from "@registry/input/css/input.js";
import ButtonGroup, { ButtonGroupSeparator, ButtonGroupText } from "@registry/button-group/css/button-group.js";

const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  justifyContent: "center",
  flexWrap: "wrap",
});

export default function ButtonGroupDemo() {
  return (
    <div class={row}>
      <ButtonGroup>
        <Button variant="outline">Copy</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Paste</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Cut</Button>
      </ButtonGroup>
    </div>
  );
}

export function ButtonGroupPlateDemo() {
  const url = signal("hellajs.com");

  return (
    <div class={row}>
      <ButtonGroup>
        <ButtonGroupText>https://</ButtonGroupText>
        <Input value={url} oninput={(v) => url(v)} />
        <Button variant="outline">Open</Button>
      </ButtonGroup>
    </div>
  );
}

export function ButtonGroupVerticalDemo() {
  return (
    <div class={row}>
      <ButtonGroup orientation="vertical">
        <Button variant="outline">Top</Button>
        <Button variant="outline">Middle</Button>
        <Button variant="outline">Bottom</Button>
      </ButtonGroup>
    </div>
  );
}
