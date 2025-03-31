const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');const { log } = require('console');
const { mergeMarkdownFiles } = require('./libs/file-merge');
const { downloadMainFunction } = require('./libs/downloader');
const { convertHtmlToMd } = require('./libs/html2md');
dotenv.config();

async function runDownload() {
    console.log('正在运行下载器...');
    try {
        await downloadMainFunction();
    } catch (error) {
        console.error('下载器执行失败:', error);
        process.exit(1);
    }
}

async function runTransform() {
    console.log('正在转换HTML为Markdown...');
    try {
        const inputDir = process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME;
        const outputDir = inputDir+"-markdown";
        await convertHtmlToMd(inputDir, outputDir);
    } catch (error) {
        console.error('HTML转换失败:', error);
        process.exit(1);
    }
}

async function runMerge() {
    console.log('正在合并所有的Markdown文件...');
    try {
        const inputDir = process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME;
        const mdOutputDir = inputDir + "-markdown";

        if (!fs.existsSync(mdOutputDir)) {
            console.error(`目录不存在: ${mdOutputDir}`);
            process.exit(1);
        }
        mergeMarkdownFiles(mdOutputDir, mdOutputDir+".full.md");
    } catch (error) {
        console.error('文件合并失败:', error);
        process.exit(1);
    }
}

const main = async () => {
    const args = process.argv.slice(2);
    const shouldDownload = args.includes('--download');
    const shouldTransform = args.includes('--transform');
    const shouldMerge = args.includes('--merge');

    // 如果没有指定任何参数，默认执行全部流程
    const runAll = !shouldDownload && !shouldTransform && !shouldMerge;

    if (runAll || shouldDownload) await runDownload();
    if (runAll || shouldTransform) await runTransform();
    if (runAll || shouldMerge) await runMerge();

    console.log('处理完成！');
}

main();
