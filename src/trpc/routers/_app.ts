import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { voicesRouter } from './voices';
import { generationsRouter } from './generations';
import { billingRouter } from './billing';
 
export const appRouter = createTRPCRouter({
  voices: voicesRouter,
  generations: generationsRouter,
  billing: billingRouter,
});
 
// export type definition of API
export type AppRouter = typeof appRouter;