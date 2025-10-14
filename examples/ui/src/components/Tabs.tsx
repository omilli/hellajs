export const Tabs = () => <>
  <h1>Tabs</h1>

  <h2>Default Tabs</h2>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab" role="tab" aria-selected="true" aria-controls="profile-panel" id="profile-tab">
        Profile
      </button>
    </li>
    <li role="presentation">
      <button class="tab" role="tab" aria-selected="false" aria-controls="dashboard-panel" id="dashboard-tab">
        Dashboard
      </button>
    </li>
    <li role="presentation">
      <button class="tab" role="tab" aria-selected="false" aria-controls="settings-panel" id="settings-tab">
        Settings
      </button>
    </li>
    <li role="presentation">
      <button class="tab" role="tab" aria-selected="false" aria-controls="contacts-panel" id="contacts-tab" disabled>
        Contacts
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="profile-tab" id="profile-panel">
    This is the profile content. It contains user information and settings related to your account.
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="dashboard-panel" id="dashboard-panel" hidden>
    This is the dashboard content. View your analytics and key metrics here.
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="settings-panel" id="settings-panel" hidden>
    This is the settings content. Manage your preferences and configuration options.
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="contacts-panel" id="contacts-panel" hidden>
    This is the contacts content. Access your contact list and communication history.
  </div>

  <h2>Color Variants</h2>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-primary" role="tab" aria-selected="true" aria-controls="primary-panel" id="primary-tab">
        Primary
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-accent" role="tab" aria-selected="false" aria-controls="accent-panel" id="accent-tab">
        Accent
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-success" role="tab" aria-selected="false" aria-controls="success-panel" id="success-tab">
        Success
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="primary-tab" id="primary-panel">
    Primary colored tab content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="accent-tab" id="accent-panel" hidden>
    Accent colored tab content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="success-tab" id="success-panel" hidden>
    Success colored tab content
  </div>

  <h2>Underline Style</h2>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-underline tab-primary" role="tab" aria-selected="true" aria-controls="under1-panel" id="under1-tab">
        Home
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-underline tab-primary" role="tab" aria-selected="false" aria-controls="under2-panel" id="under2-tab">
        About
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-underline tab-primary" role="tab" aria-selected="false" aria-controls="under3-panel" id="under3-tab">
        Contact
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="under1-tab" id="under1-panel">
    Home page content with underline tabs
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="under2-tab" id="under2-panel" hidden>
    About page content with underline tabs
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="under3-tab" id="under3-panel" hidden>
    Contact page content with underline tabs
  </div>

  <h2>Pills Style</h2>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-pills" role="tab" aria-selected="true" aria-controls="pills1-panel" id="pills1-tab">
        Overview
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-pills" role="tab" aria-selected="false" aria-controls="pills2-panel" id="pills2-tab">
        Details
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-pills" role="tab" aria-selected="false" aria-controls="pills3-panel" id="pills3-tab">
        Stats
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pills1-tab" id="pills1-panel">
    Overview content with pills style
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pills2-tab" id="pills2-panel" hidden>
    Details content with pills style
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pills3-tab" id="pills3-panel" hidden>
    Stats content with pills style
  </div>

  <h2>Pills Color Variants</h2>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-pills tab-pills-primary tab-pills-soft-primary" role="tab" aria-selected="true" aria-controls="pillscolor1-panel" id="pillscolor1-tab">
        Primary
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-pills tab-pills-accent tab-pills-soft-accent" role="tab" aria-selected="false" aria-controls="pillscolor2-panel" id="pillscolor2-tab">
        Accent
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-pills tab-pills-info tab-pills-soft-info" role="tab" aria-selected="false" aria-controls="pillscolor3-panel" id="pillscolor3-tab">
        Info
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pillscolor1-tab" id="pillscolor1-panel">
    Primary pills content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pillscolor2-tab" id="pillscolor2-panel" hidden>
    Accent pills content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="pillscolor3-tab" id="pillscolor3-panel" hidden>
    Info pills content
  </div>

  <h2>Bordered Style</h2>
  <div>
    <ul class="tabs tabs-bordered" role="tablist">
      <li role="presentation">
        <button class="tab tab-bordered" role="tab" aria-selected="true" aria-controls="bordered1-panel" id="bordered1-tab">
          Features
        </button>
      </li>
      <li role="presentation">
        <button class="tab tab-bordered" role="tab" aria-selected="false" aria-controls="bordered2-panel" id="bordered2-tab">
          Pricing
        </button>
      </li>
      <li role="presentation">
        <button class="tab tab-bordered" role="tab" aria-selected="false" aria-controls="bordered3-panel" id="bordered3-tab">
          FAQ
        </button>
      </li>
    </ul>
    <div class="tab-panel tab-panel-bordered" role="tabpanel" aria-labelledby="bordered1-tab" id="bordered1-panel">
      Features content with bordered style. This creates a card-like appearance.
    </div>
    <div class="tab-panel tab-panel-bordered" role="tabpanel" aria-labelledby="bordered2-tab" id="bordered2-panel" hidden>
      Pricing content with bordered style. Perfect for structured content.
    </div>
    <div class="tab-panel tab-panel-bordered" role="tabpanel" aria-labelledby="bordered3-tab" id="bordered3-panel" hidden>
      FAQ content with bordered style. Clean and organized layout.
    </div>
  </div>

  <h2>Size Variants</h2>
  <h3>Small</h3>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-sm tab-primary" role="tab" aria-selected="true" aria-controls="small1-panel" id="small1-tab">
        Small Tab 1
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-sm tab-primary" role="tab" aria-selected="false" aria-controls="small2-panel" id="small2-tab">
        Small Tab 2
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="small1-tab" id="small1-panel">
    Small tab content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="small2-tab" id="small2-panel" hidden>
    Small tab content 2
  </div>

  <h3>Large</h3>
  <ul class="tabs" role="tablist">
    <li role="presentation">
      <button class="tab tab-lg tab-accent" role="tab" aria-selected="true" aria-controls="large1-panel" id="large1-tab">
        Large Tab 1
      </button>
    </li>
    <li role="presentation">
      <button class="tab tab-lg tab-accent" role="tab" aria-selected="false" aria-controls="large2-panel" id="large2-tab">
        Large Tab 2
      </button>
    </li>
  </ul>
  <div class="tab-panel" role="tabpanel" aria-labelledby="large1-tab" id="large1-panel">
    Large tab content
  </div>
  <div class="tab-panel" role="tabpanel" aria-labelledby="large2-tab" id="large2-panel" hidden>
    Large tab content 2
  </div>
</>
