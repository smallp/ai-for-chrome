// This script is injected to grab and clean the HTML
(() => {
  // Create a clone to avoid modifying the actual page UI
  const clone = document.documentElement.cloneNode(true);

  const tagsToRemove = [
    "script",
    "style",
    "link",
    "iframe",
    "svg"
  ];

  tagsToRemove.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  return clone.outerHTML;
})();
