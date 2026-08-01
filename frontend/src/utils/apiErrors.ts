export function mutationError(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Ocurrió un error. Intenta de nuevo.'
}
