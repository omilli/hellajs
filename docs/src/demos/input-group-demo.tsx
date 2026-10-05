
import InputGroup, {
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@registry/input-group/css/input-group.js";

export function InputGroupDemo() {
  return (
    <>
      <InputGroup>
        <InputGroupAddon><InputGroupText>Search</InputGroupText></InputGroupAddon>
        <InputGroupInput placeholder="Enter query" />
        <InputGroupAddon align="inline-end"><InputGroupButton>Go</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </>
  );
}

export function InputGroupRingsDemo() {
  return (
    <>
      <InputGroup>
        <InputGroupInput placeholder="Focus me - the whole group lights up" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Invalid value" ariaInvalid={true} />
      </InputGroup>
    </>
  );
}

export function InputGroupColumnDemo() {
  return (
    <>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>New comment</InputGroupText></InputGroupAddon>
        <InputGroupTextarea placeholder="Write your reply" />
        <InputGroupAddon align="block-end"><InputGroupButton>Send</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </>
  );
}
