import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { resource, resourceCache } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("transform", () => {
    beforeEach(() => {
      resourceCache.map.clear();
    });

    afterEach(() => {
      resourceCache.map.clear();
    });

    test("transforms data on success", async () => {
      const r = resource(
        () => delay({ id: 1, name: "John", email: "john@test.com" }),
        {
          transform: (data) => ({ name: data.name })
        }
      );

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toEqual({ name: "John" });
    });

    test("cache stores original data, not transformed", async () => {
      const r = resource(
        () => delay({ id: 1, name: "John" }),
        {
          key: () => "user-1",
          cacheTime: 60000,
          transform: (data) => data.name
        }
      );

      r.fetch({ force: true });
      await delay(20);

      // Cache has full object, not just name
      expect(resourceCache.get("user-1")! as unknown).toEqual({ id: 1, name: "John" });
      expect(r.data()).toBe("John");
    });

    test("returns undefined when no data", async () => {
      const r = resource(
        () => delay("data"),
        { transform: (d) => d.toUpperCase() }
      );

      expect(r.data()).toBeUndefined();

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toBe("DATA");
    });

    test("works with initialData", async () => {
      const r = resource(
        () => delay({ count: 10 }),
        {
          initialData: { count: 0 },
          transform: (data) => data.count
        }
      );

      expect(r.data()).toBe(0);

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toBe(10);
    });

    test("transforms array to derived object", async () => {
      interface Todo {
        id: number;
        text: string;
        completed: boolean;
      }

      interface TodoStats {
        total: number;
        completed: number;
        pending: number;
      }

      const todos = resource<Todo[], undefined, TodoStats>(
        () => delay([
          { id: 1, text: "Task 1", completed: true },
          { id: 2, text: "Task 2", completed: false },
          { id: 3, text: "Task 3", completed: true }
        ]),
        {
          transform: (todos): TodoStats => ({
            total: todos.length,
            completed: todos.filter(t => t.completed).length,
            pending: todos.filter(t => !t.completed).length
          })
        }
      );

      todos.fetch({ force: true });
      await delay(20);

      expect(todos.data()).toEqual({ total: 3, completed: 2, pending: 1 });
    });

    test("transform receives typed data", async () => {
      interface UserResponse {
        id: number;
        name: string;
        email: string;
        permissions: string[];
      }

      interface UserSummary {
        name: string;
        email: string;
      }

      const user = resource<UserResponse, string, UserSummary>(
        () => delay({ id: 1, name: "John", email: "john@test.com", permissions: ["read", "write"] }),
        {
          key: () => "user-1",
          transform: (data): UserSummary => ({
            name: data.name,
            email: data.email
          })
        }
      );

      user.fetch({ force: true });
      await delay(20);

      const userData = user.data();
      expect(userData?.name).toBe("John");
      expect(userData?.email).toBe("john@test.com");
      // @ts-expect-error - id should not exist on transformed type
      expect(userData?.id).toBeUndefined();
    });

    test("transform works with cache hit", async () => {
      const fetcher = mock(() => delay({ value: fetcher.mock.calls.length }));

      const r = resource(
        fetcher,
        {
          key: () => "cached",
          cacheTime: 60000,
          transform: (data) => data.value * 10
        }
      );

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toBe(10);

      // Second request should use cache but still transform
      r.fetch();
      await delay(20);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r.data()).toBe(10);
    });

    test("transform with setData still transforms", async () => {
      const r = resource(
        () => delay({ count: 5 }),
        {
          key: () => "counter",
          cacheTime: 60000,
          transform: (data) => data.count * 2
        }
      );

      r.fetch({ force: true });
      await delay(20);

      expect(r.data()).toBe(10);

      r.setData({ count: 20 });
      expect(r.data()).toBe(40);
    });
  });
});
