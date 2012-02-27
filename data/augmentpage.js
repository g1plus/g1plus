/* Funktionen
 * ========== */

/**
 * Fügt der Seite ein CSS hinzu, welches das Styling der G1Plus-Elemente
 * übernimmt.
 */
function addCSS() {
    var style = document.createElement('style');
    var head = document.getElementsByTagName('head')[0];
    style.type = 'text/css';
    style.appendChild(document.createTextNode(".g1plus a { background: #AC9C64; color: #000; padding: 4px; display: inline-block; margin: 4px 4px 0px 0px; }"));
    style.appendChild(document.createTextNode(".agecheck.g1plus { height:24px; padding: 200px 0px; text-align: center; }"));
    style.appendChild(document.createTextNode(".download.g1plus { background : #262626; font-size: 12px; letter-spacing: normal; line-height: 18px; padding: 8px; }"));
    head.appendChild(style);
}

/**
 * Erzeugt einen Download-Container.
 *
 * @param id  Die id des Vidos zu dem der Container gehört
 *
 * @return Der Download-Container
 */
function createDownloadBox(id) {
    var downloads = document.createElement('div');
    downloads.setAttribute('class', 'g1plus');
    downloads.setAttribute('id', 'downloads_' + id)
    downloads.setAttribute('class', 'download g1plus');

    var heading = document.createElement('strong');
    heading.textContent = 'Downloads';

    downloads.appendChild(heading);
    downloads.appendChild(document.createElement('br'));

    return downloads;
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

/**
 * Erstellt einen Player, der dem GameOne-Player entspricht.
 *
 * @param src  Quelle des anzuzeigenden Videos.
 */
function createPlayer(src) {
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
 * Holt die zugehörigen Downloads des Owner-Objects und fügt sie in einer
 * Download-Box an.
 */
function getDownloads() {
    var src = this.getAttribute('src');
    console.log(src);
    var id = src.split('-').pop();
    this.parentNode.appendChild(createDownloadBox(id));
    self.port.emit('request', {url:'http://gameone.de/api/mrss/' + src, callback: 'response_mrss', id: id});
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

    var info = document.createElement('p');
    info.textContent = 'Um Ab-18-Inhalte sehen zu können musst du dein Alter bestätigen:';
    agecheck.appendChild(info);

    var day = document.createElement('select');
    day.setAttribute('class', 'day');
    addOptions(day, 1, 32);
    agecheck.appendChild(day);

    var month = document.createElement('select');
    month.setAttribute('class', 'month');
    addOptions(month, 1, 13);
    agecheck.appendChild(month);

    var year = document.createElement('select');
    year.setAttribute('class', 'year');
    addOptions(year, 0, 100, function(i) {
        var today = new Date();
        return today.getFullYear() - i;
    });
    agecheck.appendChild(year);

    var ok = document.createElement('a');
    ok.textContent = 'OK';
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
            self.port.emit('request_cache', commentable_id);
        }
        return false;
    });
    agecheck.appendChild(ok);

    return agecheck;
}

/* Events
 * ====== */

/**
 * Behandeln der Rückgabe der mrss-API. Inhalte die von der flvgen-API geliefert
 * werden, werden gesondert behandelt. Doppelte Urls werden gefiltert.
 */
self.port.on('response_mrss', function(response) {
    if(response.status == 200) {
        var urls = new Array();
        $('media\\:content', response.text).each(function() {
            var url = this.getAttribute('url');
            var callback = 'response_mediagen';

            if(url.indexOf('mediaGen.jhtml') != -1) {
                url = 'http://de.esperanto.mtvi.com/www/xml/flv/flvgen.jhtml?vid=' + url.split(':').pop();
                callback = 'response_flvgen';
            } else
                url = url.split('?')[0];

            if(urls.indexOf(url) == -1) {
                urls.push(url);
                self.port.emit('request', {url: url, callback: callback, id: response.id});
            }
        });
    } else {
        var downloads = document.getElementById('downloads_' + response.id);
        var error = document.createElement('p');
        error.textContent = 'Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.';
        downloads.appendChild(error);
    }
});

/**
 * Behandeln von Inhalten, die über die mediagen-API geliefert werden (reguläre
 * Viedos sowie Gametrailers-Videos).
 */
self.port.on('response_mediagen', function(response) {
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
        var error = document.createElement('p');
        error.textContent = 'Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.';
        downloads.appendChild(error);
    }
});

/**
 * Behandeln von Inhalten, die von der flvgen-API geliefert werden (TV-Folgen
 * 1 - 150).
 */
self.port.on('response_flvgen', function(response) {
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
        var error = document.createElement('p');
        error.textContent = 'Es ist ein Fehler aufgetreten. Seite aktualisieren oder es später erneut versuchen.';
        downloads.appendChild(error);
    }
});

/**
 * Behandeln des Cache-Response.
 * Im Cache enthaltene 18er Inhalte werden durch das Video ersetzt und mit
 * Downloadlinks versehen.
 */
self.port.on('response_cache', function(response) {
    var page = '1';
    var href = window.location.href.split('/');
    if(href[href.length - 2] == 'part') {
        page = href[href.length - 1];
    }

    $('div.agecheck').each(function(i){
        var id = response.cache[page][String(i + 1)];
        if(id) {
            var url = 'http://media.mtvnservices.com/mgid:gameone:video:mtvnn.com:video_meta-' + id;
            if(id.indexOf('http') > -1) {
                url = id;
            }
            var player_swf = document.createElement('div');
            player_swf.setAttribute('class', 'player_swf');
            var player = createPlayer(url);
            player_swf.appendChild(player);
            $(this).replaceWith(player_swf);
            if(id.indexOf('http') == -1) {
                player.getDownloads = getDownloads;
                player.getDownloads();
            }
        } else {
            $(this).remove();
        }
    });
});

/* Main
 * ==== */

// CSS laden
addCSS();

// UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A ENTER
var konami = new Konami()
konami.code = function() {
    $('#header h1').css('background', 'url(http://upload.wikimedia.org/wikipedia/de/thumb/a/a6/GameOneLogo.png/220px-GameOneLogo.png) no-repeat 30px 30px');
    $('#header h1').css('width', '250px');
}
konami.load()

// Downloads für alle Videos holen
$('div.player_swf embed').each(getDownloads);

// Altersbeschränkte Inhalte mit einer Altersfreigabe versehen
$('img[src="/images/dummys/dummy_agerated.jpg"]').each(function(i) {
    $(this).replaceWith(createAgeCheck());
});
