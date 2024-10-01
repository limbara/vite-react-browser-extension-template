const main = () => {
  browser.runtime.onMessage.addListener((message) => {
    console.log("Received from content main : ", message);
    return undefined;
  });

  console.log("wow from main js");
};

export { main };
