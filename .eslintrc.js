module.exports = {
	'env': {
		'browser': true,
		'es6': true,
		'node': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
	],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly',
	},
	'overrides': [
		{
			'files': [
				'*.ts',
				'*.tsx',
			],
			'rules': {
				'@typescript-eslint/explicit-function-return-type': ['error'],
				"@typescript-eslint/no-unused-vars": "warn",
				"no-unused-vars": "off",
			}
		},
		{
			"files": ["*.d.ts"],
			"rules": {
				"no-unused-vars": 0,
			}
		},
		{
			"files": ["*[!.test].js"],
			"rules": {
				"@typescript-eslint/explicit-module-boundary-types": 0,
				"indent": 0,
			}
		}
	],
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'ecmaFeatures': {
			'jsx': true,
		},
		'ecmaVersion': 2018,
		'sourceType': 'module',
	},
	'plugins': [
		'@typescript-eslint',
		'no-autofix'
	],
	'rules': {
		'@typescript-eslint/explicit-function-return-type': 'off',
		"@typescript-eslint/indent": [
			'error',
			'tab',
			{
				'SwitchCase': 1,
			}
		],
		"@typescript-eslint/no-explicit-any": "warn",
		'arrow-spacing': [
			'error',
			{
				'after': true,
				'before': true,
			}
		],
		"no-autofix/prefer-const": "error",
		'no-multiple-empty-lines': [
			'warn',
			{
				'max': 3,
			}
		],
		"no-unused-vars": [
			"warn"
		],
		'object-curly-spacing': [
			'error',
			'always',
		],
		'prefer-const': [
			'error',
			{
				'destructuring': 'all',
			}
		],
		'semi': [
			'error',
			'always',
		],
		"sort-imports": 0,
		"sort-keys": [
			"error",
			"asc"
		]
	}
};
