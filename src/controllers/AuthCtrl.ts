import {NextFunction, Request, Response} from 'express';
import {getHashedPassword, verifyHash} from "../hashing";
import {LoginPayload, SignupPayload} from "../interfaces";
import {setTokenAndCookie, validateSignupPayload} from "../utils";
import {UserCredentials} from "@spaceread/database/entity/user/UserCredentials";
import {AppDataSource} from "../app";
import {User} from "@spaceread/database/entity/user/User";

export const signup = async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as SignupPayload;

    console.log(body)

    if (!body.username || !body.password || !body.email) {
        res.status(400).send({
            success: false,
            message: "Missing username or password or email"
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

    user.username = body.username;
    user.email = body.email;
    user.salt = secrets.salt.toString('hex');
    user.hash = secrets.hash.toString('hex');

    await AppDataSource.getRepository(UserCredentials).save(user);

    const dbUser = new User();

    dbUser.username = body.username;
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