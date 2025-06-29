import { Signal, signal } from "@hellajs/core";
import { VNodeProps } from "../../../packages/dom/lib";
import { forEach } from "@hellajs/dom";

type SlotChildren = JSX.Element | JSX.Element[];

type StotProps = VNodeProps & { children?: SlotChildren };

type SlotChild = (props: StotProps) => JSX.Element;

const slot = (children?: SlotChildren) =>
  Array.isArray(children) ? forEach(children, (child) => child) : children;


interface Menu {
  isOpen: Signal<boolean>;
  toggle: () => void;
  Provider: SlotChild;
  Button: SlotChild;
  List: SlotChild;
  Item: SlotChild;
}

function Menu() {
  const menu = {
    isOpen: signal(false),
    toggle: () => menu.isOpen(!menu.isOpen())
  } as Menu;

  menu.Provider = ({ children }: StotProps) =>
    <div data-ui="menu">{slot(children)}</div>;

  menu.Button = ({ children, onclick }: StotProps) =>
    <button data-ui="menu-button" onclick={(event) => {
      menu.toggle();
      onclick?.(event);
    }}>{slot(children)}</button>;

  menu.List = ({ children }: StotProps) =>
    <ul data-ui="menu-list">{slot(children)}</ul>;

  menu.Item = ({ children }: StotProps) =>
    <li data-ui="menu-UserSelect.Item">{slot(children)}</li>;

  return menu;
};

export const Consume = () => {
  const UserSelect = Menu();

  return (
    <>
      <UserSelect.Provider>
        <UserSelect.Button onclick={() => console.log("Button clicked!")}>
          Toggle Menu
        </UserSelect.Button>
        {() => UserSelect.isOpen() &&
          <UserSelect.List>
            <UserSelect.Item>UserSelect.Item 1</UserSelect.Item>
            <UserSelect.Item>UserSelect.Item 2</UserSelect.Item>
            <UserSelect.Item>UserSelect.Item 3</UserSelect.Item>
          </UserSelect.List>
        }
      </UserSelect.Provider>
    </>
  )
};

