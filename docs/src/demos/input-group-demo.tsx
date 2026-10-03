
import { stack } from "./demo-kit";
import InputGroup, {
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@registry/input-group/css/input-group.js";

export default function InputGroupDemo() {
  return (
    <div class={stack}>
      <InputGroup>
        <InputGroupAddon><InputGroupText>Search</InputGroupText></InputGroupAddon>
        <InputGroupInput placeholder="Enter query" />
        <InputGroupAddon align="inline-end"><InputGroupButton>Go</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function InputGroupRingsDemo() {
  return (
    <div class={stack}>
      <InputGroup>
        <InputGroupInput placeholder="Focus me - the whole group lights up" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Invalid value" ariaInvalid={true} />
      </InputGroup>
    </div>
  );
}

export function InputGroupColumnDemo() {
  return (
    <div class={stack}>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>New comment</InputGroupText></InputGroupAddon>
        <InputGroupTextarea placeholder="Write your reply" />
        <InputGroupAddon align="block-end"><InputGroupButton>Send</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </div>
  );
}
