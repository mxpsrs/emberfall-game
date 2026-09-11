'use strict';
const touchPlay=()=>window.matchMedia('(pointer: coarse)').matches;
const isPlayFullscreen=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
const standalonePlay=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
let playFullscreenAttempted=false;
function syncPlayDisplay(){const active=isPlayFullscreen()||standalonePlay();$('fullscreenButton').textContent=active?'Exit fullscreen':touchPlay()?'Play fullscreen':'Fullscreen';$('fullscreenButton').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');$('fullscreenButton').hidden=standalonePlay()&&!isPlayFullscreen();$('rotateFullscreen').hidden=active;document.body.classList.toggle('fullscreen-play',active);$('legend').textContent=touchPlay()?'Tap to walk · Two fingers to rotate and zoom':'Click to walk · Drag to rotate · Scroll to zoom · WASD to move · F fullscreen';updateOrientation();}
function fullscreenUnavailable(){const message='This browser keeps its address bar visible. The game fills the available screen. For a fullscreen launch on iPhone, use Safari’s Share menu → Add to Home Screen → Open as Web App, if offered.';$('displayNotice').textContent=message;$('displayNotice').hidden=false;$('rotateFullscreenNote').textContent=message;}
async function enterPlayFullscreen(){playFullscreenAttempted=true;if(isPlayFullscreen()||standalonePlay())return;const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request){fullscreenUnavailable();return;}try{await request.call(root,{navigationUI:'hide'});$('displayNotice').hidden=true;$('rotateFullscreenNote').textContent='';if(touchPlay()&&window.screen?.orientation?.lock)try{await window.screen.orientation.lock('landscape');}catch{}syncPlayDisplay();}catch{fullscreenUnavailable();}}
async function togglePlayFullscreen(){if(isPlayFullscreen()){const exit=document.exitFullscreen||document.webkitExitFullscreen;try{await exit.call(document);}catch{}syncPlayDisplay();}else await enterPlayFullscreen();}
$('fullscreenButton').addEventListener('click',togglePlayFullscreen);$('rotateFullscreen').addEventListener('click',enterPlayFullscreen);
// The initial play gesture supplies the browser's required user activation.
function mobilePlayGesture(){if(touchPlay()&&!playFullscreenAttempted)enterPlayFullscreen();}
$('world').addEventListener('pointerdown',mobilePlayGesture,{capture:true});$('begin').addEventListener('click',mobilePlayGesture);
document.addEventListener('fullscreenchange',syncPlayDisplay);document.addEventListener('webkitfullscreenchange',syncPlayDisplay);
window.visualViewport?.addEventListener('resize',()=>{requestAnimationFrame(()=>{if(typeof resize==='function')resize();});});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,textarea,select,[contenteditable]')||$('creator').open||$('modal').open||$('spiritsDialog').open)return;if(e.key.toLowerCase()==='f'){e.preventDefault();togglePlayFullscreen();}});
syncPlayDisplay();
