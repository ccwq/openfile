# OpenFile Downloader & Converter

本项目包含两个主要工具：
1. [downloader.js](downloader.js) - 多线程下载工具
2. [html2md.js](html2md.js) - HTML转Markdown转换器

## 安装依赖

```bash
npm install
```

## 使用说明

### 1. 下载器 (downloader.js)

#### 功能
从HTML文件中提取链接并下载相关文件，支持多线程下载。

#### 参数说明
- `-t <number>`: 指定线程数（默认1）
- `<html-file>`: 源HTML文件路径

#### 使用示例
```bash
# 基本用法（单线程）
node downloader.js cesium-api-full.html

# 多线程下载（10个线程）
node downloader.js -t 10 cesium-api-full.html
```

#### 输出
- 下载的文件将保存在 `files` 目录下
- 每个文件的路径结构保持与源HTML中的相对路径一致

---

### 2. HTML转Markdown转换器 (html2md.js)

#### 功能
将HTML文件转换为Markdown格式，支持批量转换。

#### 参数说明
- `<input-dir>`: 输入目录路径（包含HTML文件）
- `<output-dir>`: 输出目录路径（将保存转换后的Markdown文件）

#### 使用示例
```bash
# 转换单个HTML文件
node html2md.js input.html output.md

# 批量转换目录中的HTML文件
node html2md.js input-dir output-dir
```

#### 输出
- HTML文件将被转换为同名的Markdown文件（.md扩展名）
- 目录结构保持不变
- 转换进度将在控制台显示

---

## 注意事项
- 确保源HTML文件中的链接是可访问的
- 下载器会自动创建必要的目录结构
- 转换器会递归处理所有HTML文件
- 建议在运行下载器时指定合适的线程数，避免过多线程导致系统负载过高

## 依赖包
- `node-html-markdown`: 用于HTML转Markdown转换
- `cheerio`: 用于HTML解析
- `worker-threads`: 用于多线程处理