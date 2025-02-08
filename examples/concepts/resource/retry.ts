import { resource } from "../../../lib";
import { ApiTypes, BASE_URL } from "./types";

const retryResource = resource<ApiTypes["User"]>(`${BASE_URL}/users/404`, {
  retries: 3,
  retryDelay: 1000,
  onError: (response) => console.log(`Failed with status: ${response.status}`),
});

async function retry() {
  try {
    await retryResource.fetch();
  } catch (e) {
    console.log("All retries failed:", e);
  }
}

retry();
