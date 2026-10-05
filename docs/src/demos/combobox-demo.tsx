
import Combobox from "@registry/combobox/css/combobox.js";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
  { value: "date", label: "Date" },
];

export function ComboboxDemo() {
  return (
    <>
      <Combobox items={fruits} placeholder="Search fruit" />
    </>
  );
}

export function ComboboxMultipleDemo() {
  return (
    <>
      <Combobox items={fruits} multiple showClear placeholder="Pick several" />
    </>
  );
}
