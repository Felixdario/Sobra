// Cria apps/api/.env a partir do .env.example quando ainda não existe (usado por `pnpm bootstrap`).
// Nunca sobrescreve um .env existente. Preenche JWT_SECRET com um valor aleatório local, para o
// dev não depender do segredo padrão inseguro. Node puro: roda igual no Windows, macOS e Linux.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const example = join(root, 'apps', 'api', '.env.example');
const target = join(root, 'apps', 'api', '.env');
const shown = relative(root, target).replaceAll('\\', '/');

if (existsSync(target)) {
  console.log(`${shown} já existe; mantido como está.`);
} else {
  const secret = randomBytes(48).toString('base64url');
  const content = readFileSync(example, 'utf8').replace(/^JWT_SECRET=$/m, `JWT_SECRET=${secret}`);
  writeFileSync(target, content, { flag: 'wx' });
  console.log(`${shown} criado a partir do .env.example (JWT_SECRET local gerado).`);
}
