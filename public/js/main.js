// Yan menu (sidebar) ac/kapa - mobil
(function () {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!toggle || !sidebar) return;
  function close() { sidebar.classList.remove('open'); if (overlay) overlay.classList.remove('show'); }
  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });
  if (overlay) overlay.addEventListener('click', close);
})();

// Silme islemleri icin onay penceresi
document.addEventListener('submit', function (e) {
  var form = e.target.closest('.js-confirm');
  if (form) {
    var message = form.getAttribute('data-confirm') || 'Emin misiniz?';
    if (!window.confirm(message)) {
      e.preventDefault();
    }
  }
});

// Flash mesajlarini 5 saniye sonra otomatik gizle
window.addEventListener('DOMContentLoaded', function () {
  var flash = document.querySelector('.container > .flash');
  if (flash) {
    setTimeout(function () {
      flash.style.transition = 'opacity 0.5s';
      flash.style.opacity = '0';
      setTimeout(function () { flash.remove(); }, 500);
    }, 5000);
  }
});
