---
applyTo: "**/*.{js,mjs,cjs,jsx,ts,tsx}"
---
# JavaScript Guidelines

Apply these guidelines when working with JavaScript or TypeScript.

## Variables

- **Use meaningful names**
  - Bad: `const yyyymmdstr = ...`
  - Good: `const currentDate = ...`

- **Consistent vocabulary**
  - Bad: `getUserInfo(); getClientData();`
  - Good: `getUser();`

- **Searchable names**
  - Bad: `setTimeout(blastOff, 86400000);`
  - Good: `const MILLISECONDS_PER_DAY = ...; setTimeout(blastOff, MILLISECONDS_PER_DAY);`

- **Explanatory variables**
  - Bad: `saveCityZipCode(address.match(...)[1], address.match(...)[2]);`
  - Good: `const [_, city, zip] = address.match(...); saveCityZipCode(city, zip);`

- **Avoid mental mapping**
  - Bad: `locations.forEach(l => dispatch(l));`
  - Good: `locations.forEach(location => dispatch(location));`

- **No unneeded context**
  - Bad: `car.carColor = color;`
  - Good: `car.color = color;`

- **Use default parameters**
  - Bad: `const name = name || "Default";`
  - Good: `function fn(name = "Default") {}`

## Functions

- **Limit arguments (2 or fewer)**
  - Bad: `fn(a, b, c)`
  - Good: `fn({a, b, c})`

- **Do one thing**
  - Bad: `function emailClients(clients) { ... }`
  - Good: `function emailActiveClients(clients) { ... }`

- **Descriptive names**
  - Bad: `addToDate(date, 1)`
  - Good: `addMonthToDate(1, date)`

- **One level of abstraction**
  - Bad: `function parse() { ... }`
  - Good: `function parse() { tokenize(); parseTokens(); }`

- **Remove duplicate code**
  - Bad: Two similar functions
  - Good: One function with a switch

- **Set default objects**
  - Bad: `config.title = config.title || "Foo";`
  - Good: `Object.assign({title: "Foo"}, config);`

- **No flags as parameters**
  - Bad: `fn(name, temp)`
  - Good: `fn(name)` and `fnTemp(name)`

- **Avoid side effects**
  - Bad: `name = name.split(" ");`
  - Good: `return name.split(" ");`

- **No global function pollution**
  - Bad: `Array.prototype.diff = ...`
  - Good: `class SuperArray extends Array { diff() {} }`

- **Favor functional programming**
  - Bad: `for (...) { ... }`
  - Good: `arr.reduce(...)`

- **Encapsulate conditionals**
  - Bad: `if (a && b) { ... }`
  - Good: `if (shouldShowSpinner(a, b)) { ... }`

- **Avoid negative conditionals**
  - Bad: `if (!isNotPresent(node))`
  - Good: `if (isPresent(node))`

- **Avoid conditionals (use polymorphism)**
  - Bad: `switch (type) { ... }`
  - Good: Subclasses with own methods

- **Avoid type-checking**
  - Bad: `if (typeof x === ...)`
  - Good: Use polymorphism or TypeScript

- **Don't over-optimize**
  - Bad: `for (let i = 0, len = arr.length; i < len; i++)`
  - Good: `for (let i = 0; i < arr.length; i++)`

- **Remove dead code**
  - Bad: Unused functions
  - Good: Only keep used code

## Objects and Data Structures

- **Use getters/setters**
  - Bad: `obj.value = 1`
  - Good: `obj.setValue(1)`

- **Private members via closure**
  - Bad: `this.name = name`
  - Good: `return { getName: () => name }`

## Classes

- **Prefer ES6 classes**
  - Bad: ES5 function prototypes
  - Good: `class Animal {}`

- **Method chaining**
  - Bad: `car.setColor("pink"); car.save();`
  - Good: `car.setColor("pink").save();`

- **Prefer composition**
  - Bad: `class EmployeeTaxData extends Employee`
  - Good: `employee.taxData = new EmployeeTaxData()`

## SOLID Principles

- **Single Responsibility**
  - Bad: Class does multiple things
  - Good: Split into focused classes

- **Open/Closed**
  - Bad: `if (adapter.name === ...)`
  - Good: `adapter.request(url)`

- **Liskov Substitution**
  - Bad: Subclass breaks parent contract
  - Good: Subclass preserves behavior

- **Interface Segregation**
  - Bad: Fat constructor
  - Good: Options object, only use needed props

- **Dependency Inversion**
  - Bad: Hardcoded dependencies
  - Good: Inject dependencies

## Testing

- **Single concept per test**
  - Bad: Multiple asserts in one test
  - Good: One assert per test

## Concurrency

- **Use Promises**
  - Bad: Nested callbacks
  - Good: `.then().catch()`

- **Use async/await**
  - Bad: `.then().catch()`
  - Good: `await fn()`

## Error Handling

- **Don't ignore errors**
  - Bad: `catch (e) { }`
  - Good: `catch (e) { handleError(e); }`

## Formatting

- **Consistent capitalization**
  - Bad: `function foo_bar() {}`
  - Good: `function fooBar() {}`

- **Caller/callee proximity**
  - Bad: Functions far apart
  - Good: Functions close together

## Comments

- **Comment only complex logic**
  - Bad: Obvious comments
  - Good: Only comment business logic

- **No commented out code**
  - Bad: `// oldCode()`
  - Good: Remove it

- **No journal comments**
  - Bad: Date logs in comments
  - Good: Use version control

- **No positional markers**
  - Bad: `//// Section ////`
  - Good: Use code structure