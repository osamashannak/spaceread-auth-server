import {NextFunction, Request, Response} from 'express';
import {getHashedPassword, verifyHash} from "../hashing";
import {GoogleLoginPayload, GoogleSignupPayload, LoginPayload, SignupPayload} from "../interfaces";
import {isUsernameTaken, isUsernameValid, setTokenAndCookie, validateSignupPayload} from "../utils";
import {UserCredentials} from "@spaceread/database/entity/user/UserCredentials";
import {AppDataSource} from "../app";
import {User} from "@spaceread/database/entity/user/User";
import {OAuth2Client} from 'google-auth-library';
import {GoogleOauth} from "@spaceread/database/entity/user/GoogleOauth";
import crypto from "crypto";

const client = new OAuth2Client();

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as GoogleLoginPayload;

    if (!body.credential) {

        res.status(400).send({
            success: false,
            message: "Bad request."
        });
        return;
    }

    let ticket;

    try {
        ticket = await client.verifyIdToken({
            idToken: body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    } catch (e) {
        res.status(400).send({
            success: false,
            message: "Bad request."
        });
        return;
    }

    const payload = ticket.getPayload();

    if (!payload || (!payload.email?.endsWith("gmail.com") && !(payload.email_verified && payload.hd))) {
        res.status(400).send({
            success: false,
            message: "Bad request."
        });
        return;
    }

    let user = await AppDataSource.getRepository(GoogleOauth).findOne({
        where: {googleId: payload.sub}, relations: ["user"]
    });

    console.log(user)

    if (!user) {
        user = new GoogleOauth();

        user.googleId = payload.sub;

        if (payload.email) {
            user.email = payload.email;
        }

        if (payload.picture) {
            user.picture = payload.picture;
        }

        if (payload.given_name) {
            user.given_name = payload.given_name;
        }

        if (payload.family_name) {
            user.family_name = payload.family_name;
        }

        if (payload.email_verified) {
            user.email_verified = payload.email_verified;
        }

        await AppDataSource.getRepository(GoogleOauth).save(user);
    }

    const userCred = await AppDataSource.getRepository(UserCredentials).findOne({
        where: {email: user.email}
    });

    if (userCred) {
        const username = userCred.username;

        const dbUser = await AppDataSource.getRepository(User).findOne({
            where: {username: username}
        });

        user.user = dbUser!;

        await AppDataSource.getRepository(GoogleOauth).save(user);

    }

    if (user.user) {

        await setTokenAndCookie(user.user.username, res);

        res.locals.user = user.user;

        next();

    } else {

        const token = crypto.randomBytes(20).toString('hex');

        user.signup_token = token;

        await AppDataSource.getRepository(GoogleOauth).save(user);

        res.cookie('oauth-token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            domain: 'localhost',
            sameSite: 'lax',
            secure: true
        });

        res.status(200).send({
            success: true,
            message: "More info needed.",
            gid: user.googleId,
            email: user.email,
            suggestedUsername: user.email.split("@")[0],
        });

    }


}

export const completeGoogle = async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as GoogleSignupPayload;

    const signUpToken = req.cookies['oauth-token'];

    if (!body.googleId || !body.email || !body.username || !signUpToken) {
        res.status(400).send({
            success: false,
            message: "Bad request."
        });
        return;
    }

    let user = await AppDataSource.getRepository(GoogleOauth).findOne({
        where: {googleId: body.googleId}
    });

    if (!user || user.email !== body.email || user.signup_token !== signUpToken || !isUsernameValid(body.username)) {
        res.status(400).send({
            success: false,
            message: "Bad request."
        });
        return;
    }

    const usernameCheck = await isUsernameTaken(body.username);

    if (usernameCheck) {
        res.status(400).send({
            success: false,
            message: "The username is already taken."
        });
        return;
    }

    const dbUser = new User();

    dbUser.username = body.username;
    dbUser.google_oauth = user;

    await AppDataSource.getRepository(User).save(dbUser);

    await setTokenAndCookie(dbUser.username, res);

    res.locals.user = dbUser;

    next();

}


export const signup = async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as SignupPayload;

    if (!body.id || !body.password || !body.email) {
        res.status(400).send({
            success: false,
            message: "Missing username or password or email"
        });
        return;
    }

    const usernameCheck = await isUsernameTaken(body.id);

    if (usernameCheck) {
        res.status(400).send({
            success: false,
            message: "The username is already taken."
        });
        return;
    }

    const signUpValidation = await validateSignupPayload(body);

    if (!signUpValidation) {
        res.status(400).send({
            success: false,
            message: "Invalid username or email or password."
        });
        return;
    }

    const secrets = await getHashedPassword(body.password);

    const user = new UserCredentials();

    user.username = body.id;
    user.email = body.email;
    user.salt = secrets.salt.toString('hex');
    user.hash = secrets.hash.toString('hex');

    await AppDataSource.getRepository(UserCredentials).save(user);

    const dbUser = new User();

    dbUser.username = body.id;
    await AppDataSource.getRepository(User).save(dbUser);

    await setTokenAndCookie(user.username, res);

    res.locals.user = dbUser;

    next();

}

export const login = async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as LoginPayload;

    console.log(body)

    if (!body.id || !body.password) {
        res.status(400).send({
            success: false,
            message: "Missing username or password"
        });
        return;
    }

    let user = await AppDataSource.getRepository(UserCredentials).findOne({
        where: [
            {username: body.id.toLowerCase()},
            {email: body.id.toLowerCase()}
        ]
    });

    const password = body.password;

    const passwordMatch = await verifyHash(password, user?.salt, user?.hash ?? "");

    if (!passwordMatch) {
        res.status(401).send({
            success: false,
            message: "Invalid username or email or password."
        });

        // todo implement rate limiting

        return;
    }

    await setTokenAndCookie(user!.username, res);

    res.locals.user = await AppDataSource.getRepository(User).findOne({
        where: {username: user!.username}
    });

    next();

}