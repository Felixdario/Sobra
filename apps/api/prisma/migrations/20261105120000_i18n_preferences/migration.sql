-- ADR-035: interface language and display currency per user; default categories keep a stable key.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
ALTER TABLE "User" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "systemKey" TEXT;

-- Backfill: categories that still carry a default pt-BR name (created by the sign-up before this
-- migration) get their key, so they show translated. Renamed ones stay as the user typed them.
UPDATE "Category" SET "systemKey" = 'salary' WHERE "kind" = 'income' AND "name" = 'Salário';
UPDATE "Category" SET "systemKey" = 'freelance' WHERE "kind" = 'income' AND "name" = 'Freelance';
UPDATE "Category" SET "systemKey" = 'investments' WHERE "kind" = 'income' AND "name" = 'Rendimentos';
UPDATE "Category" SET "systemKey" = 'housing' WHERE "kind" = 'expense' AND "name" = 'Moradia';
UPDATE "Category" SET "systemKey" = 'groceries' WHERE "kind" = 'expense' AND "name" = 'Mercado';
UPDATE "Category" SET "systemKey" = 'transport' WHERE "kind" = 'expense' AND "name" = 'Transporte';
UPDATE "Category" SET "systemKey" = 'restaurants' WHERE "kind" = 'expense' AND "name" = 'Restaurantes';
UPDATE "Category" SET "systemKey" = 'leisure' WHERE "kind" = 'expense' AND "name" = 'Lazer';
UPDATE "Category" SET "systemKey" = 'health' WHERE "kind" = 'expense' AND "name" = 'Saúde';
UPDATE "Category" SET "systemKey" = 'education' WHERE "kind" = 'expense' AND "name" = 'Educação';
UPDATE "Category" SET "systemKey" = 'subscriptions' WHERE "kind" = 'expense' AND "name" = 'Assinaturas';
UPDATE "Category" SET "systemKey" = 'shopping' WHERE "kind" = 'expense' AND "name" = 'Compras';
UPDATE "Category" SET "systemKey" = 'other' WHERE "kind" = 'expense' AND "name" = 'Outros';
