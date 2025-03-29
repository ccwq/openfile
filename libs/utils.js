/**
 * 从URL中提取目录路径
 * @param {string} url - 需要处理的URL字符串
 * @returns {string} 返回URL的目录部分
 * @example
 * // 返回 'https://example.com/path'
 * getDirNameFromUrl('https://example.com/path/file.html?query=1')
 * @example
 * // 返回 'https://example.com/path'
 * getDirNameFromUrl('https://example.com/path')
 * @example
 * // 返回 'https://example.com/path/'
 * getDirNameFromUrl('https://example.com/path/')
 */
const getDirNameFromUrl = (url) => {
    let rawUrl = url;
    rawUrl = rawUrl.split("?")[0]
    if(!rawUrl.endsWith("/")){
        const pathArr = rawUrl.split("/")
        rawUrl = pathArr.slice(0, pathArr.length-1).join("/")
    }else{
        rawUrl = rawUrl.slice(0, -1)
    }
    return rawUrl;
}

module.exports = {
    getDirNameFromUrl,
}
