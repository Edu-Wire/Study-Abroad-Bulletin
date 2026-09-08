/**
 * Authentication client.
 *
 * All calls go to the same-origin BFF at `/api/backend/*`. The session is an
 * HttpOnly cookie set by the server: there is no token in any response body and
 * nothing for client JavaScript to store or read.
 */

const API_BASE_PATH = "/api/backend";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "STUDENT" | "CONSULTANT";
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
  mustChangePassword?: boolean;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * Perform a JSON request against the BFF.
 *
 * Non-2xx responses are thrown as the parsed server payload so callers keep the
 * server's own message, matching the previous axios-based behaviour.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_PATH}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw { success: false, message: "Unable to reach the server. Please try again." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw { success: false, message: fallbackMessage };
  }

  if (!res.ok) {
    throw data ?? { success: false, message: fallbackMessage };
  }

  return data as T;
}

/** Log in an existing user. The server sets the HttpOnly session cookie. */
export const login = (userData: LoginCredentials): Promise<AuthResponse> =>
  request<AuthResponse>(
    "/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    },
    "Login failed. Please try again."
  );

/** Register a new user. The server sets the HttpOnly session cookie. */
export const signup = (userData: SignupCredentials): Promise<AuthResponse> =>
  request<AuthResponse>(
    "/signup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    },
    "Sign-up failed. Please try again."
  );

/**
 * Fetch the current user.
 *
 * This is the only authority for client-side UI state: identity and role come
 * from the server on every call, never from localStorage or a cookie.
 */
export const getCurrentUser = (): Promise<AuthResponse> =>
  request<AuthResponse>("/me", { method: "GET" }, "Session expired or invalid.");

/** Log out, revoking the session server-side and clearing the cookie. */
export const logout = async (): Promise<AuthResponse> => {
  try {
    return await request<AuthResponse>(
      "/logout",
      { method: "POST", headers: { "Content-Type": "application/json" } },
      "Logged out."
    );
  } catch {
    // The cookie is cleared server-side; a failed call must not trap the user.
    return { success: true, message: "Logged out." };
  }
};

/** Revoke every session belonging to the current user. */
export const logoutAll = (): Promise<AuthResponse> =>
  request<AuthResponse>(
    "/logout-all",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    "Failed to sign out all sessions."
  );

/** Change the current user's password. Revokes all other sessions. */
export const changePassword = (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthResponse> =>
  request<AuthResponse>(
    "/password/change",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update password."
  );
