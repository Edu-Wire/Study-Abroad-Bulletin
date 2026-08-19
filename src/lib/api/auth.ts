import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "STUDENT";
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
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
 * Log in existing user
 */
export const login = async (
  userData: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/login`,
      userData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: "Unable to connect to backend server on port 8000.",
    };
  }
};

/**
 * Register a new user
 */
export const signup = async (
  userData: SignupCredentials
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/signup`,
      userData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: "Unable to connect to backend server on port 8000.",
    };
  }
};

/**
 * Fetch profile of currently logged-in user using JWT token
 */
export const getCurrentUser = async (
  token: string
): Promise<AuthResponse> => {
  try {
    const response = await axios.get<AuthResponse>(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: "Session expired or invalid token.",
    };
  }
};
