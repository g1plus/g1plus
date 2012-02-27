/* Import
 * ====== */

var storage = require('simple-storage').storage;
var pageMod = require('page-mod');
var request = require('request');
var pageWorkers = require('page-worker');
var self = require('self');
var data = self.data;
var tabs = require('tabs');

/* Const
 * ===== */

var cacheUrl = 'http://pastebin.com/raw.php?i=tVLCAjZc';

/* Methoden
 * ======== */

/**
 * Synchronsieren des lokalen cache mit der letzten Version
 * auf pastebin.
 *
 * @param onSync  Callback der nach dem Sync-Vorgang aufgerufen wird.
 *                Der Status des Sync-Versuches wird übergeben.
 */
function syncCache(onSync) {
    var req = request.Request({
        url: cacheUrl,
        onComplete: function(response) {
            if(response.status == 200) {
                storage.cache = JSON.parse(response.text);
            }
            if(onSync) {
                onSync(response.status);
            }
        }
    });
    req.get();
}

/**
 * Überprüft auf ein Update des AddOns und führt folgende Aktionen
 * aus:
 *  - aufrufen des Changelogs
 *  - wenn notwendig aktualisieren des lokalen Caches mit dem beim
 *    Update mitgelieferten
 */
function checkUpdate() {
    if(storage.version != self.version) {
        tabs.open('http://g1plus.x10.mx/blog/changelog');
        storage.version = self.version;

        var cacheJson = JSON.parse(data.load('cache.json'));
        if(!storage.cache) {
            storage.cache = cacheJson;
        } else {
            storageUpdate = Date.parse(storage.cache.update);
            jsonUpdate = Date.parse(cacheJson.update);
            if(jsonUpdate > storageUpdate) {
                storage.cache = cacheJson;
            }
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
            console.log(r.url);
            var req = request.Request({
                url: r.url,
                onComplete: function(response) {
                    worker.port.emit(r.callback, {status: response.status, text: response.text, id: r.id});
                }
            });
            req.get();
        });

        worker.port.on('request_cache', function(id) {
            syncCache(function(status) {
                worker.port.emit('response_cache', {status:status, cache:storage.cache[id]});
            });
        });
    }
});
