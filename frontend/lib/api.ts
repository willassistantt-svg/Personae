import { begin, notify } from "@/lib/activity";
import { errorKey } from "@/lib/i18n";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type ApiOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  /** i18n key shown after a successful write; false hides it. Reads never show one. */
  success?: string | false;
  /** Background check: no overlay and no message. */
  quiet?: boolean;
};

const defaultSuccess: Record<string, string> = {
  POST: "feedback.done",
  PUT: "feedback.saved",
  PATCH: "feedback.saved",
  DELETE: "feedback.removed",
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const method = (options.method ?? (body ? "POST" : "GET")).toUpperCase();
  const write = method !== "GET";
  const end = options.quiet || typeof window === "undefined" ? () => {} : begin(write);
  try {
    const response = await fetch(path, { method, headers, body, credentials: "include" });
    const data = response.status === 204 ? undefined : await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data?.code || "ERROR", data?.message || "Request failed", response.status);
    }
    const success = options.success ?? defaultSuccess[method];
    if (write && !options.quiet && success) notify("success", success);
    return data as T;
  } catch (caught) {
    if (write && !options.quiet) notify("error", errorKey(caught instanceof ApiError ? caught.code : undefined));
    throw caught;
  } finally {
    end();
  }
}
