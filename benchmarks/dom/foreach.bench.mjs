import { forEach, mount } from '@hellajs/dom';
import { signal } from '@hellajs/core';

global.suite('DOM - ForEach', (suite) => {
  const createItems = (count) => Array.from({ length: count }, (_, i) => `Item ${i}`);

  suite.add('ForEach - 10 items', {
    setup: function() {
      this.root = document.createElement('div');
      this.root.id = 'app-root-foreach-10';
      document.body.appendChild(this.root);
    },
    fn: () => {
      const items = signal(createItems(10));
      const Component = () => ({ tag: 'ul', children: [forEach(items, (item) => ({ tag: 'li', children: [item] }))] });
      mount(Component, '#app-root-foreach-10');
    },
    teardown: function() {
      if (this.root) document.body.removeChild(this.root);
    }
  });

  suite.add('ForEach - 100 items', {
    setup: function() {
      this.root = document.createElement('div');
      this.root.id = 'app-root-foreach-100';
      document.body.appendChild(this.root);
    },
    fn: () => {
      const items = signal(createItems(100));
      const Component = () => ({ tag: 'ul', children: [forEach(items, (item) => ({ tag: 'li', children: [item] }))] });
      mount(Component, '#app-root-foreach-100');
    },
    teardown: function() {
      if (this.root) document.body.removeChild(this.root);
    }
  });

  suite.add('ForEach - 1000 items', {
    setup: function() {
      this.root = document.createElement('div');
      this.root.id = 'app-root-foreach-1000';
      document.body.appendChild(this.root);
    },
    fn: () => {
      const items = signal(createItems(1000));
      const Component = () => ({ tag: 'ul', children: [forEach(items, (item) => ({ tag: 'li', children: [item] }))] });
      mount(Component, '#app-root-foreach-1000');
    },
    teardown: function() {
      if (this.root) document.body.removeChild(this.root);
    }
  });
});