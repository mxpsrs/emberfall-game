'use strict';
document.getElementById('editorLogin').addEventListener('submit',async event=>{
 event.preventDefault();const button=document.getElementById('submit'),error=document.getElementById('error');button.disabled=true;error.textContent='';
 try{
  const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value,password:document.getElementById('password').value})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Sign in failed.');
  const access=await fetch('/api/editor/access',{cache:'no-store'});if(!access.ok)throw Error((await access.json()).error||'Owner access required.');
  location.replace('/editor/');
 }catch(e){error.textContent=e.message;}finally{button.disabled=false;document.getElementById('password').value='';}
});
