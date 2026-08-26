const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const dataUri = fs.readFileSync('kan64.txt', 'utf8');
const replacement = `TEMPLATES.swiss = {
  name:'瑞士平面排版风',
  data:{t1:'什么是*', t2:'爆款的钩子', t3:'教你如何霸占', t4:'热门', search:'您可以搜索 "ID:CANVA"', handle:'@可画干货分享', ink:'#111111', blue:'#5270FF', bg:'#FFFFFF', eyesImg:${JSON.stringify(dataUri)}},
  render(d){return \``;
html = html.replace(/TEMPLATES\.swiss = \{[\s\S]*?render\(d\)\{return \`/, replacement);
fs.writeFileSync('index.html', html);
console.log('fixed');
