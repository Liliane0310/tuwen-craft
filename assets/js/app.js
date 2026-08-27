/* 封面编辑器可用字体列表（与正文编辑器保持一致） */

/* 通过 JSBridge 保存图片到相册，浏览器环境降级为下载 */
async function saveImageViaBridge(dataUrl,name){
  if(window.xhs&&window.xhs.miniTool&&window.xhs.miniTool.saveImageToPhotosAlbum){
    try{
      const{filePath}=await window.xhs.miniTool.writeTempFile({data:dataUrl});
      await window.xhs.miniTool.saveImageToPhotosAlbum({filePath});
      alert('已保存到相册');
      return;
    }catch(err){
      alert('保存失败:'+(err&&err.errMsg||err&&err.message||'未知错误'));
      return;
    }
  }
  /* 浏览器降级：使用 a[download] */
  const a=document.createElement('a');
  a.download=`${name||'image'}_${Date.now()}.png`;
  a.href=dataUrl;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const COVER_FONT_STACKS={
  'zh-system':'"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
  'zh-song':'"Songti SC",SimSun,"Noto Serif CJK SC",serif',
  'zh-kai':'"Kaiti SC",KaiTi,STKaiti,serif',
  'zh-hei':'STHeiti,"Heiti SC","Microsoft YaHei",sans-serif',
  'zh-lxgw':'"LXGW WenKai","Kaiti SC",KaiTi,serif',
  'zh-muyao':'"MuYao SuiXinShouXieTi","Ma Shan Zheng",cursive',
  'zh-xwkai':'"XiaWuZhenKai","Noto Sans SC",sans-serif',
  'en-system':'-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
  'en-serif':'Georgia,"Times New Roman",Times,serif',
  'en-playfair':'"Playfair Display","Noto Serif SC",Georgia,serif',
  'en-rounded':'"Arial Rounded MT Bold","Avenir Next",Arial,sans-serif',
  'en-mono':'"SFMono-Regular",Menlo,Consolas,monospace',
  'en-lora':'"Lora","EB Garamond",Georgia,"Times New Roman",serif',
};
const COVER_FONT_OPTIONS=[
  {value:'',label:'默认字体'},
  {value:'zh-system',label:'苹方/系统黑体'},
  {value:'zh-song',label:'宋体'},
  {value:'zh-kai',label:'楷体'},
  {value:'zh-hei',label:'黑体'},
  {value:'zh-lxgw',label:'霞鹜文楷'},
  {value:'zh-muyao',label:'沐瑶随心手写体'},
  {value:'zh-xwkai',label:'夏五珍楷'},
  {value:'en-system',label:'系统无衬线'},
  {value:'en-serif',label:'Serif'},
  {value:'en-playfair',label:'Playfair Display'},
  {value:'en-rounded',label:'Rounded'},
  {value:'en-mono',label:'Mono'},
  {value:'en-lora',label:'Lora'},
];

const TEMPLATES = {};
const SVG = {
  wave:(color='#f5811f',w=560)=>`<svg width="${w}" height="34" viewBox="0 0 560 34" fill="none" preserveAspectRatio="none" style="display:block"><path d="M6 20 Q 45 4 84 18 T 162 18 T 240 18 T 318 18 T 396 18 T 474 18 T 552 18" stroke="${color}" stroke-width="9" stroke-linecap="round"/></svg>`,
  arrowUp:(color='#f5811f')=>`<svg width="150" height="150" viewBox="0 0 150 150" fill="none"><path d="M20 120 C 40 118 66 96 72 60 C 74 46 70 40 62 44 C 55 48 58 62 74 58 C 96 54 112 40 124 22" stroke="${color}" stroke-width="10" stroke-linecap="round"/><path d="M124 22 L 104 30 M124 22 L 118 44" stroke="${color}" stroke-width="10" stroke-linecap="round"/></svg>`,
  eyes:(src)=>src?`<img src="${src}" style="width:120px;height:auto;display:block">`:`<svg width="120" height="70" viewBox="0 0 120 70" fill="none"><ellipse cx="34" cy="35" rx="30" ry="33" fill="#fff" stroke="#111" stroke-width="4"/><ellipse cx="86" cy="35" rx="30" ry="33" fill="#fff" stroke="#111" stroke-width="4"/><circle cx="30" cy="42" r="12" fill="#111"/><circle cx="82" cy="42" r="12" fill="#111"/></svg>`,
  smile:(color='#f5811f')=>`<svg width="200" height="130" viewBox="0 0 200 130" fill="none"><path d="M40 40 L46 78 M70 34 L74 74" stroke="${color}" stroke-width="9" stroke-linecap="round"/><path d="M28 88 C 60 128 140 128 176 78" stroke="${color}" stroke-width="9" stroke-linecap="round"/></svg>`,
  search:(c='#1f2b26')=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  arrowCircle:(c='#1f2b26',s=54)=>`<svg width="${s}" height="${s}" viewBox="0 0 54 54" fill="none" stroke="${c}" stroke-width="3"><circle cx="27" cy="27" r="25"/><path d="M20 27h15m0 0l-6-6m6 6l-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function placeholder(label,bg='#ffe0cf',fg='#e8865a'){
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};color:${fg};font-family:var(--font-sohne);gap:8px"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg><span style="font-size:13px;font-weight:500">${label}</span><span style="font-size:10px;opacity:.7">上传图片替换</span></div>`;
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

/* 颜色值安全校验：只允许 #hex / rgb()/rgba() / hsl()/hsla() / 常见命名色，
   其余一律回退到 fallback，避免用户输入的颜色字段注入 CSS/HTML。 */
function safeColor(value,fallback='#000000'){
  const raw=String(value??'').trim();
  if(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw))return raw;
  if(/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/.test(raw))return raw;
  if(/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/.test(raw))return raw;
  if(/^[a-zA-Z]{1,20}$/.test(raw))return raw; /* 命名色如 red/transparent */
  return fallback;
}

/* 图片来源安全校验：只允许 data:image/ 或 blob: 前缀，其余回退为空。 */
function safeImageSrc(value){
  const raw=String(value??'').trim();
  if(/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw))return raw;
  if(/^blob:/.test(raw))return raw;
  return '';
}

function splitSwissTitle(value,maxChars=6,maxLines=4){
  const paragraphs=String(value??'').replace(/\r/g,'').split(/\n+/).map(line=>line.trim()).filter(Boolean);
  const lines=[];
  for(const paragraph of paragraphs){
    const chars=Array.from(paragraph);
    for(let i=0;i<chars.length&&lines.length<maxLines;i+=maxChars)lines.push(chars.slice(i,i+maxChars).join(''));
    if(lines.length>=maxLines)break;
  }
  return lines.length?lines:['在此写标题'];
}

/* ===================== 模板 1: 小红书效率风 ===================== */
TEMPLATES.hamster = {
  name:'小红书效率风',
  data:{tag:'打工人必备技巧', l1:'超实用！', l2:'这个方法', l3:'让我效率翻倍', footL1:'PRODUCTIVITY HACKS', footL2:'WORK SMART NOT HARD', cta:'立刻码住', accent:'#f68e22', highlight:'#f6d04c', img:null},
  render(d){return `
  <div style="width:900px;height:1200px;background:#fff;position:relative;font-family:var(--font-sohne);overflow:hidden">
    <div style="height:80px;background:#f2f2f2;display:flex;align-items:center;padding:0 28px;gap:12px">
      <span style="width:15px;height:15px;border-radius:50%;background:#ee6a5e"></span>
      <span style="width:15px;height:15px;border-radius:50%;background:#f5bd4f"></span>
      <span style="width:15px;height:15px;border-radius:50%;background:#61c454"></span>
      <div style="flex:1"></div>
      <div style="background:#fff;border-radius:18px;padding:8px 18px;display:flex;align-items:center;gap:10px;box-shadow:0 1px 2px rgba(0,0,0,.06)">
        <span data-edit="tag" style="font-size:18px;font-weight:500;color:#1f2b26">${escapeHtml(d.tag)}</span>${SVG.search()}
      </div>
    </div>
    <div data-typo="hamster.titleSpacing" style="position:absolute;top:132px;left:50px;right:40px;z-index:3;font-size:118px;line-height:1.12">
      <div style="position:relative">
        <div data-edit="l1" style="font-size:118px;font-weight:900;line-height:inherit;color:#111111;letter-spacing:-2px">${escapeHtml(d.l1)}</div>
      </div>
      <div data-edit="l2" style="font-size:118px;font-weight:900;line-height:inherit;color:#111111;letter-spacing:-2px">${escapeHtml(d.l2)}</div>
      <div style="position:relative">
        <div data-edit="l3" style="font-size:118px;font-weight:900;line-height:inherit;color:#111111;letter-spacing:-2px;display:inline-block;background:linear-gradient(transparent 55%, ${safeColor(d.highlight,'#f6d04c')} 55% 92%,transparent 92%);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 6px">${escapeHtml(d.l3)}</div>
      </div>
    </div>
    <div style="position:absolute;top:180px;right:70px;z-index:2;transform:rotate(8deg)">${SVG.arrowUp(safeColor(d.accent,'#f68e22'))}</div>
    <div data-img="img" style="position:absolute;bottom:100px;right:0;width:440px;height:500px;z-index:2">${safeImageSrc(d.img)?`<img src="${safeImageSrc(d.img)}" style="width:100%;height:100%;object-fit:contain">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:3px dashed #d4c8b4;background:rgba(244,241,234,.45);color:#9b9180;flex-direction:column;gap:10px"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span style="font-size:14px;font-weight:500">图片占位</span><span style="font-size:11px">上传透明底 PNG</span></div>`}</div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:90px;background:#eeeeef;display:flex;align-items:center;justify-content:space-between;padding:0 44px">
      <div style="line-height:1.18">
        <div data-edit="footL1" style="font-size:20px;font-weight:900;color:#111111;letter-spacing:.6px">${escapeHtml(d.footL1)}</div>
        <div data-edit="footL2" style="font-size:20px;font-weight:900;color:#111111;letter-spacing:.6px">${escapeHtml(d.footL2)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span data-edit="cta" style="font-size:36px;font-weight:900;color:#111111">${escapeHtml(d.cta)}</span>${SVG.arrowCircle('#111111',52)}
      </div>
    </div>
  </div>`;},
  fields:[
    {key:'tag',label:'顶部搜索标签',type:'text'},{key:'l1',label:'标题第1行',type:'text'},{key:'l2',label:'标题第2行',type:'text'},{key:'l3',label:'标题第3行(黄色高亮)',type:'text'},
    {key:'footL1',label:'底部英文1',type:'text'},{key:'footL2',label:'底部英文2',type:'text'},{key:'cta',label:'行动号召',type:'text'},
    {key:'accent',label:'手绘线/箭头颜色',type:'color',swatches:['#f68e22','#ff5a3c','#2f5d50','#3b6df0']},{key:'highlight',label:'文字高亮色',type:'color',swatches:['#f6d04c','#ffd84d','#7cc6ff','#ffb0c8']},{key:'img',label:'图片占位图',type:'image'},
  ],
  typography:[
    {key:'tag',label:'顶部搜索标签',lineHeight:false},
    {key:'l1',label:'标题第 1 行',lineHeight:false},
    {key:'l2',label:'标题第 2 行',lineHeight:false},
    {key:'l3',label:'标题第 3 行',lineHeight:false},
    {key:'hamster.titleSpacing',label:'标题整体行距',fontSize:false},
    {key:'cta',label:'行动号召',lineHeight:false}
  ],
  annotations:[
    {id:'hamster-wave-1',type:'wave',x:52,y:236,w:430,h:34,rotation:0,color:'#f68e22'},
    {id:'hamster-wave-2',type:'wave',x:54,y:502,w:300,h:34,rotation:0,color:'#f68e22'},
  ],
};

/* ===================== 模板 2: 黑白蓝瑞士平面排版风 ===================== */
TEMPLATES.swiss = {
  name:'瑞士平面排版风',
  data:{t1:'什么是*', t2:'爆款的钩子', t3:'教你如何霸占', t4:'热门', search:'搜索你感兴趣的关键词', handle:'@xiao雪', ink:'#111111', blue:'#5270FF', bg:'#FFFFFF', eyesImg:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMYAAADYCAYAAACwR5y2AAAQAElEQVR4AeydB7wkRbXw69yLIqC4KCCSkSRKRnJaghKeIElyWEmSkQwKCHzkuA8EHnGXKDzikh4KwpJEEJAkOUnOLpJhd/nOv+bWbE9Pd3XPnZnu6rszvzpT1VXV1aeq69Q5depUdZ8p/vdtfeSPFb6m0HO9FgiyBYomjCW0FV5UeFzhVYVdFUSh53otEFQLFE0Yp2vtp1PAzah/f1C4WmFahZ7rtUAwLVAkYcyjtV5a4SuFqFtPL/6kgIilXs/1WqD8FiiSMFYcqG6S6LSMpv1ZYRqFnuu1QOktUCRhzJ9c23rsUhq6VKFfoed6LVBqCxRJGMwpsiq7rmYYqVBlB0fcSitwh8L7CigZRqk/p0LPVaQFiiSMvGLSbtp2dCz1Kue+oxgzX7pQ/ZUUUDTMov4IhYcVVlDouQq0QJGE8c0W2uN/NO+CClVyKA9uUYR/qpDkSL9OE3qcQxshdFckYbSikp1aG+5KhbxcRrOW6hCfLlIMFlfwOTgIKmtfnl5aAC1QJGF82mJ9mayf3OI9g8ve/l0sVK6TUkxcPb225ltFoecCboEiCeOLQbTDjnrPzxVCdjMrckcppDm4STxtv3hE7zqsFiiSMFrlGK6lztXA9xRCdScoYq2IiZrdrKF/P1DouUBboEjCGDfINoAozh7kvd2+bVF9wGYKrTrafZNWb+rlL64FeEFFPW2whAF+rG/sQCAwOELxSRKVNDrTbZCZo5ehtBYokjDebbOWTMTnbrOMTt6+mBbWzvwHDRbrHlqMMb2/sFqgSMJgBbid2rMOcp4WMNgRWm/tqPuNlpaFyyeaJ83R9sumJfbiy20BXk5RGLye8SAm53HVZvyWlTViF4Wy3fcVgU0VfO42Tbxcwed6K+G+1ikxrUjCyOIYn2k7sD9DPa87VlPnUijT/Vof/nUFn/t/mniPgs/1CMPXOiWmFUkYr2XUk1XhYzTPMwo+h0h1jmbIEmM0S1fcFFrq9go+9w9NHKvwNwWf+4km9rb4aiOE5ookDORtrE19bYAF7taaYYKCz62miSz+qVe4+y99IoaB6qW6EwdSnlT/Pwpp7huaEIpCQVHpOdcCRRIGz8ziGhjY3acZj1PIciyszZ6VqQvp22WUifYNOy+yTdQ/9rerl+rmS03pJZTWAkUTxnMZNYUwyML6wD8JeOBbmlb0wh8cbU19rs+N1sSo+cvTeu1zC/gSe2nltEDRhJE1f3BmEp9rc2yrkCVSYVrBXgfNWojbUp/imxOgVYsTaxZh9DiGNmpormjCyOIYUW3T/dpYLOqp53XkwZDPm6lDidtklIOK9tlYHuYZsaiGS6yIGyJ6F+W3QNGEEe808RaIEgZpv9e/rHvQZrGxSbN21bHSvXDGEzB4jGd5OR4Ru54jdj0ZX4ZT9aIJI4tjzKtNEz0MgUU/RComsZqU6tgLgZiTmqEDCb/KKOPfmn6tQty9Eo+IXWMkWfR7iKHQu4y3QNEvBK3UR3EkItdTajiuvrxb405TyHL/rRlmUuiGYzEva6X7f/XBLFKq1+De0ytU1eolOuYsMySm9CJLa4GiCYOKZk1Gk7Q0v9Mbs7gNBnlnaL5uOHbdZXVetFFpz85a9S9qjpSGXy8+1gJlEEaWXj+JMD5WvBFlskSq9TXfYPZH6G1el6X5gth9q9xZhIHtlReBXmKxLVAGYWStTyQRBq2SV6TC3qqTIzBrF3AMcEgDH7fgnqwV/x5h0EohwAAOZRDGYwPPTvN8mh9EqufTbhyIR6TqpHk6HIh5wEDxTR5rLZwQ0pQQiWA1PHLZFORonabIXkR5LVAGYeThGBjqJbVKXpGK1emdkgoYRBxaMd9tnLmLUsGXJ4swhvlu7qUV3wJlEAbqyw88VUUz9UNP+l2alkdLhSEfH6jR7IN2y+mdPg6mySZLjDL6QzOlXqrrcYzUpiknoQzCoKbtiFPcn0ek4tC2P2rmqRQG69h34buXucMYX4aBNPINBBO9HsdIbJbyIssiDM5x9dWa0zd86YhUWLlmaakW0kJOUhiMY0KctXYB4WHXlVW+z/Sce3uEQSsEBGURBht5fM2QRRjcy2nieTr9zpo5y8ZJszQ5ttCysNeUEIk4PxL2BX0LfNzH5iv8HgTSAmURRhbHWFLbJ88OvYM1XxaRaRbDwh+nchDOA8j8EIYvL+sWD/kyRNKyCCOLACNF9YJFtEBZhIFm6ktPBREt8phjs+9hcy0nq+Mx32AuMKvmzeP21UyofdVLda18x8OnbOABPY5BKwQEZREGcvkTGe0A18jIYpOf0v99FLIcRHGTZoIbqJfq2BW4V2pqLYETT66pBXP9ZxFu1HAyV4G9TN1tgbIIg1pliSF8eox8eQCz86xFNsphMv5/GkgjDjoopuNZnx/gpBK4lRaVy/m4IwWk4UNaD0pogTIJ4+8Z9eULrxlZGpJZ0MtSA3MDh5yxFjKXMVw2AOsjaR9+cRnhFhCPu87jZxFGnjJ6eQpsgTIJ44GMerKw1sqkFHFlIy0zS57XLAbOgQLgQL1gLrOE+lcooMFSz+uO1FT2iaiX24Fb7sy9jOW3QJmE8YhW3yeOcLTMIpqnFceecg5L9pXryuPofs6xwjIWIoWoXFqa/6AmxPd0a1Tbrjf5brsJO1tAmYRB54U4fDVqZZ7hymHfNfZNHEzg4jrhYyyIChe/E+VFy2BuE72uapjBZkVFHrGWeRgf6UThwZoTgw/Q7Z2W+vj2XZmEAfYceICfBpzUl5bmi79EE/dX6KQ7WgvLwlezJDq0cIkJFY6EmJkHIo5erfV4QQEx9k71z1Q4QIGv766lPl+wRVwFfJbKmjUMVzZhsEjmawka3pfuS8OIkJfTCc7B11YP9z0sIw3DyOQs1YpF5NtYUb5UAYth3h/iKBvE4gdZaJZEx32JCSFFhkgYiCpMjNEQtdMZaefj9Y/dd0l7sTUpl7tVc7EnA7w0ONk5LBBW11pfrPCGAie40x4swuply+7tlu8o4YayCYN93LBgOh+nD6Iq5TgcjqrZQ9uDl6BeWw45F7mXhcBWCzpLb+Cs2na1SlniA0aR+qigHCc98jVa2u0WxWwLBTiGem25HsfI2XycCgJBcIYUBPJhzvtaycakD1spzNWz9kZQLushnHLIJBIlAXHtACYpvvvH+xILTmOx8RB95r8U2CaMOluDHXM9jtGxpuxMQaw9MIGeTYtj9EM0YJGRjVMvadxfFU5R4OM0qInZmaeXk41j38pvtbYvKsC94dwa7KhDCdGNga+jSFJY2aIUOBQNEAiTRzQmqIOxjWLiuLwisrcCWpVOTNi1qLrL4hj1jGUE9JlMnjm95SgNd4MgtFjr8nBrm7Hsv8mRMMpo86w5RrtzmMHWCe6J7RjqVneg9mDLynPfW3kyhZCnRxjFvAU0Wr7OX7QtFZomdkAyl+LgiGJawZgexyiqpSvyHEzssdilQ6LmZNssSgcUAohwWZ8u62Q1eT4cAkNIJtqdLBsRlEO4r9JCsSljzzznCrOFgLrmsUXTW8t3PY5R/DtgdfhNfSxqanYfMukf7Iq6FtOSY+UZc//1WrrLnxlCYNPWupqNzV1osbA7Q7OFXdkNGo9WkLqintfL8F2PMMJ/R53CEBslTnNE0dBumXzagK/ScjwRhMDGruu10HEKg3HB3TMUCINj9FmZZTEK9s0BBZw8zlZWTMlHaaufqoAKkvNvEV1YvNKoycaxN56FTiyWB1tpxCQm6tg+QVyHakGIiOoNPVdFwuBc2h31VWAoyGHJiCWszLIYxQIenf+Xmg5rh6VjErK7XsPaIRpGTUY21JOYnfxc09DhqzfkHIZ+HFfK6M78ZjAV5IgiBhj2x3CG781aCHHqDV1XFcJAdt1NX8O9ChADphocgjCLXg/GUW/EAMpEBGA1lq2xq2phg+1AemtQDqLg3CtM8AeL2Fi9EfMcDAcZSPRy8nB0kJBryk47jsBkOymj+zKKbDc6LjZAyOB/0fLpAKgyW9k9qLcF5RxRwDkHgxiDDxu+VtGbH1WY7FyohME+DLQZbGTisLQizbZ/pL0AVSY7+1gd7wYh6iO66jhHa7BEgbi5oGLXyikomr3qrhH/0AgD0QhzDdSXWLWW2Snn1KZiwophI5oXvayMQ9kAl20FYeZdrDnALVEpt3LvkMsbCmFw7D9nQ2HijK2/JQgRMX19fUbEXpqSfsw7ECew/i2Sc7VTXQ60W0ELYK1EvUzHOgMLcHDpzMyTQ4a+ACrJkf9oithxh6xfR0lETH9/vyUO4/mR5+tf/7rN58JcTznllAZwt37ta5NMliA44ocNG9ZAeCJir0Ua/ClF5DDNz2IcX5bVYPAOK1mIAyLxIYtqm/0q5Pflm6zS+kquLWpXVmITt7B+9dVXZuLEiQbf4UmHjnZw4iGCJZdc0uy5557m4osuNheMvsDC6FGjzbnnnmtGjhxpttpqKzPPPPOYb3yjpsqn3Gmnndb85z//MdwPaOdveBZlR0HTGVUZXRE5okmhhtlxx35rRNMkHBmMONG9nR2OSeVWPq6vpBpgN8R+CNSuqWsIEMSECRMscTiCoEN/+eWXZo011jBjxowxb775pvnoo4/M3XffbY4++mizyaabNMCWW25pdtxxR3PaaaeZxx9/3Hz66afm6aefNkcccYSZd955zRRTTGE+//xz88UXXxgITju/t0k0nZMwrtFMiH7qBe/eVwxZAL1N/ajbTy8AFu402HPRFiiDMGZVBDgJkM1CGsznEJEQi84++2zz/vvvm5tvvtmsvvrq5nvfY+HbmAnjJ1huoB23LgpRMkQ01VRTmW9/+9tW1CIOgjjwwAPNAw88YJ5//nmz3XbbWZGNZ5CeBfqMfgVGW0Cy8geQzuYglBnXDeACQYD7wGXPi7dA0YTBYtF9igS+es1OO5yNdCIPnGKppZYyt99+u3nttdfMDjvsYKabrraXZuqpa/t/yNM/Bap7e2v9j7LgAvWIgUA0/lvf+pYVt5588kmz4YYbWq4xkM0rVpFHy4Fr/I+Gq0AcnymeGyogBvaIQhvC54okDLaMspKKSUcqTohPJCJC0Wn/8pe/mLvuusswh3DEQnqnAE6CeDb33HMb5iRwkfnnnz+TKCLPZ57035HrkIPsLe9pnnK8oaIIA8MzbGymzYGTnQwff/zxdv6w0kor2WvmAkyQ89zfap7PPvvMAHCdhRZayDzxxBN2DgJh5ixrd813jELPDZEWKIIw1tS2YrJaUwfphc+hPn3ooYfMLrtwGqapzwt897SbBicCKAcCURHJMAe55557iGoCx9VIIC++woEKOytMrg5ZFlU2c5kdtBEOVeCYzlPVP1mBMB/k2VrDfA13BvWDdd0mDBbHIIop01rgm9+sLV0wQWb+8N5775kFFljAyvrEufuYR7hwB/yGIigbINIRCHMTuMfLL79stVcQgwPypQAiFerRlOQhFY02EWtbDrXDuJMJPodqI6qdrTU95WYtrwAAEABJREFUXOEABbgp+zUIn6DXFygw4mC4yQkt7CbEmHMejQ/GdZMwqCgHpnk5BapWWgN16umnn04wKPjOd75jHnzwQfPjH//Y4oXmCiJyRIJvE2p/rCBios3Xm2oxQ+uf+mFceKVW6x2FGxXQcGHcCaHoZUuOdlpf78BAlJ2A7EHnCB/iNbo81y3CgE2yqWX6rKqhWfrrX/9qRmwzwnKJrPxFp4Mf85v777/fwEHgJIAHjxk1DXsvRAsNDgmHwgRRCKvbq7RGaLdYi9JgRx3Gixzhwyo8Awwf+enoA/IW1g3CQIfKHgc4RiYeqGGXWnIpw8Q3M3MJGdBYIV5N+fUpzaOPPmrXQyLzijSMVtSEgxWq7mbXCmBpTEdFFILoNarrbgp9ApvMMMFhgE1V72u+rrhOE4YolqxoL61+qkMUQU366quvGtYookRBp4tCaiEFJYArj3I4stKOgoC4DIAwOHwgI1uQycMUK76hzpwBa9uW96bwDuGsaBL7+9tinihvMMNhJ2JRhGk6TRh7aIMiM6qX7OzoO+WUhvWJWWbByjw5X8ixqHOnn356u8LuwZNRb5Smp3QqTQnPMbChNXpKUeNUxlSliaZ7HXMvrA4wtWFNCuJog0jop9vqAx9XYDehet11PLBTT4DdHZdVGCMJC3YLLrig+eSTT7KyB5nOyvu1115rMELMQJAdiExOM7IFkcwoxdeP0BrV7Gw6iBbE4YiEYh0nJtwCMHdFoYNUUlNntnBzK1k7RRggyf7izBHm1ltvNYsvvrhdn2BS2wqyIeVFBNx1Vw4mycQKLQuyembGEjOw2w+NEGJLW2j84Ac/MKuuuqrZa6+9zKmnnmrOOussc9xxx5l9993XmvOgwJhhhhmsYWgbD8LOjgO52bLQRjHpt3aKMM7QR8yvkOjcesTll19ulltuOSuCOPkzfgMcBYjHh3YN/kcddZSZeeaZbX0QFVLwRhmB/j60KoAPYh6qUvZk1AzQiI0BxpvUF1GIJFdPOOZiiy1mDj/8cPPss8+aDz74wFoN3HLLLebkk082u+++u7Vs3n///Q2WDBAJ2r23337bfPzxx+amm24yG2+8sTX+5BmU7Xz6DGI3cSkAUTA55xMSKVkGH902YWiH2EQfz95o9ZodDYqpN6MrjdCco9oxmLvTYRAVkKtTasOI7FVIpNzXzejptXC27bK4psF0p+/YMF9w4g8WzWeccYZh8RMrhUMPPdTudYFQ6NguHyXSJlFAy0c8avC11lrLMFi+9dZblrssuuiidgsA6bSnI0CuUwBiZi1ls5T0QUe3RRj77LPP9FoBlvxTEaChWMn+wx/+YBs3NWNFE2afbXZzwgknGF50vAqRF8uklhXieJayrn+oD77PGINaWYPpjpHbzQUZAK6//nrz0ksvmZ122smqriEYOn68BAgAIA1w6bQTZjcffvih3RtDPAS1+eabm7/97W8W5pprLitqM6CSngEsOl6keTBDUa8zri3CGDNmDB9a8arQaDjWKmgMWG1n0A6nlE8+/cR2EgaADNa/kmK9mkLZjgOW2Uqc69h/OifGlBdddJE1+19hhRXsdmEm0q4iEydMtHMGRwj4Li3qfzXxK2u1TDtRJr5LxzSINlx66aXNCy+8YLcCzD777C45y+/XDGx643A9DbbvBk0YK6+88iqvv/76loyKDqLoEEfFr7vuOqu9gb2i4mT0iEL0niqGecEoEVA/sxMwXgfaIRLHgQqRy8KDK+sT2cn3XfW9jvcFbL311uadd94x7ISk8zK60/ERkfERs6QPhlgrDiKphZr/XT7eP6mxtiGqDltssYX5+9//bvfIuEjWvlw4wQcJFiM5gTIhubWoQRHG8OHDp7jjjjtOZTSJPo6K0pgA4U022cSsuOKKdnccbJi8xLuG4ZowQLiKAEekTuzh0HbJqgKiy3JZmbqUvpKWizoWDaIGkx11odNDBA8//LBBBOZ9Us/kOxpjXedvjM1/Fe0LM844o7nyyivNVVddZc2FkDggRE9pcA60o23P5wZFGGPHjuW7BwtGK+GQZUShYQG0EFTEEYXLQ+O7cNV96kkd4BqjRo2yL5BrIKWe+5NWMNBRIAo0ZN5HM6dAc8iEmLUmuD7vkHoy16BOUfAWNshEOBHgbt9ggw0MRDrbbLPZQdbFp/jU8XpNyy2Had4mNxjCwHjsEBqwqTSN4NQNRIobbrjByqJxotAsQ86x35wXOcccc5if/exntn50HgYOwEZM+mNraS75ftItbYVYZLxBS+C9qed3I0eOtGpU5oTjx4+3hA7H4C4mzvidBF9ZtCtcAlyYb9x777111bjvPk1jIfBq9Qdj8au3mUGZhOypL/17IKu+LST6RwdBDcdBBcRzje+AjhKFeLy7rpKPHRUjKzhjPo8609UxoY0YjDBvIHu3YVZ9AJwC1awGmx2dnkkvohPrD+yJgQCwB4NLxO+I14frViBeXvzalUV8X3+fYQ7H4ApO3//+9+16CVIJ6a7NCSfAEhqHcki91h0vqZW70Bvv67sBtstZTnQMt9cC4uDage/+qqfx8ljZ7evzNu02Wk9vBk1v1yFSYCIOcaSWxbuBw7Mewzbi1IyBJMw666zmscces4uCaMYy2hmRf4PBoN7qy9lPKRriSH0WS/90Ds1nGIVcxsmBKKgroxiLXwwQtAFxCUBn7cqK7cCzRH0OZ15Kfa9jNL7vvvsMygPC3swDidTLwUBUxz3KTyoUIsb49LnnnrPEQTsn5YvEnaPhmRRacq0QBoZlWM82PIAOH42AMJALo3F5wmkNkefekPIwAi+xxBJ28SsDrxEZ6e0k/0ZvxiJBPb9DbmeSDVHQ6fy5y09FhKfPffe737VzIfpNBtfg2yotbw1thTD20mZJnMCBKPIoqj1kwmHDhmlWYxdzQDoKLPLoarlxcVQM4AbnE64qUC/k4f3228/W31MPPhDp5b6ee31JfErtWF8GrIPBEXOORRZexLAJi/y8Q94lwHUe4J0NBnxl+8pzaxnMixD9sMFiMIKwPWUiTtHeSVkS4/ISBrpv5LWmQqgE4gOIsQiE7zIlNTATVdhfPC1+7cqoos+LQvnAy/Pgz174ll6WpyyXxIh0iV5gHKhesoOjc5IjBoDxHLwHIB4f6jWmKbrYnGiSE8OZgyqmjsWlXuYlDA4Vo9GbCqIRYW/HHnusXeGGUFgMIp7RkxP+YNdXX321Of/88w0r4W+88YZVu6EX5yWhluO+psIrGkG9Ma1nRMuogndTV8a9ScmIDHMkJUTjOHQC045oXFXDDD5Y6bKOlFEH1jXYnpuRrZachzDIs0ste/M/iAE777yzNRJkYei8884zw4cPt0dp/uhHP7Km5htttJG1KcLCFs0Cmhvs9lERfvTxR80FD4GY3XbbzdYCQiGQQPwsesCNSW4X2NnGdwm95XBOL6MsuDB4eTNXJBGx8I9/ZME7E2E0qjNn5tIMdHr1vG4NTZ1bwToaMwpM2C677DLzzDPP2EOW0UhxWBq79OAG9ib94x44CSo2XgrnR2Gb/8tf/tJAKBxwBlFp1iHj4BjUG9k9pVJs7OIk8pTk3NHTa072VaiX7pj7nXPOOXbuA17klD4xAGFARK8VSAeIKxNEaviIJPvgxqIybU1f4toDiFKHedLrSXkII5VbUAqjIZM4TMvvvPNOorxAY0eB+QbEwi4vVIbY57sCELXI666r5tMRl1+eubAXc7iGN0OOxFM0T6KVM9xc06xqE7GW8FADrDCY2yKq0+aufsS7cMTnc9eIVZGo5mAWYbAPeK3m2ybFYDHL/GJSjCeUkISGCiAJDrPppptaswo4EZN64qtMHJtttpnBtIIBJKUea1LHNmAVvXdLhUTHcxl8mNs5jU5ixopG0k8cR2bdjO+euMEAI1eRRk6j1ZxCAZFKvXSXRRhb6K1YLKqX7FjdRkRCzuMFJOfyx0IYEAEVIyfzDr5hQaW5dkDHAtx1FXxYPFoqD65zaVrmCKZ5khwv2btRjM6x3nrrmdVWW82kjKBJ5VYijr4Ap4giu8vOuxjHNVx/iqYPhLdXH/FTvWSXRRgjkm+bFEvDi4jdjZXUAUQaKVak+ZrSIAJEJyoKcOYUI5xIc9k0CPdUATjak2M+aRsRSUOZfRJpab54ZvcLpmVgTYndcIgYaA7R/sXziojVEIrU/Hh6yNcizThPmDjBHsAgIvZLW3H8Rew9GBc2LVZH8/oIg+/NLRDN3K2wiNii6fBwHzgIxCEiBqtKEhEJSCcMEAYIhwzgzZ4UcBSp1ZNwDDInIrH8XKI+51A3whZ4FlxbROycgu2jZ555pplm6mnsIh5rSDbjEP6j36y55pr2IG6R1PamBRhUUjWCPsJgAz8FFA6MrkzIIZDXX3/dYK0LR+G6cGQ68EDmTRRDvfATYOmEuKyogzRDw048yocwNN7QVnwhim8Vfv7F58YRhYi3s3Br5YE5xpFHHmm1byKSyBFFBKsDpgqJ9fURBnrxxJuKiuRF84L5TgWGeW4RR0QsCiI1317k/Csjm+MYnmcjDqFK9GRpSEIXnygKMKDASZnws5DHXcz/iKM9AeKGOqC6Za0so56pByikEcYiWmCRm2n0cemOl3rQQQdZW3yRGjGI1Pz0u8JIAXfOnnJ7CFKwYhJNm6ckN0UfqDHfUGhyKDEQJ/bcc0/j5jaTCzFEGwMJg7OtGEz7+/sbDmvgnZBXRNizwQmaXDZAGmF0ZEN5w5PauKBTaSUMq+cUw4tGfnYVJC5UAEcAC4AMHPMSBir01JEODgtxHHPMMfUzmnguOODTjvhDFVw9GRwQIxGrppmmZvtKu1B/IFL/RFV3GmHwuajIveUF0UyNGzfOfiOPDSqochETGAmYqJeHWb4nMyEG3xy2SYhTeQrFpDyRW3AzbYKVM6Ok6yTETy7gTimh86O2HTFihKH/UH/aBj8Gm+t105JEEmFMrxk5e0i9ch0vlkU/hwWjwK9//WuDHI1OnnSXFrIPh8vBMfJoANFE7eSrK9wVzsqiFyOkL+9QT6MN2B/k6gk3deGIP5OGm9TlSYSB7U5SvN5froMgXnzxRTN27FgrJkzRj2heLk55ng47X3bZ+seB0m6ZNy0hEs/CVKKKkRESLoF61hEE13As1jA4KxbArigK3BcdZblm0Ra/KgNPpH2Ms/tiMAJQ988zT+0bRiJiNVXUy8HAvU1WzkkEEMJpeQP4Nnt0MixE8Z0KsjlXeDHDhg0zdFQPZmx3TRWR9D5GAT70qMFGByFAABhjctSlSE0xwcnya6+9toFbwUkAzmqKAieb7LvfvgZ7NzoLi6xOJqfMxieFfyUidqLtMGUBevvttzfUhT7j4mM+hFFrtIGEyhEGciKnZWOZCwcZqEfwHlsxWYn2IMqL8WkCmfclmo7AERATOKGEg5bpCFg5M/lkQ9Irr7xSJ0raLArkHzlypFlyySUN93CcKukePINPEpH62gVz0RCbcAgAABAASURBVG233dYSC+2UgjwKjUWjaXHCmFkTsd1RL0wHewSziy++2LJFwqEDIzHyLiO7iPjQhWukpXutnCG6l156yfB9CkxA+CQatkKMknQOcBARSyDg4sDoz3EyzP7XX399+/0SthGg8tTkSjvqyXoGh7VlVGSNaHqcMJaLJuYJ0+DdAt/z0bwwSvJsX74Q0hyOjMoZ+KQRxpx6H3M/9ZId6us99tjDrni75zFXYJSEAzCgEE+bwXUdiEwSPUTEjrSYpy+66KJ2x2Xy08KNFZEG5Bxxo5BoSGi+aLAijxPGCs35w4thhGMk5Nj48LBrxgj5lk7JQWwijS8uljuNMLbWfPF3pVGDdZPuA68oQESkIpuj0YGDQHTEQUz4VQKRWnuvssoqDcc5JdQBs5z6HC/e2Msm3BBkFC8JcSpI5CJIgSeXdD7EHJHaiyIuATjqJR7NDSPikd2+hpiZiLOfep111jHsuEQsoR5R6DYegylfRCznExGDGEkZHE4hUovnOgHYTbmMi48SBuFFXUKoPi8McYCXw0dMwJMwvhMXuHZAfJnA4p57PhzDhVN8zlyNJy2vEYXN++j8+jyDZoq1IjjIHXfcYdhw5cQS0kUEL3igv1AHCATNoIgXb06jt3WCGGxA/+ZT8B67oumlOzo8SOC/++67Bg0V10C0E3INkC8KxBUJvBiejz/nnHNmKQy+m4DbpglxXYti0KFwxCfEKcIAhpwnnnhifSQmTsTbycgSBIiIbXfsxxDDPUjVT26MEsZ6nhuCSaKTgYzzmWeI1F4QcXEgb5ngFiHBC44BV/PgUzPqmZSB98NhYZNiuhyK40dHgnPALY4++miDOrfLKHS8eLigiBi+tCtS6yspD0kkjLVTMgcdPWbMmDp+jMoiUh/VRKSeVlZAOIVD8RARq0vPwOPbsXQmhN+PxRV+iZoZcxzmHFtttZVBFdw2EgUXAIHzGTMRb5/gQInZQI0RCR/Ia8RG3mAAjuGQ6ZNodVxs+T7cAiwgXHwPxDlG6VbOcBBMSJDTwRvRFZGEeKdYID50oO1FJhFF/DqC/8KEXU9i0jcdEVUD9oY7nCUyOotIA+cQqV27vEX5ImLlW56HKQa+BzD7iCaz2h29LiUMEQAiYiflfPqLdg91IEprJESqn/60dsg8k3GIIyEvH9qpfzimljshV+hRTLgZ0cAzpaIklQocZD0IBDhq076kQdzbtVsw4WaCzjnF/VP0d+053SqYwylc2Y6Tu+sB30pOjmN4V1UHbgjSgzDYFx4kcoqUiHIq5WQazOOilrNBGnMy36AiDzzwgGGFnHCVgH0xDKAQN1wwAXd76qYjDCZ5CXnCj0LO/fe//x0soimjUhq+n0USghysMDEBR1S5hxxyCMFKAZbGTMQhihTEWbawohRrF3n2AqSUU340X9dx4lT52DRiAGGIiI1k9dgG0v/GR5KC4BjgH4UIfoa5RtU0VFg5M5hSp2hdImGsD6aDY/xII7+mUFmHxgR1YogVYH4hUiOMHPh9MpBnfvVRHaoXtjvrrLPsjko4iWcUDqYScAuIIwOh2SCMSnMLkdpJhU72zahw6MlfDiDYspXzwH2Fe6eccoq16KX9kd0LR6DFBzKAsqEr47ZZIYzavr+MnKEmo3aDY4Cfhz2SXAX4dABJ7KMGgmF77MlnEp50/GeImEMYHCuUgdvMEIadhWdkDDZZROoryqETBotjGQ35xUB6ZQgDfK+99lqD6tYNUMSFDOw1ycBvRggjbQ9Axr2tJHcvL2o3Fm54QuisPIf2bJzWgwOHrWZEw5VwF1xwgcWT0dgGAv/jSKYMFKeHMJIsOjPuCycZwsDIDU1DOFhNwmTiVxONEzNyrLe8r3diksB70WD4jkGJfeNMvKvCMbBAyBhEv8sLqDRh0HV4OSz0EQ4N6DAQB3ixaozvARZkfuFJDy7JtTsnklSFY3BaiohXUzgthIHeNrgGbwUhvgER6vwCvFAQUJ+nnnoKzwdvauIaCpVx1A9kH330UbxKwNxzz23t1zxcYxoIoxKV8SE53XTTGU8lfbd2Pa2/v98aM/IgTuHA9wCEwRqGJ0uYSVg5wx3DxK4ZK0fQzSk2ZioIY1obrOgfHY/TxEXELjSlVqOkBMQ89xJeeOGFLCxYx4ibnmfdE0T6vffea1jMDAKZ9pH4FoQRNUNov8iCS0BMYS8vO+WYiBf8+FyPc4SRg2NUShsVrTw7/NxcKhofaph3AqTg1wdhODOElDxhRyNGQRzo0d1EMDSMEfPY/cY5Tx7cvtK0xG81aHywDo4Nctiqvf8+SjWuwgXEPSbfWRhCGJ9nZQo5ncUakZqGgbOmQsWVw6g9IxRov6F/lSMMVye4NavgWoegHXg6BB3u7jrqQxj/iUZULcx5QeBMJUNWFz7yyCMGHME1BV7WeM5QVa86jhFYpGZ98M477wSPeMY7cPh/CWG85a6q6C+ySN4PEZVXO14G58pmYECvqrG+jIyhJYvU0M6xTlM66v19/XUcRGp41yMmBT6BMFARToqqQEhE7OHEWHS682BFUitpyv6JiPnTn/6UhYYzIMzKF1w6hA9SOWzByFYqMBd1eDL3S0FmPITxWkpikNEiYkUSZEWOrc9h91JqPZyZRA5Vbal4tvNwCMPTydopuiv3uncC3ikP+BjCeDolMcjo6Avgk7VBIhlBSkQMNlJAJDopWMn1i6SKhB7Htlz6EfOjFFwnQBiZdgopN5cS3a8ryTwYNS0ncRMOGVjgQyPleQmg/7r+cYSRetVzIlI3/a8C9nCMDEXN+xDGP6tQmTiOrAlwslw8PsRrDOwy8HpQ04sw5tTHdN6J1OZ3DFadL73zJSLWshXXDbIJT3gXwkAr9UFCYpBRzC1AbM0116zbIHEdMowdOzYLvQc0w/cUKumcrI4FQugVAFdngeAhjDchDOqSacRDphAAkYQK7bDDDiGgk4kD8uzDDz9stWiezPdoWvRMKb2shhMRqwwB25lmmgkvaIAw4BgsBjPPSEH2PUcYjFgpecKKpmJsTIJjhIVZDRsItxaq/bv5heN0tdiG/wl6VR2bbUU26lznYrCqgiiFoSMcw+EdrUsk/JYjjBsjkUEHOUofbsGkNsRde44A3PclLrnkkqyJ6T+0wd1ebw1Wy7n6MiDwgczQsWcdwx7eMGGC8fSfdxxh/DX0Cjn8MFT77W9/a7DmhDhcfCi+w4kvpsLZ/vznPxsUBSJiXFoM17Gx68pdstDqAI4OpFei3BQm3RAxODqiTsDoVUcYmCNEj4dMyBtGFB//mH766Q0yIsQRBlaNWNDoImLgGpzxSipxKS/iNk2vRNsrnomOzjbffPNVQhmCPRdW2Ih+iZUxBguE+uSbPM/wFzqcc845dRQhjvpFIAEm2yI19eWdd95pvxQqUrtmpIqhiWUzHAM/llStS04R94gmwVQGC2AGKM8cwyqiHMcA8Yf4CxEQSxBD+CQt37ELEUeHE+KTOxWE4ys//vhjl5Q0okIUjFDkqeS+GN4LyK+44op2LgVnTALyhAD//Oc/DRyD/TEp+LxIfJQwHiMiRGAkAk499VRDxwsRxyhOH370oZ1X3HXXXfVokRrXqEfUAmNqnv1n9dsGqvTnRBKsnBM4YnBV4Z1k4PkkSAdPGEzq4BibbLKJgV2DdMiA6TWfAv7HP/5hotwiBecbI/FvR8KVCTJgYV7B8fqOe4SMvF1sVQRFUpUhTYQRpChFw0Ph5557rpk4YaJWKWzHtkk+wYUYBcv2YMvaEZuTXJZKWTk7pJHXOST5m9N8M03r5rKW6iPegQBzDHyIGT8BmgjjPc30nEJpTkTqcjiTI/TiNPwNN9xgGx0dtEOOigLuOhQfvDkUgG9HIPaBYxQieP5vJEzwWf6qBtRxm222MRMmsk5p7PsTEeN+ImLj3HXRPm3PMxmk0BK6b5QQz6BLWgSohJ1SREUp0v/OX1kAskD0+dtuu61hMxIaKCa1pAPRPCGFUSFfc801BhWmB08OPrgihvcTsetKXKKFwwoBi1VPfUuri4jUn80RPxCIiKQt7jE4WW1JnDAmzRbrxRUfYF6B+ISPehbZlUbv6++zo4+I1P3isfM/EQI++OCD7QFwdJqU3Pdq/EsKUVcp83+HOKIja0vUm3fk4kPywQslwZgxYyxB9PX11e27YnjWpxN9sYQ7YteFX9LAjLZMuO+77z7j1GoiYjiipXCEWnzgE088YZ599lmruvTcOjoh7RGNq9wZXz//+c8VbWNFXRGx4dD+mJtCDJyWCG6I5/gJgPm/je6z/5P+mHhghj4ppr1Q7rsZeciM3Ad133zzzQa7KAiEeCC0bayIdogQ4OZg6623dsE0n/WKyxMSIQqO0ElICicKQ0E4+NRTT22ROuKII6wf8h9zPgZbNIUZeN7t0uOEgex7q0ss0neqTSbcTLaXX3554xq/SDxaeRbKAIc3cws22T/4YH3QSSvqSk1IO7KIgUmTw3V844PBiwEL7s4ByWCLuIIfIqAlxAohA0cGLAw6bRXihEHkTfwVDbA3OAUT12WXXdY+Pj4a28jA/jgFEZToJEcffTTBLDjLk4GVcE9yOEkMAvvvv79FKKPD2Txl/jE3vfzyJCbdgBWKJ84OtpFJhPFnTUFtpV73HbIfnQpdOPL5SiuuZJzI5NE1dx+xnE+Aw5EVNeDo0aMJ+oARyWfJ/H++m0NJ452hGNl9993TJrGhoGrxEBEDx7AX6X8N5xslEca7em+qdopRnY6seXI5N3eIZ6Yc4tA+rbPOOgYRZI455jCIJ8RXCRCjIAq3eOTBfaQnjaRKGHLyzlZbbTUzwwwz1LWDIpIYplJlwyuvvGL4FnwGHpmEwf1X85cEiA50BNLcyMFkjOskQJMEITHCkJ88XCM68cEX9itcccUVhs8/+crhvsFBd+9CjEAte+ihh2ZtX31VMblMweeQcxmYfHmCSDvttNMqwS1oLMctRITLJODQQbh5PS2JY5B4lf4l2l84ojj//PPND3/4QztKsGii+VMd96AVYKSh80ME3I+lI4t3xHOzIxzCVQEI//TTT7f68Qyc/1vT8+zUe1jzBet4R8OHDzccdsdKcrCIRhBz8wtwj0RHg3ALFE/1uDTCwNLzL/VcsQAPOPHEE81DDz1kZbeDDjrIMPqLNFMkebkdtrv55pub22+/3bK1X/3qV0Rba1nyQDg2omJ/2Ai5BT24Rwr6nI9/dkpaPDro/d/M+84++2yDBJAmJscrVOY1gy4cQ0R8HB3CMNFfGmGQ52L+koAGefrppw0neGNu/Pvf/94wccaylI4fBU5kIB4tBvufUcPCNehEiFQ0tAsnPSv0uK232dqucsMVeQkp+J6k8WkqWk1qcI81XAVywXsCle233978YK4fEAwS4OBRxOhzvBv6GFpOEbFSjkjN17womloiDPTt4/TGJgcLZZQ/8sgj7YonDwUgGNhsFJhQo2UiPQ7xgkmPx4WnCg9jAAAQAElEQVR27RoZvJjQXXbZZfVVbgi+v7+fpChgnHlaNCIj3CDrZuTtejKDFw9hTUlEDO8cBUmo74o+CAGAM+AIg/6KwSNxMUDRBEdviPZxDCaClzTkHrhg4swiz/XXX284cYHPfJGUJA7RgHEgb1WBjuLmVNttt12dKGh0FBO0TaxuRxtjPozF+S45GZK29+UpLI2BgIfB9W+88UY72nItkmqIR3KpQH8DgXfffbd+yjx7ZIhLgD8mxBkfYZD/DP1rmJTotXFslU7CrrrPv/jczhVIQ5yIAkgCpFURMPuI448WCk0a1prUCU6BTzx+BDAUPD1ynSeIaUjm8nmegjqVh/nEjjvuaNZaay3DiOzKZSCIt41LK9N37+PWW2pGHFwzYPF+wBcAP/XZax+3ciYpkzAwhWbBz2Z2f45VMZqMGjXKHmVDGmKESE12E8nnc1/IMH7CeIMRWhRHGnnjjTe2USJiuQbcUqSxzprhtwo0vnotOU4mbOmGTmcWkXqR2KydcsophkHCDXraqerphB3UI0sM8H54/F5774WXuMcbfDURK49/q9/ksjgGN5zCXxrANTbbbDObDGXawBD5o/EQE6VvUiehar/4xS8MMiviJNd0Fvwo6L0ci5O1bhG9JRou3coZZBjoIApEKN4tgwTxgNbPAIRDAua/DNgci/rmm29a1JLej00w5tIBv8nLQxjM2B9ounMgAi0AXwtCQzUQ1eCJiJVLRZL9hsyBXYiIYaIJEdAJIAQmc5gv09iIGCbhp3nhEjtrUpMYqnF5HByjbreT54ZO5nH1ZeS955577F57CEOk+R128rmdKAsTnX5VgKAkyCjvA02/QSHR5SEMbvTaFg8bNsywRgGrJTOgnQNvyAATbggDs3J8KkbHERGCcThWI9ox72Cyfp+W0TGXtyAIAKJnLnHbbbcZrGed6FyFdwqu4Ikxakad4eapB93lJQwoC+vDpmdhfjxu3Djz6quvmvNHnV/nDnQkkcRO01CGiNTvEZGGtBAu6CTgwRxigQUWsPMJrkXEyq6EAV7GAEAQxxDXJiD/tllE/ttRxzLSQvQQxU033WRWWWUVW4BTtkA0NiLyJyJBvb/+vn5z1FFH2WWECJpJQZ+Vc+bk2xWISHCAu4j6nMuKqhKRarfddrOf1YJzQBhQbzRvFcOIFeC91VZbmZdfrh3q0a+sWkSItoQCQdgLY2gnRChEqYGoQXuIsIO+uZUb6fjslKQevEs4BQuxEEm0HNcW0bjQwn39fQZNKbgzaKfgh4Wzd70oL8eg/Nv1D86hXqNjNCUGQmAizo6pKb8+ZV2tS1pVAW54/PHHG/YL04EgCjoQkFAnVLNMuhOSWo5i/zHq3pZvbOUGOAXvDSXK4osvbrBoWGKJJaymsQocIl7Xk046yR52B6dHPRtPH7jGbm0gmOy1QhiUsLf+NY2G0UkodikcYMCkVfPWHYjWLyoU4DNhBxxwgLWzoQNBEEBCFVBt758Q307UNe3cnOde3ktfX5/h3K7777/fWjlTPyQAtDt5yggpz+GHH15Hhzlg/WJSALafaj3usrVKGBwvcqK72flxytx1110NBxm4dBoYrgJ7c3Gh+oiBDjf2CLsvw7pGptO49IjPSjU6608jcZ0IXpFVyMiRI+sbu3x5Gf3heABcz8Hee+9t2EfCSY8iUufynChPXl+ZLaZ1JTuETcHUgf3n0T4mInb+Q3oE6L8sokaimoN9zVGZMUdqjqcUEh0vQETMMsssUz/hAzZNZl4GfsiAGAh+jJ5rr702wTywq2Z6VKHT7m9a4PMKqQ51KuLeBRdcYBZaaCE76RSRhvy0O0BHh+sxf8AU+/PPPjeHHHKIPZE91FXshookXMDtqBN770844YS6+b+IWKIQkehd7+jFKIVMNxjCQMXFB/AS92tAsW5URdUHS2YUpgJwDsKZWJWYAc7Awb8YQroFogx0MCcfnZFnsMlM5hPt1VyBLL5xQAHKAdZX6CTPP/+8wWTl2GOPNWwPwEz8yiuvtHZD478cb03/N9xwQ4O4y6DFaMt7Q2Hiyq2KT30heIiC/uU4iIhYwqAeIvUw3OIj4rJgMIRBmRwzcgKBJOjv77cyOS9spZVWMqIrx1+b4mvWnoqXkXRPKHHYP8Ep4uJhEn46AKCQ2D0prYNxjHCJgxDPQJuEelJEbPsSx96YjTbayDA32meffcyIESPM6quvbn7yk5+Yvv4+06dzCvIBImLtn+hQcHviqgQQBUsFaKKoQxR3rvUd2Sj1OTQb5Yi9zvrry8rgST9U05rWNkREo41VY0LNrIhzKFeUIBih6HiKrDUriPr25gL+aDQeE+VgjKqrrrqq1WqQ5gPFmXN+N9E8eXblabZBOzRTXtXthRdeaOcJzOPiT1E87cgJZ6ATidTeTzSfiBgGLuJExOYXqfnEhQZwBnDi3RFeeeWVbX+jrsQDvF93PeAfo/H2+E31M107hEGH2Fif8K5CgwMpF4HGisPTll566fqcQ6Q2ulEpl68on0ZCbBCRhkeO1Ems21XYkJBwoWUgq66lSfjqdd15F6P4fBaawCgnaBWj6MDV6r1F54fIGVhFJRHU6G+8UTunDsKP46Lviii+knSGMQTzQTuEwRMYzTbXwASFRMcoxgtjMsucA/GKlVUyQzT4RQINxUQTeRqDsy/Hf2kwCtxrr73qEzcfPno/NjaraZ7nFIpy1+uDUp/HohyHMcCJNV+DExHLARoiK34Bp4A46EtuTwzrMZ6BFitnBvLcNW+XMHjQLfqXKmcjtwKax7z//vtm3nnnNRyCgJhFBYkvEiBSEbGnkf/rX/+yentOPmReBLGIiA8diGINzVD09lPmGKfqc5scq7uMlIygZ555ZlP6UIvg/C64G/0H038sLyAIpAAMCBPqyw69+CcXErI1RnWCMCiRN3IsgTjQ2UBcpLbji4otuOCChpeIGbOIWJsjEenYyKajup27INIB4ERDEs81Iw0TVtSbqPlIJw0gLFLDRWSSr/EQBeJTKcZ9+vxzFZrOFaZjOE5x2GGH1c1WNK9dvcYfSuA6P+pmTFcY6AC0ibSFiESrO14vGLTR7mkwv+sUYfBE2NWkT6oSkwIcn4PGBC3J66+/buAodEo0LHTclNtyRVOOA26g0SBMJz5dd911ZuGFFzbHHXccyblAy6NDDtfM9yqU5Vg85FAF7/MRLRgEqDPihjdzBRPhjqijf/Ob39iTSjKqwF77RzLyJCZ3kjCgyp20E6FeTHyYptl4Jou8uMcff9zMMsssho/DvPjii/YQ568mfmU1DDZjB/6YRyBmQBAzzzyz2XTTTQ0nlkSLBi8H0XjCGs8C24oaflihbHeGIlDbfaOBJHf33XdbUXUoEgX1pd/87Gc/s5+EYP6q78dKB84nj4jlGnx9Fc0pUS1DJwmDhyMLb6dInspFGkD1pLnJN9tjmZjTaZ96+inTSeJAI4bItP766xs2x/NcxQ8vU3TTfKxTLKWZMYVRr3SHuhHOnIoInJEjT5G5UzNVOGGPPfYwDKJIFsyvkqqi780O0pqWazFP8zW5ThMGDwCpPRW5AxUmKhgHJAJQvYhYGVhEbAdF5GG1lvnHnHPNaVi15UwqRgXy86KZrEeBxqFsynTAxB7ziOWWW84uMjJBYwEIYmSCTTnMe0TE3hK/n2sFHFt6mWg3Ha1ibyzv7wJ9dOphCcjZr732mmELgOZrcLRlQ0TFLlCps4qvL8diTl1tIPI3kIY1QtNZBZFsmcFuEIZ7KEL8hnqReNAYFYgCnRzQ/HbT0+9+9zvDYW7MR7C72nnnnc0JJ55gLrzowjpAAKx4YrTIfAU1MNxhp512Mo8++qg1iGP+AkAMTNDcM3gOAA74ERin4Q0UsCQubXupPj/NwZVru/wTcjAAIEbRgeCWzDfIRr0dh+a6KuCImfWKAw88MA/aT2umfRTact0kDBC7Vv9+otCSfI5eXu+xK9DMEdjYPnr0aIOunsklcxIHTMLQcJEHziIihs7AvEJEDMQAl6BjUCYQJwauB+BmTV9YAbzVC9ahgky1vKUdwHzLLbc0qKTrbTE+dbmJ7EECksSdd95p1ltvvcS558B7c1IJdnxYOSNytlWfbhMGyCGfL6OBwxSa9nJoXJPjRcYjXQdn9GdUBAiTj8YhHYIgTDzpdJAoQZA3BVi931bTMKd9Rf0qODjaB3FEaQfqTzztgYkL3FJEDPp/U7EfuyYx/WewZIDLQB/VrHdnXsb99eQiCIOHQRDsIFlEL5jQqteaExF7Ay/bQbShRMTOVUTErot8+eWX9treFPkTqeUjSomI1VA0PfPr9SgF5kfqVcK9qlg2iQxaJ8slNc3AbZlfcVAF1zZtgGtE2460EIHzkFkQRouYNFjGcB6t16z1qNe+K4owHKbIf5hTbKURqNPUK95pBxmvwKHVP9Kns5citAm2opXLna+5blSoOzgk4CIQRW655RY7GefgOLgGCgy4SojEoe/Fov7UU0+Z4cOH23COP/at/DpHvtxZiiYMEGNUplMySm+vEY8rFOXGacOz6DOvPhDiZI1Cg5V1tCUiYOraBupbRMqLLrrIHHvcsVb//+577xpHHKHVXN+PGTt2rF2EHTduXB70EH3X1Yxwf/U648ogDIc5Gp/z9GIhhVUVUEMmarA0rR3HijFfJlxfC5lJYQ8FjB/VGxLuba0FE87EmTVip6Zb1Tjf8WBPNPI6nCPKWcgTAvBBoXXXXbcuDmfghHXzTzUPvnqdc2USRrQWzDtGaAQd97/UZw0BTRa2LnpprNbBBlL+GGkAktV/WuFchS30ekaFTRXQNDHX0eCQc2O1Rt6DGOAamsecfPLJhn3erAEgZhHn0oogFBZZeQ4ECw48H5GOODZX7bDDDnZupO+OJB98oonrKCCeq9dZFwphuFoxunPQGBqXxTTy2wpLK9DBD1aftREWb/6oYdSVTJiZPDOx307jltMG5Z4fapjtt5xNOujVTy2jTVfo7Sfr0y5R8DqI4bzzzrPHbrKCTGbWPeioImIHIG1DorsCHLIADmgNp/rGVNbKGc0TZ+RedRVfuMv1WIgCDWLXDDpDI4x4q9AA92skHfwo9Q9UYJLFHhA2SSFfM3lGFcxEFCO/bohj+thKONrDe64VIzOiFJt7+P4hW3mJo6NCHEXUEutmnsM227POOstwjhUGpCJCdBbQJ36ume5Q6JoLnTC6VvEhWjATUCaiHAqdWkVUn4gvdEZMZ5w6F01V6k0dSoAbTTfddOaxxx4zs802m9lvv/3stlxwyfEIjuxnToHonSP74LP0CGPwbRfqnaz6Mk9LFDMQY0TErvE4cwv2NiDiYIsEwTDngIvQiaOVTIpz6eRF0xW9nzROicF33OjBBx80HN+D6T/rE+QnHaAM/BRg3WZlTeN4TfW663qE0d32Lav0D/TBiSNrWuejA6O1mmmmmQyfZ+ZaRLQYUzfFcERlIwf+IAbKu8hHpwAAApFJREFUFBG7sg7X4ZsiEBdcAPs1JtnXXnutmX/++Q3iG8f88F1GkVr5JvvHZyiYaz6WnbUzOXqE0Zl2DLGUDxWptY0xKCk0mOzo7Ey+MSVBxGJH47777mvgIBtusKGhQ7/yCksFxqp84TKM8hADJTJPwOSEeAgAroIqmDTEpS222MJwnA/i2jPPPEO0JTR2HYrkIgwUCivpja8rFOZ6hFFYU5fyoM/0qRzxc4T6LAaq1+joyMRwmAA+k3BGeQjlhhtvMOxjmXPOOc18881nDjroIINGi+0Bt99+u3nooYcMxyNxGiLWrxdffLHhIDfywhGYv1x66aV2rz8TfsoH4Cr4GYCGEkXLlpqPsHrFuR5hFNfWZT0Jgvi9Phyd/3uM9FHQeMsJGO0J4yNGEXbzAsLPPvus4Tt87POAC6y22mpWm7TYYovZ72iwyYytAXAY8sJVHNHhUy7lAKRFfcIxYH60uMahmleveNcjjOLbvKwnYlPF2hCm9WXh0PBcCKYhwhjWnA7UuBUUnlIozfUIo7SmL+XBTBY46QQrA0ztS0Ei4aFsvuKImx9rGou4dYsHvS7F9QijlGYv/aHYpWFIeZJi0nX5XZ+R5iAI7NgW1QzMhfh2hQbLdz3CKP8dlIUBpqv76sPnVsA2rUiLATjCpfrcBRU2VShMDavPyuV6hJGrmYZ0pje0dtimzao+5jWY4Giw4w4lAKfk84yZtXTs355UP0jXI4wgX0spSLHugUHm0vp0xCyIhZM2iNeoQbnX9K5rFdhpOKf6KyrwjI6biWu5HXU9wuhocw6ZwjhAGvGK44Om01qxZ4YRHrXvaL3GDPZW9eEuHOWD2TtW0edq3GEK7H2BAwGEsfwNZv6g+GW6/w8AAP//4LZnEwAAAAZJREFUAwCcb3Klucr1fAAAAABJRU5ErkJggg=="},
  render(d){
    d.title??=[d.t1,d.t2,d.t3,d.t4].filter(Boolean).join('\n');
    const titleLines=splitSwissTitle(d.title);
    const ink=safeColor(d.ink,'#111111'),bg=safeColor(d.bg,'#FFFFFF'),eyesSrc=safeImageSrc(d.eyesImg);
    return `
  <div style="width:900px;height:1200px;background:${bg};position:relative;font-family:var(--font-sohne);overflow:hidden">
    <div style="position:absolute;top:46px;left:46px;display:flex;gap:6px;z-index:3">
      <span style="width:9px;height:9px;background:${ink};border-radius:50%"></span>
      <span style="width:9px;height:9px;background:${ink};border-radius:50%"></span>
      <span style="width:9px;height:9px;background:${ink};border-radius:50%"></span>
    </div>
    <div style="position:absolute;top:38px;right:46px;display:flex;align-items:center;gap:10px;border:1.5px solid ${ink};border-radius:30px;padding:10px 20px;z-index:3;background:#fff">
      <span data-edit="search" style="font-size:17px;font-weight:500;color:${ink}">${escapeHtml(d.search)}</span>${SVG.search(ink)}
    </div>
    <div style="position:absolute;top:118px;left:46px;right:46px;height:2px;background:${ink};z-index:3"></div>
    <div data-edit="title" data-typo="title" style="position:absolute;top:176px;left:46px;right:220px;z-index:3;font-size:105px;font-weight:900;line-height:1;color:${ink};letter-spacing:-2px">
      ${titleLines.map(line=>`<span style="display:block;width:max-content;max-width:100%;margin-bottom:12px">${escapeHtml(line)}</span>`).join('')}
    </div>
    <div style="position:absolute;top:210px;right:90px;z-index:3">${SVG.arrowCircle(ink,110)}</div>
    <div style="position:absolute;bottom:210px;right:90px;z-index:3">${SVG.eyes(eyesSrc)}</div>
    <div style="position:absolute;bottom:110px;left:46px;right:46px;height:2px;background:${ink};z-index:3"></div>
    <div style="position:absolute;bottom:50px;left:46px;right:46px;display:flex;justify-content:space-between;align-items:center;z-index:3">
      <span style="font-size:26px;color:${ink}">✦✦✦</span>
      <span data-edit="handle" style="font-size:22px;font-weight:700;color:${ink}">${escapeHtml(d.handle)}</span>
    </div>
  </div>`;},
  fields:[
    {key:'title',label:'标题',type:'textarea',rows:4,hint:'一个标题；自动按每行最多 6 个字排版，也可手动换行；最多显示 4 行（建议 24 字内）。'},
    {key:'search',label:'搜索框文字',type:'text'},{key:'handle',label:'底部账号',type:'text'},
    {key:'blue',label:'蓝色强调',type:'color',swatches:['#5270FF','#4F6FFF','#3b6df0','#2f5d50']},{key:'ink',label:'文字/线条色',type:'color',swatches:['#111111','#050505','#1f2b26']},{key:'bg',label:'背景色',type:'color',swatches:['#FFFFFF','#F7F7F7','#F9F9F9']},{key:'eyesImg',label:'眼睛涂鸦素材',type:'image'},
  ],
  typography:[{key:'title',label:'标题'}],
  annotations:[{id:'swiss-underline-default',type:'underline',x:46,y:269,w:365,h:16,rotation:0,color:'#5270FF'}],
};

/* ===================== 模板 3: 手写涂鸦 Q&A 风 ===================== */
TEMPLATES.doodle = {
  name:'手写涂鸦Q&A风',
  data:{c1:'不懂就问', c2:'有问必答', qa:'Q&A', sub:'无话不说  倾囊相授', paper:'#F7F7F4', ink:'#050505', yellow:'#FFD84F', blue:'#36A9E8', orange:'#FF8A2A'},
  render(d){
    const paper=safeColor(d.paper,'#F7F7F4'),ink=safeColor(d.ink,'#050505'),yellow=safeColor(d.yellow,'#FFD84F'),blue=safeColor(d.blue,'#36A9E8'),orange=safeColor(d.orange,'#FF8A2A');
    return `
  <div style="width:900px;height:1200px;background:${paper};position:relative;font-family:var(--font-sohne);overflow:hidden">
    <div style="height:64px;background:#D5D5D5;display:flex;align-items:center;justify-content:center;gap:14px">
      <span style="width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:12px solid #888"></span>
      <div style="width:520px;height:24px;background:#EAEAEA;border-radius:12px;position:relative"><div style="position:absolute;left:180px;top:2px;width:160px;height:20px;background:#BFBFBF;border-radius:10px"></div></div>
      <span style="width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:12px solid #888"></span>
    </div>
    <div style="position:absolute;inset:64px 0 0 0;background-image:radial-gradient(circle,#e5ddd0 2.5px,transparent 2.5px);background-size:24px 24px;z-index:0"></div>
    <div style="position:absolute;top:160px;left:64px;z-index:3;line-height:1.05">
      <div style="position:relative;display:inline-block;margin-bottom:8px"><span data-edit="c1" style="font-family:'MuYao SuiXinShouXieTi','Ma Shan Zheng',cursive;font-size:128px;color:${ink}">${escapeHtml(d.c1)}</span><div style="position:absolute;left:-6px;right:-10px;bottom:34px;height:38px;background:${yellow};opacity:.85;border-radius:4px;z-index:-1;transform:rotate(-1deg)"></div></div><br>
      <div style="position:relative;display:inline-block;margin-bottom:18px"><span data-edit="c2" style="font-family:'MuYao SuiXinShouXieTi','Ma Shan Zheng',cursive;font-size:128px;color:${ink}">${escapeHtml(d.c2)}</span><div style="position:absolute;left:-6px;right:-10px;bottom:34px;height:38px;background:${yellow};opacity:.85;border-radius:4px;z-index:-1;transform:rotate(-1deg)"></div></div>
    </div>
    <div style="position:absolute;top:470px;left:64px;z-index:3">
      <div style="position:relative;display:inline-block"><span data-edit="qa" style="font-family:'MuYao SuiXinShouXieTi','Ma Shan Zheng',cursive;font-size:180px;font-weight:900;color:${ink};line-height:1">${escapeHtml(d.qa)}</span><div style="position:absolute;left:-16px;right:-20px;top:50%;transform:translateY(-50%) rotate(-2deg);height:80px;background:${blue};opacity:.8;border-radius:8px;z-index:-1"></div></div>
    </div>
    <div style="position:absolute;bottom:160px;left:64px;z-index:3;display:flex;align-items:flex-end;gap:20px">
      <span data-edit="sub" style="font-family:'XiaWuZhenKai','Ma Shan Zheng',cursive;font-size:46px;color:${ink};">${escapeHtml(d.sub)}</span>
      <div style="transform:rotate(-6deg) scale(1.4);transform-origin:bottom left;margin-bottom:6px;margin-left:72px">${SVG.smile(orange)}</div>
    </div>
    <div style="position:absolute;bottom:130px;left:64px;width:240px;height:3px;background:${ink};z-index:3"></div>
  </div>`;},
  fields:[
    {key:'c1',label:'手写标题第1行',type:'text'},{key:'c2',label:'手写标题第2行',type:'text'},{key:'qa',label:'Q&A 文字',type:'text'},{key:'sub',label:'底部中文',type:'text'},
    {key:'paper',label:'纸张背景',type:'color',swatches:['#F7F7F4','#F1F1EE','#FDFCF7']},{key:'yellow',label:'黄色高亮',type:'color',swatches:['#FFD84F','#FFD23F','#FFC341']},{key:'blue',label:'蓝色色块',type:'color',swatches:['#36A9E8','#28B4F0','#5270FF']},{key:'orange',label:'笑脸颜色',type:'color',swatches:['#FF8A2A','#f5811f','#ff5a3c']},
  ],
  typography:[{key:'c1',label:'手写标题第 1 行'},{key:'c2',label:'手写标题第 2 行'},{key:'sub',label:'底部中文'}],
};

/* ===================== 模板 4: 知识自媒体文章封面 ===================== */
TEMPLATES.article = {
  name:'知识自媒体文章风',
 data:{author:'@xiao雪', title:'从营销角度看，瑞幸\n七夕联名为啥会\n翻车？', dek:'联名不是找一个正当红的IP，\n而是判断：这段情绪，普通人进得去吗？', ink:'#171717', red:'#D5282F', bg:'#FFFEFA', img:null},
  render(d){
    const imageWidth=796,imageHeight=448,imageLeft=(900-imageWidth)/2;
    const ink=safeColor(d.ink,'#171717'),red=safeColor(d.red,'#D5282F'),bg=safeColor(d.bg,'#FFFEFA'),imgSrc=safeImageSrc(d.img);
    return `
  <div style="width:900px;height:1200px;background:${bg};position:relative;font-family:var(--font-sohne);overflow:hidden">
    <div style="position:absolute;top:48px;left:52px;right:52px;display:flex;justify-content:space-between;align-items:flex-start;z-index:3">
      <span data-edit="author" style="font-size:24px;font-weight:700;color:${red}">${escapeHtml(d.author)}</span>
    </div>
    <div style="position:absolute;top:94px;left:52px;right:52px;height:1px;background:#E5E5E5;z-index:3"></div>
    <div data-edit="title" style="position:absolute;top:142px;left:52px;right:52px;font-size:84px;font-weight:900;color:${ink};line-height:1.18;letter-spacing:-1px;white-space:pre-line;z-index:3">${escapeHtml(d.title)}</div>
    <div data-edit="dek" style="position:absolute;top:500px;left:52px;right:180px;font-size:30px;color:${ink};line-height:1.7;white-space:pre-line;z-index:3">${escapeHtml(d.dek)}</div>
    <div style="position:absolute;top:628px;left:52px;width:140px;height:5px;background:${red};z-index:3"></div>
    <div data-img="img" style="position:absolute;bottom:60px;left:${imageLeft}px;width:${imageWidth}px;height:${imageHeight}px;background:transparent;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;z-index:2;color:#9b9180">${imgSrc?`<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;display:block">`:placeholder('16:9、白底或透明底主题图片',bg,'#9b9180')}</div>
  </div>`;},
  fields:[
    {key:'author',label:'作者信息',type:'text'},{key:'title',label:'主标题(可换行)',type:'textarea'},{key:'dek',label:'副标题(可换行)',type:'textarea'},
    {key:'img',label:'主题图片',type:'image',hint:'建议使用 16:9 图片；白底或透明底素材也可以，会等比完整显示、不裁切。'},
    {key:'red',label:'红色强调',type:'color',swatches:['#D5282F','#C92D35','#c1121f']},{key:'ink',label:'主文字色',type:'color',swatches:['#171717','#111111','#000000']},{key:'bg',label:'背景色',type:'color',swatches:['#FFFEFA','#FFFFFF','#F9F7F1']},
  ],
  typography:[{key:'author',label:'作者信息'},{key:'title',label:'主标题'},{key:'dek',label:'副标题'}],
};

/* ===================== 模板 5: Editorial Magazine 上图下文笔记风 ===================== */
TEMPLATES.editorial = {
  name:'Editorial Magazine 风',
  data:{ratio:'8:5', note:"Don't Give Yourself Away for Free\n不要因为“能给”，就把一切都免费交出去。\n\n真正的价值，不在于你分享了多少，而在于你是否尊重自己的边界。", ink:'#080808', bg:'#FFFFFF', imageBg:'#F3EEF0', img:null},
  render(d){
    const isFourThree=d.ratio==='4:3',imageH=isFourThree?675:562;
    const lines=String(d.note||'').replace(/\r/g,'').split('\n');
    const title=escapeHtml(lines.shift()||'在这里写下标题');
    const body=escapeHtml(lines.join('\n').replace(/^\n+/,''));
    const titleSize=isFourThree?42:50;
    const bodyLength=Array.from(lines.join('')).length;
    const bodySize=Math.max(isFourThree?18:20,(isFourThree?26:28)-Math.floor(bodyLength/150)*2);
    const ink=safeColor(d.ink,'#080808'),bg=safeColor(d.bg,'#FFFFFF'),imageBg=safeColor(d.imageBg,'#F3EEF0'),imgSrc=safeImageSrc(d.img);
    return `
  <div style="width:900px;height:1200px;background:${bg};position:relative;font-family:var(--font-sohne);overflow:hidden">
    <div data-img="img" style="position:absolute;top:0;left:0;right:0;height:${imageH}px;background:${imageBg};overflow:hidden;z-index:2;display:flex;align-items:center;justify-content:center">${imgSrc?`<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;display:block">`:placeholder(`顶部 ${escapeHtml(d.ratio)} 图片 · 完整显示`,imageBg,'#9B7D88')}</div>
    <div style="position:absolute;top:${imageH}px;left:0;right:0;bottom:0;padding:${isFourThree?'34px':'42px'} 62px 46px;background:${bg};z-index:3">
      <div data-edit="note" style="color:${ink};outline-offset:8px">
        <div data-typo="note.title" style="font-family:Georgia,'Noto Serif SC','Source Han Serif SC',Songti,serif;font-size:${titleSize}px;font-weight:700;font-style:italic;line-height:1.12;letter-spacing:-.02em">${title}</div>
        <div data-typo="note.body" style="margin-top:${isFourThree?'22px':'30px'};font-family:Georgia,'Noto Sans SC',sans-serif;font-size:${bodySize}px;line-height:${isFourThree?'1.62':'1.7'};white-space:pre-wrap;letter-spacing:.01em">${body}</div>
      </div>
    </div>
  </div>`;},
  fields:[
    {key:'img',label:'顶部图片',type:'image',hint:'图片会完整显示，不裁切；建议上传与所选比例一致的图片。'},
    {key:'ratio',label:'图片比例',type:'choice',options:[{value:'8:5',label:'8 : 5'},{value:'4:3',label:'4 : 3'}]},
    {key:'note',label:'文字编辑',type:'textarea',rows:9,hint:'首行使用杂志标题字体，其余内容自动使用正文字体；可自由换行。'},
    {key:'ink',label:'文字色',type:'color',swatches:['#080808','#171717','#000000']},{key:'bg',label:'文字区背景',type:'color',swatches:['#FFFFFF','#F8F5F1','#F2EEE8']},
  ],
  typography:[{key:'note.title',label:'首行标题'},{key:'note.body',label:'正文'}],
};

/* ===================== 模板 6: 复古 Field Guide ===================== */
TEMPLATES.fieldguide = {
  name:'复古 Field Guide',
  data:{top:'UI COMPONENTS · FIELD GUIDE', title:'网页控件\n图鉴', subtitle:'41 个常见 UI 控件', meta:'产品 · 设计 · 前端', outer:'#EFE8D5', inner:'#E8DFC5', ink:'#263D29', pink:'#D8799B'},
  render(d){
    const outer=safeColor(d.outer,'#EFE8D5'),inner=safeColor(d.inner,'#E8DFC5'),ink=safeColor(d.ink,'#263D29'),pink=safeColor(d.pink,'#D8799B');
    return `
  <div style="width:900px;height:1200px;background:${outer};display:flex;align-items:center;justify-content:center;font-family:var(--font-sohne);overflow:hidden">
    <div style="width:780px;height:1080px;background:${inner};border-radius:28px;position:relative;box-shadow:inset 0 0 80px rgba(38,61,41,.04);overflow:hidden">
      <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(transparent,transparent 26px,rgba(38,61,41,.03) 26px,rgba(38,61,41,.03) 27px);z-index:0"></div>
      <div data-edit="top" style="position:absolute;top:82px;left:0;right:0;text-align:center;font-family:Georgia,serif;font-size:18px;font-weight:700;color:${ink};letter-spacing:.28em;z-index:2">${escapeHtml(d.top)}</div>
      <div style="position:absolute;top:180px;left:0;right:0;text-align:center;font-family:Georgia,serif;font-size:180px;color:${pink};line-height:1;z-index:1;opacity:.85">“</div>
      <div data-edit="title" style="position:absolute;top:340px;left:0;right:0;text-align:center;font-family:'Noto Serif SC','Source Han Serif SC',Songti,serif;font-size:110px;font-weight:700;color:${ink};line-height:1.2;letter-spacing:6px;white-space:pre-line;z-index:2">${escapeHtml(d.title)}</div>
      <div style="position:absolute;top:620px;left:-20px;right:-20px;height:2px;background:${ink};z-index:2"></div>
      <div style="position:absolute;top:680px;left:0;right:0;text-align:center;z-index:2">
        <div data-edit="subtitle" style="font-family:'Noto Serif SC',serif;font-size:46px;font-weight:600;color:${ink};margin-bottom:18px">${escapeHtml(d.subtitle)}</div>
        <div data-edit="meta" style="font-family:Georgia,serif;font-size:22px;color:${ink};letter-spacing:.18em;opacity:.8">${escapeHtml(d.meta)}</div>
      </div>
    </div>
  </div>`;},
  fields:[
    {key:'top',label:'顶部英文',type:'text'},{key:'title',label:'主标题(可换行)',type:'textarea'},{key:'subtitle',label:'副标题',type:'text'},{key:'meta',label:'底部小字',type:'text'},
    {key:'outer',label:'外层米色',type:'color',swatches:['#EFE8D5','#E8DFC5','#F4F1EA']},{key:'inner',label:'内层纸张',type:'color',swatches:['#E8DFC5','#EFE8D5','#F0EBDC']},{key:'ink',label:'墨绿色',type:'color',swatches:['#263D29','#2B422D','#1f2b26']},{key:'pink',label:'引号粉色',type:'color',swatches:['#D8799B','#E08FA9','#C98BA3']},
  ],
  typography:[{key:'title',label:'主标题'},{key:'subtitle',label:'副标题'}],
};

function estimateNotebookLines(text,charsPerLine){
  return String(text||'').split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(Array.from(line).length/charsPerLine)),0);
}
function renderNotebookSections(d){
  const sections=Array.isArray(d.sections)?d.sections.slice(0,5):[];
  if(!sections.length)return '';
  const ink=safeColor(d.ink,'#64171A'),note=safeColor(d.note,'#FFE8A9');
  const count=sections.length;
  const bodyFont=count<=3?24.5:count===4?21.5:18.5;
  const titleFont=count<=3?32:count===4?28:25;
  const titleH=count<=3?43:count===4?38:34;
  const gap=count<=3?16:count===4?11:9;
  const charsPerLine=count<=3?28:count===4?32:36;
  const areaHeight=643;
  const natural=sections.map(section=>Math.max(count<=3?88:68,Math.ceil(estimateNotebookLines(section.body,charsPerLine)*bodyFont*1.4+22)));
  const bodyBudget=areaHeight-count*titleH-(count-1)*gap;
  const naturalSum=natural.reduce((sum,height)=>sum+height,0);
  const scale=Math.min(1,bodyBudget/naturalSum);
  const heights=natural.map(height=>Math.floor(height*scale));
  let remainder=scale<1?bodyBudget-heights.reduce((sum,height)=>sum+height,0):0;
  for(let i=0;remainder>0&&i<heights.length;i=(i+1)%heights.length,remainder--)heights[i]++;
  let top=0;
  const html=sections.map((section,index)=>{
    const sectionTop=top,boxTop=sectionTop+titleH,boxHeight=heights[index];
    top=boxTop+boxHeight+gap;
    return `<div data-edit="sections.${index}.title" style="position:absolute;top:${sectionTop}px;left:0;right:0;height:${titleH}px;font-size:${titleFont}px;font-weight:700;line-height:1.2;color:${ink};z-index:3">${escapeHtml(section.title)}</div>
      <div style="position:absolute;top:${boxTop}px;left:0;width:700px;height:${boxHeight}px;padding:10px 14px;border-radius:12px;background:${note};z-index:3">
        <div data-edit="sections.${index}.body" style="font-size:${bodyFont}px;line-height:1.4;color:${ink};white-space:pre-line;overflow-wrap:anywhere">${escapeHtml(section.body)}</div>
      </div>`;
  }).join('');
  return `<div style="position:absolute;top:432px;left:92px;width:700px;height:${areaHeight}px;z-index:3">${html}</div>`;
}

/* ===================== 模板 7: 线圈方格笔记风 ===================== */
TEMPLATES.notebook = {
  name:'线圈方格笔记风',
  data:{
    title:'学习顺序很重要',
    subtitle:'不走弯路的考公学习方法',
    kicker:'备考顺序究竟是怎样的？',
    intro:'学完一个板块再学下一个？还是各个板块一起学。\n以下是考公上岸人的血泪总结',
    sections:[
      {title:'一、第一轮行测学习',body:'1.语言理解、判断推理、资料分析、数量关系，四个模块基础课按照顺序学习，并积累错题\n2.常识要每天积累，贯穿整个备考过程'},
      {title:'二、第二轮复盘',body:'1.复习基础阶段整理的错题\n2.针对薄弱知识点采取听网课、刷题训练等各类适合自己的方式重点加强\n3.后期各模块需穿插学习'},
      {title:'三、第三轮申论学习',body:'1.整理申论规范词、成语和实词辨析、常识等，每日晨读+背诵\n2.每天按照考试时间进行测试，\n行测一套题、申论卡时间写，作文需写出题目、开头、分论点和结尾'}
    ],
    tab:'KAOGONG',
    red:'#A9181D',
    ink:'#64171A',
    paper:'#FFFDF1',
    note:'#FFE8A9',
    yellow:'#FFC94D'
  },
  annotations:[
    {id:'notebook-circle',type:'circle',x:463,y:179,w:146,h:78,color:'#F2C44A',rotation:3}
  ],
  render(d){
    const red=safeColor(d.red,'#A9181D'),ink=safeColor(d.ink,'#64171A'),paper=safeColor(d.paper,'#FFFDF1'),note=safeColor(d.note,'#FFE8A9'),yellow=safeColor(d.yellow,'#FFC94D');
    const rings=Array.from({length:28},(_,i)=>`<div style="position:absolute;left:-2px;top:${73+i*40}px;width:65px;height:22px;z-index:8"><span style="position:absolute;left:0;top:7px;width:52px;height:8px;border-radius:0 8px 8px 0;background:#321316;box-shadow:0 1px 0 rgba(255,255,255,.28)"></span><span style="position:absolute;left:41px;top:0;width:21px;height:21px;border-radius:50%;background:${red};border:4px solid #751519;box-shadow:inset 2px 0 0 rgba(255,255,255,.18)"></span></div>`).join('');
    return `
  <div style="width:900px;height:1200px;background:${red};position:relative;overflow:hidden;font-family:'XiaWuZhenKai','Noto Sans SC',sans-serif">
    <div style="position:absolute;left:37px;top:29px;width:826px;height:1148px;border-radius:42px;background:${yellow};z-index:0"></div>
    <div style="position:absolute;right:2px;top:155px;width:43px;height:178px;border-radius:0 9px 9px 0;background:${yellow};z-index:1;box-shadow:0 2px 0 rgba(91,17,19,.2)">
      <span data-edit="tab" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;text-orientation:mixed;font-family:var(--font-sohne);font-size:22px;font-weight:700;letter-spacing:1px;color:${red}">${escapeHtml(d.tab)}</span>
    </div>
    <div style="position:absolute;left:23px;top:18px;width:837px;height:1148px;border-radius:43px 54px 42px 47px;background:${paper};overflow:hidden;z-index:2;box-shadow:inset 0 0 35px rgba(107,80,28,.035)">
      <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(125,126,113,.28) 1.4px,transparent 1.4px),linear-gradient(90deg,rgba(125,126,113,.28) 1.4px,transparent 1.4px);background-size:37px 37px;background-position:34px 32px;opacity:.72"></div>

      <div data-edit="title" style="position:absolute;top:52px;left:92px;right:42px;text-align:center;font-family:'XiaWuZhenKai','Noto Serif SC',STKaiti,serif;font-size:88px;font-weight:700;line-height:1.05;letter-spacing:5px;color:${ink};white-space:nowrap;z-index:3;text-shadow:.7px .7px 0 ${ink}">${escapeHtml(d.title)}</div>

      <div style="position:absolute;top:165px;left:130px;right:58px;height:88px;z-index:3">
        <div data-edit="subtitle" style="position:absolute;inset:0;text-align:center;font-family:'XiaWuZhenKai','MuYao SuiXinShouXieTi',cursive;font-size:48px;font-weight:700;line-height:1.35;color:${red};white-space:nowrap">${escapeHtml(d.subtitle)}</div>
      </div>

      <div data-edit="kicker" style="position:absolute;top:271px;left:94px;right:50px;font-size:31px;font-weight:700;line-height:1.25;color:${ink};z-index:3">${escapeHtml(d.kicker)}</div>

      <div style="position:absolute;top:323px;left:92px;width:700px;min-height:88px;padding:12px 14px;border-radius:12px;background:${note};z-index:3">
        <div data-edit="intro" style="font-size:25px;line-height:1.35;color:${ink};white-space:pre-line">${escapeHtml(d.intro)}</div>
      </div>

      ${renderNotebookSections(d)}
    </div>
    ${rings}
  </div>`;
  },
  fields:[
    {key:'title',label:'主标题',type:'text'},{key:'subtitle',label:'红色副标题',type:'text'},{key:'kicker',label:'导语标题',type:'text'},{key:'intro',label:'导语内容',type:'textarea'},
    {key:'sections',label:'内容段落',type:'sections'},{key:'tab',label:'右侧标签',type:'text'},
    {key:'red',label:'封面红色',type:'color',swatches:['#A9181D','#9F171B','#B32025']},{key:'ink',label:'文字颜色',type:'color',swatches:['#64171A','#5B1719','#711E20']},{key:'paper',label:'方格纸颜色',type:'color',swatches:['#FFFDF1','#FCF8E9','#FFFBEF']},{key:'note',label:'笔记色块',type:'color',swatches:['#FFE8A9','#FFE4A0','#FBE3A6']},{key:'yellow',label:'标签/批注黄色',type:'color',swatches:['#FFC94D','#F7C74A','#FFD35A']}
  ],
  typography(d){return [
    {key:'title',label:'主标题'},{key:'subtitle',label:'红色副标题'},{key:'kicker',label:'导语标题'},{key:'intro',label:'导语内容'},
    ...d.sections.flatMap((section,index)=>[{key:`sections.${index}.title`,label:`段落 ${index+1} 标题`},{key:`sections.${index}.body`,label:`段落 ${index+1} 正文`}])
  ];},
};

/* ============================================================
   引擎运行时
   ============================================================ */
const COVER_EDITOR_STORAGE_KEY='cover-studio-state-v1';
const COVER_DEFAULT_DATA=Object.fromEntries(Object.entries(TEMPLATES).map(([key,template])=>[key,JSON.parse(JSON.stringify(template.data))]));

function isPlainObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function sameStoredValue(left,right){try{return JSON.stringify(left)===JSON.stringify(right);}catch(_){return left===right;}}
function coverStateForStorage({includeImages=true}={}){
  const templates={};
  Object.entries(TEMPLATES).forEach(([key,template])=>{
    const defaults=COVER_DEFAULT_DATA[key]||{};
    const imageKeys=new Set((template.fields||[]).filter(field=>field.type==='image').map(field=>field.key));
    const data={};
    Object.entries(template.data||{}).forEach(([field,value])=>{
      if(!includeImages&&imageKeys.has(field))return;
      if(!sameStoredValue(value,defaults[field]))data[field]=value;
    });
    const entry={};
    if(Object.keys(data).length)entry.data=data;
    if(isPlainObject(template.typographyOverrides)&&Object.keys(template.typographyOverrides).length)entry.typographyOverrides=template.typographyOverrides;
    if(Object.keys(entry).length)templates[key]=entry;
  });
  return {version:1,currentKey,templates,updatedAt:Date.now()};
}
function restoreCoverState(){
  try{
    const raw=localStorage.getItem(COVER_EDITOR_STORAGE_KEY);if(!raw)return null;
    const stored=JSON.parse(raw);if(!isPlainObject(stored))return null;
    if(isPlainObject(stored.templates))Object.entries(stored.templates).forEach(([key,entry])=>{
      const template=TEMPLATES[key];if(!template||!isPlainObject(entry))return;
      if(isPlainObject(entry.data)){
        const allowed=new Set([...Object.keys(template.data||{}),...(template.fields||[]).map(field=>field.key)]);
        Object.entries(entry.data).forEach(([field,value])=>{if(allowed.has(field))template.data[field]=value;});
      }
      if(isPlainObject(entry.typographyOverrides))template.typographyOverrides=entry.typographyOverrides;
    });
    return Object.prototype.hasOwnProperty.call(TEMPLATES,stored.currentKey)?stored.currentKey:null;
  }catch(_){return null;}
}

let currentKey=restoreCoverState()||'notebook';
let coverSaveTimer=null;
function saveCoverState(){
  if(coverSaveTimer){clearTimeout(coverSaveTimer);coverSaveTimer=null;}
  try{
    localStorage.setItem(COVER_EDITOR_STORAGE_KEY,JSON.stringify(coverStateForStorage()));
    return true;
  }catch(_){
    try{
      localStorage.setItem(COVER_EDITOR_STORAGE_KEY,JSON.stringify(coverStateForStorage({includeImages:false})));
      return true;
    }catch(_){return false;}
  }
}
function saveCoverStateDebounced(){clearTimeout(coverSaveTimer);coverSaveTimer=setTimeout(saveCoverState,180);}
const canvas=document.getElementById('canvas');
const inspFields=document.getElementById('inspFields');
const inspTitle=document.getElementById('inspTitle');
const annotationMenu=document.getElementById('annotationMenu');
const annotationBtn=document.getElementById('annotationBtn');
const ANNOTATION_STORAGE_KEY='cover-studio-annotations-v1';
const ANNOTATIONS=(()=>{try{return JSON.parse(localStorage.getItem(ANNOTATION_STORAGE_KEY)||'{}')}catch(_){return {}}})();
Object.keys(ANNOTATIONS).forEach(key=>{
  if(key!=='notebook'&&key!=='swiss'&&key!=='hamster'){delete ANNOTATIONS[key];return;}
  if(!Array.isArray(ANNOTATIONS[key])){ANNOTATIONS[key]=[];return;}
  const allowed=key==='notebook'?['circle','arrow']:key==='swiss'?['underline']:['wave'];
  ANNOTATIONS[key]=ANNOTATIONS[key].filter(item=>allowed.includes(item.type)&&item.id!=='notebook-arrow');
  if(key==='notebook')ANNOTATIONS[key].forEach(item=>{if(item.color==='#FFC94D')item.color='#F2C44A';});
});
try{localStorage.setItem(ANNOTATION_STORAGE_KEY,JSON.stringify(ANNOTATIONS))}catch(_){}
let selectedAnnotationId=null;
let activeAnnotationColor='#F2C44A';
let annotationSerial=Date.now();

function saveAnnotations(){try{localStorage.setItem(ANNOTATION_STORAGE_KEY,JSON.stringify(ANNOTATIONS))}catch(_){}}
function updateSwissUnderlineColor(color){
  if(currentKey!=='swiss')return;
  getAnnotations().filter(item=>item.type==='underline').forEach(item=>{item.color=color;});
  activeAnnotationColor=color;saveAnnotations();
}
function updateHamsterWaveColor(color){
  if(currentKey!=='hamster')return;
  getAnnotations().filter(item=>item.type==='wave').forEach(item=>{item.color=color;});
  activeAnnotationColor=color;saveAnnotations();
}

function getAnnotations(key=currentKey){
  if(!Object.prototype.hasOwnProperty.call(ANNOTATIONS,key)){
    ANNOTATIONS[key]=(TEMPLATES[key].annotations||[]).map(item=>({...item}));
  }
  return ANNOTATIONS[key];
}
function annotationSvg(a){
  if(a.type==='circle')return `<svg class="annotation-art" viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M91 30 C90 44 72 52 49 52 C25 52 8 43 8 30 C9 15 26 8 50 8 C75 8 90 16 91 30" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  if(a.type==='arrow')return `<svg class="annotation-art" viewBox="0 0 140 190" preserveAspectRatio="none"><path d="M18 181 C55 164 84 142 82 112 C80 87 63 72 47 78 C31 83 26 99 34 113 C43 129 62 135 82 129 C111 121 128 101 131 78 C134 53 125 29 116 9" fill="none" stroke="currentColor" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M101 31 L116 9 L136 27" fill="none" stroke="currentColor" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  if(a.type==='underline')return `<svg class="annotation-art" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100" rx="12" fill="currentColor"/></svg>`;
  if(a.type==='wave')return `<svg class="annotation-art" viewBox="0 0 560 34" preserveAspectRatio="none"><path d="M6 20 Q45 4 84 18 T162 18 T240 18 T318 18 T396 18 T474 18 T552 18" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></svg>`;
  return '';
}
function annotationMarkup(a,interactive=true){
  return `<div class="annotation-item${interactive&&a.id===selectedAnnotationId?' selected':''}" data-annotation-id="${a.id}" data-annotation-type="${a.type}" style="left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px;color:${a.color};transform:rotate(${a.rotation||0}deg);${interactive?'':'pointer-events:none;'}">${annotationSvg(a)}${interactive?'<button class="annotation-delete" title="删除批注" aria-label="删除批注">×</button><span class="annotation-resize" title="调整大小"></span>':''}</div>`;
}
function renderStaticAnnotations(items){return `<div class="annotation-static-layer">${items.map(a=>annotationMarkup(a,false)).join('')}</div>`;}
function renderAnnotations(){
  if(currentKey!=='notebook'&&currentKey!=='swiss'&&currentKey!=='hamster')return;
  const layer=document.createElement('div');layer.className='annotation-layer';
  layer.innerHTML=getAnnotations().map(a=>annotationMarkup(a,true)).join('');
  canvas.appendChild(layer);bindAnnotationEvents();
}
function selectAnnotation(id){
  selectedAnnotationId=id;
  canvas.querySelectorAll('.annotation-item').forEach(el=>el.classList.toggle('selected',el.dataset.annotationId===id));
  if(currentKey!=='notebook'&&currentKey!=='swiss'&&currentKey!=='hamster')return;
  const item=getAnnotations().find(a=>a.id===id);
  if(item){activeAnnotationColor=item.color;document.querySelectorAll('.annotation-color').forEach(el=>el.classList.toggle('active',el.dataset.annotationColor.toLowerCase()===item.color.toLowerCase()));}
}
function deleteAnnotation(id){
  const items=getAnnotations(),index=items.findIndex(a=>a.id===id);if(index<0)return;
  items.splice(index,1);saveAnnotations();if(selectedAnnotationId===id)selectedAnnotationId=null;renderCanvas();
}
function startAnnotationGesture(e,item,mode){
  e.preventDefault();e.stopPropagation();selectAnnotation(item.id);
  const el=canvas.querySelector(`[data-annotation-id="${item.id}"]`);
  const start={x:e.clientX,y:e.clientY,ax:item.x,ay:item.y,w:item.w,h:item.h};
  const rect=canvas.getBoundingClientRect(),sx=900/rect.width,sy=1200/rect.height;
  const move=ev=>{
    const dx=(ev.clientX-start.x)*sx,dy=(ev.clientY-start.y)*sy;
    if(mode==='drag'){
      item.x=Math.max(0,Math.min(900-item.w,start.ax+dx));item.y=Math.max(0,Math.min(1200-item.h,start.ay+dy));
      el.style.left=item.x+'px';el.style.top=item.y+'px';
    }else{
      const minW=60,minH=item.type==='underline'?10:item.type==='wave'?20:44;
      item.w=Math.max(minW,Math.min(900-item.x,start.w+dx));item.h=Math.max(minH,Math.min(1200-item.y,start.h+dy));
      el.style.width=item.w+'px';el.style.height=item.h+'px';
    }
  };
  const up=()=>{saveAnnotations();document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
}
function bindAnnotationEvents(){
  canvas.querySelectorAll('.annotation-item').forEach(el=>{
    const item=getAnnotations().find(a=>a.id===el.dataset.annotationId);if(!item)return;
    el.addEventListener('pointerdown',e=>{if(e.target.closest('.annotation-delete'))return;startAnnotationGesture(e,item,e.target.closest('.annotation-resize')?'resize':'drag');});
    el.querySelector('.annotation-delete').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
    el.querySelector('.annotation-delete').addEventListener('click',e=>{e.stopPropagation();deleteAnnotation(item.id);});
  });
}
function addAnnotation(type){
  const allowed=currentKey==='notebook'?(type==='circle'||type==='arrow'):currentKey==='swiss'?type==='underline':(currentKey==='hamster'&&type==='wave');
  if(!allowed)return;
  const defaults=type==='circle'?{x:365,y:255,w:170,h:88,rotation:-2}:type==='arrow'?{x:585,y:315,w:165,h:210,rotation:0}:type==='underline'?{x:46,y:269,w:420,h:16,rotation:0}:{x:52,y:236,w:430,h:34,rotation:0};
  const color=currentKey==='swiss'&&type==='underline'?(TEMPLATES.swiss.data.blue||'#5270FF'):currentKey==='hamster'&&type==='wave'?(TEMPLATES.hamster.data.accent||'#f68e22'):activeAnnotationColor;
  const item={id:'annotation-'+(++annotationSerial),type,color,...defaults};
  getAnnotations().push(item);saveAnnotations();selectedAnnotationId=item.id;renderCanvas();annotationMenu.classList.remove('open');
}
function updateAnnotationAvailability(){
  const enabled=currentKey==='notebook'||currentKey==='swiss'||currentKey==='hamster';document.getElementById('annotationWrap').style.display=enabled?'':'none';
  document.querySelectorAll('[data-annotation-for]').forEach(button=>button.style.display=button.dataset.annotationFor===currentKey?'':'none');
  if(currentKey==='swiss'&&selectedAnnotationId==null){activeAnnotationColor=TEMPLATES.swiss.data.blue||'#5270FF';document.querySelectorAll('.annotation-color').forEach(el=>el.classList.toggle('active',el.dataset.annotationColor.toLowerCase()===activeAnnotationColor.toLowerCase()));}
  if(currentKey==='hamster'&&selectedAnnotationId==null){activeAnnotationColor=TEMPLATES.hamster.data.accent||'#f68e22';document.querySelectorAll('.annotation-color').forEach(el=>el.classList.toggle('active',el.dataset.annotationColor.toLowerCase()===activeAnnotationColor.toLowerCase()));}
  if(!enabled){annotationMenu.classList.remove('open');selectedAnnotationId=null;}
}
function getTypographyTargets(t){return typeof t.typography==='function'?t.typography(t.data):(t.typography||[]);}
function getTypographyElement(root,key){return root.querySelector(`[data-typo="${key}"],[data-edit="${key}"]`);}
function captureTypographyDefaults(root,t){
  t._typographyDefaults={};
  getTypographyTargets(t).forEach(target=>{
    const el=getTypographyElement(root,target.key);if(!el)return;
    const style=getComputedStyle(el),fontSize=parseFloat(style.fontSize)||16,lineHeight=parseFloat(style.lineHeight);
    t._typographyDefaults[target.key]={fontSize:Math.round(fontSize*10)/10,lineHeight:Math.round((Number.isFinite(lineHeight)?lineHeight/fontSize:1.2)*100)/100,fontFamily:''};
  });
}
function applyTypography(root,t){
  const overrides=t.typographyOverrides||{};
  getTypographyTargets(t).forEach(target=>{
    const value=overrides[target.key],el=getTypographyElement(root,target.key);if(!value||!el)return;
    if(target.fontSize!==false&&Number.isFinite(value.fontSize))el.style.fontSize=`${value.fontSize}px`;
    if(target.lineHeight!==false&&Number.isFinite(value.lineHeight))el.style.lineHeight=String(value.lineHeight);
    if(target.fontFamily!==false&&value.fontFamily&&COVER_FONT_STACKS[value.fontFamily])el.style.fontFamily=COVER_FONT_STACKS[value.fontFamily];
  });
}
function renderCanvas(){const t=TEMPLATES[currentKey];canvas.innerHTML=t.render(t.data);captureTypographyDefaults(canvas,t);applyTypography(canvas,t);bindInlineEdit();renderAnnotations();updateAnnotationAvailability();saveCoverStateDebounced();}
const renderCanvasDebounced=(function(){let timer;return function(){clearTimeout(timer);timer=setTimeout(()=>renderCanvas(),280);};})();
function setTemplateData(path,value){
  const parts=path.split('.');let target=TEMPLATES[currentKey].data;
  for(let i=0;i<parts.length-1;i++){const key=/^\d+$/.test(parts[i])?Number(parts[i]):parts[i];target=target[key];if(target==null)return;}
  const last=/^\d+$/.test(parts.at(-1))?Number(parts.at(-1)):parts.at(-1);target[last]=value;
}
function bindInlineEdit(){
  canvas.querySelectorAll('[data-edit]').forEach(el=>{
    el.addEventListener('click',e=>{if(!canvas.classList.contains('show-hints'))return;e.stopPropagation();el.setAttribute('contenteditable','true');el.focus();document.execCommand&&document.getSelection().selectAllChildren(el);});
    el.addEventListener('blur',()=>{const path=el.getAttribute('data-edit');setTemplateData(path,el.innerText);el.removeAttribute('contenteditable');if(path.startsWith('sections.')||(currentKey==='swiss'&&path==='title'))renderCanvas();else saveCoverStateDebounced();syncInspector();});
    el.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();el.blur();}});
  });
}
function buildInspector(){
  const t=TEMPLATES[currentKey];inspTitle.textContent=t.name;inspFields.innerHTML='';
  t.fields.forEach(f=>{const wrap=document.createElement('div');wrap.className='field';
    if(f.type==='text'){wrap.innerHTML=`<label>${f.label}</label><input type="text" data-f="${f.key}" value="">`;}
    else if(f.type==='textarea'){wrap.innerHTML=`<label>${f.label}</label><textarea data-f="${f.key}"${f.rows?` rows="${f.rows}"`:''}></textarea>${f.hint?`<div class="hint">${f.hint}</div>`:''}`;}
    else if(f.type==='color'){const sw=(f.swatches||[]).map(c=>`<span class="swatch" data-sw="${f.key}" data-c="${c}" style="background:${c}"></span>`).join('');wrap.innerHTML=`<label>${f.label}</label><div class="row"><input type="color" data-f="${f.key}" value="${t.data[f.key]||'#000000'}"><input type="text" data-f="${f.key}" value="${t.data[f.key]||''}" style="flex:1"></div><div class="swatches">${sw}</div>`;}
    else if(f.type==='image'){wrap.innerHTML=`<label>${f.label}</label><label class="upload-btn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3m0 0L8 7m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>上传图片<input type="file" accept="image/*" data-img="${f.key}" hidden></label><div class="hint">${f.hint||'建议透明底 PNG。未上传时显示占位图。'}</div>`;}
    else if(f.type==='choice'){wrap.innerHTML=`<label>${f.label}</label><div class="choice-group">${(f.options||[]).map(option=>`<button class="choice-btn${t.data[f.key]===option.value?' active':''}" data-choice="${f.key}" data-value="${option.value}" type="button">${option.label}</button>`).join('')}</div>${f.hint?`<div class="hint">${f.hint}</div>`:''}`;}
    else if(f.type==='sections'){
      const sections=Array.isArray(t.data.sections)?t.data.sections:[];
      wrap.innerHTML=`<label>${f.label}</label>${sections.map((section,index)=>`<div class="section-editor">
        <div class="section-editor-head"><span class="section-editor-index">段落 ${index+1}</span><div class="section-editor-actions">
          <button data-section-move="up" data-section-index="${index}" title="上移">↑</button><button data-section-move="down" data-section-index="${index}" title="下移">↓</button><button data-section-delete="${index}" title="删除">×</button>
        </div></div>
        <input type="text" data-section-index="${index}" data-section-field="title" aria-label="段落标题">
        <textarea data-section-index="${index}" data-section-field="body" aria-label="段落内容"></textarea>
      </div>`).join('')}<button class="section-add" data-section-add ${sections.length>=5?'disabled':''}>＋ 添加段落</button><div class="section-limit">支持 1–5 段；黄色内容块会随段落数量自动生成并重新排版。</div>`;
    }
    inspFields.appendChild(wrap);
  });
  const typographyTargets=getTypographyTargets(t);
  if(typographyTargets.length){
    const panel=document.createElement('div');panel.className='field typography-panel';
    panel.innerHTML=`<label>文字排版</label><div class="hint">可调整内容文字；装饰文字保持模板原有设计。</div>${typographyTargets.map(target=>{
      const defaults=t._typographyDefaults?.[target.key]||{fontSize:16,lineHeight:1.2,fontFamily:''};
      const value=t.typographyOverrides?.[target.key]||defaults;
      const sizeControl=target.fontSize===false?'':`<label><span>字号</span><input type="number" min="8" max="220" step="1" value="${value.fontSize}" data-typo-size="${target.key}"><span class="typography-unit">px</span></label>`;
      const lineControl=target.lineHeight===false?'':`<label><span>行距</span><input type="number" min="0.7" max="3" step="0.05" value="${value.lineHeight}" data-typo-line="${target.key}"><span class="typography-unit">×</span></label>`;
      const fontControl=target.fontFamily===false?'':`<div class="typography-font-row"><select data-typo-font="${target.key}">${COVER_FONT_OPTIONS.map(opt=>`<option value="${opt.value}"${(value.fontFamily||'')===opt.value?' selected':''}>${opt.label}</option>`).join('')}</select></div>`;
      return `<div class="typography-control"><div class="typography-control-head"><span>${target.label}</span><button class="typography-reset" type="button" data-typo-reset="${target.key}">恢复默认</button></div><div class="typography-inputs">${sizeControl}${lineControl}</div>${fontControl}</div>`;
    }).join('')}`;
    inspFields.appendChild(panel);
  }
  wireInspector();syncInspector();
}
function wireInspector(){
  inspFields.querySelectorAll('input[data-f],textarea[data-f]').forEach(inp=>{
    inp.addEventListener('input',()=>{const k=inp.getAttribute('data-f');TEMPLATES[currentKey].data[k]=inp.value;if(k==='blue')updateSwissUnderlineColor(inp.value);if(k==='accent')updateHamsterWaveColor(inp.value);if(inp.type==='color'||inp.parentElement.classList.contains('row')){inspFields.querySelectorAll(`[data-f="${k}"]`).forEach(o=>{if(o!==inp)o.value=inp.value;});}
    if(inp.type==='text'||inp.tagName==='TEXTAREA'){renderCanvasDebounced();}else{renderCanvas();}});
  });
  inspFields.querySelectorAll('.swatch').forEach(s=>{s.addEventListener('click',()=>{const k=s.getAttribute('data-sw'),c=s.getAttribute('data-c');TEMPLATES[currentKey].data[k]=c;if(k==='blue')updateSwissUnderlineColor(c);if(k==='accent')updateHamsterWaveColor(c);inspFields.querySelectorAll(`[data-f="${k}"]`).forEach(o=>o.value=c);renderCanvas();});});
  inspFields.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.choice;TEMPLATES[currentKey].data[key]=button.dataset.value;
    inspFields.querySelectorAll(`[data-choice="${key}"]`).forEach(item=>item.classList.toggle('active',item===button));renderCanvas();
  }));
  inspFields.querySelectorAll('input[data-img]').forEach(inp=>{inp.addEventListener('change',e=>{const k=inp.getAttribute('data-img'),file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{TEMPLATES[currentKey].data[k]=ev.target.result;renderCanvas();};r.readAsDataURL(file);});});
  inspFields.querySelectorAll('[data-section-index][data-section-field]').forEach(input=>input.addEventListener('input',()=>{
    const index=Number(input.dataset.sectionIndex),field=input.dataset.sectionField;TEMPLATES[currentKey].data.sections[index][field]=input.value;renderCanvas();
  }));
  const addButton=inspFields.querySelector('[data-section-add]');if(addButton)addButton.addEventListener('click',()=>{
    const sections=TEMPLATES[currentKey].data.sections;if(sections.length>=5)return;
    const numerals=['一','二','三','四','五'];sections.push({title:`${numerals[sections.length]}、新段落`,body:'在这里填写段落内容'});renderCanvas();buildInspector();
  });
  inspFields.querySelectorAll('[data-section-delete]').forEach(button=>button.addEventListener('click',()=>{
    const sections=TEMPLATES[currentKey].data.sections;if(sections.length<=1)return;
    sections.splice(Number(button.dataset.sectionDelete),1);renderCanvas();buildInspector();
  }));
  inspFields.querySelectorAll('[data-section-move]').forEach(button=>button.addEventListener('click',()=>{
    const sections=TEMPLATES[currentKey].data.sections,index=Number(button.dataset.sectionIndex),next=button.dataset.sectionMove==='up'?index-1:index+1;
    if(next<0||next>=sections.length)return;[sections[index],sections[next]]=[sections[next],sections[index]];renderCanvas();buildInspector();
  }));
  inspFields.querySelectorAll('[data-typo-size],[data-typo-line]').forEach(input=>input.addEventListener('input',()=>{
    const t=TEMPLATES[currentKey],key=input.dataset.typoSize||input.dataset.typoLine,number=Number(input.value);
    if(!Number.isFinite(number))return;
    t.typographyOverrides??={};
    const defaults=t._typographyDefaults?.[key]||{fontSize:16,lineHeight:1.2,fontFamily:''};
    t.typographyOverrides[key]??={...defaults};
    if(input.dataset.typoSize)t.typographyOverrides[key].fontSize=Math.min(220,Math.max(8,number));
    else t.typographyOverrides[key].lineHeight=Math.min(3,Math.max(.7,number));
    renderCanvasDebounced();
  }));
  inspFields.querySelectorAll('[data-typo-font]').forEach(select=>select.addEventListener('change',()=>{
    const t=TEMPLATES[currentKey],key=select.dataset.typoFont,value=select.value;
    t.typographyOverrides??={};
    const defaults=t._typographyDefaults?.[key]||{fontSize:16,lineHeight:1.2,fontFamily:''};
    t.typographyOverrides[key]??={...defaults};
    t.typographyOverrides[key].fontFamily=value;
    renderCanvas();
  }));
  inspFields.querySelectorAll('[data-typo-reset]').forEach(button=>button.addEventListener('click',()=>{
    const t=TEMPLATES[currentKey];if(t.typographyOverrides)delete t.typographyOverrides[button.dataset.typoReset];renderCanvas();buildInspector();
  }));
}
function syncInspector(){const d=TEMPLATES[currentKey].data;inspFields.querySelectorAll('input[data-f],textarea[data-f]').forEach(inp=>{const k=inp.getAttribute('data-f');if(inp.type!=='color'&&d[k]!=null&&document.activeElement!==inp)inp.value=d[k];});inspFields.querySelectorAll('[data-section-index][data-section-field]').forEach(input=>{const item=d.sections?.[Number(input.dataset.sectionIndex)];if(item&&document.activeElement!==input)input.value=item[input.dataset.sectionField]||'';});}
const TEMPLATE_PREVIEWS={
  hamster:'./assets/template-previews/hamster.jpg',
  swiss:'./assets/template-previews/swiss.jpg',
  article:'./assets/template-previews/article.jpg',
  editorial:'./assets/template-previews/editorial.jpg',
  fieldguide:'./assets/template-previews/fieldguide.jpg',
  notebook:'./assets/template-previews/notebook.jpg'
};
function buildThumbs(){
  const list=document.getElementById('tplList');list.innerHTML='';
  Object.entries(TEMPLATES).forEach(([key,t])=>{
    const thumb=document.createElement('div');thumb.className='tpl-thumb'+(key===currentKey?' active':'');thumb.dataset.key=key;
    const preview=TEMPLATE_PREVIEWS[key];let mini=null;
    if(preview){
      const img=document.createElement('img');img.className='preview-image';img.src=preview;img.alt=`${t.name}预览`;thumb.appendChild(img);
    }else{
      mini=document.createElement('div');mini.className='mini';mini.style.width='900px';mini.style.height='1200px';mini.innerHTML=t.render(t.data)+renderStaticAnnotations(t.annotations||[]);thumb.appendChild(mini);
    }
    thumb.insertAdjacentHTML('beforeend',`<span class="label">${t.name}</span>`);
    thumb.addEventListener('click',()=>{currentKey=key;selectedAnnotationId=null;document.querySelectorAll('.tpl-thumb').forEach(x=>x.classList.remove('active'));thumb.classList.add('active');renderCanvas();buildInspector();});
    list.appendChild(thumb);
    if(mini)mini.style.transform=`scale(${thumb.clientWidth/900})`;
  });
}
function fitCanvas(){const stage=document.getElementById('stage');const pad=64;const availW=stage.clientWidth-pad;const availH=stage.clientHeight-pad;const scale=Math.min(availW/900,availH/1200,1);canvas.style.transform=`scale(${scale})`;document.getElementById('canvasWrap').style.width=(900*scale)+'px';document.getElementById('canvasWrap').style.height=(1200*scale)+'px';document.getElementById('zoomTag').textContent=Math.round(scale*100)+'%  ·  900×1200';}
window.addEventListener('resize',fitCanvas);
window.addEventListener('beforeunload',saveCoverState);
annotationBtn.addEventListener('click',e=>{e.stopPropagation();annotationMenu.classList.toggle('open');});
annotationMenu.addEventListener('click',e=>e.stopPropagation());
document.querySelectorAll('[data-annotation-type]').forEach(btn=>btn.addEventListener('click',()=>addAnnotation(btn.dataset.annotationType)));
document.querySelectorAll('[data-annotation-color]').forEach(btn=>btn.addEventListener('click',()=>{
  activeAnnotationColor=btn.dataset.annotationColor;document.querySelectorAll('.annotation-color').forEach(el=>el.classList.toggle('active',el===btn));
  const item=getAnnotations().find(a=>a.id===selectedAnnotationId);if(item){item.color=activeAnnotationColor;saveAnnotations();renderCanvas();}
}));
document.addEventListener('click',e=>{annotationMenu.classList.remove('open');if(!e.target.closest('.annotation-item')&&!e.target.closest('.annotation-wrap'))selectAnnotation(null);});
document.addEventListener('keydown',e=>{
  const editing=e.target.matches('input,textarea,[contenteditable="true"]');
  if(!editing&&(e.key==='Delete'||e.key==='Backspace')&&selectedAnnotationId){e.preventDefault();deleteAnnotation(selectedAnnotationId);}
  if(e.key==='Escape'){annotationMenu.classList.remove('open');selectAnnotation(null);}
});
document.getElementById('toggleHints').addEventListener('click',function(){canvas.classList.toggle('show-hints');const active=canvas.classList.contains('show-hints');this.classList.toggle('btn-primary',active);this.classList.toggle('btn-ghost',!active);const label=document.getElementById('toggleHintsText');if(label){label.textContent=active?'退出画布编辑':'点击画布编辑';}});
document.getElementById('exportBtn').addEventListener('click',async function(){if(document.body.classList.contains('mode-body'))return;if(typeof html2canvas==='undefined'){alert('导出库加载失败,请检查网络或刷新页面重试');return;}const old=this.innerHTML;this.innerHTML='导出中…';this.disabled=true;selectAnnotation(null);annotationMenu.classList.remove('open');canvas.classList.remove('show-hints');const prevTransform=canvas.style.transform;canvas.style.transform='scale(1)';try{if(document.fonts&&document.fonts.ready){try{await document.fonts.ready;}catch(_){}}const cvs=await html2canvas(canvas,{width:900,height:1200,scale:2,backgroundColor:null});const dataUrl=cvs.toDataURL('image/png');await saveImageViaBridge(dataUrl,`封面_${TEMPLATES[currentKey].name}`);}catch(err){alert('导出失败:'+err.message);}canvas.style.transform=prevTransform;this.innerHTML=old;this.disabled=false;});
function init(){buildThumbs();renderCanvas();buildInspector();fitCanvas();initMobileUI();}
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(()=>{buildThumbs();fitCanvas();});}
init();
window.getCoverEditorState=()=>({currentKey,templates:TEMPLATES});
window.saveCoverState=saveCoverState;

/* ===== 移动端交互 ===== */
function initMobileUI(){
  const overlay=document.createElement('div');
  overlay.id='mobileOverlay';
  document.body.appendChild(overlay);

  const editBtn=document.createElement('button');
  editBtn.id='mobileEditBtn';
  editBtn.setAttribute('aria-label','编辑');
  editBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  document.body.appendChild(editBtn);

  const inspector=document.getElementById('coverInspector');
  const bodyInspector=document.getElementById('bodyInspector');

  function openDrawer(){
    if(document.body.classList.contains('mode-body')){
      bodyInspector.style.transform='translateY(0)';
    }else{
      inspector.classList.add('mobile-open');
    }
    overlay.classList.add('show');
  }
  function closeDrawer(){
    if(document.body.classList.contains('mode-body')){
      bodyInspector.style.transform='translateY(100%)';
    }else{
      inspector.classList.remove('mobile-open');
    }
    overlay.classList.remove('show');
  }

  editBtn.addEventListener('click',function(){
    const panel=document.body.classList.contains('mode-body')?bodyInspector:inspector;
    const isOpen=document.body.classList.contains('mode-body')
      ?bodyInspector.style.transform==='translateY(0)'||(!bodyInspector.style.transform)
      :inspector.classList.contains('mobile-open');
    if(isOpen)closeDrawer();else openDrawer();
  });

  overlay.addEventListener('click',closeDrawer);

  /* 模板选择后在小屏上不关抽屉（因为模板栏在顶部，不遮挡） */
  /* 画布编辑提示切换后自动收起面板 */
  document.getElementById('toggleHints').addEventListener('click',function(){
    if(canvas.classList.contains('show-hints')&&window.innerWidth<=768)closeDrawer();
  });

  /* 选中模板后自动收起 */
  const origBuildThumbs=buildThumbs;
  /* 不需要覆盖，模板在顶部条不遮挡 */
}
