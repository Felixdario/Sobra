import { hash, verify } from '@node-rs/argon2';

let dummyHash: Promise<string> | undefined;

export const hashPassword = (password: string): Promise<string> => hash(password);

export const verifyPassword = (passwordHash: string, password: string): Promise<boolean> =>
  verify(passwordHash, password);

/** Same cost as a real check, so a login with an unknown e-mail does not answer faster. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash('senha-que-nao-existe');
  await verify(await dummyHash, password);
}
