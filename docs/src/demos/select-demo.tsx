
import Select from "@registry/select/css/select.js";
import { style } from "@hellajs/css";

const compact = style({ width: "12rem" }, { label: "demo-select-compact" });

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
  { value: "date", label: "Date", disabled: true },
];

export function SelectDemo() {
  return (
    <>
      <div class="demo-row">
        <Select items={fruits} placeholder="Pick a fruit" />
      </div>
    </>
  );
}

export function SelectCompactDemo() {
  return (
    <>
      <div class="demo-row">
        <Select items={fruits} size="sm" clearable placeholder="Compact" class={compact} />
      </div>
    </>
  );
}
