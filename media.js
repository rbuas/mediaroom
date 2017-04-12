module.exports = MediaDB;

global.ROOT_DIR = process.cwd() || __dirname;

var path = require("path");
var jsext = require(ROOT_DIR + "/rocks/jsext");
var MediaExt = require(ROOT_DIR + "/rocks/mediaext/mediaext");
var MemoDB = require(ROOT_DIR + "/rocks/memodb");

MediaDB.extends( MemoDB );
function MediaDB (options) {
    var self = this;
    self.options = Object.assign({
        type : "media",
        schema : self.SCHEMA,
        schemadefault : self.SCHEMADEFAULT,
        master : "web",
        versions : MediaExt.VERSIONS
    }, options);
    self.master = self.options.master;
    MemoDB.call(self, self.options);
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

MediaDB.prototype.READEDFILES = ["jpg"];

MediaDB.prototype.scrapdir = function(dirIn, dirOut, merge) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var responseinfos;
        MediaExt.scrapdir(dirIn, self.READEDFILES)
        .then(function(mediainfos) {
            var tasks = mediainfos.map(function(mediainfo) {
                if(dirOut) mediainfo.path = dirOut;
                return self.stock(mediainfo, merge);
            });
            return Promise.all(tasks);
        })
        .then(function(stockedinfos) {
            if(!dirOut) return resolve(stockedinfos);

            responseinfos = stockedinfos;
            var tasks = stockedinfos.map(function(stockedinfo) {
                if(!stockedinfo || !stockedinfo.id || !stockedinfo.type) return;
                var file = stockedinfo.id + "." + stockedinfo.type;
                return MediaExt.generateVersions(dirOut, file, self.master, self.options.versions);
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