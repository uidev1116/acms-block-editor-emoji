import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['src/assets/', 'coverage/', 'build/', 'vendor/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['frontend/**/*.{ts,tsx}', 'tests/js/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // テストはモックやホストの型を雑に扱うので、any を許す
    files: ['tests/js/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  // 整形は Prettier に任せる（競合するルールを切る。最後に置く）
  prettier,
);
