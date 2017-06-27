module.exports = MediaDrone = {};

const path = require("path");
const jsext = require("jsext");
const MediaExt = require("mediaext");

MediaDrone.ERROR = {
    MISSING_PARAMS : "Missing required params",
    NODIR : "No directory",
    COLLECTION_NOTFOUND : "Can not found the collection"
};

/**
 * scrapAlbums Search into a root directory for new albums subdsirectories and save into collection db.
 * @param {CollectionDB} collectionDB 
 * @return {Promise} Responses as reject({error:String, internalerror:error}) or resolve([<collection.id>]) 
 */
MediaDrone.scrapAlbums = function(collectiondb) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!collectiondb) return reject({error:MediaDrone.ERROR.MISSING_PARAMS});

        var albumsRoot = collectiondb.root;
        if(!albumsRoot) return reject({error:MediaDrone.ERROR.ROOT, root:albumsRoot});

        albumsRoot = path.normalize(albumsRoot);
        if(!jsext.isDir(albumsRoot)) return reject({error:MediaDrone.ERROR.NODIR, albumsRoot:albumsRoot});

        var albums = jsext.listSubdir(albumsRoot);
        if(!albums || albums.length == 0) return resolve(files);

        var tasks = albums.map((albumid) => {
            var collectionPath = path.normalize(path.join(albumsRoot, albumid));
            return !collectiondb.exists(albumid) && collectiondb.create({id:albumid, path:collectionPath, status:"PRIVATE"});
        });

        return Promise.all(tasks)
        .then(function(newCollections) {
            newCollections = newCollections.clean();
            var newCollectionsIds = newCollections.map((collection) => (collection && collection.id));
            return newCollectionsIds;
        })
        .then(resolve)
        .catch(reject);
    });
}

/**
 * scrapAlbum Read from a directory to search new medias and save into media db.
 */
MediaDrone.scrapAlbum = function(mediadb, albumDir) {
    return new Promise(function(resolve, reject) {
        var readDir = path.normalize(path.join(albumDir, mediadb.masterversion));
        if(!jsext.isDir(readDir) || !jsext.isDir(albumDir)) return reject({error:MediaDrone.ERROR.NODIR, readDir:readDir, albumDir:albumDir});

        var responseinfos;
        MediaExt.scrapdir(readDir, mediadb.mediatypes)
        .then(function(mediainfos) {
            var tasks = mediainfos.map(function(mediainfo) {
                if(albumDir) mediainfo.path = albumDir;
                return mediadb.stock(mediainfo);
            });
            return Promise.all(tasks);
        })
        .then(function(stockedinfos) {
            if(!albumDir) return resolve(stockedinfos);

            responseinfos = stockedinfos;
            var tasks = stockedinfos.map(function(stockedinfo) {
                if(!stockedinfo || !stockedinfo.id || !stockedinfo.type) return;
                var file = stockedinfo.id + "." + stockedinfo.type;
                return MediaExt.generateVersions(albumDir, file, mediadb.masterversion, mediadb.versions);
            });
            return Promise.all(tasks);
        })
        .then(function(versions) {
            //TODO log errors from versions
            resolve(responseinfos);
        })
        .catch(reject);
    });
}