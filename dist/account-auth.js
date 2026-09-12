'use strict';
let accountUsername='',loginMode='choose',loginResolve=null;
function renderLogin(){const choice=loginMode==='choose',signup=loginMode==='register';$('loginChoice').hidden=!choice;$('loginForm').hidden=choice;$('loginSwitch').hidden=choice;$('loginNote').hidden=choice;$('loginTitle').textContent=choice?'Enter Emberfall':signup?'Create your account':'Log in';$('loginSubmit').textContent=signup?'Create account':'Log in';$('loginPassword').autocomplete=signup?'new-password':'current-password';$('loginPassword').minLength=5;$('loginPassword').placeholder='At least 5 characters';$('loginSwitch').textContent='Back';$('loginError').textContent='';}
function chooseLoginMode(mode){if(!['choose','register','login'].includes(mode)||$('loginSubmit').disabled)return;loginMode=mode;renderLogin();if(mode!=='choose')$('loginUsername').focus();}
async function ensureGameLogin(){
 const response=await fetch('/api/auth/session',{cache:'no-store'});if(!response.ok)throw new Error('Login unavailable');const data=await response.json();
 if(data.account){accountUsername=data.account.username;return;}
 $('loading').hidden=true;$('loginScreen').showModal();renderLogin();
 return new Promise(resolve=>{loginResolve=resolve;});
}
async function submitGameLogin(event){event.preventDefault();if(!['register','login'].includes(loginMode)||$('loginSubmit').disabled)return;const password=$('loginPassword').value;if(password.length<5){$('loginError').textContent='Your password must be at least 5 characters.';return;}
 $('loginSubmit').disabled=true;$('loginError').textContent='';
 try{const response=await fetch('/api/auth/'+loginMode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('loginUsername').value,password})});const data=await response.json();if(!response.ok){$('loginError').textContent=data.error||'Unable to sign in.';return;}accountUsername=data.account.username;$('loginPassword').value='';$('loginScreen').close();$('loading').hidden=false;loginResolve?.();loginResolve=null;}catch{$('loginError').textContent='Cannot reach the server. Please retry.';}finally{$('loginSubmit').disabled=false;}
}
async function logoutGame(){stop();await flushCloudSave();if(cloudDirty||cloudBusy)return;const response=await fetch('/api/auth/logout',{method:'POST'});if(response.ok){cloudReady=false;location.reload();}}
