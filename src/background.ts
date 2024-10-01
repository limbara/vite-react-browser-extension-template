import "webextension-polyfill"; // had to inject webextension-polyfill manually because chrome doesn't accept multiple script on background

browser.runtime.onMessage.addListener((message) => {
  console.log("Received : ", message);
  return undefined;
});

console.log("background");
