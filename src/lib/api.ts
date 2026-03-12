export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || "Request failed", response.status);
  }

  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  return parseResponse<T>(response);
}

export async function apiForm<T>(path: string, body: FormData, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    method: "POST",
    body,
    ...init,
  });

  return parseResponse<T>(response);
}
