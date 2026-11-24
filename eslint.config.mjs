import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'apps/api/drizzle/**', 'notes/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // last: turns off lint rules that would fight with Prettier
);
