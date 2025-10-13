export const Forms = () => <>
  <h1>Form Elements</h1>
  
  <h2>Text Inputs</h2>
  <div class="form-group">
    <label class="label">Default Input</label>
    <input type="text" class="input" placeholder="Enter text..." />
  </div>
  
  <div class="form-group">
    <label class="label label-required">Required Input</label>
    <input type="text" class="input input-outline-primary" placeholder="Enter text..." />
    <span class="helper-text">This field is required</span>
  </div>
  
  <div class="form-group">
    <label class="label">Error State</label>
    <input type="text" class="input input-outline-error" placeholder="Enter text..." value="invalid@" />
    <span class="error-text">Please enter a valid email address</span>
  </div>
  
  <div class="form-group">
    <label class="label">Success State</label>
    <input type="text" class="input input-outline-success" placeholder="Enter text..." value="valid@email.com" />
    <span class="success-text">Email is valid</span>
  </div>

  <h2>Input Variants</h2>
  <div class="form-group">
    <label class="label">Filled Input</label>
    <input type="text" class="input input-filled-primary" placeholder="Filled style..." />
  </div>
  
  <div class="form-group">
    <label class="label">Underline Input</label>
    <input type="text" class="input input-underline" placeholder="Underline style..." />
  </div>
  
  <div class="form-group">
    <label class="label">Rounded Input</label>
    <input type="text" class="input input-rounded" placeholder="Rounded style..." />
  </div>

  <h2>Input Sizes</h2>
  <div class="form-group">
    <label class="label">Small Input</label>
    <input type="text" class="input input-sm" placeholder="Small size..." />
  </div>
  
  <div class="form-group">
    <label class="label">Large Input</label>
    <input type="text" class="input input-lg" placeholder="Large size..." />
  </div>

  <h2>Textarea</h2>
  <div class="form-group">
    <label class="label">Message</label>
    <textarea class="input textarea" placeholder="Enter your message..."></textarea>
  </div>

  <h2>Select Dropdowns</h2>
  <div class="form-group">
    <label class="label">Default Select</label>
    <select class="select">
      <option>Choose an option...</option>
      <option>Option 1</option>
      <option>Option 2</option>
      <option>Option 3</option>
    </select>
  </div>
  
  <div class="form-group">
    <label class="label">Outlined Select</label>
    <select class="select select-outline-primary">
      <option>Choose an option...</option>
      <option>Primary Option 1</option>
      <option>Primary Option 2</option>
    </select>
  </div>
  
  <div class="form-group">
    <label class="label">Filled Select</label>
    <select class="select select-filled-accent">
      <option>Choose an option...</option>
      <option>Accent Option 1</option>
      <option>Accent Option 2</option>
    </select>
  </div>

  <h2>Checkboxes</h2>
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox" />
      <span>Default checkbox</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox checkbox-primary" checked />
      <span>Primary checked</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox checkbox-success" checked />
      <span>Success checked</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox" disabled />
      <span>Disabled checkbox</span>
    </label>
  </div>

  <h2>Checkbox Sizes</h2>
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox checkbox-sm" />
      <span>Small checkbox</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" class="checkbox checkbox-lg" />
      <span>Large checkbox</span>
    </label>
  </div>

  <h2>Radio Buttons</h2>
  <div class="form-group">
    <label class="checkbox-label">
      <input type="radio" name="radio-group" class="checkbox radio" />
      <span>Option 1</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="radio" name="radio-group" class="checkbox radio radio-primary" checked />
      <span>Option 2 (Primary)</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="checkbox-label">
      <input type="radio" name="radio-group" class="checkbox radio" />
      <span>Option 3</span>
    </label>
  </div>

  <h2>Switches</h2>
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch" />
      <span>Default switch</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch switch-primary" checked />
      <span>Primary checked</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch switch-success" checked />
      <span>Success checked</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch" disabled />
      <span>Disabled switch</span>
    </label>
  </div>

  <h2>Switch Sizes</h2>
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch switch-sm" />
      <span>Small switch</span>
    </label>
  </div>
  
  <div class="form-group">
    <label class="switch-label">
      <input type="checkbox" class="switch switch-lg" />
      <span>Large switch</span>
    </label>
  </div>

  <h2>Complete Form Example</h2>
  <form>
    <div class="form-group">
      <label class="label label-required">Full Name</label>
      <input type="text" class="input" placeholder="John Doe" />
    </div>
    
    <div class="form-group">
      <label class="label label-required">Email</label>
      <input type="email" class="input input-outline-primary" placeholder="john@example.com" />
      <span class="helper-text">We'll never share your email</span>
    </div>
    
    <div class="form-group">
      <label class="label">Country</label>
      <select class="select">
        <option>Select your country...</option>
        <option>United States</option>
        <option>United Kingdom</option>
        <option>Canada</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="label">Message</label>
      <textarea class="input textarea" placeholder="Tell us more..."></textarea>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" class="checkbox checkbox-primary" />
        <span>I agree to the terms and conditions</span>
      </label>
    </div>
    
    <div class="form-group">
      <label class="switch-label">
        <input type="checkbox" class="switch switch-primary" checked />
        <span>Subscribe to newsletter</span>
      </label>
    </div>
    
    <button type="submit" class="btn btn-primary btn-full">Submit Form</button>
  </form>
</>
