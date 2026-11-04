import type { FastifySerializerCompiler } from 'fastify';
import fp from 'fastify-plugin';
import { ResponseSerializationError, validatorCompiler } from 'fastify-type-provider-zod';
import { $ZodType, safeParse } from 'zod/v4/core';

/**
 * fastify-type-provider-zod 7 serializes with `z.encode`, which rejects the one-way `.transform()`
 * used by the shared schemas (cents, colors, months). Parsing the response instead validates it
 * against the contract and applies those idempotent transforms.
 */
const serializerCompiler: FastifySerializerCompiler<$ZodType | { properties: $ZodType }> = ({
  schema,
  method,
  url,
}) => {
  const zodSchema = schema instanceof $ZodType ? schema : schema.properties;
  return (data) => {
    const result = safeParse(zodSchema, data);
    if (!result.success) throw new ResponseSerializationError(method, url, { cause: result.error });
    return JSON.stringify(result.data);
  };
};

export const zodPlugin = fp(
  async (app) => {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
  },
  { name: 'zod' },
);
