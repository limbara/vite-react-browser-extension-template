import { Browser } from "webextension-polyfill";

declare global {
  interface Window {
    browser: Browser;
  }

  const browser: Browser
}