const fs = require('fs');
const yaml = require('yaml');

/**
 * 加载并解析config.yml文件
 * @returns {{replacementsForMarkdown: Array<{search: string, replace: string}>}|null} 解析后的配置对象，包含替换规则数组
 * @example
 * // 获取配置
 * const config = loadConfig();
 * if (config) {
 *   console.log(config.replacements); // 输出替换规则数组
 * }
 */
function loadConfig() {
  try {
    const fileContent = fs.readFileSync('config.yml', 'utf8');
    return yaml.parse(fileContent);
  } catch (err) {
    console.error('加载配置文件出错:', err);
    return null;
  }
}

module.exports = loadConfig;