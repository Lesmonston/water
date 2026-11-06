import {add, el, card} from './common.mjs';
export function about() {
  const node = el('div', 'privacy');
  for (const [title, text] of [['Water 读取什么', '一般体检读取名字、大小、时间与属性，以及进程信息。项目声明、工作树指向和你单独发起的查重有明确的内容读取范围。'], ['保护你的数据', '浏览器登录信息、Cookies、网站存储、源码与未知数据库受到保护。会话记录只有在设置中明确允许后，才会列出旧会话供你决定。'], ['数据留在本机', '不上传。体检结果和清理记录保存在这台电脑上。'], ['清理由你决定', '可再生缓存直接删除。你选的部分默认先放进同盘隔离区，可以还原；隔离区永久删除后才释放空间。直接删除与永久删除无法恢复。可重新下载不等于可回滚。']]) add(node, add(card(title), el('p', 'sub', text)));
  return node;
}
