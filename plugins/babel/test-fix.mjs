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

// Test case 1: Custom parameter names
console.log('=== Test 1: Custom parameter names ===');
const code1 = `forEach(users, (user, idx) => <div>{user.name}</div>)`;
const result1 = transform(code1);
console.log(result1);
console.log('✓ Contains user:', result1.includes('user:'));
console.log('✓ Contains idx:', result1.includes('idx:'));
console.log('✓ Does not contain item:', !result1.includes('item:'));

// Test case 2: Different custom names
console.log('\n=== Test 2: Different custom names ===');
const code2 = `forEach(products, (product) => <span>{product.title}</span>)`;
const result2 = transform(code2);
console.log(result2);
console.log('✓ Contains product:', result2.includes('product:'));
console.log('✓ Contains index (default):', result2.includes('index:'));

console.log('\n=== Test 3: Complex expressions ===');
const code3 = `forEach(items, (element, position) => <div class={position % 2 ? 'odd' : 'even'}>{element.value}</div>)`;
const result3 = transform(code3);
console.log('✓ Contains element:', result3.includes('element:'));
console.log('✓ Contains position:', result3.includes('position:'));