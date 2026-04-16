import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // `any` is intentional opt-out — strict TS already surfaces real bugs,
      // and forcing every Supabase query/untyped third-party callback to use `unknown`
      // adds ceremony without catching anything. Downgraded to warn (was error default).
      "@typescript-eslint/no-explicit-any": "warn",
      // Empty interfaces extending other types are sometimes necessary for shadcn/ui components.
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
);
