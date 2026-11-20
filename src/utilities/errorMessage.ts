/** A thrown value as one line of text for the logs. */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))
