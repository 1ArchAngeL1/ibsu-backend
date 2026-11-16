import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "ibsu:public";

/**
 * Opens a route to unauthenticated callers. The guard is global, so a route
 * is private unless it says otherwise — forgetting the decorator leaves a
 * route shut, which is the right way round to be wrong.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
