# API文档下载与转换工具

本项目是一个自动化工具链，用于下载在线API文档、转换为Markdown格式并合并为单个文件，便于后续RAG索引或直接作为大模型输入。

## 核心功能

1. **文档下载模块** (`downloader.js`)
   - 多线程下载在线API文档资源
   - 自动解析HTML中的资源链接
   - 保持原始目录结构

2. **格式转换模块** (`html2md.js`)
   - 将HTML文档转换为标准Markdown格式
   - 支持批量转换整个目录
   - 保留文档结构和超链接

3. **文件合并模块** (`file-merge.js`)
   - 将所有Markdown文件合并为单个文件
   - 保持章节顺序和层级关系
   - 生成最终可用于RAG系统的文档

## 典型工作流程

1. 运行下载器获取在线文档资源
2. 转换HTML文档为Markdown格式
3. 合并所有Markdown文件生成最终文档

## 使用说明

1. **环境变量配置**
   - **API文档URL**
     - `DOWNLOADER_TASK_URL`: API文档的源URL地址
     - `DOWNLOADER_TASK_FILE_NAME`: 下载后的文件名
     
   - **输出目录配置**
     - `DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME`: 下载文件的输出目录
     - `DOWNLOADER_TASK_FILE_OUTPUT_DIR_PATH`: 输出目录的完整路径

   - **网络配置**
     - `DOWNLOAD_TASK_PROXY`: HTTP/HTTPS代理服务器URL（格式：http://host:port）
     - `DOWNLOAD_TASK_RETRY_COUNT`: 下载重试次数（默认3次）
     - `DOWNLOAD_TASK_RETRY_DELAY`: 重试间隔时间（毫秒，默认3000）

   - **性能配置**
     - `DOWNLOAD_TASK_CONCURRENCY`: 并发下载数量（默认1）
     - `DOWNLOAD_TASK_TIMEOUT`: 请求超时时间（毫秒，默认30000）

2. **替换规则设置**
   - **HTML到Markdown转换规则**
     - 在`config.yml`中定义转换规则，格式如下：
       ```yaml
       replacementsForHtml:
         - search: "搜索模式"
           replace: "替换内容"
       replacementsForMarkdown:
         - search: "搜索模式"
           replace: "替换内容"
       ```

   - **目录结构**
     - 下载目录：`DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME`
     - Markdown输出目录：`DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME-markdown`
     - 合并后的文件：`DOWNLOADER_TASK_FILE_OUTPUT_DIR_NAME-markdown.full.md`

3. **执行流程**
   - 运行`node index.js`启动完整处理流程（下载、转换和合并）
   - 可选参数：
     - `--download` 仅执行下载任务
     - `--transform` 仅执行转换任务
     - `--merge` 仅执行合并任务
   - 示例：
     - `node index.js --download` 仅下载文档
     - `node index.js --transform --merge` 转换并合并文档
     - 参数可以任意组合使用

## 输出用途

- **RAG系统索引**：合并后的Markdown文件可直接用于构建文档检索系统
- **大模型输入**：完整文档可作为上下文信息提供给大语言模型

## 依赖项

- `node-html-markdown`: HTML转Markdown
- `cheerio`: HTML解析
- `worker-threads`: 多线程处理

