import { signal } from "@hellajs/core";
import { css } from "@hellajs/css";

export const Foo = ({ title }: { title: string }, children?: JSX.Element) => {
  return (
    <div class={css({
      backgroundColor: "red",
      color: "white",
      padding: "10px",
    })}>
      <h1>{title}</h1>
      {children}
    </div>
  );
};

export const App = () => {
  const counter = signal(0);

  const increment = () => {
    counter(counter() + 1);
  };

  return (
    <div class={() => counter() % 2 === 0 ? "even" : "odd"}>
      <Foo title="Tag"><p>{counter}</p><p>{counter}</p></Foo>

      {
        () => counter() % 2 === 0 ? <p>Even</p> : <p>Odd</p>
      }
      <button onClick={increment}>Increment</button>
    </div>
  )
};
