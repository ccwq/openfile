const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const {argv} = require('process');
const dotenv = require('dotenv');
const {getDirNameFromUrl} = require('./utils');


dotenv.config();


// 重试次数
const DOWNLOAD_TASK_RETRY_COUNT = parseInt(process.env.DOWNLOAD_TASK_RETRY_COUNT) || 3;


// 重试间隔时间，单位毫秒
const DOWNLOAD_TASK_RETRY_DELAY = parseInt(process.env.DOWNLOAD_TASK_RETRY_DELAY) || 3000;


/**
 * 代理设置
 * @type {{host: string, port: string}|null}
 */
const proxyInfo = (() => {
    const proxyUrl = process.env.DOWNLOAD_TASK_PROXY;

    if (proxyUrl) {
        const parsedProxy = new URL(proxyUrl);
        return {
            protocol: parsedProxy.protocol.replace(':', ''), // 移除冒号，例如 'http:' -> 'http' o
            host: parsedProxy.hostname,
            port: parsedProxy.port,
        }
    }
    return null;
})()


/**
 * 下载文件到本地
 * @param {string} url - 要下载的文件URL
 * @param {string} filePath - 本地保存路径
 * @param {number} [retryCount=0] - 重试次数，默认0
 * @returns {Promise<void>} 下载完成的Promise
 * @example
 * // 下载文件并重试3次
 * await downloadFile('https://example.com/file.txt', './files/file.txt', 3);
 */
async function downloadFile(url, filePath, retryCount = 0) {
    console.log(`Downloading ${url} to ${filePath}`);

    try {


        // 文件存在, 并且包含尺寸
        if (await fs.existsSync(filePath)) {
            try {
                const stats = await fs.promises.stat(filePath);
                console.log("文件尺寸大小判断：", stats.size, "字节");

                if (stats.size === 0) {
                    fs.unlinkSync(filePath);
                    return await downloadFile(url, filePath, retryCount + 1);
                }
                return;
            } catch (accessErr) {
                if (retryCount >= DOWNLOAD_TASK_RETRY_COUNT) {
                    throw accessErr;
                }

                console.log(`File ${filePath} not accessible, retrying (${retryCount + 1}/${DOWNLOAD_TASK_RETRY_COUNT})`);
                await new Promise(resolve => setTimeout(resolve, DOWNLOAD_TASK_RETRY_DELAY));
                return await downloadFile(url, filePath, retryCount + 1);
            }
        }

        const file = fs.createWriteStream(filePath, {flags: 'wx', mode: 0o666});
        try {
            const axiosConfig = {
                method: 'get',
                url: url,
                responseType: 'stream'
            };

            // 如果设置代理
            if (proxyInfo) {
                axiosConfig.proxy = proxyInfo;
            }

            const response = await axios(axiosConfig);
            response.data.pipe(file);


            // 文件流写入
            await new Promise((resolve, reject) => {
                file.on('finish', resolve);
                file.on('error', async(err) => {
                    await fs.promises.unlink(filePath).catch(() => {});

                    if (retryCount >= DOWNLOAD_TASK_RETRY_COUNT) {
                        const errorMessage = `${new Date().toISOString()} - Failed to download ${url}: ${err.message}\n`;
                        await fs.promises.appendFile('download_errors.log', errorMessage);
                        console.error(errorMessage.trim());
                        reject(err);
                    } else {
                        console.log(`Retrying ${url} (${retryCount + 1}/${DOWNLOAD_TASK_RETRY_COUNT})`);
                        await new Promise(resolve => setTimeout(resolve, DOWNLOAD_TASK_RETRY_DELAY));
                        resolve(await downloadFile(url, filePath, retryCount + 1));
                    }
                });
            });
        } catch (writeErr) {
            if (retryCount >= DOWNLOAD_TASK_RETRY_COUNT) {
                console.error(`下载次数超过${DOWNLOAD_TASK_RETRY_COUNT}, 停止`)
                throw writeErr;
            }

            console.error("error:", writeErr);
            console.log(`Error writing ${filePath}, retrying (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, DOWNLOAD_TASK_RETRY_DELAY));
            return await downloadFile(url, filePath, retryCount + 1);
        }
    } catch (err) {
        throw err;
    }
}


/**
 * 并发下载多个链接
 * @param {string[]} links - 要下载的URL数组
 * @param {number} [concurrency=1] - 并发数，默认1
 * @returns {Promise<void>} 所有下载完成的Promise
 * @example
 * // 并发下载2个文件
 * await downloadLinks(['https://example.com/1.txt', 'https://example.com/2.txt'], 2);
 */
async function downloadLinks(links, concurrency = 1) {
    const chunks = [];
    const chunkSize = Math.ceil(links.length / concurrency);

    for (let i = 0; i < concurrency; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        chunks.push(links.slice(start, end));
    }

    await Promise.all(chunks.map(async(chunk, i) => {
        for (const link of chunk) {
            if (!link) continue;

            try {
                const url = new URL(link);
                const outputDirName = process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME || 'files';
                let filePath = path.join(outputDirName, url.pathname);

                // 处理后缀名, 保证是html
                const ext = path.extname(filePath);
                if (!ext || ext!==".html") {
                    filePath = filePath + ".html";
                }

                const dirPath = path.dirname(filePath);

                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, {recursive: true, mode: 0o777});
                }

                console.log(`[Task ${i}] Downloading ${url.href} to ${filePath}`);
                await downloadFile(url.href, filePath);
                console.log(`[Task ${i}] Downloaded ${filePath}`);
            } catch (err) {
                console.error(`[Task ${i}] Error downloading ${link}:`, err.message);
            }
        }
    }));
}

/**
 * 主函数，处理命令行参数并执行下载任务
 * @returns {Promise<void>}
 * @example
 * // 从cesium-api-full.html下载所有链接，使用4个并发
 * node downloader.js cesium-api-full.html -t 4
 */
async function main() {
    try {
        const args = argv.slice(2);


        // 下载分段数
        let concurrency = 2;
        const setConcurrency = (val)=>{
            concurrency = typeof val == "number" ? val : parseInt(val);
        }

        let urlMapFilePath


        // 使用了参数
        if (args.includes('-t')) {
            const index = args.indexOf('-t');
            setConcurrency(args[index + 1] || process.env.DOWNLOAD_TASK_THREAD_COUNT || concurrency)
            urlMapFilePath = args[index + 2];
        }

        // 不使用参数的情况
        else{
            setConcurrency(process.env.DOWNLOAD_TASK_THREAD_COUNT || concurrency)
            if (args.length > 0) {
                urlMapFilePath = args[0];
            }
        }

        console.log(`Using concurrency: ${concurrency}`);

        // 优先使用命令行参数，其次是环境变量，最后是默认值
        urlMapFilePath = urlMapFilePath || process.env.DOWNLOADER_TASK_FILE_URL || "cesium-api-full.html"

        let html;
        if (urlMapFilePath.startsWith('http://') || urlMapFilePath.startsWith('https://')) {
            html = await new Promise(async(resolve, reject) => {

                const options = {url: urlMapFilePath, method: 'get'};

                // 如果设置代理
                if (proxyInfo) {
                    options.proxy = proxyInfo;
                }

                const response = await axios(options);
                resolve(response.data);
            });
        } else {
            html = fs.readFileSync(urlMapFilePath, 'utf8');
        }
        const $ = cheerio.load(html);

        // 从环境变量中读取选择器，或者使用默认值
        const rootSelector = process.env.DOWNLOADER_TASK_FILE_DOM_ROOT_SELECTOR || 'body';
        const elementSelector = process.env.DOWNLOADER_TASK_FILE_DOM_ELEMENT_SELECTOR || 'a';

        let links = $(rootSelector).find(elementSelector).map((i, el) => $(el).attr('href')).get();

        // add base url
        // gir dir path from urlMapFilePath
        const baseUrl = getDirNameFromUrl(urlMapFilePath) + "/";
        // filter empty element
        links = links.filter(link => link);

        // remove hash
        links = links.map(link => link.split('#')[0]);

        // keep unique
        links = [...new Set(links)];
        // add base url
        links = links.map(link => new URL(link, baseUrl).href);

        if (!links.length) {
            console.log('No links found.');
            return;
        }

        if (!fs.existsSync('files')) {
            fs.mkdirSync('files');
        }

        await downloadLinks(links, concurrency);
        console.log('All downloads completed!');
    } catch (err) {
        console.error('Error:', err);
    }
}

if (require.main === module) {
    main();
}


module.exports = {
    downloadMainFunction: main,
}
