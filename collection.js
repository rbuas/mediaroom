module.exports = CollectionDB;

const path = require("path");
const jsext = require("jsext");
const MediaExt = require("mediaext");
const MemoDB = require("memodb");

const MediaDrone = require("./mediadrone"); 

CollectionDB.extends( MemoDB );
function CollectionDB (mediadb, options) {
    var self = this;
    self.options = Object.assign({
        type : "collection",
        schema : self.SCHEMA,
        schemadefault : self.SCHEMADEFAULT,
        root : path.join(ROOT_DIR, "albums")
    }, options);
    MemoDB.call(self, self.options);
    self.mediadb = mediadb;
    self.root = self.options.root;
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

CollectionDB.prototype.collections = function (categories, props) {
    var self = this;
    return self.getIndex("category", categories, props);
}

/**
 * scrapPath Search into a registered collection path for new medias.
 * @param {String} id Collection id
 * @return {Promise} Responses as reject({error:String, internalerror:error}) or resolve(collection) 
 */
CollectionDB.prototype.scrapPath = function(id) {
    var self = this;
    if(!self.mediadb) throw new Error("missing mediadb");

    return new Promise(function(resolve, reject) {
        self.get(id)
        .then(function(collection) {
            if(!collection || !collection.id) reject({error:CollectionDB.ERROR.COLLECTION_NOTFOUND});

            if(!collection.path) return;

            return MediaDrone.scrapAlbum(self.mediadb, collection.path);
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