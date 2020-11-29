let g_bookmark_num = 0;
let g_highlight_top = 0;
let g_highlight_word = "";
let g_arrAutocomplete = [];

const header = document.querySelector('header');
const section = document.querySelector('section');

// ファイルが選択された時に起動する関数を指定する
document.getElementById("selectFile").addEventListener("change", readFile, false);

// ---------------------------------------------------------------
// 関数定義 
// ---------------------------------------------------------------
// 1.ブックマークファイルを選択して読み込み一覧表を生成する。
function readFile() { 
    const file = this.files[0]; // 選択されたファイル
    const reader = new FileReader();
    const json = reader.readAsText(file);
    g_bookmark_num = 0
                    
    // ファイル読み込み開始時：スピナー（ロードが遅い場合表示）を追加する
    reader.onloadstart = function() {
        let card = document.getElementsByClassName("card-header");
        $(card).append('<div class="spinner d-flex align-items-center"><strong>Loading...</strong><div class="spinner-border ml-auto" role="status" aria-hidden="true"></div></div>');
    }

    // ファイル読み込み終了時：スピナーを削除する
    reader.onloadend = function() {
        let spinner = document.getElementsByClassName("spinner");
        $(spinner).remove();
    }

    // ファイル読み込み時：ブックマークファイル（.json）を読み込む
    reader.onload = function(e) {
        let lines = e.target.result;
        const jsonObj = JSON.parse(lines);

        // JSONから辞書（連想配列）を作る
        let dicTags = [];
        try {
            makeTagdic(jsonObj, dicTags);    
        }
        catch (e) {
            alert("Error : " + e.message);
            return false;
        }

        // 再描画のためのクリア
        header.innerHTML = "";
        section.innerHTML = "";

        // HTML書き出し
        showHeader(jsonObj, dicTags);
        showSection(dicTags);

        // イベント処理
        // タグ検索ボックス・ワードハイライト・フローティングボタン機能
        $( function() {
            // タグ検索ボックス
            $('#search').autocomplete({ // jqueryui
                // オートコンプリート
                source: function(request, response) {
                    //let matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i"); // 先頭が一致
                    let matcher = new RegExp(".*" + $.ui.autocomplete.escapeRegex(request.term) + ".*", "i"); // 部分一致
                    response($.grep(g_arrAutocomplete, function(item) {
                        return matcher.test(item);
                    }));
                },
                // 選択時自動で該当箇所にジャンプ
                select: function(event, ui) { 
                    let data = ui.item.value;
                    let pos = $("#" + data).offset().top;
                    $('html').animate({scrollTop: pos}, 3*1000);
                    return false;
                }
            });
    
            // ワードハイライト FireFoxのみ動作
            $("#highlight").keydown(function(e) {
                if(e.which == 13) { // Enter key
                    let word = $("#highlight").val();
                    if (g_highlight_word !== word) {
                        g_highlight_top = 0;
                        g_highlight_word = word;
                        browser.find.removeHighlighting();
                    }
                    if(word) {
                        browser.find.find(word, {includeRectData: true}).then(goto);    
                    }
                    return false;
                }
                if(e.which == 46) { // Delete key
                    $("#highlight").val("");
                    browser.find.removeHighlighting();
                    g_highlight_top = 0;
                    return false;
                }
                // ワードハイライト位置に飛ぶ
                function goto(results) {
                    console.log(`goto:There were: ${results.count} matches.`);
                    if (results.count > 0) {
                        browser.find.highlightResults();
                        for (rect of results.rectData) {
                            for (rectChild of rect.rectsAndTexts.rectList) {
                                // 検索ボックスには移動しない
                                if (g_highlight_top === 0) {
                                    g_highlight_top = rectChild.top;
                                    continue;
                                }
                                if (Math.floor(rectChild.top) > Math.floor(g_highlight_top)) {
                                    g_highlight_top = rectChild.top;
                                    let pos = rectChild.top;
                                    $('html').animate({scrollTop: pos}, 0.5*1000);
                                    return false;
                                }
                            }
                        }
                    }
                }
            });

            // フローティングボタン（トップへ移動する）
            $(window).on("scroll", function() {
                if ($(this).scrollTop() > 100) $('#fab').show();
                else $('#fab').hide();
            });
            $('#fab').click(function() {
                $('html').animate({scrollTop: 0}, 1*1000);
                return false;
            });
        } );
    }
}

// 2.readFileから呼び出される。ブックマークファイル（.json）の情報を保持する連想配列（dicTags）を生成する。
function makeTagdic(jsonObj, dicTags) {
    // タグ辞書を作る
    let bookmarks = jsonObj['children']; // ルートの子供
    for (let i = 0; i < bookmarks.length; i++) {
        let folders = bookmarks[i].children;
        if (folders) {
            for (let j = 0; j < folders.length; j++) {
                let arrFolders = [];
                switchByTypecode(folders[j], dicTags, arrFolders);
            }
        }
    }

    // 取得したタグ辞書をソート
    dicTags.sort(function(a, b) {
        // フォルダーをタグより上に表示する
        let flagA = a.folder;
        let flagB = b.folder;
        if (flagA < flagB) return 1; // 0より大きい場合、bをaより小さいインデックスにソート
        if (flagA > flagB) return -1; // 0未満の場合、aをbより小さいインデックスにソート

        // タイトル（フォルダー名・タグ名）の昇順にソートする
        let nameA = a.name;
        let nameB = b.name;
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        // URLの昇順にソートする
        let urlA = a.url.toUpperCase(); // 大文字と小文字を無視する
        let urlB = b.url.toUpperCase(); // 大文字と小文字を無視する
        if (urlA < urlB) return -1;
        if (urlA > urlB) return 1;

        return 0; // 0を返した場合、aとbは互いに変更せず、他のすべての要素に対してソート
    });
}

// 3.makeTagdicから呼び出される。JSONのURL要素まで下りブックマークの情報を取得する。
function switchByTypecode(folderObj, dicTags, arrFolders) {
    switch (folderObj.typeCode) {
        case 1: // bookmark "text/x-moz-place"
            if (!folderObj.uri.includes("place:")) { // "最近付けたタグ"と"よく見るページ"は含めない
                makeDictionary(folderObj, dicTags, arrFolders);
                arrFolders = [];
            }
            arrFolders = [];
            break;
        case 2: // folder "text/x-moz-place-container"
            arrFolders.push(folderObj.title);
            let folders = folderObj.children;
            if (folders) {
                for (let i = 0; i < folders.length; i++) {
                    switchByTypecode(folders[i], dicTags, arrFolders); // 再起呼び出し
                }
            }
            arrFolders.pop();
            break;
        case 3: // "text/x-moz-place-separator"
            break;
        default:
            break;
    }
}

// 4.switchByTypecodeから呼び出される。ブックマークファイル（.json）の情報を保持する連想配列（dicTags）を生成する。
function makeDictionary(jsonObj, dicTags, arrFolders) {
    g_bookmark_num = g_bookmark_num + 1;

    let strTags = jsonObj.tags;
    if (strTags) {
        let arrTags = strTags.split(",");
        arrTags.forEach(function(item){
            dicTags.push({name:item, title:jsonObj.title, url:jsonObj.uri, iconurl:jsonObj.iconuri, folder:0});
        })
    }

    // folder tag array があったらタグリストに追加 dicTagsにfolder:0/1を追加する
    if (arrFolders.length > 0) {
        arrFolders.forEach(function(item){
            dicTags.push({name:"F-" + item, title:jsonObj.title, url:jsonObj.uri, iconurl:jsonObj.iconuri, folder:1});
        })
    }
}

// 5.readFileから呼び出される。ヘッダー部分（<header>）書き出しを行う。
function showHeader(jsonObj, dicTags) {
    // +++++++++++++++++++++++++++++++
    // タイトル表示
    /* Bootstrap
    <div class="jumbotron jumbotron-fluid">
        <div class="container">
            <h1 class="display-4">Fluid jumbotron</h1>
            <p class="lead">This is a modified jumbotron that occupies the entire horizontal space of its parent.</p>
        </div>
    </div>
    */
    let elemDiv_Jumbo = document.createElement('div');
    elemDiv_Jumbo.setAttribute("class", "jumbotron jumbotron-fluid rounded border border-dark mb-3");
    let elemDiv_Container = document.createElement('div');
    elemDiv_Container.setAttribute("class", "container");

    let elemH1_Title = document.createElement('h1');
    elemH1_Title.setAttribute("class", "display-4 text-center");
    elemH1_Title.textContent = "ブックマーク一覧";

    // +++++++++++++++++++++++++++++++
    // ブックマーク数表示
    /* Font Awesome
    <span class="fa-layers fa-fw" style="background:MistyRose">
        <i class="fas fa-bookmark"></i>
        <span class="fa-layers-counter" style="background:Tomato">1,419</span>
    </span>*/
    let elemSpan_Image_layer = document.createElement('span');
    elemSpan_Image_layer.setAttribute("class", "fa-layers fa-fw ml-3");

    let elemI_ImageB = document.createElement('i');
    elemI_ImageB.setAttribute("class", "fas fa-bookmark");
    elemSpan_Image_layer.appendChild(elemI_ImageB);

    let elemSpan_Number = document.createElement('span');
    elemSpan_Number.textContent = g_bookmark_num;
    elemSpan_Number.setAttribute("class", "fa-layers-counter");
    elemSpan_Number.setAttribute("style", "background:Tomato");
    elemSpan_Image_layer.appendChild(elemSpan_Number);

    elemH1_Title.appendChild(elemSpan_Image_layer);
    elemDiv_Container.appendChild(elemH1_Title);

    // +++++++++++++++++++++++++++++++
    // 更新日時表示
    let elemP_Datetime = document.createElement('p');
    elemP_Datetime.setAttribute("class", "lead text-center");
    const dateAdded = new Date(Math.floor(jsonObj['dateAdded']/1000)); //下３桁を切り捨てる
    const lastModified = new Date(Math.floor(jsonObj['lastModified']/1000)); //下３桁を切り捨てる
    let options = {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false,
        timeZone: 'Asia/Tokyo' 
    };
    elemP_Datetime.textContent = '作成日時: ' + new Intl.DateTimeFormat('ja-JP', options).format(dateAdded) + ' ／ 更新日時: ' + new Intl.DateTimeFormat('ja-JP', options).format(lastModified);
    elemDiv_Container.appendChild(elemP_Datetime);

    elemDiv_Jumbo.appendChild(elemDiv_Container);
    header.appendChild(elemDiv_Jumbo);

    // +++++++++++++++++++++++++++++++
    // タグ検索ボックスを追加する
    let autocomplete = document.getElementsByTagName("header");
    $(autocomplete).append('<div class="ui-widget"><label class="mx-2 mt-4" for="search">タグ検索:</label><input id="search" placeholder="（例）a" size="30"></div>');

    // +++++++++++++++++++++++++++++++
    // ワードハイライトボックスを追加する（FireFoxのみ動作）
    let highlight = document.getElementsByTagName("header");
    $(highlight).append('<div class="ui-widget"><label class="mx-2 mt-3 mb-4" for="highlight">ワードハイライト:</label><input id="highlight" class="p-1" placeholder="（例）firefox" size="30"></div>');  
}

// 6.readFileから呼び出される。セクション部分（<section>）書き出しを行う。
function showSection(dicTags) {
    let elemBookmark = document.createElement('bookmarks');
    let elemUl_Taglist = document.createElement('ul');

    // +++++++++++++++++++++++++++++++
    // 書き出す（タグ一覧）
    /* Bootstrap
    <ul class="list-inline">
        <li class="list-inline-item"><button type="button" class="btn btn-secondary"><a>Secondary</a></button></li>
        <li class="list-inline-item">Phasellus iaculis</li>
        <li class="list-inline-item">Nulla volutpat</li>
    </ul>*/
    elemUl_Taglist.setAttribute("class", "list-inline");

    let lastTag = "";
    g_arrAutocomplete = [];
    dicTags.forEach(function(item, index, array) {
        if (lastTag !== item.name) {
            lastTag = item.name;
            g_arrAutocomplete.push(lastTag); // オートコンプリートソース（フォルダー名かタグ名の配列）

            let elemLi_Tag = document.createElement('li');
            elemLi_Tag.setAttribute("class", "list-inline-item m-2");

            let elemA_ToTag = document.createElement("a");
            let tagTitle;
            if (item.folder === 1) {
                tagTitle = document.createTextNode(lastTag.slice(2));
            }
            else tagTitle = document.createTextNode(lastTag);
            elemA_ToTag.appendChild(tagTitle);
            elemA_ToTag.setAttribute("href", "#" + lastTag);

            // folder=0 なら青 folder=1ならアウトライン
            if (item.folder === 1) {
                elemA_ToTag.setAttribute("class", "btn btn-outline-primary text-decoration-none");
            }
            else elemA_ToTag.setAttribute("class", "btn btn btn-primary text-decoration-none");
            
            elemLi_Tag.appendChild(elemA_ToTag);
            elemUl_Taglist.appendChild(elemLi_Tag);
        }
    })
    elemBookmark.appendChild(elemUl_Taglist);

    // +++++++++++++++++++++++++++++++
    // 書き出す（リンク一覧）
    /* Font Awesome <ul class="fa-ul">*/
    let elemUl_Bookmarks = document.createElement('ul');
    elemUl_Bookmarks.setAttribute("class", "fa-ul");
    lastTag = "";
    dicTags.forEach(function(item, index, array) {
        // +++++++++++++++++++++++++++++++
        // タイトルバー表示
        if (lastTag !== item.name) {
            lastTag = item.name;

            // +++++++++++++++++++++++++++++++
            // タイトルバー枠
            let elemLi_Tag = document.createElement('li');
            elemLi_Tag.setAttribute("id", "tag");
            // folder=0 ならタグ folder=1ならフォルダー
            if (item.folder === 1) {
                elemLi_Tag.setAttribute("class", "mt-5 p-3 border border-warning bg-light rounded");
            }
            else elemLi_Tag.setAttribute("class", "mt-5 p-3 bg-warning rounded");

            // +++++++++++++++++++++++++++++++
            // テーブル追加
            let elemDiv_Container = document.createElement('div');
            elemDiv_Container.setAttribute("class", "container");

            let elemDiv_Row = document.createElement('div');
            elemDiv_Row.setAttribute("class", "row ");

            // +++++++++++++++++++++++++++++++
            // アイコン
            let elemDiv_Col_Img = document.createElement('div');
            elemDiv_Col_Img.setAttribute("class", "col-1");
            // Font Awesome <i class="fas fa-tags"></i>
            let elemI_ImageT = document.createElement('i');
            // folder=0 ならタグ folder=1ならフォルダー
            if (item.folder === 1) {
                elemI_ImageT.setAttribute("class", "fas fa-folder-open fa-2x");
            }
            else elemI_ImageT.setAttribute("class", "fas fa-tags fa-2x");            
            elemDiv_Col_Img.appendChild(elemI_ImageT);
            elemDiv_Row.appendChild(elemDiv_Col_Img);

            // +++++++++++++++++++++++++++++++
            // タグ／フォルダー名
            let elemDiv_Col_Tag = document.createElement('div');
            elemDiv_Col_Tag.setAttribute("class", "col pl-0");
            let elemSpan_Tag = document.createElement('span');
            // folder=0 ならタグ folder=1ならフォルダー
            if (item.folder === 1) {
                elemSpan_Tag.textContent = 'フォルダー : ' + lastTag.slice(2);
            }
            else elemSpan_Tag.textContent = 'タグ : ' + lastTag;
            elemSpan_Tag.setAttribute("id", lastTag);
            elemDiv_Col_Tag.appendChild(elemSpan_Tag);
            elemDiv_Row.appendChild(elemDiv_Col_Tag);

            elemDiv_Container.appendChild(elemDiv_Row);
            elemLi_Tag.appendChild(elemDiv_Container);
            elemUl_Bookmarks.appendChild(elemLi_Tag);
        }

        // +++++++++++++++++++++++++++++++
        // ブックマークリスト表示
        let elemLi_Bookmark = document.createElement('li');
        elemLi_Bookmark.setAttribute("id", "bookmark");
        elemLi_Bookmark.setAttribute("class", "mt-3 ml-5");

        // リストマーカー
        /* Font Awesome <span class="fa-li"><i class="fas fa-check-square"></i></span>*/
        let elemSpan_ListMark = document.createElement('span');
        elemSpan_ListMark.setAttribute("class", "fa-li");
        let elemI_ImageM = document.createElement('i');
        elemI_ImageM.setAttribute("class", "fas fa-check-square");
        elemSpan_ListMark.appendChild(elemI_ImageM);
        elemLi_Bookmark.appendChild(elemSpan_ListMark);

        // リンク
        let elemA_Url = document.createElement("a");
        let bookmarkTitle = document.createTextNode(item.title);
        elemA_Url.appendChild(bookmarkTitle);
        elemA_Url.setAttribute("href", item.url);
        elemA_Url.setAttribute("target", "_blanc" );
        elemA_Url.setAttribute("rel", "noreferrer noopener" ); // https://developer.mozilla.org/ja/docs/Web/HTML/Element/a
        elemLi_Bookmark.appendChild(elemA_Url);

        // URL
        let elemSpan_Url = document.createElement('span');
        elemSpan_Url.setAttribute("class", "ml-1");
        /* urliconを取得して表示する（すべてアクセスし時間がかかるため使用しない）
        if (item.iconurl) { // <img src="..." class="mr-3" alt="...">
            let elemImg_ImageL = document.createElement('img');
            elemImg_ImageL.setAttribute("class", "mx-1");
            elemImg_ImageL.setAttribute("src", item.iconurl);
            elemImg_ImageL.setAttribute("width", "20px");
            elemImg_ImageL.setAttribute("height", "20px");
            elemImg_ImageL.setAttribute("alt", "🔗"); // 環境依存文字
            elemSpan_Url.appendChild(elemImg_ImageL);
        }
        else {
            // <i class="fas fa-link"></i> */
            let elemI_ImageL = document.createElement('i');
            elemI_ImageL.setAttribute("class", "fas fa-link mx-1");
            elemSpan_Url.appendChild(elemI_ImageL);
        /*}*/
        let bookmarkUrl = document.createTextNode(item.url);
        elemSpan_Url.appendChild(bookmarkUrl);
        elemLi_Bookmark.appendChild(elemSpan_Url);

        elemUl_Bookmarks.appendChild(elemLi_Bookmark);
    })

    elemBookmark.appendChild(elemUl_Bookmarks);
    section.appendChild(elemBookmark);
}
