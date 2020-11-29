function showTab() {
  var creating = browser.tabs.create({
    url:"content_scripts/bmlist.html"
  });
}

browser.browserAction.onClicked.addListener(showTab);