export interface SignupPayload {
    username: string;
    password: string;
    email: string;
}

export interface LoginPayload {
    id: string;
    password: string;
}