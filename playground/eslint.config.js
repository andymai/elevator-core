import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";

// ─── Shared rules (DRY across src/ and tests/) ─────────────────────

const sharedRules = {
  "@typescript-eslint/no-deprecated": "warn",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports", fixStyle: "separate-type-imports" },
  ],
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/restrict-template-expressions": [
    "error",
    { allowNumber: true, allowBoolean: true },
  ],
  "@typescript-eslint/no-unnecessary-condition": "error",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-return": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-this-alias": "error",
  "@typescript-eslint/prefer-readonly": "error",
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-expect-error": { descriptionFormat: "^-- .+" },
      "ts-ignore": true,
      "ts-nocheck": true,
    },
  ],
  "prefer-const": "error",
  eqeqeq: ["error", "always"],
  "no-var": "error",
  "no-console": ["error", { allow: ["error", "warn"] }],
  "max-lines": ["warn", { max: 600, skipBlankLines: true, skipComments: true }],
};

const noMutableExport = {
  selector: 'ExportNamedDeclaration > VariableDeclaration[kind="let"]',
  message: "Mutable exports (`export let`) are forbidden. Use a getter or const.",
};

// ─── Config ─────────────────────────────────────────────────────────

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "public/pkg/",
      ".screenshots/",
      "scripts/*.mjs",
      "eslint.config.js",
      "commitlint.config.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  // ─── src/ (app code) ────────────────────────────────────────────
  {
    files: ["src/**/*.ts"],
    ignores: ["src/__tests__/**", "src/**/*.test.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedRules,
      "no-restricted-syntax": ["error", noMutableExport],
    },
  },
  // ─── Module boundaries ──────────────────────────────────────────
  {
    files: ["src/**/*.ts"],
    ignores: ["src/__tests__/**", "src/**/*.test.ts", "src/ambient.d.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "types", pattern: ["src/types/*"] },
        { type: "sim", pattern: ["src/sim/*"] },
        { type: "domain", pattern: ["src/domain/*"] },
        { type: "render", pattern: ["src/render/*"] },
        { type: "platform", pattern: ["src/platform/*"] },
        { type: "feature", pattern: ["src/features/*"], capture: ["featureName"] },
        { type: "shell", pattern: ["src/shell/*"] },
        { type: "entry", pattern: ["src/main.ts"] },
      ],
      "boundaries/dependency-nodes": ["import", "dynamic-import"],
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "disallow",
        rules: [
          { from: ["types"], allow: [] },
          { from: ["sim"], allow: ["types"] },
          { from: ["domain"], allow: ["types", "domain"] },
          { from: ["render"], allow: ["types", "domain"] },
          { from: ["platform"], allow: ["types"] },
          { from: ["feature"], allow: ["types", "domain", "sim", "render", "platform"] },
          { from: [["feature"]], allow: [["feature", { featureName: "${from.featureName}" }]] },
          { from: ["shell"], allow: ["types", "domain", "sim", "render", "platform", "feature", "shell"] },
          { from: ["entry"], allow: ["shell"] },
        ],
      }],
    },
  },
  // ─── Tests ──────────────────────────────────────────────────────
  {
    files: ["src/__tests__/**/*.ts", "src/**/*.test.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedRules,
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "max-lines": "off",
    },
  },
  // ─── Vite config ────────────────────────────────────────────────
  {
    files: ["vite.config.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedRules,
      "max-lines": "off",
    },
  },
);
