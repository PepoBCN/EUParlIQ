import { router } from "./_core/trpc.js";
import { committeeRouter } from "./committeeRouter.js";
import { searchRouter } from "./searchRouter.js";
import { mepRouter } from "./mepRouter.js";
import { procedureRouter } from "./procedureRouter.js";

export const appRouter = router({
  committees: committeeRouter,
  search: searchRouter,
  meps: mepRouter,
  procedures: procedureRouter,
});

export type AppRouter = typeof appRouter;
