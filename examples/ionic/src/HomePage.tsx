import { navigate } from "../../../packages/router";

export function HomePage() {
  return (
    <ion-page>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title class="px-4">HellaJS + Ionic + Tailwind</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="max-w-3xl mx-auto space-y-6 p-4">
          <ion-button expand="full" onClick={() => navigate("/lazy")}>Go to Lazy Loaded Page</ion-button>
        </div>
      </ion-content>
    </ion-page>
  );
}
