import { HeadlessAccordion } from "./ui/Accordion";
import { forEach } from "@hellajs/dom";

export const AppX = () => {

  const AccordionItems = [
    {
      title: "Item 1",
      content: "Content for Item 1"
    },
    {
      title: "Item 2",
      content: "Content for Item 2"
    },
    {
      title: "Item 3",
      content: "Content for Item 3"
    }
  ]

  return (
    <>
      {
        forEach(AccordionItems, (item) => {
          const { Container, Toggle, Item } = HeadlessAccordion();
          return (
            <Container>
              <Toggle>{item.title}</Toggle>
              <Item>{item.content}</Item>
            </Container>
          )
        })
      }
    </>
  )
};

