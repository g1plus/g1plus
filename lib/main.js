/* Import
 * ====== */

var storage = require('simple-storage').storage;
var pageMod = require('page-mod');
var request = require('request');
var pageWorkers = require('page-worker');
var self = require('self');
var data = self.data;
var tabs = require('tabs');
var simplePrefs = require('simple-prefs');
var prefs = simplePrefs.prefs;
var prefservice = require('preferences-service');


/* Event-Listener
 * ============== */

// Listener auf die Einstellungen
simplePrefs.on("agerated", onPrefChange);
simplePrefs.on("uselegacyplayer", onPrefChange);
simplePrefs.on("runningads", onPrefChange);


/*
 * Globals
 * ======== */

var _workers = [];


/* Methoden
 * ======== */

function onPrefChange(prefName) {
    prefs.dataRoot = data.url('');
    for(var w in _workers) {
        _workers[w].port.emit('update_prefs', prefs);
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
    /*if(!storage.firstrun) {
        tabs.open('http://g1plus.x10.mx/information');
        storage.firstrun = true;
    }

    if(storage.version != self.version) {
        tabs.open('http://g1plus.x10.mx/changelog');
        storage.version = self.version;
    }*/

    prefs.latest_player = 'http://www.gameone.de/flash/g2player_2.0.64.1.swf';

    // Check if the player version changed and update it accordingly
    var req = request.Request({
        url:'http://www.gameone.de/tv/1',
        onComplete: function(response) {
            if(response.status == 200) {
                var latest_player = response.text.match(/http:\/\/www.gameone.de\/flash\/g2player_[0-9\.]*swf/g);
                prefs.latest_player = latest_player[0];
                onPrefChange();
            }
        }
    });
    req.get();
}

function detachWorker(worker, workerArray) {
  var index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
}

/* Main
 * ==== */

checkUpdate();

pageMod.PageMod({
    include: '*.gameone.de',
    contentScriptWhen: 'ready',
    contentScriptFile: [data.url('jquery.min.js'),
                        data.url('swfobject.js'),
                        data.url('konami.pack.js'),
                        data.url('augmentpage.js')],
    attachTo: ["existing", "top"],
    onAttach: function(worker) {
        prefs.dataRoot = data.url('');
        fallback = JSON.parse(data.load('fallback.json'));

        // register worker and unregister on detach
        _workers.push(worker);
        worker.on('detach', function () {
          detachWorker(this, _workers);
        });

        // Immediately emit the preferences to the user-script
        worker.port.emit('main', {prefs: prefs, fallback: fallback});

        // r:{callback, url, id}
        worker.port.on('request', function(r) {
            var req = request.Request({
                url: r.url,
                onComplete: function(response) {
                    worker.port.emit(r.callback, {status: response.status,
                                                  text: response.text,
                                                  id: r.id});
                }
            });
            req.get();
        });

        var cache;

        // r:{id}
        worker.port.on('request_cache', function(r) {
            if(!cache) {
                var req = request.Request({
                    url:'http://gameone.de/blog/' + r.id + '.json',
                    headers:{'User-Agent':'GameOne',
                             'X-G1APP-IDENTIFIER':'x'},
                    onComplete: function(response) {
                        if(response.status == 200) {
                            var post = JSON.parse(response.text);
                            var body = post['post']['body'];
                            cache = body;
                            worker.port.emit('response_cache', {status:response.status, cache:body});
                        } else {
                            worker.port.emit('response_cache', {status:response.status, cache:null});
                        }
                    }
                });
                req.get();
            } else {
                worker.port.emit('response_cache', {status:200, cache:cache});
            }
        });
    }
});
