# ExBmSearch

## What it does - ExBmSearchの機能 ##

The extension includes:

* a browser action including HTML, CSS, and JS
* a background script
* a content script
* three images, packaged as web accessible resources

When the user clicks the browser action button, the background script injects a content script into the new opened tab.  
ブラウザーのメニューバーに表示される[ExBmSearch]アイコンをクリックするとタブが開きます。

When the user chooses a bookmark file(.json), the extension reads the file and get the bookmark data.  
ブックマークファイルを選択するとファイルからブックマークデータを取得します。

The content script replaces the current page content with a tag list, a bookmark folder list and a linked bookmark list.  
ブックマークデータを取得するとタグ一覧とブックマークフォルダー一覧およびリンクするブックマークファイルの一覧を表示します。

Note that:

* See [HERE](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Installing) to know how to install this extension with "Load Temporary Add-on".   
この拡張機能をインストールするには [こちら](https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Installing)を参考に「"一時的なアドオンを読み込む" 」で使用してください。

* Please tag each bookmarks in advance. See [HERE](https://support.mozilla.org/en-US/kb/categorizing-bookmarks-make-them-easy-to-find) to know how to tag bookmarks.  
前もって各ブックマークにタグを設定しておいてください。ブックマークにタグを設定する方法は[こちら](https://support.mozilla.org/ja/kb/categorizing-bookmarks-make-them-easy-to-find)を参照してください。

* Please export the latest bookmark file in advance. See [HERE](https://support.mozilla.org/en-US/kb/export-firefox-bookmarks-to-backup-or-transfer) to know how to export it.  
前もって最新のブックマークファイルをエクスポートしておいてください。ブックマークファイルをエクスポートは[こちら](https://support.mozilla.org/ja/kb/restore-bookmarks-from-backup-or-move-them)を参照してください。