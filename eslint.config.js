import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "reports/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2020
      }
    },
    rules: {
      "no-console": "warn",
      "prefer-const": "off",
      "security/detect-object-injection": "off", // Often false positive in modern JS/TS
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
);
