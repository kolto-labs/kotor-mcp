(function () {
  try {
    var saved = localStorage.getItem('kq-theme');
    var theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
