// Hamburger menu toggle
(function () {
  const btn = document.querySelector('.hamburger-toggle');
  const nav = document.querySelector('.site-nav');
  if (!btn || !nav) return;

  const icon = btn.querySelector('.material-symbols-outlined');

  function open() {
    nav.classList.add('nav-open');
    btn.setAttribute('aria-expanded', 'true');
    if (icon) icon.textContent = 'close';
  }

  function close() {
    nav.classList.remove('nav-open');
    btn.setAttribute('aria-expanded', 'false');
    if (icon) icon.textContent = 'menu';
  }

  btn.addEventListener('click', function () {
    nav.classList.contains('nav-open') ? close() : open();
  });

  // Close on click outside header
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('nav-open') && !e.target.closest('.site-header')) {
      close();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
      close();
    }
  });
})();

// Nav dropdown toggle (mobile tap, desktop uses CSS :hover)
(function () {
  var dropdown = document.querySelector('.nav-dropdown');
  var trigger = document.querySelector('.nav-dropdown-trigger');
  if (!dropdown || !trigger) return;

  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    dropdown.classList.toggle('dropdown-open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown')) {
      dropdown.classList.remove('dropdown-open');
    }
  });
})();
