import { noUntypedExternalResponse } from "./rules/no-untyped-external-response.js";
import { noTailwindArbitraryInBracketedRoute } from "./rules/no-tailwind-arbitrary-in-bracketed-route.js";

export const rules = {
  "no-untyped-external-response": noUntypedExternalResponse,
  "no-tailwind-arbitrary-in-bracketed-route": noTailwindArbitraryInBracketedRoute,
};

const plugin = {
  meta: {
    name: "@overengineered-solutions/eslint-plugin-portfolio",
    version: "0.3.0",
  },
  rules,
};

export default plugin;
