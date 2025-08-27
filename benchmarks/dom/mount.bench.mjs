import { mount } from '@hellajs/dom';
import { signal } from '@hellajs/core';

global.suite('DOM - Mount', (suite) => {
  suite.add('Mount - Simple Component', {
    setup: function() {
      this.root = document.createElement('div');
      this.root.id = 'app-root-simple';
      document.body.appendChild(this.root);
    },
    fn: () => {
      const Component = () => ({ tag: 'div', children: ['Hello'] });
      mount(Component, '#app-root-simple');
    },
    teardown: function() {
      if (this.root) document.body.removeChild(this.root);
    }
  });

  suite.add('Mount - Nested Component', {
    setup: function() {
      this.root = document.createElement('div');
      this.root.id = 'app-root-nested';
      document.body.appendChild(this.root);
    },
    fn: () => {
      const NestedComponent = () => ({ tag: 'span', children: ['World'] });
      const Component = () => ({ tag: 'div', children: ['Hello ', NestedComponent()] });
      mount(Component, '#app-root-nested');
    },
    teardown: function() {
      if (this.root) document.body.removeChild(this.root);
    }
  });
});