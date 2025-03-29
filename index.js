const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');const { log } = require('console');
const { mergeMarkdownFiles } = require('./libs/file-merge');
const { downloadMainFunction } = require('./libs/downloader');
const { convertHtmlToMd } = require('./libs/html2md');
 dotenv.config();

const main = async () => {

    // 1. 运行下载器
    console.log('正在运行下载器...');
    try {
        await downloadMainFunction();
    } catch (error) {
        console.error('下载器执行失败:', error);
        process.exit(1);
    }

    // 2. 运行HTML转Markdown
    console.log('正在转换HTML为Markdown...');
    try {
        const inputDir = process.argv[2] || process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME;
        const outputDir = process.argv[2] || inputDir+"-markdown";
        await convertHtmlToMd(inputDir, outputDir)
    } catch (error) {
        console.error('HTML转换失败:', error);
        process.exit(1);
    }

    //3. 合并所有的md文件
    console.log('正在合并所有的Markdown文件...');
    try {
        const inputDir = process.argv[2] || process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME;
        const mdOutputDir = inputDir + "-markdown";

        try {
            if (!fs.existsSync(mdOutputDir)) {
                console.error(`目录不存在: ${mdOutputDir}`);
                process.exit(1);
            }
            mergeMarkdownFiles(mdOutputDir, mdOutputDir+".full.md");
        } catch (error) {
            console.error('文件合并失败:', error);
            process.exit(1);
        }


    } catch (error) {
        console.error('文件合并失败:', error);
        process.exit(1);
    }

    console.log('处理完成！');
}


main();
