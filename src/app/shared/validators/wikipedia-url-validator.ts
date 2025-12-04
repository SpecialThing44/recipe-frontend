export function wikipediaUrlValidator(control: any): { [key: string]: any } | null {
  if (!control.value || control.value.trim() === '') {
    return null;
  }

  const url = control.value.trim();
  const wikiPattern = /^https?:\/\/(en\.)?wikipedia\.org\/wiki\/.+$/i;

  if (!wikiPattern.test(url)) {
    return { invalidWikipediaUrl: true };
  }

  return null;
}
