module.exports = MediaRouter;

const path = require("path");
const jsext = require("jsext");
const MemoRouter = require("memodb").MemoRouter;

const MediaDB = require("./media");
const CollectionDB = require("./collection");
const MediaDrone = require("./mediadrone");

MediaRouter.extends( MemoRouter );
function MediaRouter (mediadb, collectiondb, options) {
    var self = this;
    self.options = Object.assign({}, options);
    MemoRouter.call(self, self.options);
    self.mdb = mediadb;
    self.cdb = collectiondb;
}

MediaRouter.prototype.get = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoid = req.params[self.mdb.TYPE];
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.mdb.getVersion(memoid, req.format, pick)
        .then(function(media) {
            return responseFormatedMedia(res, media, self.mdb.TYPE, format);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"get error : " + (err && err.error)});
        });
    }
}

MediaRouter.prototype.scrapAlbums = function() {
    var self = this;
    return function (req, res) {
        //call api
        MediaDrone.scrapAlbums(self.cdb)
        .then(function(albums) {
            var response = {status:"SUCCESS"};
            response.albums = albums;
            res.json(response);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"scrap error : " + (err && err.error)});
        });
    };
}

MediaRouter.prototype.scrapAlbum = function() {
    var self = this;
    return function (req, res) {
        //prepare params
        var albumid = req.params.album;

        //call api
        MediaDrone.scrapAlbum(self.mdb, albumid)
        .then(function(album) {
            var response = {status:"SUCCESS"};
            response.album = album;
            res.json(response);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"scrap error : " + (err && err.error)});
        });
    };
}

MediaRouter.prototype.collection = function() {
    var self = this;
    return function (req, res) {
        //prepare params
        var collectionid = req.params.collection;
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.cdb.get(collectionid, pick)
        .then(function(collection) {
            var response = {status:"SUCCESS"};
            response.collection = collection;
            res.json(response);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"collection error : " + (err && err.error)});
        });
    };
}

MediaRouter.prototype.collections = function() {
    var self = this;
    return function (req, res) {
        //prepare params
        var categories = req.params.category && req.params.category.split("|");;
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.cdb.collections(categories, pick)
        .then(function(collectionlist) {
            var response = {status:"SUCCESS"};
            response.collectionlist = collectionlist;
            res.json(response);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"collection error : " + (err && err.error)});
        });
    };
}


// PRIVATE
function responseFormatedMedia (res, media, type, format) {
    format = format && format.toLowerCase() || "json";
    switch(format) {
        case("json") :
            var response = {status:"SUCCESS"};
            response[type] = memo;
            res.json(response);
            break;
        case("full") :
        case("web") :
        case("low") :
        case("mob") :
        case("thumb") :
        case("tiny") :
            var type = path.extname(media).slice(1);
            var mimetype = MediaExt.mimetype(type);
            var stream = fs.createReadStream(media);
            stream.on("open", function() {
                res.set("Content-Type", mimetype);
                stream.pipe(res);
            });
            stream.on("error", function() {
                res.set("Content-Type", "text/plain");
                res.status(404).end("not found");
            });
            break;
    }
}