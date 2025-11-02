export function LazyPage() {
  return (
    <ion-page>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Lazy Loaded Page</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <h2>This page was loaded lazily!</h2>
        <p>
          Lazy loading helps improve the initial load time of your application by loading this page only when it's needed.
        </p>
      </ion-content>
    </ion-page>
  );
}