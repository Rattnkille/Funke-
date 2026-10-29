import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["log", "error", "warn"] }],
    },
  },
);
