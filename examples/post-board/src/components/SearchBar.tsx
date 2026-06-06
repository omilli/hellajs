import { css } from "@hellajs/css";
import type { Signal } from "@hellajs/core";
import { theme } from "../theme.ts";

interface SearchBarProps {
  value: Signal<string>;
  onSearch: () => void;
}

export const SearchBar = ({ value, onSearch }: SearchBarProps) => {
  const handleKeyup = (e: KeyboardEvent) => {
    (e.key === "Enter" || value() === "") && onSearch();
  };

  return (
    <div class="search-bar">
      <input
        type="text"
        placeholder={"Search..."}
        bind:value={value}

        on:input={e => value((e.target as HTMLInputElement).value)}
        on:keyup={handleKeyup}
      />
      <button on:click={onSearch}>Search</button>
    </div>
  );
};

css({
  ".search-bar": {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
    "input": {
      flex: 1,
      padding: "0.5rem 0.75rem",
      borderRadius: theme.radius.sm,
      border: `1px solid ${theme.color.border}`,
      fontSize: "0.9rem",
    },
    "button": {
      cursor: "pointer",
      borderRadius: theme.radius.sm,
      border: `1px solid ${theme.color.border}`,
      backgroundColor: theme.color.surface,
      color: theme.color.text,
      padding: "0.5rem 1rem",
      fontSize: "0.9rem",
    },
  },
}, { global: true });
