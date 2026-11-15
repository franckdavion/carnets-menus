import { dreameHandler } from "./dreame_handler.ts";
export { dreameHandler };
if (import.meta.main) Deno.serve(dreameHandler);
