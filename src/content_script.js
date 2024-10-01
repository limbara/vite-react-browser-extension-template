// https://stackoverflow.com/a/53033388
// browser was loaded on externalize webextension-polyfill
(async () => {
  const src = browser.runtime.getURL("assets/content_main.js");
  const contentMain = await import(src);
  console.log(contentMain)
  contentMain.main();
})();
