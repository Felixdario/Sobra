import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env';
import { ARGON2_PROFILES, createPasswordHasher } from './password';

const SECRET = 'segredo-de-producao-com-mais-de-32-caracteres';

describe('custo do argon2', () => {
  it('produção usa o perfil forte por padrão (OWASP: argon2id, 19 MiB, 2 passadas)', async () => {
    expect(loadEnv({}).ARGON2_PROFILE).toBe('production');
    expect(loadEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET }).ARGON2_PROFILE).toBe(
      'production',
    );
    expect(ARGON2_PROFILES.production).toEqual({ memoryCost: 19_456, timeCost: 2, parallelism: 1 });

    const hash = await createPasswordHasher('production').hash('senha-forte-123');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('recusa o perfil de teste em produção', () => {
    expect(() =>
      loadEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET, ARGON2_PROFILE: 'test' }),
    ).toThrow(/ARGON2_PROFILE=test é proibido em produção/);
  });

  it('o perfil de teste é barato e os hashes valem entre perfis (verify lê os parâmetros do hash)', async () => {
    const test = createPasswordHasher('test');
    const production = createPasswordHasher('production');
    const cheap = await test.hash('senha-forte-123');
    expect(cheap).toMatch(/\$m=8,t=1,p=1\$/);
    await expect(production.verify(cheap, 'senha-forte-123')).resolves.toBe(true);
    await expect(test.verify(cheap, 'outra')).resolves.toBe(false);
    await expect(test.burnCheck('qualquer')).resolves.toBeUndefined();
  });
});
