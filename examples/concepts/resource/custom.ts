import { resource } from "../../../lib";
import { ApiTypes, BASE_URL } from "./types";

const customResource = resource<ApiTypes["User"]>(async () => {
  const response = await fetch(`${BASE_URL}/users/1`);
  const data = await response.json();
  if (!data.email.includes("@")) throw new Error("Invalid email");
  return data;
});

async function custom() {
  try {
    await customResource.fetch();
    console.log("User email:", customResource.data()?.email);
  } catch (e) {
    console.error("Custom fetch failed:", e);
  }
}

custom();
