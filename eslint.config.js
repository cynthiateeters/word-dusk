import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  localStorage: "readonly",
  console: "readonly",
  fetch: "readonly",
  DOMException: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  URL: "readonly",
  structuredClone: "readonly",
};

const nodeGlobals = {
  process: "readonly",
  Buffer: "readonly",
  console: "readonly",
  URL: "readonly",
  fetch: "readonly",
  structuredClone: "readonly",
  DOMException: "readonly",
};

export default [
  {
    ignores: [
      "dist/",
      "node_modules/",
      "scripts/.cache/",
      "playwright-report/",
      "test-results/",
      "word-dusk.jsx",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["scripts/**/*.mjs", "playwright.config.js", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...nodeGlobals,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
      },
    },
  },
];
