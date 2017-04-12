module.exports = CollectionDB;

global.ROOT_DIR = process.cwd() || __dirname;

var path = require("path");
var jsext = require(ROOT_DIR + "/rocks/jsext");
var MediaExt = require(ROOT_DIR + "/rocks/mediaext/mediaext");
var MemoDB = require(ROOT_DIR + "/rocks/memodb");

CollectionDB.extends( MemoDB );
function CollectionDB (mediadb, options) {
    var self = this;
    self.options = Object.assign({
        type : "col",
        schema : self.SCHEMA,
        schemadefault : self.SCHEMADEFAULT,
        root : path.join(ROOT_DIR, "media")
    }, options);
    MemoDB.call(self, self.options);
    self.mediadb = mediadb;
}

CollectionDB.ERROR = {
    MISSING_PARAMS : "Missing required params",
    NODIR : "No directory",
    ALBUM_NOTFOUND : "Can not found the album"
};

CollectionDB.prototype.SCHEMA = {
    id : String,
    since : Date,
    lastupdate : Date,
    status : String,
    author : String,

    path : String,
    alias : Array,
    priority : Number,
    type : String,

    title : String,
    resume : String,
    content : String,
    contentlist : Array,
    category : Array,
    crosslink : Array
}

CollectionDB.prototype.SCHEMADEFAULT = function() {
    return {
        since : Date.now(),
        lastupdate : Date.now(),
        status : "PUBLIC",
        author : "",

        type : "",
        title : "",
        resume : "",
        content : "",
        contentlist : [],
        category : [],
        crosslink : []
    };
}

/**
 * scrapTargets Search into a root directory for new targets collections subdirectories and save into collection db.
 * @param {String} rootdir Directory to search for new targets
 * @return {Promise} Responses as reject({error:String, internalerror:error}) or resolve([<collection.id>]) 
 */
CollectionDB.prototype.scrapTargets = function(rootdir) {
    var self = this;
    rootdir = rootdir || self.options.root;
    return new Promise(function(resolve, reject) {
        if(!rootdir) return reject({error:CollectionDB.ERROR.MISSING_PARAMS});

        rootdir = path.normalize(rootdir);
        if(!jsext.isDir(rootdir)) return reject({error:CollectionDB.ERROR.NODIR, rootdir:rootdir});

        var targets = jsext.listSubdir(rootdir);
        if(!targets || targets.length == 0) return resolve(files);

        var tasks = targets.map(function(target) {
            var targetid = target;
            var collectionPath = path.normalize(path.join(rootdir, target));
            return !self.exists(target) && self.create({id:targetid, path:collectionPath});
        });
        return Promise.all(tasks)
        .then(function(collections) {
            var newCollections = collections.map(function(collection) {
                return collection && collection.id;
            });
            return newCollections;
        })
        .then(resolve)
        .catch(reject);
    });
}

/**
 * scrapAlbum Search into a registered album path for new medias.
 * @param {String} id Album id
 * @return {Promise} Responses as reject({error:String, internalerror:error}) or resolve(collection) 
 */
CollectionDB.prototype.scrapAlbum = function(id) {
    var self = this;
    if(!self.mediadb) throw new Error("missing mediadb");

    return new Promise(function(resolve, reject) {
        self.get(id)
        .then(function(collection) {
            if(!collection || !collection.id) reject({error:CollectionDB.ERROR.ALBUM_NOTFOUND});

            if(!collection.path) return;

            var collectionIn = path.join(collection.path, self.mediadb.master);
            if(!jsext.isDir(collectionIn)) return;

            return self.mediadb.scrapdir(collectionIn, collection.path)
        })
        .then(function(medias) {
            if(!medias) return;

            var mediaids = medias.map(function(media) {
                return media && media.id;
            });
            return mediaids.unique().clean();
        })
        .then(function(validmedias) {
            return self.update({id:id,contentlist:validmedias || []});
        })
        .then(resolve)
        .catch(reject);
    });
}