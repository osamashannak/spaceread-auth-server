import crypto from "crypto";

const PEPPER_STRING = process.env.PEPPER as string;

if (!PEPPER_STRING) {
    throw new Error("No pepper found in environment variables");
}

const PEPPER = Buffer.from(PEPPER_STRING, "hex");

export async function verifyHash(password: string, salt: string | undefined, hash: string): Promise<boolean> {
    const keyBuffer = Buffer.from(hash, 'hex')
    const derivedKey = await getHashedPassword(password, salt);
    return keyBuffer.length == derivedKey.hash.length && crypto.timingSafeEqual(keyBuffer, derivedKey.hash);
}

export async function getHashedPassword(password: string, providedSalt?: Buffer | string): Promise<{
    salt: Buffer,
    hash: Buffer
}> {

    return new Promise((resolve, reject) => {
        if (providedSalt && typeof providedSalt === "string") {
            providedSalt = Buffer.from(providedSalt, "hex");
        }
        const salt = (providedSalt ?? crypto.randomBytes(16)) as Buffer;

        const peppered = crypto.createHmac('SHA256', PEPPER).update(password).digest('hex');

        crypto.scrypt(peppered, salt, 64,  (err, derivedKey) => {
            if (err) reject(err);
            resolve({salt: salt, hash: derivedKey})
        });
    });
}
