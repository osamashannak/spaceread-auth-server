import {SignupPayload} from "./interfaces";
import {AppDataSource, RedisClient} from "./app";
import crypto from "crypto";
import {Response} from "express";
import {UserCredentials} from "@spaceread/database/entity/user/UserCredentials";

export async function validateSignupPayload(payload: SignupPayload): Promise<boolean> {
    return isUsernameValid(payload.id) && isEmailValid(payload.email) && isPasswordValid(payload.password);
}

export const isUsernameTaken = async (username: string) => {
    const credRepo = AppDataSource.getRepository(UserCredentials);

    const userCheck = await credRepo.findOne({
        where: {username: username.toLowerCase()}
    });

    return !!userCheck;
}

export const isUsernameValid = (username: string) => {
    if (username.match(/[\u0080-\uFFFF]|\s/)) {
        return false;
    }

    return !(username.length < 3 || username.length > 20);
}

export const isPasswordValid = (password: string): boolean => {
    return !(password.length < 8 || password.length > 20);
}

export const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return emailRegex.test(email);
}

export const setTokenAndCookie = async (username: string, res: Response) => {
    const randomToken = crypto.randomBytes(20).toString('hex');
    const csrfToken = crypto.randomBytes(20).toString('hex');

    await RedisClient.setEx(randomToken, 1000 * 60 * 60 * 24 * 365, JSON.stringify({
        username,
        csrfToken: csrfToken,
        expiration: Date.now() + 1000 * 60 * 60 * 24 * 365
    }));

    res.cookie('auth', randomToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        domain: process.env.DOMAIN,
        sameSite: 'none',
        secure: true
    }).cookie('k', csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        domain: process.env.DOMAIN,
        maxAge: 1000 * 60 * 60 * 24 * 365 * 5,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5),
        secure: true
    });
}