import api from '../api/axios';
import type { RegisterRequest, RegisterResponse, LoginRequest, LoginResponse } from '../types/auth';
export type { RegisterRequest, LoginRequest, LoginResponse } from '../types/auth';

export const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/api/v1/auth/register', data);
    return response.data;
};

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/v1/auth/login', data);
    return response.data;
};
