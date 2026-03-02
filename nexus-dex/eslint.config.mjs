import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = {
  extends: ["next/core-web-vitals"],
  rules: {
    'react/no-unescaped-entities': 'off',
    'jsx-a11y/alt-text': 'warn',
    '@next/next/no-img-element': 'warn',
  },
};

export default eslintConfig;
