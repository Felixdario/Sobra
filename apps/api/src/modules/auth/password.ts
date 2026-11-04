import { hash, type Options, verify } from '@node-rs/argon2';

/**
 * Argon2id cost per environment. `production` is the OWASP recommendation (19 MiB, 2 passes),
 * the library's own default, written down so it can't change silently. `test` is the minimum the
 * algorithm accepts: hundreds of registrations per test run would otherwise compete for CPU and
 * memory and push `beforeAll` hooks past their timeout. `loadEnv` refuses `test` in production.
 */
export const ARGON2_PROFILES = {
  production: { memoryCost: 19_456, timeCost: 2, parallelism: 1 },
  test: { memoryCost: 8, timeCost: 1, parallelism: 1 },
} as const satisfies Record<string, Options>;

export type Argon2Profile = keyof typeof ARGON2_PROFILES;

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  /** Uses the parameters stored in the hash, so it verifies hashes of any profile. */
  verify(passwordHash: string, password: string): Promise<boolean>;
  /** Same cost as a real check, so a login with an unknown e-mail does not answer faster. */
  burnCheck(password: string): Promise<void>;
};

export function createPasswordHasher(profile: Argon2Profile): PasswordHasher {
  const options = ARGON2_PROFILES[profile];
  let dummyHash: Promise<string> | undefined;
  return {
    hash: (password) => hash(password, options),
    verify: (passwordHash, password) => verify(passwordHash, password),
    burnCheck: async (password) => {
      dummyHash ??= hash('senha-que-nao-existe', options);
      await verify(await dummyHash, password);
    },
  };
}
