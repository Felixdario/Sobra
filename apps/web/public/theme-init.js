/* global document */
// Runs before the first paint (blocking, in <head>): applies the theme chosen by hand.
// Without a choice the stylesheet follows prefers-color-scheme. Key: src/theme/theme.ts.
(function () {
  try {
    var choice = localStorage.getItem('sobra.theme');
    if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  } catch {
    // Storage blocked: follow the system.
  }
})();
