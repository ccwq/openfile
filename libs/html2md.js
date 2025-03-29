const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv'); dotenv.config();
const { NodeHtmlMarkdown } = require('node-html-markdown');

const {
  replacementsForMarkdown
} = require('./loadConfig.js')();

/**
 * 将HTML文件或目录转换为Markdown格式
 * @async
 * @param {string} inputDir - 输入目录路径（包含HTML文件）
 * @param {string} outputDir - 输出目录路径（将保存转换后的Markdown文件）
 * @returns {Promise<void>}
 * @example
 * // 转换单个HTML文件
 * convertHtmlToMd('input.html', 'output.md');
 * @example
 * // 批量转换目录中的HTML文件
 * convertHtmlToMd('input-dir', 'output-dir');
 */
async function convertHtmlToMd(inputDir, outputDir) {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 创建转换器实例
  const nhm = new NodeHtmlMarkdown();

  // 递归处理目录
  /**
 * 递归处理目录中的HTML文件
 * @async
 * @param {string} currentPath - 当前处理的目录路径
 * @returns {Promise<void>}
 * @example
 * // 处理目录中的所有HTML文件
 * await processDirectory('./html-files');
 */
  async function processDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await processDirectory(fullPath);
      } else if (path.extname(item).toLowerCase() === '.html') {
        // 读取HTML文件
        const htmlContent = fs.readFileSync(fullPath, 'utf8');

        // 转换为Markdown
        const mdContent = nhm.translate(htmlContent);

        let mdResult = mdContent;

        // 对md进行替换
        replacementsForMarkdown.forEach(item => {
          const { search, replace } = item;
          const regex = new RegExp(search, 'g');
          mdResult = mdResult.replace(regex, replace);
        })

        // 计算输出路径
        const relativePath = path.relative(inputDir, currentPath);
        const outputPath = path.join(outputDir, relativePath);

        // 确保输出子目录存在
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }

        // 写入MD文件
        const mdFileName = item.replace(/\.html$/i, '.md');
        fs.writeFileSync(path.join(outputPath, mdFileName), mdResult);

        console.log(`Converted: ${fullPath} -> ${path.join(outputPath, mdFileName)}`);
      }
    }
  }

  await processDirectory(inputDir);
  console.log('Conversion completed!');
}

// 使用示例
// if (process.argv.length < 4) {
//   console.log('Usage: node html2md.js <input-directory> <output-directory>');
//   process.exit(1);
// }

const inputDir = process.argv[2] || process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME;
const outputDir = process.argv[2] || inputDir+"-markdown";

if(require.main === module){
  convertHtmlToMd(inputDir, outputDir).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}


module.exports = {
  convertHtmlToMd
}