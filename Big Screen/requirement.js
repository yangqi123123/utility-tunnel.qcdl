(function () {
  const source = document.getElementById('requirementDocument');
  if (!source || !(source instanceof HTMLTemplateElement)) return;

  const fragment = source.content.cloneNode(true);
  const hasMeaningfulContent = (section) => {
    section.querySelectorAll('tbody tr').forEach((row) => {
      const values = [...row.cells].map((cell) => cell.textContent.trim());
      if (!values.some(Boolean)) row.remove();
    });
    section.querySelectorAll('table').forEach((table) => {
      if (!table.querySelector('tbody tr')) table.remove();
    });
    const body = section.querySelector('.requirement-section-body') || section;
    return body.textContent.replace(/\s+/g, '').length > 0 || Boolean(body.querySelector('img, video'));
  };

  fragment.querySelectorAll('[data-requirement-section]').forEach((section) => {
    if (!hasMeaningfulContent(section)) section.remove();
  });
  if (!fragment.querySelector('[data-requirement-section]')) return;

  const root = document.createElement('div');
  root.className = 'requirement-widget';
  root.innerHTML = `
    <button class="requirement-trigger" type="button" aria-label="打开需求说明" aria-haspopup="dialog" aria-controls="requirementModal" aria-expanded="false">
      <i class="fa-solid fa-book-open" aria-hidden="true"></i>
      <span class="requirement-tooltip" role="tooltip">需求说明</span>
    </button>
    <div class="requirement-modal" id="requirementModal" role="dialog" aria-modal="true" aria-labelledby="requirementDialogTitle" hidden>
      <div class="requirement-dialog">
        <header class="requirement-dialog-head">
          <h2 id="requirementDialogTitle">需求说明</h2>
          <button class="requirement-close" type="button" aria-label="关闭需求说明">&times;</button>
        </header>
        <div class="requirement-dialog-body"></div>
      </div>
    </div>`;
  root.querySelector('.requirement-dialog-body').appendChild(fragment);
  document.body.appendChild(root);

  const trigger = root.querySelector('.requirement-trigger');
  const modal = root.querySelector('.requirement-modal');
  const closeButton = root.querySelector('.requirement-close');
  const open = () => {
    modal.hidden = false;
    document.body.classList.add('requirement-open');
    trigger.setAttribute('aria-expanded', 'true');
    closeButton.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('requirement-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
}());
