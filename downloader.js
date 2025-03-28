const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');
const { argv } = require('process');
const dotenv = require('dotenv'); dotenv.config();

const DOWNLOAD_TASK_RETRY_COUNT = parseInt(process.env.DOWNLOAD_TASK_RETRY_COUNT) || 3;
const DOWNLOAD_TASK_RETRY_DELAY = parseInt(process.env.DOWNLOAD_TASK_RETRY_DELAY) || 3000;

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
  return new Promise(async (resolve, reject) => {
    if (fs.existsSync(filePath)) {
      try {
        // Check if file is accessible
        // fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);

        // 如果文件大小为0，删除文件并抛出错误
        const stats = await fs.promises.stat(filePath);

        console.log("文件尺寸大小判断：", stats.size, "字节")
        if (stats.size === 0) {
          // Delete the file if it's empty
          fs.unlinkSync(filePath);
          downloadFile(url, filePath, retryCount+1).then(resolve).catch(reject);
        }
        return resolve();
      } catch (accessErr) {
        // File exists but not accessible, wait and retry
        if (retryCount < DOWNLOAD_TASK_RETRY_COUNT) {
          setTimeout(() => {
            console.log(`File ${filePath} not accessible, retrying (${retryCount + 1}/${DOWNLOAD_TASK_RETRY_COUNT})`);
            downloadFile(url, filePath, retryCount + 1).then(resolve).catch(reject);
          }, DOWNLOAD_TASK_RETRY_DELAY);
          return;
        }
        return reject(accessErr);
      }
    }
    try {
      const file = fs.createWriteStream(filePath, { flags: 'wx' });
      
      const proxyUrl = process.env.DOWNLOAD_TASK_PROXY;
      let options = { host: urlMapFilePath };
      if (proxyUrl) {
        const parsedProxy = new URL(proxyUrl);
        options = {
          host: parsedProxy.hostname,
          port: parsedProxy.port,
          path: urlMapFilePath,
          headers: {
            Host: new URL(urlMapFilePath).hostname
          }
        };
      }
      https.get(options, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {
          if (retryCount < 3) {
            setTimeout(() => {
              console.log(`Retrying ${url} (${retryCount + 1}/${DOWNLOAD_TASK_RETRY_COUNT})`);
              downloadFile(url, filePath, retryCount + 1).then(resolve).catch(reject);
            }, DOWNLOAD_TASK_RETRY_DELAY);
          } else {
            const errorMessage = `${new Date().toISOString()} - Failed to download ${url}: ${err.message}\n`;
            fs.appendFileSync('download_errors.log', errorMessage);
            console.error(errorMessage.trim());
            reject(err);
          }
        });
      });
    } catch (writeErr) {
      if (retryCount < DOWNLOAD_TASK_RETRY_COUNT) {
        setTimeout(() => {
          console.log(`Error writing ${filePath}, retrying (${retryCount + 1}/3)`);
          downloadFile(url, filePath, retryCount + 1).then(resolve).catch(reject);
        }, DOWNLOAD_TASK_RETRY_DELAY);
      } else {
        reject(writeErr);
      }
    }
  });
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
  
  await Promise.all(chunks.map(async (chunk, i) => {
    for (const link of chunk) {
      if (!link) continue;
      
      try {
        const url = new URL(link);
        const outputDirName = process.env.DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME || 'files';
        const filePath = path.join(outputDirName, url.pathname);
        const dirPath = path.dirname(filePath);
        
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
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
    let concurrency = 2;
    let urlMapFilePath

    if (args.includes('-t')) {
      const index = args.indexOf('-t');
      concurrency = parseInt(args[index + 1], 10) || process.env.DOWNLOAD_TASK_THREAD_COUNT || concurrency;
      urlMapFilePath = args[index + 2];
    } else if (args.length > 0) {
      urlMapFilePath =  args[0] ;
      concurrency = process.env.DOWNLOAD_TASK_THREAD_COUNT || concurrency;
    }
    console.log(`Using concurrency: ${concurrency}`);

    // 优先使用命令行参数，其次是环境变量，最后是默认值
    urlMapFilePath = urlMapFilePath || process.env.DOWNLOADER_TASK_FILE_URL || "cesium-api-full.html"
    
    let html;
    if (urlMapFilePath.startsWith('http://') || urlMapFilePath.startsWith('https://')) {
      html = await new Promise((resolve, reject) => {
        https.get(urlMapFilePath, (response) => {
          let data = '';
          response.on('data', (chunk) => data += chunk);
          response.on('end', () => resolve(data));
        }).on('error', reject);
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
    const baseUrl = urlMapFilePath.split('/').slice(0, -1).join('/');
    // filter empty element
    links = links.filter(link => link);

    // remove hash
    links = links.map(link => link.split('#')[0]);

    // keep unique
    links = [...new Set(links)];
    // add base url
    links = links.map(link => new URL(link, baseUrl).href);

    if(!links.length) {
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