export interface RegisterRequest { name: string; email: string; password: string }
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { accessToken: string; tokenType: string }
export interface RegisterResponse { id: number; name: string; email: string; role: string }
