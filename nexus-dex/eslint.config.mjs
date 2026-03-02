import { dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "@eslint/eslintrc";
const { FlatCompat } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'jsx-a11y/alt-text': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];

export default eslintConfig;
