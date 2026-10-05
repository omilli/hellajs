import { signal } from "@hellajs/core";
import Button from "@registry/button/css/button.js";
import Input from "@registry/input/css/input.js";
import ButtonGroup, { ButtonGroupSeparator, ButtonGroupText } from "@registry/button-group/css/button-group.js";

export function ButtonGroupDemo() {
  return (
    <>
      <ButtonGroup>
        <Button variant="outline">Copy</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Paste</Button>
        <ButtonGroupSeparator />
        <Button variant="outline">Cut</Button>
      </ButtonGroup>
    </>
  );
}

export function ButtonGroupPlateDemo() {
  const url = signal("hellajs.com");

  return (
    <>
      <ButtonGroup>
        <ButtonGroupText>https://</ButtonGroupText>
        <Input value={url} oninput={(v) => url(v)} />
        <Button variant="outline">Open</Button>
      </ButtonGroup>
    </>
  );
}

export function ButtonGroupVerticalDemo() {
  return (
    <>
      <ButtonGroup orientation="vertical">
        <Button variant="outline">Top</Button>
        <Button variant="outline">Middle</Button>
        <Button variant="outline">Bottom</Button>
      </ButtonGroup>
    </>
  );
}
