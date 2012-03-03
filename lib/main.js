/* Import
 * ====== */

var simple_storage = require('simple-storage');
var storage = simple_storage.storage;
var pageMod = require('page-mod');
var request = require('request');
var pageWorkers = require('page-worker');
var self = require('self');
var data = self.data;
var tabs = require('tabs');

/* Const
 * ===== */

var cacheMirrors = ['http://pastebin.com/raw.php?i=tVLCAjZc',
                    'http://g1plus.x10.mx/cache.json'];

/* Methoden
 * ======== */

/**
 * Synchronsieren des lokalen cache mit der letzten Version
 * auf pastebin oder eines Fallback-Mirrors, wenn neuer.
 *
 * @param onSync  Callback der nach dem Sync-Vorgang aufgerufen wird.
 *                Der Status des Sync-Versuches wird übergeben.
 */
function syncCache(mirror, onSync) {
    var req = request.Request({
        url: cacheMirrors[mirror],
        onComplete: function(response) {
            if(response.status == 200) {
                var json = JSON.parse(response.text);
                if(storage.cache['update']) {
                    if(Date.parse(json['update']) > Date.parse(storage.cache['update'])) {
                        storage.cache = json;
                    }
                } else {
                    storage.cache = json;
                }
                onSync(response.status);
            } else {
                if(cacheMirrors[mirror + 1]) {
                    syncCache(mirror + 1, onSync);
                } else {
                    onSync(response.status);
                }
            }
        }
    });
    req.get();
}

/**
 * Filter die Content-Elemente aus einer Seite.
 *
 * @param src  Quelltext der Seite.
 *
 * @return Die Content-Elemente reduziert auf ihre Referenzen.
 */
function getContentElements(src) {
    var re = /#gallery_\d*|video_meta-\w*|<embed(.*)/g;

    var result = new Array();

    while((match = re.exec(src)) != null) {
        if(match[0].indexOf('embed') > -1) {
            result.push(match[0].split('"')[1]);
        } else if(match[0].indexOf('video_meta-') > -1) {
            result.push(match[0].split('-')[1]);
        } else {
            result.push(match[0].split('#')[1]);
        }
    }

    return result;
}

/**
 * Erzeugt ein Cache-Objekt aus der Differenz zweier HTML-Seiten.
 *
 * @param pre  Die Seite mit gesperrten Inhalten.
 * @param post Die Seite mit 18er-Inhalten.
 *
 * @return Cache-Objekt
 */
function diff(pre, post) {
    var result = {};

    var re = /dummy_agerated.jpg/g;

    if(!re.test(post)) {
        var post_elems = getContentElements(post);
        var pre_elems = getContentElements(pre);

        for(i in pre_elems) {
            var index = post_elems.indexOf(pre_elems[i]);
            if(index > -1) {
                post_elems.splice(index, 1);
            }
        }

        var dummy_count = 0;
        var match = re.exec(pre);

        while(match) {
            ++dummy_count;
            var src = post_elems.shift();
            result[String(dummy_count)] = new Array(src);
            match = re.exec(pre);
        }

        if(dummy_count < post_elems) {
            result[String(dummy_count)].concat(post_elems);
        }
    }

    return result;
}

/**
 * Legt ein Cache-Objekt in den lokalen Storage.
 *
 * @param id  id der Seite
 * @param page  page der Seite
 * @param cache Cache-Objekt
 */
function addToCache(id, page, cache) {
    if(cache['1'] && cache['1'].length > 0) {
        if(!storage.cache[id]) {
            storage.cache[id] = {};
        }
        if(!storage.cache[id][page]) {
            storage.cache[id][page] = cache;
        }
    }
}

/**
 * Überprüft auf ein Update des AddOns und führt folgende Aktionen
 * aus:
 *  - aufrufen des Changelogs
 *  - wenn notwendig aktualisieren des lokalen Caches mit dem beim
 *    Update mitgelieferten
 */
function checkUpdate() {
    if(!storage.firstrun) {
        tabs.open('http://g1plus.x10.mx/information');
        storage.firstrun = true;
    }

    if(storage.version != self.version) {
        tabs.open('http://g1plus.x10.mx/changelog');
        storage.version = self.version;

        var cacheJson = JSON.parse(data.load('cache.json'));
        if(!storage.cache) {
            storage.cache = cacheJson;
        } else {
            // Update des Caches erzwingen, selbst wenn älter um einen fehlerhaften Cache zu überschreiben (z.B. fehlendes update-property *duh*)
            storage.cache = cacheJson;
        }
    }
}

/* Main
 * ==== */

checkUpdate();

pageMod.PageMod({
    include: '*.gameone.de',
    contentScriptWhen: 'ready',
    contentScriptFile: [data.url('jquery.min.js'), data.url('konami.pack.js'), data.url('augmentpage.js')],
    onAttach: function(worker) {
        worker.port.on('request', function(r) {
            var req = request.Request({
                url: r.url,
                onComplete: function(response) {
                    worker.port.emit(r.callback, {status: response.status, text: response.text, id: r.id});
                }
            });
            req.get();
        });

        worker.port.on('request_cache', function(r) {
            syncCache(0, function(status) {
                var page = '1';
                var href = r.url.split('?').pop().split('/');
                if(href[href.length - 2] == 'part') {
                    page = href[href.length - 1];
                }

                if(storage.cache[r.id] && storage.cache[r.id][page]) {
                    worker.port.emit('response_cache', {status:status, cache:storage.cache[r.id]});
                } else {
                    var req = request.Request({
                        url:'https://www.google.com/search?q=cache:' + r.url,
                        onComplete: function(response) {
                            if(response.status == 200) {
                                // request a unmodified/uninterpreted copy of the current page
                                var req = request.Request({
                                    url: r.url,
                                    onComplete: function(response2) {
                                        var cache = {};
                                        cache[page] = diff(response2.text, response.text);

                                        addToCache(r.id, page, cache[page]);

                                        worker.port.emit('response_cache', {status:status, cache:cache});
                                    }
                                });
                                req.get();
                            } else {
                                worker.port.emit('response_cache', {status:status, cache:null});
                            }
                        }
                    });
                    req.get();
                }
            });
        });

        worker.port.on('add_to_cache', function(r) {
            var req = request.Request({
                url: r.url,
                onComplete: function(response) {
                    if(response.status == 200) {
                        var page = '1';
                        var href = r.url.split('?').pop().split('/');
                        if(href[href.length - 2] == 'part') {
                            page = href[href.length - 1];
                        }

                        var cache = {};
                        cache['1'] = getContentElements(response.text);

                        addToCache(r.id, page, cache);
                    }
                }
            });
            req.get();
        });
    }
});
