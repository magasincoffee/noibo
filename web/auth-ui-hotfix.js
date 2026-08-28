/* MAGASIN Auth UI hardening
 * Loaded before app.js. Uses capture-phase handlers so the legacy login
 * password listener cannot overwrite the SVG eye button with text characters.
 */
(function(window, document){
  'use strict';

  const EYE_ON = '<svg class="icon-eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  const EYE_OFF = '<svg class="icon-eye-off" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17.4 17.4 0 0 1-3.1 3.7M6.3 6.5C3.5 8.4 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function renderEye(button, visible){
    button.innerHTML = visible ? EYE_OFF : EYE_ON;
    button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    button.setAttribute('title', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    const wrap = button.closest('.password-wrap');
    if (wrap) wrap.classList.toggle('is-visible', visible);
  }

  function toggleFromButton(event){
    const button = event.target && event.target.closest ? event.target.closest('[data-password-toggle]') : null;
    if (!button) return;

    // Capture phase prevents the older app.js listener from replacing the SVG
    // markup with the legacy ◉ / ◌ characters.
    event.preventDefault();
    event.stopImmediatePropagation();

    const wrap = button.closest('.password-wrap');
    const input = wrap && wrap.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    renderEye(button, !visible);
    input.focus({preventScroll:true});
  }

  function init(){
    document.addEventListener('click', toggleFromButton, true);
    document.querySelectorAll('[data-password-toggle]').forEach(function(button){
      renderEye(button, false);
    });

    // Better native validation messages for the three auth flows.
    document.querySelectorAll('#loginForm,#registerForm,#forgotForm,#resetForm').forEach(function(form){
      form.addEventListener('invalid', function(event){
        const input = event.target;
        if (!input || !input.matches('input')) return;
        input.classList.add('input-error');
      }, true);

      form.addEventListener('input', function(event){
        const input = event.target;
        if (input && input.matches('input')) input.classList.remove('input-error');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})(window, document);
