import { signal } from "../../../lib";

const counter = signal(0, {
  onRead: (value) => console.log(`Counter signal read: ${value}`),
  onWrite: (value) => console.log(`Counter signal write: ${value}`),
  onDispose: () => console.log("Counter signal disposed"),
  onSubscribe: () => console.log("Counter signal subscribed"),
  onUnsubscribe: () => console.log("Counter signal unsubscribed"),
});

const unsub = counter.subscribe(() => {
  console.log(`Counter signal subscribed value: ${counter()}`);
});

const clear = setInterval(() => {
  counter.set(counter() + 1);
  if (counter() > 5) {
    clearInterval(clear);
    counter.dispose();
    unsub();
  }
}, 1000);
