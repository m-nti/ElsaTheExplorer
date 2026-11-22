// Layer order first: app.css declares the cascade order before any component
// stylesheet is evaluated, so Panda's reset/base/tokens/recipes/utilities
// layers cannot be reordered by import order.
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");

if (!target) {
  throw new Error("Elsa the Explorer: #app mount point is missing from index.html");
}

const app = mount(App, { target });

export default app;
