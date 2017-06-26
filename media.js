module.exports = MediaDB;

const path = require("path");
const jsext = require("jsext");
const MediaExt = require("mediaext");
const MemoDB = require("memodb");

const MediaRouter = require("./mediarouter");
const CollectionDB = require("./collection");

MediaDB.extends( MemoDB );
function MediaDB (options) {
    var self = this;
    self.options = Object.assign({
        type : "media",
        schema : self.SCHEMA,
        schemadefault : self.SCHEMADEFAULT,
        masterversion : "web",
        versions : MediaExt.VERSIONS,
        mediatypes : ["jpg"],
        collectiontype : "collection",
        collectionroot : "albums",
        collectionpath : null
    }, options);

    // public read only
    self.masterversion = self.options.masterversion;
    self.versions = self.options.versions;
    self.mediatypes = self.options.mediatypes;

    MemoDB.call(self, self.options);

    self.collection = self.options.collectiontype && new CollectionDB(self, {
        type : self.options.collectiontype,
        memopath : self.options.collectionpath,
        root : self.options.collectionroot,
        mcache : self.mcache
    });
    self.router = new MediaRouter(self, self.collection);
}

MediaDB.ERROR = {
    MISSING_PARAMS : "Missing required params",
    NODIR : "No directory",
    MISSING_TYPE : "Can not identify the media type",
    UNKNOWN_FORMAT : "Unknown format"
};

MediaDB.prototype.SCHEMA = {
    id : String,
    path : String,
    type : String,

    since : Date,
    lastscrap : Date,

    creation : Date,
    author : String,
    email : String,
    site : String,
    copyright : String,
    orientation : String,
    height : Number,
    width : Number,
    model : String,
    modelserial : String,
    focal : Number,
    lens : String,
    wb : String,
    xres : Number,
    yres : Number,
    iso : Number,
    ex : Number,
    fn : Number,
    dominant : [],

    title : String,
    caption : String,
    tags : [String],

    altitude : Number,
    latitude : [],
    longitude : [],
    city : String,
    state : String,
    country : String,
    countrycode : String,

    authorrating : Number,
    publicrating : Number,
    ratingcount : Number,
    showcount : Number
}

MediaDB.prototype.SCHEMADEFAULT = function() {
    return {
        since : Date.now(),
        lastupdate : Date.now(),
        status : "PUBLIC",
        content : "",
        author : "",
        authorrating : 0,
        publicrating : 0,
        ratingcount : 0,
    };
}

/**
 * getVersion Return a formated media
 * @param {String} id Media id
 * @param {String} format Required format
 * @param {Array} props Array of keys to filter the response media
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(formatedMedia)
 */
MediaDB.prototype.getVersion = function(id, format, props) {
    var self = this;
    return new Promise(function(resolve, reject) {
        format = format && format.toLowerCase();
        var jsonRequested = !format || format == "json";
        self.get(id, jsonRequested && props)
        .then(function(media) {
            if(jsonRequested) return media;

            if(!self.options.versions[format]) return reject({error:MediaDB.ERROR.UNKNOWN_FORMAT, format:format}); 

            var fileversion = path.join(media.path, format, media.id) + "." + media.type;
            return fileversion;
        })
        .then(resolve)
        .catch(reject);
    });
}