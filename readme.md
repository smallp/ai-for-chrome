# Chrome HTML Fetcher (WebSocket Agent)

这是一个基于 Chrome 扩展程序的自动化 HTML 抓取工具。它通过 WebSocket 接收指令，并在后台静默抓取指定网址的 HTML 内容，经过清洗后回传。

## 主要功能

- **WebSocket 驱动**：通过 WebSocket 协议远程控制扩展程序执行任务。
- **后台静默运行**：抓取过程在后台标签页进行，不干扰用户正常浏览。
- **HTML 自动清洗**：自动移除脚本、样式表、框架及矢量图（script, style, link, iframe, svg），仅保留核心结构。
- **任务回传**：抓取结果以 JSON 格式实时通过 WebSocket 返回给服务端。
- **状态管理**：Popup 页面支持手动连接管理及地址持久化。

## 安装方法

1. 下载本仓库代码到本地。
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`。
3. 开启右上角的 **"开发者模式" (Developer mode)**。
4. 点击 **"加载已解压的扩展程序" (Load unpacked)**。
5. 选择本项目所在的文件夹。

## 使用说明

1. 点击浏览器工具栏中的扩展图标打开 Popup。
2. 输入您的 WebSocket 服务器地址（例如 `ws://localhost:8080`）。
3. 点击 **"Connect WebSocket"** 手动建立连接。
4. 保持浏览器运行，扩展将自动监听并处理服务端下发的任务。

## 协议格式

### 1. 服务端下发任务
服务端应发送以下格式的 JSON 消息：
```json
{
  "task": "featchUrl",
  "id": "unique_task_id_123",
  "data": {
    "url": "https://example.com"
  }
}
