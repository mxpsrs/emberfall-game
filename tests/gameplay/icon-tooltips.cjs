const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// Deterministic input/DOM fixture: no browser or server needed.
class Element{
 constructor(tag='div'){this.tagName=tag;this.attrs={};this.dataset={};this.style={};this.children=[];this.hidden=false;this.textContent='';this.rect={left:260,top:110,width:32,height:32};}
 get title(){return this.getAttribute('title')||'';}set title(v){this.setAttribute('title',v);}
 get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}hasAttribute(k){return k in this.attrs;}removeAttribute(k){delete this.attrs[k];}
 appendChild(el){el.remove();this.children.push(el);el.parentElement=this;return el;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
 contains(el){return el===this||this.children.some(c=>c.contains(el));}
 matches(selector){return selector.split(',').some(s=>s===':focus-visible'?!!this.keyboardFocus:s==='[hidden]'?this.hidden:s==='[title]'?this.hasAttribute('title'):s==='[data-tooltip]'?!!this.dataset.tooltip:s==='[data-item-icon]'?!!this.dataset.itemIcon:s==='[data-help-hold="true"]'?this.dataset.helpHold==='true':s==='button[aria-label]'?this.tagName==='button'&&this.hasAttribute('aria-label'):s==='dialog[open]'?this.tagName==='dialog'&&this.open:s.startsWith('#')?this.id===s.slice(1):false);}
 closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)||null;}
 querySelector(selector){return this.children.find(c=>c.matches(selector))||this.children.map(c=>c.querySelector(selector)).find(Boolean)||null;}
 getBoundingClientRect(){return this.id==='gameTooltip'?{left:0,top:0,width:230,height:58}:{...this.rect,bottom:this.rect.top+this.rect.height};}
}
const events=new Map(),windowEvents=new Map(),document={body:new Element('body'),createElement:tag=>new Element(tag),addEventListener(type,fn,capture=false){const list=events.get(type)||[];list.push({fn,capture});events.set(type,list);}};
const window={innerWidth:320,innerHeight:180,addEventListener:(type,fn)=>windowEvents.set(type,fn),visualViewport:{width:320,height:180,offsetLeft:0,offsetTop:0,addEventListener(){}}};
let now=0,next=1;const timers=new Map();
function advance(ms){const until=now+ms;for(let guard=0;guard<1000;guard++){const task=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>until)break;now=task[1].at;timers.delete(task[0]);task[1].fn();}now=until;}
const ctx={document,window,console,setTimeout(fn,ms){const id=next++;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};vm.createContext(ctx);vm.runInContext(fs.readFileSync('client/icon-tooltips.js','utf8'),ctx);
const tooltip=document.body.children[0];
function fire(type,target,extra={}){const e={target,pointerType:'mouse',clientX:288,clientY:139,pointerId:1,buttons:0,relatedTarget:null,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const {fn}of [...events.get(type)||[]].sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(e);if(e.stopped)break;}if(type==='click'&&!e.stopped)target.onclick?.(e);return e;}
function button(title){const b=new Element('button');b.title=title;b.setAttribute('aria-label',title);document.body.appendChild(b);return b;}

const settings=button('Settings');settings.dataset.helpHold='true';settings.setAttribute('aria-describedby','existing-help');
fire('pointerover',settings);advance(179);assert(tooltip.hidden);advance(1);assert.equal(tooltip.textContent,'Settings');assert(!tooltip.hidden);assert(!settings.hasAttribute('title'),'native tooltip is suppressed while custom help is visible');
assert.equal(settings.getAttribute('aria-describedby'),'existing-help gameTooltip');assert(parseInt(tooltip.style.left)+230<=314);assert(parseInt(tooltip.style.top)+58<=174,'tooltip fits the mobile-size viewport');
settings.title='Run energy: 72%';advance(150);assert.equal(tooltip.textContent,'Run energy: 72%','dynamic HUD text refreshes');
fire('pointerout',settings);assert(tooltip.hidden);assert.equal(settings.title,'Run energy: 72%');assert.equal(settings.getAttribute('aria-describedby'),'existing-help');

settings.dataset.tooltip='Woodcutting\nCurrent XP: 120\n54 XP to level 3';settings.keyboardFocus=true;fire('focusin',settings);advance(180);assert.equal(tooltip.textContent,settings.dataset.tooltip);fire('keydown',settings,{key:'Escape'});assert(tooltip.hidden);
const modal=new Element('dialog');modal.open=true;document.body.appendChild(modal);const spell=button('Fire strike');modal.appendChild(spell);fire('pointerover',spell);advance(180);assert.equal(tooltip.parentElement,modal,'tooltip is visible in the dialog top layer');spell.remove();advance(150);assert(tooltip.hidden,'removed panel cannot leave stale help visible');

let clicks=0;settings.onclick=()=>clicks++;fire('pointerdown',settings,{pointerType:'touch'});advance(499);fire('pointerup',settings,{pointerType:'touch'});fire('click',settings);assert.equal(clicks,1,'ordinary taps still activate');
fire('pointerdown',settings,{pointerType:'touch'});advance(500);assert(!tooltip.hidden);assert(fire('contextmenu',settings).defaultPrevented,'phone hold avoids the browser callout');fire('pointerup',settings,{pointerType:'touch'});const heldClick=fire('click',settings);assert(heldClick.defaultPrevented);assert.equal(clicks,1,'hold-to-read does not accidentally activate a tab');advance(2200);assert(tooltip.hidden);
fire('pointerdown',settings,{pointerType:'touch'});advance(100);fire('pointermove',settings,{pointerType:'touch',clientX:270,clientY:139});advance(600);assert(tooltip.hidden,'dragging cancels the hold');fire('pointercancel',settings,{pointerType:'touch'});

const item=button('Bronze arrows');item.dataset.helpHold='true';const canvas=new Element('canvas');canvas.dataset.itemIcon='arrows';item.appendChild(canvas);let itemActions=0;item.onclick=()=>itemActions++;
fire('pointerdown',item,{pointerType:'touch'});advance(700);assert(tooltip.hidden);assert(!fire('contextmenu',item).defaultPrevented,'item long-press menu is untouched');fire('pointerup',item,{pointerType:'touch'});fire('click',item);assert.equal(itemActions,1);
const world=new Element('canvas');document.body.appendChild(world);fire('pointerdown',world,{pointerType:'touch'});advance(700);assert(tooltip.hidden);assert(!fire('contextmenu',world).defaultPrevented,'world/player action menus are untouched');
const safe=button('<img src=x onerror=alert(1)>');fire('pointerover',safe);advance(180);assert.equal(tooltip.textContent,safe.getAttribute('aria-label'),'player/item labels remain plain text');windowEvents.get('blur')();assert(tooltip.hidden);
console.log('PASS: timed hover, live labels, keyboard focus, viewport bounds, modal layer, stale panel cleanup, touch tap/hold/drag, native callout handling, item/world menu preservation and plain-text labels.');
