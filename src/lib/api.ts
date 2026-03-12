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

export function getApiOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  if (import.meta.env.VITE_API_ORIGIN) {
    return import.meta.env.VITE_API_ORIGIN as string;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  return window.location.origin;
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  if (url.startsWith("/")) {
    return `${getApiOrigin()}${url}`;
  }

  return url;
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiOrigin()}/api${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
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
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    method: "POST",
    body,
    ...init,
  });

  return parseResponse<T>(response);
}
