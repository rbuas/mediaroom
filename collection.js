module.exports = CollectionDB;

var path = require("path");
var jsext = require("jsext");
var MediaExt = require("mediaext");
var MemoDB = require("../memodb");

CollectionDB.extends( MemoDB );
function CollectionDB (mediadb, options) {
    var self = this;
    self.options = Object.assign({
        type : "collection",
        schema : self.SCHEMA,
        schemadefault : self.SCHEMADEFAULT,
        root : path.join(ROOT_DIR, "collection")
    }, options);
    MemoDB.call(self, self.options);
    self.mediadb = mediadb;
}

CollectionDB.ERROR = {
    MISSING_PARAMS : "Missing required params",
    NODIR : "No directory",
    COLLECTION_NOTFOUND : "Can not found the collection"
};

CollectionDB.prototype.SCHEMA = Object.assign(MemoDB.WapModel.SCHEMA, {
    path : String
});

CollectionDB.prototype.SCHEMADEFAULT = function() {
    return Object.assign(MemoDB.WapModel.SCHEMADEFAULT(), {
        type : "collection"
    });
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
 * scrapCollection Search into a registered collection path for new medias.
 * @param {String} id Collection id
 * @return {Promise} Responses as reject({error:String, internalerror:error}) or resolve(collection) 
 */
CollectionDB.prototype.scrapCollection = function(id) {
    var self = this;
    if(!self.mediadb) throw new Error("missing mediadb");

    return new Promise(function(resolve, reject) {
        self.get(id)
        .then(function(collection) {
            if(!collection || !collection.id) reject({error:CollectionDB.ERROR.COLLECTION_NOTFOUND});

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

CollectionDB.prototype.collection = function(id, props) {
    var self = this;
    return self.get(id, props);
}

CollectionDB.prototype.collections = function (categories, props) {
    var self = this;
    return self.getIndex("category", categories, props);
}