import { style } from "@hellajs/css";
import { theme } from "../theme.ts";
import { appStore } from "../state.ts";

const search = style({
  display: "flex",
  gap: "0.5rem",
  marginBottom: "1rem",
  "& input, & button": {
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.color.border}`,
    fontSize: "0.9rem",
    padding: "0.5rem 0.75rem",
  },
  input: {
    flex: 1,
  },
});

const { searchValue } = appStore;

const submitSearch = () => appStore.query(appStore.searchValue());

export const SearchBar = () => {
  const handleKeyup = (e: KeyboardEvent) => {
    (e.key === "Enter" || searchValue() === "") && submitSearch();
  };

  return (
    <div class={search}>
      <input
        type="text"
        placeholder="Search..."
        name="search"
        value={searchValue}
        on:input={(e) => searchValue((e.target as HTMLInputElement).value)}
        on:keyup={handleKeyup}
      />
      <button on:click={submitSearch}>Search</button>
    </div>
  );
};
