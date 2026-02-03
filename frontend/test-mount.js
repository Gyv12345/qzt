const { JSDOM } = require('jsdom');

// 模拟 HTML
const html = `
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>
  </body>
</html>
`;

const dom = new JSDOM(html);
global.document = dom.window.document;
global.window = dom.window;

// 检查元素是否存在
const appElement = document.getElementById('app');
console.log('✅ 找到 app 元素:', appElement !== null);

const rootElement = document.getElementById('root');
console.log('❌ root 元素不应该存在:', rootElement === null);
