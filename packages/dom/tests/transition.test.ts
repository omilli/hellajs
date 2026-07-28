import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, html, Transition } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("Transition", () => {
    test("renders children when show is true", () => {
      mount(html`
        <div id="container">
          <${Transition} show=${true}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")).not.toBeNull();
      expect(document.getElementById("container")?.textContent).toContain("Visible");
    });

    test("renders array children (JSX compiles children to an array)", () => {
      mount(html`<div id="tcontainer">${Transition({ show: true, children: [
        html`<b id="ta">A</b>`,
        html`<i id="tb">B</i>`,
      ] })}</div>`);

      expect(document.getElementById("ta")).not.toBeNull();
      expect(document.getElementById("tb")).not.toBeNull();
      expect(document.getElementById("tcontainer")?.textContent).not.toContain("[object Object]");
    });

    test("removes children immediately when show is false without leave class", () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${visible}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")).not.toBeNull();

      visible(false);
      flush();

      expect(document.getElementById("content")).toBeNull();
    });

    test("adds enter class when show transitions to true", () => {
      const visible = signal(false);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} enter="fade-in">
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")).toBeNull();

      visible(true);
      flush();

      expect(document.getElementById("content")?.classList.contains("fade-in")).toBe(true);
    });

    test("adds leave class when show transitions to false", () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} leave="fade-out" duration=${100}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(false);
      flush();

      expect(document.getElementById("content")?.classList.contains("fade-out")).toBe(true);
    });

    test("removes element after duration via tick", async () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} leave="fade-out" duration=${100}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(false);
      flush();

      expect(document.getElementById("content")).not.toBeNull();

      await delay(160);

      expect(document.getElementById("content")).toBeNull();
    });

    test("cancels leave and rescues node on rapid toggle to true", () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} enter="fade-in" leave="fade-out" duration=${100}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(false);
      flush();

      const content = document.getElementById("content")!;
      expect(content.classList.contains("fade-out")).toBe(true);

      visible(true);
      flush();

      const rescued = document.getElementById("content")!;
      expect(rescued).not.toBeNull();
      expect(rescued).toBe(content);
      expect(rescued.classList.contains("fade-out")).toBe(false);
    });

    test("starts fresh leave after rescue and second false toggle", async () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} leave="fade-out" duration=${100}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(false);
      flush();

      visible(true);
      flush();

      visible(false);
      flush();

      expect(document.getElementById("content")?.classList.contains("fade-out")).toBe(true);

      await delay(160);

      expect(document.getElementById("content")).toBeNull();
    });

    test("adds custom appear class on first mount", () => {
      mount(html`
        <div id="container">
          <${Transition} show=${true} appear="slide-in">
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")?.classList.contains("slide-in")).toBe(true);
    });

    test("reuses enter class for appear when appear is true", () => {
      mount(html`
        <div id="container">
          <${Transition} show=${true} enter="fade-in" appear=${true}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")?.classList.contains("fade-in")).toBe(true);
    });

    test("does not add enter class on first mount without appear prop", () => {
      mount(html`
        <div id="container">
          <${Transition} show=${true} enter="fade-in">
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")?.classList.contains("fade-in")).toBe(false);
    });

    test("uses enter class instead of appear when show starts false", () => {
      const visible = signal(false);

      mount(html`
        <div id="container">
          <${Transition} show=${visible} enter="fade-in" appear="slide-in">
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(true);
      flush();

      const content = document.getElementById("content")!;
      expect(content.classList.contains("fade-in")).toBe(true);
      expect(content.classList.contains("slide-in")).toBe(false);
    });

    test("does not leak timer when parent removed mid-leave", async () => {
      const visible = signal(true);

      const app = mount(html`
        <div id="container">
          <${Transition} show=${visible} leave="fade-out" duration=${100}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      visible(false);
      flush();

      app.unmount();

      await delay(160);
    });

    test("works with reactive show function wrapping a signal", () => {
      const visible = signal(true);

      mount(html`
        <div id="container">
          <${Transition} show=${() => visible()}>
            <span id="content">Visible</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")).not.toBeNull();

      visible(false);
      flush();

      expect(document.getElementById("content")).toBeNull();
    });

    test("static boolean false renders no content", () => {
      mount(html`
        <div id="container">
          <${Transition} show=${false}>
            <span id="content">Hidden</span>
          </${Transition}>
        </div>
      `);

      expect(document.getElementById("content")).toBeNull();
    });
  });
});
