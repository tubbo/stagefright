module.exports = {
    "env": {
      "browser": true,
      "es6": true,
      "node": true
    },
    "parserOptions": {
      "ecmaVersion": 2017,
      "sourceType": "module"
    },
  "extends": "eslint:recommended",
  "rules": {
    "indent": ["error", 2],
    "keyword-spacing": ["error", { "before": true }],
    "semi": ["error", "never"],
    "eqeqeq": ["error", "always"]
  }
};
