import { computed, effect } from "@hellajs/core";
import { resource } from "@hellajs/resource";
import { navigate } from "@hellajs/router";
import { store } from "@hellajs/store";

interface CreateOptions {
  color: string,
  font: string,
  text: string
}

const API_URL = "https://dummyjson.com/image/800x400";

const postResource = (dataSignal: () => CreateOptions) =>
  resource((data: CreateOptions) => {
    const { color, font, text } = data;
    return fetch(
      `${API_URL}/${color}?fontFamily=${font}&text=${text}`.replace(/\s/g, '+')
    );
  }, { key: dataSignal })

const createPostStore = () => {
  const storeRef = store({
    backgrounds: ["red", "green", "blue", "yellow", "purple", "orange"],
    fonts: ["bitter", "cairo", "comfortaa", "cookie", "dosis", "gotham", "lobster"],
    color: "",
    font: "",
    text: "",
    loading: false,
    error: null,
    collection: [] as string[],
  });

  const resourceData = computed((): CreateOptions => ({
    color: storeRef.color(),
    font: storeRef.font(),
    text: storeRef.text()
  }));

  const storeResource = postResource(resourceData);

  effect(() => {
    if (storeResource.error()) {
      return alert(`Error`);
    }

    const url = storeResource.data()?.url;
    if (!url) return;

    storeRef.collection([url, ...storeRef.collection()]);
    storeRef.color("");
    storeRef.font("");
    storeRef.text("");
    storeResource.abort();

    navigate("/");
  })

  return {
    store: storeRef,
    resource: storeResource,
  }
}

export const postStore = createPostStore();
