export type ApiTypes = {
  Post: { userId: number; id: number; title: string; body: string };
  User: { id: number; name: string; username: string; email: string };
  Todo: { userId: number; id: number; title: string; completed: boolean };
};

export const BASE_URL = "https://jsonplaceholder.typicode.com";
