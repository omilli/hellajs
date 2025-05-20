import "./bench"

// import { navigate, route, router } from "@hellajs/core";
// import { resource } from "../lib/reactive/resource";
// import { signal } from "../lib/reactive";
// import { effect } from "../lib/reactive"; // <-- add this import

// router({
//   "/": async () => {
//     import("./bench");
//   },
//   "/about": {
//     handler() {
//       console.log("about");
//     },
//     before() {
//       console.log("before about");
//     },
//     after() {
//       console.log("after about");
//     }
//   },
//   "/about/:id": (params) => {
//     // Create a signal for the id param
//     const idSignal = signal(params.id);

//     // Create the resource for fetching a post
//     const postResource = resource(
//       (id: string) =>
//         fetch(`https://jsonplaceholder.typicode.com/posts/${id}`).then(res => res.json()),
//       {
//         key: () => idSignal(),
//         enabled: true,
//         initialData: null,
//       }
//     );

//     // Use effect to log status and data
//     effect(() => {
//       console.log("Post data:", postResource.data());
//       console.log("Status:", postResource.status());
//     });
//   },
//   "/abc/*": () => {
//     console.log("abc");
//   },
//   "/xyz": "/abc"
// }, {
//   404() {
//     console.log("404");
//   },
//   before() {
//     console.log("before");
//   },
//   after() {
//     console.log("after");
//   },
//   redirects: [{
//     from: ['/old-path', '/old-path2'],
//     to: '/new-path',
//   }],
// });
