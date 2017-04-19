module.exports = MediaRouter;

var path = require("path");
var jsext = require("jsext");
var MemoRouter = require("memodb").MemoRouter;
var MediaDB = require("./media");
var CollectionDB = require("./collection");

MediaRouter.extends( MemoRouter );
function MediaRouter (mdb, cdb, options) {
    var self = this;
    self.options = Object.assign({}, options);
    MemoRouter.call(self, self.options);
    self.mdb = mdb;
    self.cdb = mdb;
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
            res.json({status:"ERROR", error:"creation error : " + (err && err.error)});
        });
    }
}

MediaRouter.prototype.scrapTargets = function() {
    var self = this;
    return function (req, res) {
        //call api
        self.mdb.scrapTargets()
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
        self.mdb.scrapAlbum(albumid)
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
        //TODO
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