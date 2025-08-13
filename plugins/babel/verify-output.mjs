import babel from '@babel/core';
import plugin from './index.mjs';

function transform(code) {
  return babel.transformSync(code, {
    plugins: [plugin],
    filename: 'test.js',
    babelrc: false,
    configFile: false,
  }).code;
}

// Test case 1: Basic forEach with custom parameter names
console.log('=== Test 1: Custom parameter names ===');
const code1 = `forEach(users, (user, idx) => <div>{user.name}</div>)`;
console.log('Input:', code1);
console.log('Output:');
console.log(transform(code1));
console.log();

// Test case 2: Complex JSX with parameter references
console.log('=== Test 2: Complex JSX expressions ===');
const code2 = `forEach(items, (element, position) => <div class={position % 2 ? 'odd' : 'even'} data-id={element.id}>{element.value}</div>)`;
console.log('Input:', code2);
console.log('Output:');
console.log(transform(code2));
console.log();

// Test case 3: Non-JSX forEach (should be ignored)
console.log('=== Test 3: Non-JSX forEach (ignored) ===');
const code3 = `forEach(items, (item) => item.name)`;
console.log('Input:', code3);
console.log('Output:');
console.log(transform(code3));
console.log();

// Test case 4: Regular JSX (should transform normally)
console.log('=== Test 4: Regular JSX ===');
const code4 = `<div id="test">Hello World</div>`;
console.log('Input:', code4);
console.log('Output:');
console.log(transform(code4));