import {SignupPayload} from "./interfaces";
import {AppDataSource} from "./orm/data-source";
import {UserCredentials} from "./orm/entity/UserCredentials";
import {RedisClient} from "./app";
import crypto from "crypto";
import {Response} from "express";

export async function validateSignupPayload(payload: SignupPayload): Promise<boolean> {

    const credRepo = AppDataSource.getRepository(UserCredentials);

    const usernameTaken = await credRepo.findOne({
        where: {username: payload.username}
    });


    return usernameTaken == undefined && isEmailValid(payload.email) && isPasswordValid(payload.password);

}

export const isPasswordValid = (password: string): boolean => {
    if (password.match(/[\u0080-\uFFFF]/)) {
        return false;
    }

    if (password.match(/\s/)) {
        return false;
    }

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
        domain: 'localhost',
        sameSite: 'none',
        secure: true,
    }).cookie('k', csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        domain: 'localhost',
        maxAge: 1000 * 60 * 60 * 24 * 365 * 5,
        secure: true,
    });
}