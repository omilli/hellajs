
import Combobox from "@registry/combobox/css/combobox.js";
import { row, stack } from "./demo-kit";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
  { value: "date", label: "Date" },
];

export default function ComboboxDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Combobox items={fruits} placeholder="Search fruit" />
      </div>
    </div>
  );
}

export function ComboboxMultipleDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Combobox items={fruits} multiple showClear placeholder="Pick several" />
      </div>
    </div>
  );
}
