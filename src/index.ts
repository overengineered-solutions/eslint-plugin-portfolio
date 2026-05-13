import { noUntypedExternalResponse } from "./rules/no-untyped-external-response.js";

export const rules = {
  "no-untyped-external-response": noUntypedExternalResponse,
};

const plugin = {
  meta: {
    name: "@overengineered-solutions/eslint-plugin-portfolio",
    version: "0.1.1",
  },
  rules,
};

export default plugin;
