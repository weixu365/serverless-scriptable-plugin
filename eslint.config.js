'use strict';

const js = require('@eslint/js');
const n = require('eslint-plugin-n');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'coverage/**',
      'node_modules/**',
      '.nyc_output/**',
      '**/*{.,-}min.js',
      'tmp*',
    ],
  },
  js.configs.recommended,
  n.configs['flat/recommended-script'],
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      'class-methods-use-this': 'off',
      'no-console': 'off',
      strict: 'off',
      'max-len': ['error', { code: 120, tabWidth: 2, ignoreUrls: true }],
      indent: ['error', 2, { FunctionDeclaration: { parameters: 'first' } }],
      'no-underscore-dangle': 'off',
      'arrow-parens': ['error', 'as-needed'],
      'max-classes-per-file': ['error', 2],
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      'n/no-unpublished-require': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
    rules: {
      'no-use-before-define': 'off',
      'no-template-curly-in-string': 'off',
      'n/no-unpublished-require': 'off',
    },
  },
  {
    files: ['test/scripts/**/*.js'],
    rules: {
      'no-undef': 'off',
    },
  },
];
