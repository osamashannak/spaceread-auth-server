export interface SignupPayload {
    id: string;
    password: string;
    email: string;
}

export interface LoginPayload {
    id: string;
    password: string;
}

export interface GoogleLoginPayload {
    credential: string;
}

export interface GoogleSignupPayload {
    googleId: string;
    email: string;
    username: string;
}