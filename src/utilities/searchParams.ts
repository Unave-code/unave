/** The first value of a search param that may repeat, or an empty string when it is missing. */
export const firstParam = (value?: string | string[]): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''
