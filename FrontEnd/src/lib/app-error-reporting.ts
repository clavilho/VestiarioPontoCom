export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  console.error('Erro na aplicação', context, error);
}
