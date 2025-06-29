import { Signal, signal } from "@hellajs/core";
import { slot, SlotChild, SlotProps } from "../../../packages/dom";


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

  menu.Provider = ({ children }: SlotProps) =>
    <div data-ui="menu">{slot(children)}</div>;

  menu.Button = ({ children, onclick }: SlotProps) =>
    <button data-ui="menu-button" onclick={(event) => {
      menu.toggle();
      onclick?.(event);
    }}>{slot(children)}</button>;

  menu.List = ({ children }: SlotProps) =>
    <ul data-ui="menu-list">{slot(children)}</ul>;

  menu.Item = ({ children }: SlotProps) =>
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

