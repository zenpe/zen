document.addEventListener('DOMContentLoaded', function() {
    // 检查Busuanzi是否已加载
    function isBusuanziLoaded() {
      return typeof busuanzi !== 'undefined' && 
             typeof busuanzi.fetch !== 'undefined';
    }
    
    // 显示网站统计元素
    function showSiteStats() {
      const siteContainers = document.querySelectorAll('[id^="busuanzi_container_site_"]');
      siteContainers.forEach(function(container) {
        container.style.display = 'inline';
      });
    }
    
    // 加载Busuanzi脚本
    function loadBusuanzi() {
      if (!isBusuanziLoaded()) {
        var script = document.createElement('script');
        script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
        script.async = true;
        // 添加错误处理
        script.onerror = function() {
          console.warn('Busuanzi script failed to load');
          // 即使加载失败也显示容器元素
          showSiteStats();
        };
        document.head.appendChild(script);
      }
    }
    
    // 立即尝试加载脚本
    loadBusuanzi();
    
    // 检查Busuanzi是否加载完成
    var checkInterval = setInterval(function() {
      if (isBusuanziLoaded()) {
        clearInterval(checkInterval);
        showSiteStats();
      }
    }, 100);
    
    // 超时处理（5秒后停止检查）
    setTimeout(function() {
      clearInterval(checkInterval);
      showSiteStats();
    }, 5000);
  });