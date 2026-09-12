'use strict';
window.realmTrade=null;
const TRADE_QUANTITIES=[1,5,10,'X','All'];
function tradeAmount(){const t=window.realmTrade;return !t?1:t.quantity==='All'?Infinity:t.quantity==='X'?Math.max(1,Math.floor(Number(t.custom)||1)):t.quantity;}
function tradeVerb(side){return window.realmTrade.kind==='bank'?(side==='bag'?'Deposit':'Withdraw'):(side==='bag'?'Sell':'Buy');}
function spareItemCount(id){const item=ITEMS[id];return Math.max(0,(item?.slot?s.gear[id]||0:s.bag[id]||0)-(item?.slot&&s.equipment[item.slot]===id?1:0));}
function shopUnitPrice(id){const row=shopStock.find(row=>row[0]===id);return row?Math.max(1,Math.ceil(row[2]/row[1])):null;}
function shopSalePrice(id){
 if(shopPrices[id])return shopPrices[id];const buy=shopUnitPrice(id);if(buy)return Math.max(1,Math.floor(buy/2));
 return ITEMS[id]?.value||{bronzeSword:3,ironSword:24,shortbow:8,oakStaff:10,leatherArmor:12,leatherBoots:5,rawTrout:1,ironBar:6,arrowheads:1,ashes:1}[id]||0;
}
function endTrade(){
 if(!window.realmTrade)return;window.realmTrade=null;document.body.classList.remove('trade-open');$('modal').classList.remove('trade-window');
 $('closeModal').textContent='Back to adventure';$('closeModal').setAttribute('aria-label','Back to adventure');$('modal').removeAttribute('aria-label');
 document.querySelectorAll('[data-tab]').forEach(b=>b.disabled=false);
 syncPanelButton();
}
function openTrade(kind){
 stop();if($('modal').open)$('modal').close();
 window.realmTrade={kind,quantity:1,custom:10,search:'',filter:'all',notice:''};
 document.body.classList.add('panels-open','trade-open');$('gameDock').hidden=false;tab='bag';panelPage=0;syncTabs();
 document.querySelectorAll('[data-tab]').forEach(b=>b.disabled=b.dataset.tab!=='bag');
 syncPanelButton();
 $('modal').classList.add('trade-window');$('modal').setAttribute('aria-label',kind==='bank'?'Briarhaven Bank':'Mara’s General Store');
 $('closeModal').textContent='×';$('closeModal').setAttribute('aria-label',kind==='bank'?'Close bank window':'Close shop window');
 const title=kind==='bank'?'Bank of Briarhaven':'Mara’s General Store';
 $('modalBody').innerHTML='<div class="trade-heading"><span class="trade-emblem" aria-hidden="true">'+(kind==='bank'?'▣':'◈')+'</span><div><h2>'+title+'</h2><p id="tradeSummary"></p></div></div>'+
  '<div class="trade-tools"><div class="trade-tabs" aria-label="Item category">'+[['all','All items'],['equipment','Equipment'],['supplies','Supplies']].map(([id,label])=>'<button type="button" data-trade-filter="'+id+'" aria-pressed="'+(id==='all')+'">'+label+'</button>').join('')+'</div><input id="tradeSearch" type="search" placeholder="Search '+kind+'…" aria-label="Search '+kind+'" autocomplete="off"></div>'+
  '<div class="trade-scroll"><div id="tradeGrid" class="trade-grid" aria-label="'+(kind==='bank'?'Stored items':'Shop stock')+'"></div><p id="tradeEmpty" hidden></p></div>'+
  '<div class="trade-bottom"><p id="tradeNotice" role="status"></p><div class="trade-controls"><div class="trade-quantity" role="group" aria-label="Transaction quantity"><span>Quantity</span>'+TRADE_QUANTITIES.map(q=>'<button type="button" data-trade-quantity="'+q+'" aria-pressed="'+(q===1)+'">'+q+'</button>').join('')+'<input id="tradeCustom" type="number" min="1" max="1000000" step="1" value="10" aria-label="Custom quantity" hidden></div>'+(kind==='bank'?'<button id="depositInventory" type="button">Deposit bag</button>':'<span class="trade-wallet" id="tradeWallet"></span>')+'</div></div><div id="tradeItemMenu" role="menu" hidden></div>';
 $('tradeSearch').oninput=e=>{window.realmTrade.search=e.target.value;renderTradeContents();};
 $('modalBody').querySelectorAll('[data-trade-filter]').forEach(b=>b.onclick=()=>{window.realmTrade.filter=b.dataset.tradeFilter;renderTradeContents();});
 $('modalBody').querySelectorAll('[data-trade-quantity]').forEach(b=>b.onclick=()=>{const t=window.realmTrade;t.quantity=/^\d+$/.test(b.dataset.tradeQuantity)?Number(b.dataset.tradeQuantity):b.dataset.tradeQuantity;$('tradeCustom').hidden=t.quantity!=='X';if(t.quantity==='X')$('tradeCustom').focus();renderUI();});
 $('tradeCustom').oninput=e=>{if(window.realmTrade)window.realmTrade.custom=e.target.value;renderInventory();renderTradeContents();};
 if(kind==='bank')$('depositInventory').onclick=depositInventory;
 $('modal').show();renderUI();
}
function renderTradeContents(){
 const t=window.realmTrade;if(!t)return;const grid=$('tradeGrid');if(!grid)return;
 const bank=t.kind==='bank',entries=bank?Object.entries(s.bank||{}).filter(([id,n])=>ITEMS[id]&&n>0):shopStock.map(([id])=>[id,Infinity]);
 const rows=entries.filter(([id])=>(!t.search||ITEMS[id].name.toLowerCase().includes(t.search.toLowerCase()))&&(t.filter==='all'||(t.filter==='equipment'?!!ITEMS[id].slot:!ITEMS[id].slot)));
 $('tradeSummary').textContent=bank?entries.length+' stored item types · '+s.gold+' coins':s.gold+' coins · Buy from the shop, sell from your bag';
 $('modalBody').querySelectorAll('[data-trade-filter]').forEach(b=>b.setAttribute('aria-pressed',String(t.filter===b.dataset.tradeFilter)));
 $('modalBody').querySelectorAll('[data-trade-quantity]').forEach(b=>b.setAttribute('aria-pressed',String(t.quantity.toString()===b.dataset.tradeQuantity)));
 grid.replaceChildren();
 for(const [id,count]of rows){
  const button=document.createElement('button');button.type='button';button.className='trade-slot';button.appendChild(itemCanvas(id));
  const qty=document.createElement('b');qty.textContent=bank?formatTradeCount(count):'∞';button.appendChild(qty);
  if(!bank){const cost=document.createElement('small');cost.textContent=shopUnitPrice(id)+' gp'+(ITEMS[id].requirements?' · '+Object.entries(ITEMS[id].requirements).map(([k,n])=>k.slice(0,3)+' '+n).join(' / '):'');button.appendChild(cost);}
  button.title=ITEMS[id].name+(bank?' · '+count:' · '+shopUnitPrice(id)+' coins each');bindItemPress(button,id,false,'stock');grid.appendChild(button);
 }
 const emptyCount=Math.max(0,(bank?40:24)-rows.length);for(let i=0;i<emptyCount;i++){const empty=document.createElement('span');empty.className='trade-slot trade-empty-slot';empty.setAttribute('aria-hidden','true');grid.appendChild(empty);}
 $('tradeEmpty').hidden=!!rows.length;$('tradeEmpty').textContent=entries.length?'No matching items.':bank?'Your bank is empty. Tap an item in your bag to store it.':'No stock available.';
 $('tradeNotice').textContent=t.notice||(bank?'Tap bag items to deposit. Tap stored items to withdraw.':'Tap stock to buy. Tap bag items to sell. Hold an item for prices and quantities.');
 if(bank)$('depositInventory').disabled=inventorySlots().length===0;else $('tradeWallet').textContent=s.gold+' coins';
 paintItemIcons(grid);
}
function formatTradeCount(count){return count>=1000000?(Math.floor(count/100000)/10)+'m':count>=10000?Math.floor(count/1000)+'k':String(count);}
function tradeItemLabel(id,side){const t=window.realmTrade,q=t.quantity==='X'?Math.max(1,Math.floor(Number(t.custom)||1)):t.quantity;return tradeVerb(side)+' '+q+' '+ITEMS[id].name+(t.kind==='shop'?' for '+(side==='bag'?shopSalePrice(id):shopUnitPrice(id))+' coins each':'')+'. Hold for more options.';}
function tradeItemAction(id,side,amount=tradeAmount()){
 const t=window.realmTrade;if(!t)return false;const verb=tradeVerb(side),item=ITEMS[id];if(!item)return false;
 let moved=0,price=0;
 if(t.kind==='bank')moved=transferBank(id,side==='stock',amount);
 else if(side==='bag'){price=shopSalePrice(id);if(!price){t.notice='Mara does not buy '+item.name+'.';renderTradeContents();return false;}moved=sell(id,price,amount);}
 else{
  price=shopUnitPrice(id);if(!price)return false;
  const room=STACKABLE.has(id)?(canCarry(id)?Infinity:0):bagSpaceFor(id),quantity=Math.min(amount,Math.floor(s.gold/price),room);
  if(quantity>0&&buySupply(id,quantity,quantity*price))moved=quantity;
  else t.notice=s.gold<price?'You need '+price+' coins to buy '+item.name+'.':'Your bag is full.';
 }
 if(moved){t.notice=({Deposit:'Deposited',Withdraw:'Withdrew',Buy:'Bought',Sell:'Sold'})[verb]+' '+moved+' × '+item.name+(price?' for '+(moved*price)+' coins':'')+'.';}
 else if(t.kind==='bank')t.notice=side==='stock'?'Make room in your bag to withdraw this item.':'There are no unworn items of that type in your bag.';
 $('tradeItemMenu').hidden=true;renderTradeContents();return moved||false;
}
function depositInventory(){
 let moved=0;for(const id of Object.keys(ITEMS))moved+=transferBank(id,false,Infinity,false)||0;
 if(!moved)return;window.realmTrade.notice='Deposited '+moved+' items from your bag.';renderUI();save();
}
function showTradeItemMenu(id,side,anchor){
 const t=window.realmTrade;if(!t)return;const menu=$('tradeItemMenu');menu.replaceChildren();
 const title=document.createElement('strong');title.textContent=ITEMS[id].name;menu.appendChild(title);
 if(t.kind==='shop'){const price=side==='bag'?shopSalePrice(id):shopUnitPrice(id),line=document.createElement('small');line.textContent=price?price+' coins each':"Mara doesn't buy this item";menu.appendChild(line);}
 for(const q of [1,5,10,'All']){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=tradeVerb(side)+' '+q;b.onclick=()=>tradeItemAction(id,side,q==='All'?Infinity:q);menu.appendChild(b);}
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.setAttribute('role','menuitem');cancel.onclick=()=>{menu.hidden=true;anchor.focus();};menu.appendChild(cancel);
 menu.hidden=false;const rect=anchor.getBoundingClientRect(),width=200,height=menu.offsetHeight;
 menu.style.left=Math.max(8,Math.min(window.innerWidth-width-8,rect.left-width+rect.width))+'px';menu.style.top=Math.max(8,Math.min(window.innerHeight-height-8,rect.top))+'px';menu.querySelector('button')?.focus();
}
document.addEventListener('pointerdown',e=>{const menu=$('tradeItemMenu');if(menu&&!menu.hidden&&!menu.contains(e.target))menu.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!window.realmTrade)return;e.preventDefault();const menu=$('tradeItemMenu');if(menu&&!menu.hidden)menu.hidden=true;else close();});
