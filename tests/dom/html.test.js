import { test, expect } from "bun:test";
import { html, forEach, mount } from "../../packages/dom/dist/dom.js";

test("html - basic functionality", () => {
  // Simple text interpolation
  const name = "World";
  const textResult = html`Hello ${name}!`;
  expect(textResult).toEqual({
    tag: '$',
    children: ['Hello ', 'World', '!']
  });

  // Plain text with no HTML
  const message = "Just a message";
  const plainResult = html`${message}`;
  expect(plainResult).toEqual({
    tag: '$',
    children: [message]
  });

  // Empty template
  const emptyResult = html``;
  expect(emptyResult).toEqual({
    tag: '$',
    children: []
  });

  // Function as child content
  const getMessage = () => "Dynamic message";
  const funcResult = html`<div>${getMessage}</div>`;
  expect(funcResult).toEqual({
    tag: 'div',
    props: {},
    children: [getMessage]
  });
});

test("html - elements and attributes", () => {
  // Single element with attributes
  const className = "greeting";
  const id = "hello";
  const result = html`<div class="${className}" id="${id}">Content</div>`;
  expect(result).toEqual({
    tag: 'div',
    props: {
      class: 'greeting',
      id: 'hello'
    },
    children: ['Content']
  });

  // Multiple interpolations in same attribute
  const base = "btn";
  const variant = "primary";
  const multiAttrResult = html`<button class="${base} ${variant}">Click</button>`;
  expect(multiAttrResult).toEqual({
    tag: 'button',
    props: {
      class: 'btn primary'
    },
    children: ['Click']
  });

  // Empty attributes and self-closing tags
  const emptyAttrResult = html`<input disabled checked>`;
  expect(emptyAttrResult).toEqual({
    tag: 'input',
    props: {
      disabled: '',
      checked: ''
    },
    children: []
  });

  // Self-closing with attributes
  const src = "image.jpg";
  const selfClosingResult = html`<img src="${src}" alt="Image">`;
  expect(selfClosingResult).toEqual({
    tag: 'img',
    props: {
      src: 'image.jpg',
      alt: 'Image'
    },
    children: []
  });

  // Boolean and number interpolation in attributes
  const isActive = true;
  const count = 42;
  const boolNumResult = html`<div data-active="${isActive}" data-count="${count}">Content</div>`;
  expect(boolNumResult).toEqual({
    tag: 'div',
    props: {
      'data-active': isActive,
      'data-count': count
    },
    children: ['Content']
  });

  // Attribute with dynamic value only
  const clickHandler = () => console.log("clicked");
  const handlerResult = html`<button onclick="${clickHandler}">Click me</button>`;
  expect(handlerResult).toEqual({
    tag: 'button',
    props: {
      onclick: clickHandler
    },
    children: ['Click me']
  });
});

test("html - nested structures", () => {
  // Basic nested elements
  const title = "Page Title";
  const content = "Page content";
  const nestedResult = html`<div><h1>${title}</h1><p>${content}</p></div>`;
  expect(nestedResult).toEqual({
    tag: 'div',
    props: {},
    children: [
      {
        tag: 'h1',
        props: {},
        children: [title]
      },
      {
        tag: 'p',
        props: {},
        children: [content]
      }
    ]
  });

  // Mixed text and elements
  const name = "John";
  const age = 25;
  const mixedResult = html`<div>Hello ${name}, you are ${age} years old!</div>`;
  expect(mixedResult).toEqual({
    tag: 'div',
    props: {},
    children: ['Hello ', 'John', ', you are ', 25, ' years old!']
  });

  // Whitespace handling
  const whitespaceResult = html`
    <div>
      <p>Paragraph</p>
    </div>
  `;
  expect(whitespaceResult.tag).toBe('div');
  expect(whitespaceResult.children).toHaveLength(1);
  expect(whitespaceResult.children[0]).toEqual({
    tag: 'p',
    props: {},
    children: ['Paragraph']
  });
});

test("html - advanced nested html calls", () => {
  // Basic nested html calls
  const title = "Welcome";
  const subtitle = "To HellaJS";

  const header = html`<h1>${title}</h1>`;
  const subheader = html`<h2>${subtitle}</h2>`;

  const basicResult = html`<div class="hero">${header}${subheader}</div>`;
  expect(basicResult).toEqual({
    tag: 'div',
    props: {
      class: 'hero'
    },
    children: [
      {
        tag: 'h1',
        props: {},
        children: [title]
      },
      {
        tag: 'h2',
        props: {},
        children: [subtitle]
      }
    ]
  });

  // Deeply nested html calls
  const username = "john_doe";
  const email = "john@example.com";

  const userIcon = html`<img src="/icons/user.svg" alt="User">`;
  const userInfo = html`<div class="info"><span>${username}</span><span>${email}</span></div>`;
  const userCard = html`<div class="user-card">${userIcon}${userInfo}</div>`;

  const deepResult = html`<div class="container">${userCard}</div>`;
  expect(deepResult.tag).toBe('div');
  expect(deepResult.props.class).toBe('container');
  expect(deepResult.children[0].tag).toBe('div');
  expect(deepResult.children[0].props.class).toBe('user-card');
  expect(deepResult.children[0].children).toHaveLength(2);

  // Array of html elements and conditional rendering
  const items = ['Red', 'Green', 'Blue'];
  const colorDivs = items.map(color =>
    html`<div class="color" style="background: ${color.toLowerCase()}">${color}</div>`
  );

  const arrayResult = html`<div class="palette">${colorDivs}</div>`;
  expect(arrayResult.children).toEqual([colorDivs]);
  expect(colorDivs[0]).toEqual({
    tag: 'div',
    props: {
      class: 'color',
      style: 'background: red'
    },
    children: ['Red']
  });

  // Conditional rendering
  const isLoggedIn = true;
  const testUsername = "TestUser";

  const loginButton = html`<button>Login</button>`;
  const welcomeMessage = html`<div>Welcome, ${testUsername}!</div>`;

  const conditionalResult = html`<div class="header">${isLoggedIn ? welcomeMessage : loginButton}</div>`;
  expect(conditionalResult.children).toEqual([welcomeMessage]);

  // Mixed content types
  const mixedContent = [
    html`<h1>Dashboard</h1>`,
    "Some text",
    html`<p>Count: 42</p>`,
    () => "click"
  ];

  const mixedResult = html`<div class="container">${mixedContent}</div>`;
  expect(mixedResult.children).toEqual([mixedContent]);
});

test("html - forEach integration", () => {
  // Basic forEach integration  
  const items = ['Apple', 'Banana', 'Cherry'];
  const listItems = forEach(items, (item, index) =>
    html`<li key="${index}">${item}</li>`
  );

  const result = html`<ul class="fruits">${listItems}</ul>`;
  expect(result.children).toEqual([listItems]);
  expect(listItems.arity).toBe(true);

  // Complex forEach with nested html (structure test only)
  const users = [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'User' },
    { id: 3, name: 'Carol', role: 'Moderator' }
  ];

  const userRows = forEach(users, (user) => {
    const badge = html`<span class="badge">${user.role}</span>`;
    return html`<tr><td>${user.name}</td><td>${badge}</td></tr>`;
  });

  const tableResult = html`
    <table>
      <thead>
        <tr><th>Name</th><th>Role</th></tr>
      </thead>
      <tbody>${userRows}</tbody>
    </table>
  `;

  expect(tableResult.tag).toBe('table');
  expect(tableResult.children).toHaveLength(2);
  expect(tableResult.children[1]).toEqual({
    tag: 'tbody',
    props: {},
    children: [userRows]
  });
});

test("html - DOM rendering with forEach", () => {
  // Basic forEach DOM rendering
  document.body.innerHTML = '<div id="test-container"></div>';

  const items = ['Apple', 'Banana', 'Cherry'];
  const app = html`
    <div>
      <h1>Fruits</h1>
      <ul>
        ${forEach(items, (item, index) =>
    html`<li data-index="${index}">${item}</li>`
  )}
      </ul>
    </div>
  `;

  mount(() => app, '#test-container');

  const container = document.getElementById('test-container');
  expect(container?.querySelector('h1')?.textContent).toBe('Fruits');

  const listItems = container?.querySelectorAll('li');
  expect(listItems?.length).toBe(3);
  expect(listItems?.[0]?.textContent).toBe('Apple');
  expect(listItems?.[0]?.getAttribute('data-index')).toBe('0');
  expect(listItems?.[1]?.textContent).toBe('Banana');
  expect(listItems?.[2]?.textContent).toBe('Cherry');
});

test("html - advanced forEach DOM scenarios", () => {
  // Nested html structures with forEach
  document.body.innerHTML = '<div id="test-container"></div>';

  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
    { id: 3, name: 'Carol', email: 'carol@example.com', active: true }
  ];

  const app = html`
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${forEach(users, (user) => {
    const statusBadge = html`<span class="${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span>`;
    return html`
            <tr data-user-id="${user.id}">
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
  })}
      </tbody>
    </table>
  `;

  mount(() => app, '#test-container');

  const container = document.getElementById('test-container');
  const rows = container?.querySelectorAll('tbody tr');

  expect(rows?.length).toBe(3);

  // Check first user
  expect(rows?.[0]?.getAttribute('data-user-id')).toBe('1');
  expect(rows?.[0]?.children[0]?.textContent).toBe('Alice');
  expect(rows?.[0]?.children[1]?.textContent).toBe('alice@example.com');
  expect(rows?.[0]?.children[2]?.querySelector('span')?.className).toBe('active');
  expect(rows?.[0]?.children[2]?.querySelector('span')?.textContent).toBe('Active');

  // Check inactive user
  expect(rows?.[1]?.children[2]?.querySelector('span')?.className).toBe('inactive');
  expect(rows?.[1]?.children[2]?.querySelector('span')?.textContent).toBe('Inactive');
});

test("html - dynamic forEach scenarios", () => {
  // Dynamic array updates
  document.body.innerHTML = '<div id="test-container"></div>';

  let items = ['Item 1', 'Item 2'];

  const renderList = () => html`
    <div>
      <ul>
        ${forEach(() => items, (item, index) =>
    html`<li data-index="${index}">${item}</li>`
  )}
      </ul>
    </div>
  `;

  mount(renderList, '#test-container');

  const container = document.getElementById('test-container');
  let listItems = container?.querySelectorAll('li');

  expect(listItems?.length).toBe(2);
  expect(listItems?.[0]?.textContent).toBe('Item 1');
  expect(listItems?.[1]?.textContent).toBe('Item 2');

  // Update the array and re-mount
  items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
  mount(renderList, '#test-container');

  listItems = container?.querySelectorAll('li');
  expect(listItems?.length).toBe(4);
  expect(listItems?.[2]?.textContent).toBe('Item 3');
  expect(listItems?.[3]?.textContent).toBe('Item 4');

  // Conditional rendering with forEach
  document.body.innerHTML = '<div id="test-container-2"></div>';

  const conditionalItems = [
    { id: 1, name: 'Apple', visible: true },
    { id: 2, name: 'Banana', visible: false },
    { id: 3, name: 'Cherry', visible: true },
    { id: 4, name: 'Date', visible: false }
  ];

  const conditionalApp = html`
    <div>
      ${forEach(conditionalItems.filter(item => item.visible), (item) =>
    html`<div class="item" data-id="${item.id}">${item.name}</div>`
  )}
    </div>
  `;

  mount(() => conditionalApp, '#test-container-2');

  const container2 = document.getElementById('test-container-2');
  const visibleItems = container2?.querySelectorAll('.item');

  expect(visibleItems?.length).toBe(2);
  expect(visibleItems?.[0]?.textContent).toBe('Apple');
  expect(visibleItems?.[0]?.getAttribute('data-id')).toBe('1');
  expect(visibleItems?.[1]?.textContent).toBe('Cherry');
  expect(visibleItems?.[1]?.getAttribute('data-id')).toBe('3');
});

