'use strict';
let accountUsername='',loginMode='login',loginResolve=null;
function renderLogin(){const signup=loginMode==='register';$('loginTitle').textContent=signup?'Create your account':'Welcome back';$('loginSubmit').textContent=signup?'Create account':'Log in';$('loginPassword').autocomplete=signup?'new-password':'current-password';$('loginConfirmField').hidden=!signup;$('loginConfirm').required=signup;$('loginSwitch').textContent=signup?'Already registered? Log in':'New player? Create an account';$('loginError').textContent='';}
async function ensureGameLogin(){
 const response=await fetch('/api/auth/session',{cache:'no-store'});if(!response.ok)throw new Error('Login unavailable');const data=await response.json();
 if(data.account){accountUsername=data.account.username;return;}
 $('loading').hidden=true;$('loginScreen').showModal();renderLogin();
 return new Promise(resolve=>{loginResolve=resolve;});
}
async function submitGameLogin(event){event.preventDefault();const password=$('loginPassword').value;if(loginMode==='register'&&password!==$('loginConfirm').value){$('loginError').textContent='Passwords do not match.';return;}
 $('loginSubmit').disabled=true;$('loginError').textContent='';
 try{const response=await fetch('/api/auth/'+loginMode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('loginUsername').value,password})});const data=await response.json();if(!response.ok){$('loginError').textContent=data.error||'Unable to sign in.';return;}accountUsername=data.account.username;$('loginPassword').value='';$('loginConfirm').value='';$('loginScreen').close();$('loading').hidden=false;loginResolve?.();loginResolve=null;}catch{$('loginError').textContent='Cannot reach the server. Please retry.';}finally{$('loginSubmit').disabled=false;}
}
async function logoutGame(){stop();await flushCloudSave();if(cloudDirty||cloudBusy)return;const response=await fetch('/api/auth/logout',{method:'POST'});if(response.ok){cloudReady=false;location.reload();}}
