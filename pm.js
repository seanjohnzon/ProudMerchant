/* Proud Merchant: the one door to our database. The key below is the publishable
   one, made to be seen; the database decides who may read or write what. */
window.PM = window.PM || (function(){
  var URL = 'https://ecfscfmmgpefnpjqwbye.supabase.co';
  var KEY = 'sb_publishable_3frQgbkFaZt7nCgVhHqdbQ_IwDF7jQd';
  var sb = window.supabase.createClient(URL, KEY);
  function fail(e){ throw new Error((e && e.message) || 'Something went wrong.'); }
  return {
    rpc: function(name, body){ return sb.rpc(name, body || {}).then(function(r){ if (r.error) fail(r.error); return r.data; }); },
    session: function(){ return sb.auth.getSession().then(function(r){ return r.data.session; }); },
    signIn: function(email, password){ return sb.auth.signInWithPassword({ email: email, password: password }).then(function(r){ if (r.error) fail(r.error); return r.data.session; }); },
    signUp: function(email, password, name){ return sb.auth.signUp({ email: email, password: password, options: { data: { name: name } } }).then(function(r){ if (r.error) fail(r.error); if (!r.data.session) throw new Error('The account was made but could not be opened. Log in with your email and password.'); return r.data.session; }); },
    signOut: function(){ return sb.auth.signOut(); }
  };
})();
