(() => {
  "use strict";

  const sourceFile = "6e6P96fcVhL.png";
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

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        replaceSource(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        replaceSource(node);
        node.querySelectorAll?.("svg image").forEach(replaceSource);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  const preload = new Image();
  preload.addEventListener("load", () => {
    optimizedAssetReady = true;
    replaceExistingSources();
  });
  preload.src = optimizedUrl;
})();
