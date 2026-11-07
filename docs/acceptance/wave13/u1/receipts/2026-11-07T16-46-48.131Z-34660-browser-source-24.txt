import {add, el, heading, button, row} from './common.mjs';
export function intro(s, a) {
  const lines = ['体检只读：只看名字、大小和时间，不读文件内容。', '清什么由你点：推荐的直接清，要确认的先放进隔离区。', '隔离区里的随时能还原，永久删除前会再问一次。'];
  const main = add(el('section', 'card dark main-card intro'), lines.map(text => row(text)), add(el('div', 'bottom action-stack'), button('开始', a.startIntro, 'btn primary', 'intro-start')));
  return add(el('section', 'screen'), heading('Flick 怎么用', ''), main);
}
