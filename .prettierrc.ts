// 参考配置
module.exports = {
  arrowParens: "always", //箭头函数的参数无论有几个，都要括号包裹
  bracketSameLine: true, //在多行元素的最后一行放置 > 符号，而不是单独一行
  bracketSpacing: true, //在对象中的括号之间打印空格`{x: 1}` 格式化为 `{ x: 1 }`
  embeddedLanguageFormatting: "auto", // 是否格式化一些文件中被嵌入的代码片段的风格，如果插件可以识别。
  htmlWhitespaceSensitivity: "ignore", // 指定 HTML 文件的全局空白敏感度。影响空白字符是否影响布局。
  insertPragma: false, // 在文件的顶部插入一个特殊的 @format 标记，指定文件格式需要被 Prettier 格式化。
  jsxSingleQuote: false, //jsx 语法是否单引号
  printWidth: 120, //单行代码最长字符长度，超过之后会自动格式化换行。
  proseWrap: "preserve", // 指定如何处理 markdown 文本的换行。（always | never | preserve）
  quoteProps: "as-needed", // 对象属性是否使用引号包裹。（as-needed | consistent | preserve）
  requirePragma: false, // 只有在文件顶部包含了特殊的 @format 标记时，才格式化文件。
  semi: false, //分号是否添加
  singleAttributePerLine: false, // 是否将每个 JSX 属性放在单独的一行上。
  singleQuote: true, //是否单引号
  tabWidth: 2, // 指定每个缩进级别的空格数。
  trailingComma: "none", //对象的最后一个属性末尾是否添加 `,`
  useTabs: false, // 是否使用制表符（tab）缩进。
  vueIndentScriptAndStyle: false, // 是否缩进 Vue 文件中的代码<script>和<style>标签
  endOfLine: "lf", // 与 `.editorconfig` 保持一致设置。指定换行符样式。（lf | crlf | cr | auto）
};
