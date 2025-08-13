// Simple validation script to check if our DOM template system is working
const fs = require('fs');
const path = require('path');

console.log('Validating DOM template system...');

// Check if template.ts has the new functions
const templatePath = path.join(__dirname, 'packages/dom/lib/template.ts');
if (fs.existsSync(templatePath)) {
  const content = fs.readFileSync(templatePath, 'utf8');
  
  const checks = [
    'registerDOMTemplate',
    'bindDOMTemplate', 
    'createTemplateFromVNode',
    'DOMTemplate',
    'TemplateBinding'
  ];
  
  const missing = checks.filter(check => !content.includes(check));
  
  if (missing.length === 0) {
    console.log('✓ All DOM template functions are present');
  } else {
    console.log('✗ Missing functions:', missing.join(', '));
  }
} else {
  console.log('✗ template.ts not found');
}

// Check forEach.ts updates
const forEachPath = path.join(__dirname, 'packages/dom/lib/forEach.ts');
if (fs.existsSync(forEachPath)) {
  const content = fs.readFileSync(forEachPath, 'utf8');
  
  if (content.includes('bindDOMTemplate')) {
    console.log('✓ forEach.ts updated to use DOM templates');
  } else {
    console.log('✗ forEach.ts missing DOM template integration');
  }
} else {
  console.log('✗ forEach.ts not found');
}

// Check Babel plugin updates
const babelPath = path.join(__dirname, 'plugins/babel/index.mjs');
if (fs.existsSync(babelPath)) {
  const content = fs.readFileSync(babelPath, 'utf8');
  
  if (content.includes('registerDOMTemplate') && content.includes('createTemplateFromVNode')) {
    console.log('✓ Babel plugin updated for DOM templates');
  } else {
    console.log('✗ Babel plugin missing DOM template support');
  }
} else {
  console.log('✗ Babel plugin not found');
}

console.log('Validation complete!');