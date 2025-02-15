const { mergeWithRules, CustomizeRule } = require('webpack-merge');

module.exports = mergeWithRules(
  {
    'module.rules': CustomizeRule.Append,
    plugins: CustomizeRule.Append,
  },
);
