import { forEach } from "@hellajs/dom"
import { postStore } from "../store"
import { css } from "@hellajs/css"


const styles = css({
  "> div": {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
  },
  "input, select": {
    width: "100%",
    padding: "0.5rem",
  },
  button: {
    padding: "0.5rem 1rem",
    backgroundColor: "mediumslateblue",
    color: "white",
    border: "none",
    cursor: "pointer",
    width: "100%",
    "&:disabled": {
      opacity: 0.5,
    }
  }
})

export const Create = () => {
  const { store, resource } = postStore;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const inValid = ![store.color, store.font, store.text].every((val) => val() !== '');
    if (inValid) {
      return alert("Please fill all fields");
    }
    resource.fetch();
  }

  return (
    <form class={styles} onsubmit={submit}>
      <div>
        <label for="color">
          Background Color:
        </label>
        <select value={store.color} id="color" onchange={(e) => store.color((e.target as HTMLSelectElement).value)}>
          <option value="" disabled="true" >Select</option>
          {forEach(store.backgrounds, (color: string) =>
            <option value={color}>{color}</option>
          )}
        </select>
      </div>

      <div>
        <label for="font">
          Font Family:
        </label>
        <select value={store.font} id="font" onchange={(e) => store.font((e.target as HTMLSelectElement).value)}>
          <option value="" disabled="true" >Select</option>
          {forEach(store.fonts, (font: string) =>
            <option value={font}>{font}</option>
          )}
        </select>
      </div>

      <div>
        <label for="text">
          Text Content:
        </label>
        <input value={store.text} type="text" id="text" placeholder="e.g. Hello World!" oninput={(e) => store.text((e.target as HTMLInputElement).value)} />
      </div>

      <button type="submit" disabled={resource.loading}>Create</button>
    </form>
  )
}