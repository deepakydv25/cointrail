import api from '../api/axios';

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
}

export const registerUser = async (data: RegisterRequest) => {
    const response = await api.post('/auth/register', data);
    return response.data;
}

export const loginUser = async (
    data: LoginRequest
) : Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
};
