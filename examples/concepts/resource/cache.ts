import { resource } from "../../../lib";
import { ApiTypes, BASE_URL } from "./types";

const cachedResource = resource<ApiTypes["Post"][]>(`${BASE_URL}/posts`, {
  cache: true,
  cacheTime: 3000,
  transform: (posts) =>
    posts.map((p) => ({ ...p, title: p.title.toUpperCase() })),
});

async function caching() {
  console.log("First fetch:");
  await cachedResource.fetch();

  console.log("\nSecond fetch (from cache):");
  await cachedResource.fetch();

  await new Promise((resolve) => setTimeout(resolve, 3100));
  console.log("\nThird fetch (cache expired):");
  await cachedResource.fetch();
}

caching();
