// ==UserScript==
// @name Userscript loader for The FFZ Enhancing Add-On
// @description Allows you to use The FFZ Enhancing Add-On as a userscript
// @icon https://tester798.github.io/ffzenhancing/images/icon128.png
// @match *://*.twitch.tv/*
// @run-at document-start
// ==/UserScript==

(() => {
    var __ffzenhancing_base_url = localStorage.ffzenhancingDebugMode == 'true' ? 'http://localhost:8001/' : 'https://tester798.github.io/ffzenhancing/';
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `var __ffzenhancing_base_url = '${__ffzenhancing_base_url}';`;
    document.documentElement.appendChild(script);
    script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = __ffzenhancing_base_url + 'ffzenhancing.js';
    document.documentElement.appendChild(script);
})();