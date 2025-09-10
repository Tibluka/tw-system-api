module.exports = {
    env: {
      browser: false,
      commonjs: true,
      es2021: true,
      node: true,
      jest: true
    },
    extends: [
      'eslint:recommended',
      'airbnb-base'
    ],
    parserOptions: {
      ecmaVersion: 12
    },
    rules: {
      // Permitir console.log em desenvolvimento
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      
      // Permitir uso de next sem return
      'consistent-return': 'off',
      
      // Permitir reassignment de parâmetros
      'no-param-reassign': ['error', { props: false }],
      
      // Permitir underscore dangle (para MongoDB _id)
      'no-underscore-dangle': ['error', { allow: ['_id', '__v'] }],
      
      // Permitir funções async sem await
      'require-await': 'off',
      
      // Configurar max line length
      'max-len': ['error', { 
        code: 100, 
        ignoreUrls: true, 
        ignoreStrings: true, 
        ignoreTemplateLiterals: true 
      }],
      
      // Permitir uso de for...of
      'no-restricted-syntax': [
        'error',
        'ForInStatement',
        'LabeledStatement',
        'WithStatement'
      ],
      
      // Permitir uso de continue
      'no-continue': 'off',
      
      // Permitir uso de ++ em loops
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      
      // Configurar comma-dangle
      'comma-dangle': ['error', 'never'],
      
      // Permitir funções antes da definição
      'no-use-before-define': ['error', { functions: false }],
      
      // Configurar indent
      'indent': ['error', 2, { SwitchCase: 1 }],
      
      // Configurar quotes
      'quotes': ['error', 'single', { allowTemplateLiterals: true }],
      
      // Configurar semi
      'semi': ['error', 'always'],
      
      // Permitir unused vars para next em middlewares
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^(next|req|res)$',
        varsIgnorePattern: '^_'
      }]
    },
    overrides: [
      {
        files: ['src/tests/**/*.js'],
        rules: {
          // Permitir mais flexibilidade em testes
          'no-unused-expressions': 'off',
          'import/no-extraneous-dependencies': 'off'
        }
      }
    ]
  };