const fs = require('fs');
const dataUri = fs.readFileSync('kan64.txt', 'utf8');
let html = fs.readFileSync('index.html', 'utf8');
// Replace the swiss template data block fully
const replacement = `TEMPLATES.swiss = {
  name:'瑞士平面排版风',
  data:{t1:'什么是*', t2:'爆款的钩子', t3:'教你如何霸占', t4:'热门', search:'您可以搜索 "ID:CANVA"', handle:'@可画干货分享', ink:'#111111', blue:'#5270FF', bg:'#FFFFFF', eyesImg:${JSON.stringify(dataUri)}}`;
html = html.replace(/TEMPLATES\.swiss = \{[\s\S]*?data:\{[\s\S]*?eyesImg:[^\n]*\n/, replacement + '\n');
fs.writeFileSync('index.html', html);
console.log('embedded');
