import { noUntypedExternalResponse } from "./rules/no-untyped-external-response.js";
import { noTailwindArbitraryInBracketedRoute } from "./rules/no-tailwind-arbitrary-in-bracketed-route.js";
import { noPlatformStripeInTenantScope } from "./rules/no-platform-stripe-in-tenant-scope.js";

export const rules = {
  "no-untyped-external-response": noUntypedExternalResponse,
  "no-tailwind-arbitrary-in-bracketed-route": noTailwindArbitraryInBracketedRoute,
  "no-platform-stripe-in-tenant-scope": noPlatformStripeInTenantScope,
};

const plugin = {
  meta: {
    name: "@overengineered-solutions/eslint-plugin-portfolio",
    version: "0.4.0",
  },
  rules,
};

export default plugin;
