import { Signal, signal } from "@hellajs/core";
import { html, VNodeProps, VNodeValue } from "../../../packages/dom/lib";

type HoleArgs = (VNodeProps | VNodeValue)[];

type HoleChild = (...args: HoleArgs) => VNodeValue;

interface MenuProps {
  isOpen: Signal<boolean>;
}

interface MenuProvider extends MenuProps {
  toggle: () => void;
  Container: HoleChild;
  Button: HoleChild;
  List: HoleChild;
  Item: HoleChild;
}

const menuProps = {
  isOpen: signal(false)
}

function Menu({ isOpen }: MenuProps = menuProps): MenuProvider {
  const menu = {
    isOpen,
    toggle: () => menu.isOpen(!menu.isOpen())
  } as MenuProvider;

  menu.Container = (...args: HoleArgs) =>
    html.div({ "data-ui": "menu" },
      hole(args).children
    );

  menu.Button = (...args: HoleArgs) => {
    const { props, children } = hole(args);

    return html.button({
      ...props,
      "data-ui": "menu-button",
      onclick: (event) => {
        menu.toggle();
        props.onclick?.(event);
      }
    }, children)
  };

  menu.List = (...args: HoleArgs) =>
    html.ul({ "data-ui": "menu-items" },
      hole(args).children
    );

  menu.Item = (...args: HoleArgs) =>
    html.li({ "data-ui": "menu-item" },
      hole(args).children
    );

  return menu;
};

const hole = (args: any[]) => {
  const isProps = typeof args[0] === 'object' && Object.hasOwn(args[0], 'tag');
  let props: VNodeProps = isProps ? args[0] : {}, children = args;
  return { props, children }
}

export const App = () => {
  const UserSelect = Menu();

  return (
    <>
      {UserSelect.Container(
        UserSelect.Button({ onclick: () => console.log("foo") },
          "Toggle Menu"
        ),
        () => UserSelect.isOpen() &&
          UserSelect.List(
            UserSelect.Item("Item 1"),
            UserSelect.Item("Item 2"),
            UserSelect.Item("Item 3"),
          )
      )}
    </>
  )
};

