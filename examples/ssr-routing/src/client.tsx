import { hydrate } from "@hellajs/dom";
import { router } from "@hellajs/router";
import { routes, App, notFound } from "./app";

router({ routes, notFound });

hydrate(<App />, "#app");
