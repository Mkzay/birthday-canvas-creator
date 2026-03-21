/**
 * Never return raw Error.message to clients in production (can leak paths, SQL, etc.).
 */
export const isProductionApi = process.env.NODE_ENV === "production";

export function exposeErrorToClient(error: unknown, productionMessage: string): string {
  if (!isProductionApi && error instanceof Error && error.message) {
    return error.message;
  }
  return productionMessage;
}
