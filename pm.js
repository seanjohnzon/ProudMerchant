/* Proud Merchant: the one door to our database. The key below is the publishable
   one, made to be seen; the database decides who may read or write what. */
window.PM = window.PM || (function(){
  var URL = 'https://ecfscfmmgpefnpjqwbye.supabase.co';
  var KEY = 'sb_publishable_3frQgbkFaZt7nCgVhHqdbQ_IwDF7jQd';
  var sb = window.supabase.createClient(URL, KEY);
  function fail(e){ throw new Error((e && e.message) || 'Something went wrong.'); }
  // SIT test door: account.html?t=<business code> opens that list with no login. Works only
  // while the database allows it (it does in SIT, not in UAT).
  var test = new URLSearchParams(location.search).get('t');
  try { if (test) sessionStorage.setItem('pm-test', test); else test = sessionStorage.getItem('pm-test'); } catch(e){}
  return {
    testCode: test || null,
    rpc: function(name, body){ return sb.rpc(name, body || {}).then(function(r){ if (r.error) fail(r.error); return r.data; }); },
    session: function(){ return sb.auth.getSession().then(function(r){ return r.data.session; }); },
    sendCode: function(email){ return sb.auth.signInWithOtp({ email: email }).then(function(r){ if (r.error) fail(r.error); }); },
    checkCode: function(email, code){ return sb.auth.verifyOtp({ email: email, token: code, type: 'email' }).then(function(r){ if (r.error) fail(r.error); return r.data.session; }); },
    signOut: function(){ return sb.auth.signOut(); }
  };
})();
