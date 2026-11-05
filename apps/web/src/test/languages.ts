/** The browser's languages (`navigator.languages`) seen by the app before sign-in. */
let languages: readonly string[] = ['pt-BR'];

/** en-US tests call `setBrowserLanguages(['en-US'])`; every test starts in pt-BR. */
export function setBrowserLanguages(next: readonly string[]) {
  languages = next;
}

export function installBrowserLanguages() {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    get: () => languages,
  });
}
