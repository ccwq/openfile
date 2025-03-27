const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

async function convertHtmlToSitemap(htmlFilePath) {
    try {
        // 读取HTML文件
        const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
        
        // 使用cheerio解析HTML
        const $ = cheerio.load(htmlContent);
        
        // 提取所有链接
        const links = [];
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                links.push(href);
            }
        });

        // 生成sitemap.xml内容
        const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
            links.map(link => `
    <url>
        <loc>${link}</loc>
        <priority>0.8</priority>
    </url>`).join('') +
            `
</urlset>`;

        // 生成输出文件名
        const outputFilePath = path.join(
            path.dirname(htmlFilePath),
            path.basename(htmlFilePath, path.extname(htmlFilePath)) + '-sitemap.xml'
        );

        // 写入sitemap文件
        await fs.writeFile(outputFilePath, sitemapContent);
        console.log(`Sitemap generated successfully at: ${outputFilePath}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// 使用示例
// node html-to-sitemap.js cesium-api-part2.html
if (require.main === module) {
    if (process.argv.length < 3) {
        console.error('Usage: node html-to-sitemap.js <html-file-path>');
        process.exit(1);
    }
    
    const htmlFilePath = process.argv[2];
    convertHtmlToSitemap(htmlFilePath);
}