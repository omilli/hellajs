
import Select from "@registry/select/css/select.js";
import { row, stack } from "./demo-kit";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
  { value: "date", label: "Date", disabled: true },
];

export default function SelectDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Select items={fruits} placeholder="Pick a fruit" />
      </div>
    </div>
  );
}

export function SelectCompactDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Select items={fruits} size="sm" clearable placeholder="Compact" class="w-48" />
      </div>
    </div>
  );
}
