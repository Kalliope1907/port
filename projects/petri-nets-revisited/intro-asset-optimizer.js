(() => {
  "use strict";

  const sourceFile = "6e6P96fcVhL-static.png";
  const optimizedFile = "mobile/6e6P96fcVhL.webp";
  const xlinkNamespace = "http://www.w3.org/1999/xlink";
  const optimizedUrl = new URL(optimizedFile, document.baseURI).href;
  let optimizedAssetReady = false;

  function replaceSource(image) {
    if (!optimizedAssetReady || image.localName !== "image") return;

    const currentSource =
      image.getAttribute("href") ||
      image.getAttributeNS(xlinkNamespace, "href") ||
      image.getAttribute("xlink:href");

    if (!currentSource || !currentSource.includes(sourceFile)) return;

    image.setAttribute("href", optimizedUrl);
    image.setAttributeNS(xlinkNamespace, "xlink:href", optimizedUrl);
  }

  function replaceExistingSources() {
    document.querySelectorAll("svg image").forEach(replaceSource);
  }

  const preload = new Image();
  preload.addEventListener("load", () => {
    optimizedAssetReady = true;
    replaceExistingSources();
    window.setInterval(replaceExistingSources, 500);
  });
  preload.src = optimizedUrl;
})();
