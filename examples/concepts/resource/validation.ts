import { resource } from "../../../lib";
import { ApiTypes, BASE_URL } from "./types";

const validatedResource = resource<ApiTypes["Todo"][]>(`${BASE_URL}/todos`, {
  validate: (todos) =>
    todos.every((todo) => typeof todo.completed === "boolean"),
  transform: (todos) => todos.filter((todo) => todo.completed),
});

async function validate() {
  await validatedResource.fetch();
  console.log("Completed todos:", validatedResource.data()?.length);
}

validate();
