import api from '../api/axios';

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export const registerUser = async (data: RegisterRequest) => {
    const response = await api.post('/auth/register', data);
    return response.data;
}