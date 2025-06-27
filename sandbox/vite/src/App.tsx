import { signal } from "@hellajs/core";
import { show } from "../../../packages/dom";

export const Foo = (props: { foo: string }, children?: JSX.Element) => {
  console.log(props, children);
  return (
    <div>
      <h1>{props.foo}</h1>
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
      <Foo foo="Tag"><p>{counter}</p><p>{counter}</p></Foo>
      {
        () => {
          if (counter() % 2 === 0) {
            return <p>Even</p>;
          }
          return <p>Odd</p>;
        }
      }
      <button onClick={increment}>Increment</button>
    </div>
  )
};
