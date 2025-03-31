const fs = require('fs');
const path = require('path');
const {
  fileMergeSpipter,
} = require('./loadConfig.js')();
/**
 * 递归获取目录中所有.md文件
 * @param {string} dirPath - 要搜索的目录路径
 * @param {Array} [arrayOfFiles=[]] - 用于递归的文件数组
 * @returns {Array} 包含所有.md文件路径的数组
 */
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      } else if (path.extname(file) === '.md') {
        arrayOfFiles.push(fullPath);
      }
    });
    
    return arrayOfFiles;
  } catch (error) {
    console.error(`无法读取目录: ${dirPath}`, error);
    throw error;
  }
};

/**
 * 合并多个文件内容到一个输出文件
 * @param {Array} files - 要合并的文件路径数组
 * @param {string} outputFile - 输出文件路径
 */
const mergeFiles = (files, outputFile) => {
  const outputStream = fs.createWriteStream(outputFile);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    outputStream.write(content + `\n${fileMergeSpipter}\n`);
  });
  
  outputStream.end();
};

/**
 * 主合并函数
 * @param {string} inputDir - 输入目录路径
 * @param {string} outputFile - 输出文件路径
 */
function mergeMarkdownFiles(inputDir, outputFile) {
  try {
    const mdFiles = getAllFiles(path.join(process.cwd(), inputDir));
    mergeFiles(mdFiles, outputFile);
    console.log('文件合并完成！');
  } catch (error) {
    console.error('文件合并失败:', error);
    process.exit(1);
  }
}

module.exports = {
  getAllFiles,
  mergeFiles,
  mergeMarkdownFiles
};