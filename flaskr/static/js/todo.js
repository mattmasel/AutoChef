/* Remind before leaving unsaved issue edits. All saves use normal HTML forms. */
(() => {
  let dirty = false;
  const editor = document.getElementById('issue-editor');
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('input', () => {
      dirty = true;
      if (form === editor) document.getElementById('save-status').textContent = 'Unsaved changes — save before switching issues.';
    });
    form.addEventListener('submit', () => { dirty = false; });
  });
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
})();
