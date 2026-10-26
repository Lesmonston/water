import {add, el, heading, icon} from './common.mjs';
export function about(state) {
  const page = add(el('section'), heading('关于与隐私', '空间由你掌控，数据留在本机。'));
  add(page, add(el('div', 'glass about-brand'), icon('drop'), add(el('div'), el('h2', '', 'Water'), el('p', 'cap', state.app ? `版本 ${state.app.app_version}` : '服务未连接'))));
  for (const [title, text] of [['Water 读取什么', '文件名、大小、时间与属性，以及正在运行的程序列表，用于判断文件是否被占用。'], ['不读取什么', '文件内容、浏览器登录信息与网站数据、聊天记录内容。Cookies、登录信息、本地存储与 IndexedDB 始终受保护，Water 不会清理。网站离线数据（Service Worker 缓存）只在你确认后清理，清理后不影响登录。'], ['数据留在本机', '不上传任何数据。扫描、体检结果和清理记录都保留在这台设备上。'], ['清理由你确认', '删除只在你选择分组并确认后执行。文件将被永久删除，不进入回收站，无法恢复。可重新下载或生成，并不代表可以回滚。']]) add(page, add(el('section', 'glass privacy-section'), el('h2', '', title), el('p', 'sub', text)));
  return page;
}
