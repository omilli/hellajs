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

// Test the new implementation
const testCode = `forEach(users, (user, idx) => <div>{user.name}</div>)`;
console.log('Input:', testCode);
console.log('Output:', transform(testCode));
console.log('\n---\n');

const testCode2 = `forEach(items, (item) => <li key={item.id}>{item.name}</li>)`;
console.log('Input:', testCode2);  
console.log('Output:', transform(testCode2));