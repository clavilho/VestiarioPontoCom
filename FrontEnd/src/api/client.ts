import type { ApiResult, ClubData, Workspace } from "./types";

type AuthUser = {
  id: string;
  email: string;
  user_metadata?: { full_name?: string };
};
type AuthSession = { access_token: string; user?: AuthUser };
type AuthPayload = { user: AuthUser | null; session?: AuthSession | null };
type DataRequest = {
  table: string;
  operation?: "insert" | "update" | "delete";
  filters?: Record<string, unknown>;
  values?: unknown;
  returning?: boolean;
  single?: boolean;
  limit?: number;
  order?: { field: string; ascending: boolean };
};

const apiBase = (import.meta.env["VITE_API_URL"] ?? "").replace(/\/$/, "");
const sessionKey = "mongo_session";
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED";
const authListeners = new Set<(event: AuthEvent, session: AuthSession | null) => void>();

function token() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(sessionKey);
}

function emitAuth(event: AuthEvent, session: AuthSession | null) {
  authListeners.forEach((listener) => listener(event, session));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    const currentToken = token();
    if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);

    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) {
      return {
        data: null as T,
        error: body?.error ?? { message: body?.message ?? `Falha HTTP ${response.status}.` },
      };
    }

    return {
      data: (body && Object.hasOwn(body, "data") ? body.data : body) as T,
      error: null,
    };
  } catch (error) {
    return {
      data: null as T,
      error: {
        message: error instanceof Error
          ? `Não foi possível conectar à API: ${error.message}`
          : "Não foi possível conectar à API.",
      },
    };
  }
}

async function authRequest(action: string, values: Record<string, unknown> = {}) {
  return request<AuthPayload>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action, ...values }),
  });
}

function saveSession(session: AuthSession | null | undefined) {
  if (!session?.access_token || typeof window === "undefined") return;
  window.localStorage.setItem(sessionKey, session.access_token);
}

class DataQuery<T = any> implements PromiseLike<ApiResult<T>> {
  private operation?: DataRequest["operation"];
  private filters: Record<string, unknown> = {};
  private values?: unknown;
  private returning = false;
  private singleResult = false;
  private maxRows?: number;
  private sort?: DataRequest["order"];

  constructor(private readonly table: string) {}

  select(_columns?: string) {
    this.returning = true;
    return this;
  }

  insert(values: unknown) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: unknown) {
    this.operation = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters[field] = value;
    return this;
  }

  order(field: string, options: { ascending?: boolean } = {}) {
    this.sort = { field, ascending: options.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.maxRows = value;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  private execute() {
    const body: DataRequest = {
      table: this.table,
      filters: this.filters,
      returning: this.returning,
      single: this.singleResult,
    };
    if (this.operation) body.operation = this.operation;
    if (this.values !== undefined) body.values = this.values;
    if (this.maxRows !== undefined) body.limit = this.maxRows;
    if (this.sort) body.order = this.sort;

    return request<T>("/api/data", { method: "POST", body: JSON.stringify(body) });
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export const mongo = {
  auth: {
    async getUser() {
      if (!token()) return { data: { user: null }, error: null };
      return authRequest("user");
    },
    async signInWithPassword(credentials: { email: string; password: string }) {
      const result = await authRequest("signin", credentials);
      if (!result.error) {
        saveSession(result.data.session);
        emitAuth("SIGNED_IN", result.data.session ?? null);
      }
      return result;
    },
    async signUp(credentials: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string }; emailRedirectTo?: string };
    }) {
      const result = await authRequest("signup", {
        email: credentials.email,
        password: credentials.password,
        fullName: credentials.options?.data?.full_name ?? "",
      });
      if (!result.error) {
        saveSession(result.data.session);
        if (result.data.session) emitAuth("SIGNED_IN", result.data.session);
      }
      return result;
    },
    async signInWithGoogle(credential: string) {
      const result = await request<AuthPayload>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      if (!result.error) {
        saveSession(result.data.session);
        emitAuth("SIGNED_IN", result.data.session ?? null);
      }
      return result;
    },
    async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }) {
      return authRequest("reset", { email });
    },
    async updateUser(attributes: { password: string }) {
      const result = await authRequest("updatepassword", { password: attributes.password });
      if (!result.error) emitAuth("USER_UPDATED", null);
      return result;
    },
    async signOut() {
      const result = await authRequest("signout");
      if (typeof window !== "undefined") window.localStorage.removeItem(sessionKey);
      emitAuth("SIGNED_OUT", null);
      return result;
    },
    onAuthStateChange(callback: (event: AuthEvent, session: AuthSession | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => { authListeners.delete(callback); },
          },
        },
      };
    },
  },
  from(table: string) {
    return new DataQuery(table);
  },
  async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}) {
    return request<T>("/api/rpc", {
      method: "POST",
      body: JSON.stringify({ name, args }),
    });
  },
};

async function readApi<T>(path: string): Promise<T> {
  const result = await request<T>(path);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function getWorkspace() {
  return readApi<Workspace>("/api/workspace");
}

export function getClubData(input: { data: { club: string } }) {
  return readApi<ClubData>(`/api/clubs/${encodeURIComponent(input.data.club)}`);
}
