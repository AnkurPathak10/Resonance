import { auth } from '@clerk/nextjs/server';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';
 
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return {};
});
 
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
 
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

//authenticated procedure
export const authenticatedProcedure = t.procedure.use(async ({ next }) => {
  const { userId} = await auth();
  if (!userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
     ctx: { userId} 
  });
});

//organization procedure
export const orgProcedure = t.procedure.use(async ({ next }) => {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  if (!orgId) {
    throw new TRPCError({ 
      code: 'FORBIDDEN' ,
      message: "Organization required"
    });
  }
  return next({
     ctx: { userId, orgId} 
  });
});