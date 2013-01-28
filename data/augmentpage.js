/* Funktionen
 * ========== */

/**
 * Fügt der Seite ein CSS hinzu, welches das Styling der G1Plus-Elemente
 * übernimmt.
 */
function addCSS(dataRoot) {
    var style = document.createElement('link');
    var head = document.getElementsByTagName('head')[0];
    style.type = 'text/css';
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('href', dataRoot + 'g1plus.css');
    head.appendChild(style);
}

/**
 * Erzeugt einen Container für Download-Links.
 *
 * @param id   Die id des Containers
 *
 * @return Der Container
 */
function createDownloadContainer(id) {
    var downloads = document.createElement('div');
    downloads.setAttribute('id', id)
    downloads.setAttribute('class', 'downloads g1plus');

    var heading = document.createElement('h4');
    heading.textContent = 'Downloads';
    downloads.appendChild(heading);

    return downloads;
}

function setDuration(duration, id) {
    var video_length = document.createElement('p');
    video_length.setAttribute('class', 'duration');
    video_length.textContent = '(' + duration + 'min)';
    $('#downloads_' + id).append(video_length);
}

function setPreviewImage(url, id) {
    var parent = $('#downloads_' + id).parent();
    parent.css({'background-image':'url("' + url + '")',
                'background-repeat':'no-repeat'});
}

function createWarning(msg) {
    var warning = document.createElement('div');
    warning.setAttribute('class', 'warn_text g1plus');
    $(warning).html(msg);

    return warning;
}

/**
 * Erzeugt einen simplen Link.
 *
 * @param url   Url auf die der Link zeigt
 * @param text  Text des Links
 *
 * @return Das Link-Element
 */
function createDownloadLink(url, text) {
    var downlink = document.createElement('a');
    downlink.setAttribute('href', url);
    downlink.textContent = text;

    return downlink;
}

function replaceWithLegacyPlayer() {
    try {
        console.log($('#embeddedPlayer', this).get(0).getAttribute('flashvars'));
        var src = $('#embeddedPlayer', this).get(0).getAttribute('flashvars');
    } catch(err) {
        var src = $('#embeddedPlayer param[name="flashvars"]', this).val();
    }
    var id = src.split('&').shift().split(':').pop();
    var url = 'http://media.mtvnservices.com/mgid:gameone:video:mtvnn.com:' + id;

    var player = createLegacyPlayer(url);
    $('#embeddedPlayer', this).replaceWith(player);
}

/**
 * Erstellt einen Player, der dem alten GameOne-Player entspricht.
 *
 * @param src  Quelle des anzuzeigenden Videos.
 */
function createLegacyPlayer(src) {
    var player = document.createElement('embed');
    player.setAttribute('width', 566);
    player.setAttribute('height', 424);
    player.setAttribute('flashvars', 'configParams');
    player.setAttribute('menu', 'false');
    player.setAttribute('swliveconnect', 'true');
    player.setAttribute('allowscriptaccess', 'always');
    player.setAttribute('enablejavascript', 'true');
    player.setAttribute('allowfullscreen', 'true');
    player.setAttribute('quality', 'high');
    player.setAttribute('name', 'embeddedPlayer');
    player.setAttribute('id', 'embeddedPlayer');
    player.setAttribute('src', src);
    player.setAttribute('type', 'application/x-shockwave-flash');

    return player;
}

/**
 * Erstellt einen Player, der dem GameOne-Player entspricht.
 *
 * @param src  Quelle des anzuzeigenden Videos.
 */
function createPlayer(src, parent) {
    var swf = document.createElement('div');
    parent.appendChild(swf);
    var rand = Math.floor((Math.random()*1000000)+1);
    var flashvars = {
        mrss: src,
        config: "http://www.gameone.de/gameone_de_DE.xml",
        adSite: "gameone.de",
        umaSite: "gameone.de",
        autoPlay: "false",
        url: "",
        tile: "",
        ord: rand,
        image: ""
    };
    var params = {
        wmode: "true",
        enableJavascript: "true",
        allowscriptaccess: "always",
        swLiveConnect: "true",
        allowfullscreen: "true"
    };
    var attributes = {
      id:"embeddedPlayer",
      name:"embeddedPlayer"
    };
    swfobject.embedSWF("http://www.gameone.de/flash/g2player_2.0.60.swf", swf, "566", "424", "9.0.28.0", "expressInstall.swf", flashvars, params, attributes);
}

/**
 * Holt die zugehörigen Downloads des Owner-Objects und fügt sie in einer
 * Download-Box an.
 */
function getDownloads() {
    if(preferences.uselegacyplayer) {
        var src = $('#embeddedPlayer', this).get(0).getAttribute('src');
    } else {
        try {
            var src = $('#embeddedPlayer', this).get(0).getAttribute('flashvars').split('&').shift();
        } catch(err) {
            var src = $('#embeddedPlayer param[name="flashvars"]', this).val().split('&').shift();
        }
    }
    var id = src.split('-').pop();
    this.appendChild(createDownloadContainer('downloads_' + id));
    request('http://gameone.de/api/mrss/' + src, 'response_mrss', id);
}

/**
 * Füllt ein select-Element mit option-Einträgen beginnend bei min bis max
 * aufsteigend. Wird kein callback angegeben entsprech die Einträge den
 * jeweiligen Zahlen.
 *
 * @param select    Das zu befüllende select-Element
 * @param min       Startelement
 * @param max       Endelement
 * @param callback  Funktion die für jedes Element aufgerufen wird. Es wird die
 *                  jeweilige Ziffer übergeben. Rückgabewert muss ein dazu
 *                  korrespondierender String sein.
 */
function addOptions(select, min, max, callback) {
    for(var i = min; i < max; ++i) {
        var option = document.createElement('option');
        if(!callback) {
            option.textContent = i;
        } else {
            option.textContent = callback(i);
        }
        select.appendChild(option);
    }
}

/**
 * Erzeugt eine Altersabfrage, die bei Eingabe eines Alters, welches der
 * Volljährigkeit entspricht, die Freigabe aller altersbeschränkten Inhalte
 * auslöst.
 *
 * @return Das Altersabfrage-Element
 */
function createAgeCheck() {
    var agecheck = document.createElement('div');
    agecheck.setAttribute('class', 'agecheck g1plus');

    var agecheck_box = document.createElement('div');

    var info = document.createElement('p');
    info.textContent = 'Um Ab-18-Inhalte sehen zu können musst du dein Alter bestätigen:';
    agecheck_box.appendChild(info);

    var day = document.createElement('select');
    day.setAttribute('class', 'day');
    addOptions(day, 1, 32);
    agecheck_box.appendChild(day);

    var month = document.createElement('select');
    month.setAttribute('class', 'month');
    addOptions(month, 1, 13);
    agecheck_box.appendChild(month);

    var year = document.createElement('select');
    year.setAttribute('class', 'year');
    addOptions(year, 0, 100, function(i) {
        var today = new Date();
        return today.getFullYear() - i;
    });
    agecheck_box.appendChild(year);

    var ok = document.createElement('input');
    ok.setAttribute('type', 'submit');
    ok.setAttribute('value', 'Bestätigen');

    $(ok).click(function() {
        var year = parseInt($('select.year :selected', this.parentNode).text());
        var month = parseInt($('select.month :selected', this.parentNode).text());
        var day = parseInt($('select.day :selected', this.parentNode).text());
        var age = new Date(year, month - 1, day);
        var padded_age = new Date(age.getFullYear() + 18, age.getMonth(), age.getDate());
        var today = new Date();
        if((today.getTime() - padded_age.getTime()) >= 0) {
            var commentable_id = document.getElementById('commentable_id').getAttribute('value');
            $('div.agecheck').empty();
            $('div.agecheck').addClass('loading');
            request_cache(commentable_id, window.location.href);
        }
        return false;
    });
    agecheck_box.appendChild(ok);
    agecheck.appendChild(agecheck_box);

    return agecheck;
}

/**
 * Behandeln der Rückgabe der mrss-API. Inhalte die von der flvgen-API geliefert
 * werden, werden gesondert behandelt. Doppelte Urls werden gefiltert.
 */
function response_mrss(response) {
    if(response.status == 200) {
        var urls = new Array();
        $('media\\:content', response.text).each(function() {
            var url = this.getAttribute('url');
            var duration = Math.round(parseFloat(this.getAttribute('duration')) / 60);
            var callback = 'response_mediagen';

            if(url.indexOf('mediaGen.jhtml') != -1) {
                url = 'http://de.esperanto.mtvi.com/www/xml/flv/flvgen.jhtml?vid=' + url.split(':').pop();
                callback = 'response_flvgen';
            } else {
                url = url.split('?')[0];
            }

            if(urls.indexOf(url) == -1) {
                setDuration(duration, response.id);
                urls.push(url);
                request(url, callback, response.id);
            }
        });

        var preview_image = $('img', response.text).get(0).getAttribute('url');
        if (preview_image) {
            setPreviewImage(preview_image, response.id);
        }
    } else {
        var downloads = document.getElementById('downloads_' + response.id);
        $(downloads).replaceWith(createWarning('Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.'));
    }
}

/**
 * Behandeln von Inhalten, die über die mediagen-API geliefert werden (reguläre
 * Videos sowie Gametrailers-Videos).
 */
function response_mediagen(response) {
    var downloads = document.getElementById('downloads_' + response.id);

    if(response.status == 200) {
        var videos = [];

        $('rendition', response.text).each(function() {
            var v = {};
            v.width = this.getAttribute('width');
            v.height = this.getAttribute('height');
            v.bitrate = this.getAttribute('bitrate');
            v.mime = this.getAttribute('type').split('/').pop();
            if(this.textContent.indexOf('http') == -1) {
                v.url = this.textContent.trim().split('/riptide/').pop();
                v.url = 'http://cdn.riptide-mtvn.com/' + v.url;
            } else {
                v.url = this.textContent;
            }
            videos.push(v);
        });

        videos.sort(function(a, b) {
            return b.width - a.width;
        });

        videos.sort(function(a, b) {
            return b.bitrate - a.bitrate;
        });

        $(videos).each(function () {
            var downlink = createDownloadLink(this.url,
                this.mime + ' ' + this.width + 'x' + this.height + '@' + this.bitrate + 'kbps');
            downloads.appendChild(downlink);
        });
    } else {
        $(downloads).replaceWith(createWarning('Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.'));
    }
}

/**
 * Behandeln von Inhalten, die von der flvgen-API geliefert werden (TV-Folgen
 * 1 - 150).
 */
function response_flvgen(response) {
    var downloads = document.getElementById('downloads_' + response.id);
    items = [];

    if(response.status == 200) {
        $('src', response.text).each(function() {
            items.push($(this).text());
        });

        $(items).each(function() {
            var text = this.split('/').pop();
            text = text.split('.').shift();
            var downlink = createDownloadLink(this, text);
            downloads.appendChild(downlink);
        });

        var x = $('a', downloads);

        x.sort(function(a, b) {
            return b.textContent < a.textContent;
        });

        $('a', downloads).each(function() {
            downloads.removeChild(this);
        });

        $(x).each(function() {
            downloads.appendChild(this);
        });
    } else {
        $(downloads).replaceWith(createWarning('Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.'));
    }
}

/**
 * Behandeln des Cache-Response.
 * Im Cache enthaltene 18er-Inhalte werden durch das Video ersetzt und mit
 * Downloadlinks versehen.
 */
function response_cache(response) {
    var page = '1';
    var href = window.location.href.split('?').pop().split('/');
    if(href[href.length - 2] == 'part') {
        page = href[href.length - 1];
    }

    $('div.agecheck').each(function(i){
        if(response.cache && response.cache[page][String(i + 1)]) {
            var ids = response.cache[page][String(i + 1)];
            for(j in ids) {
                var id = ids[j];
                if(id.indexOf('gallery') > -1) {
                    $(this).replaceWith(createWarning('Bei diesem altersbeschränkten Inhalt handelt es sich um eine Bilder-Galerie, Diese werden derzeit nicht von G1Plus erfasst. Dies kann sich in zukünftigen Versionen ändern, wenn gesteigertes Interesse besteht (<a href="https://github.com/g1plus/g1plus/issues/1">Issue #1</a>)'));
                } else {
                    var url = "http://www.gameone.de/api/mrss/mgid:gameone:video:mtvnn.com:video_meta-" + id;
                    if(id.indexOf('http') > -1) {
                        url = id;
                    }
                    var player_swf = document.createElement('div');
                    player_swf.setAttribute('class', 'player_swf');
                    if(preferences.uselegacyplayer) {
                        url = 'http://media.mtvnservices.com/mgid:gameone:video:mtvnn.com:video_meta-' + id;
                        if(id.indexOf('http') > -1) {
                            url = id;
                        }
                        var player = createLegacyPlayer(url);
                        player_swf.appendChild(player);
                    } else {
                        var player = createPlayer(url, player_swf);
                    }
                    $(this).after(player_swf);
                    if(id.indexOf('http') == -1) {
                        player_swf.getDownloads = getDownloads;
                        player_swf.getDownloads(id);
                    }
                }
            }
            $(this).remove();
        } else {
            $(this).replaceWith(createWarning('Für diesen altersbeschränkten Inhalt liegt keine Referenz im Cache vor. Entweder ist der Cache derzeit nicht aktuell oder es handelt sich um eine Bilder-Galerie (wird derzeit nicht von G1Plus berücksichtigt).'));
        }
    });
}

/* Browser specific functions
 * ========================== */
// TODO: In jeweils eigene Datei (ff.js/chrome.js) auslagern

function request(url, callback, id) {
    self.port.emit('request', {url: url, callback: callback, id: id});
}

function add_to_cache(id, url) {
    self.port.emit('add_to_cache', {id: id, url: url});
}

function request_cache(id, url) {
    self.port.emit('request_cache', {id: id, url: url});
}

/* Events
 * ====== */

self.port.on('response_mrss', function(response) {
    response_mrss(response);
});

self.port.on('response_mediagen', function(response) {
    response_mediagen(response);
});

self.port.on('response_flvgen', function(response) {
    response_flvgen(response);
});

self.port.on('response_cache', function(response) {
    response_cache(response);
});

self.port.on('main', function(response) {
    main(response.prefs);
});

/* Main
 * ==== */

var preferences;

function main(prefs) {
    preferences = prefs;

    // CSS laden
    addCSS(prefs.dataRoot);

    // UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A ENTER
    var konami = new Konami()
    konami.code = function() {
        $('#header h1').css('background', 'url(http://upload.wikimedia.org/wikipedia/de/thumb/a/a6/GameOneLogo.png/220px-GameOneLogo.png) no-repeat 30px 30px');
        $('#header h1').css('width', '250px');
    }
    konami.load()

    // Wenn in den Einstellungen aktiviert, den alten Player verwenden
    if(preferences.uselegacyplayer) {
        $('div.player_swf').each(replaceWithLegacyPlayer);
    }

    // Downloads für alle Videos holen
    $('div.player_swf').each(getDownloads);

    // Wenn keine Altersbeschränkungshinweise vorhanden, dann werden die
    // Inhalte in den Cache gelegt. D.h. sollten wir eine Seite nach 22 Uhr
    // besuchen, welche altersbeschränkte Inhalte hat, dann haben wir auch
    // ohne synchronisierten Cache die Möglichkeit innerhalb den Sperrstunden
    // diese Inhalte zu sehen.
    if($('img[src="/images/dummys/dummy_agerated.jpg"]').length == 0) {
        if(document.getElementById('commentable_id')) {
            var commentable_id = document.getElementById('commentable_id').getAttribute('value');
            add_to_cache(commentable_id, window.location.href);
        }
    } else if(prefs.agerated) {
        // Altersbeschränkte Inhalte mit einer Altersfreigabe versehen wenn
        // in den Einstellungen erlaubt.
        $('img[src="/images/dummys/dummy_agerated.jpg"]').each(function(i) {
            $(this).replaceWith(createAgeCheck());
        });
    }
}
