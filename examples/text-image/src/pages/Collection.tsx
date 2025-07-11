import { forEach } from "@hellajs/dom"
import { postStore } from "../store"

export const Collection = () => {
  const { store } = postStore;
  return (
    <>
      {forEach(store.collection, (url) =>
        <img src={url} alt="Generated" />
      )}
      {() => store.collection().length === 0 &&
        <p style="text-align:center">No images generated yet.</p>
      }
    </>
  )
}