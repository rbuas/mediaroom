global.ROOT_DIR = process.cwd() || __dirname;

var jsext = require("jsext");
var expect = require("chai").expect;
var express = require("express");
var MemoCache = require("memocache");
var RestTest = require("webdrone").RestTest;

var MediaDB = require("./media");
var CollectionDB = require("./collection");
var MediaRouter = require("./mediarouter");

/////////////
// TESTCLASS : MediaRestTest
///////
MediaRestTest.extends( RestTest );
function MediaRestTest (options) {
    var self = this;
    RestTest.call(this, options);
    self.app = express();
    self.router = express.Router();
    self.mcache = new MemoCache({
        maxSize:5000000,
        alertRatio : 0.9,
        alertCallback : function(stats) {
            console.log("MEDIARESTTEST::WARNING : memory was attempt next to the limit : ", stats);
        }
    });
    self.mediadb = new MediaDB({mcache:self.mcache, memopath:"./test/media", type:"media"});
    self.collectiondb = new CollectionDB(self.mediadb, {mcache:self.mcache, memopath:"./test/images"});
    self.mediarouter = new MediaRouter(self.mediadb, self.collectiondb);

    self.router.param("media", self.mediarouter.memoParam());
    self.router.get("/keys", self.mediarouter.keys());
    self.router.get("/count", self.mediarouter.count());
    self.router.get("/get/:media/:pick?", self.mediarouter.get());
    self.router.get("/getlist/:memolist/:pick?", self.mediarouter.getList());
    self.router.get("/random/:count?/:pick?", self.mediarouter.random());
    self.router.post("/create", self.mediarouter.create());
    self.router.get("/clone/:media/:clone", self.mediarouter.clone());
    self.router.post("/update", self.mediarouter.update());
    self.router.get("/remove/:media", self.mediarouter.remove());
    self.router.post("/removelist", self.mediarouter.removeList());
    self.router.get("/scraptargets", self.mediarouter.scrapTargets());
    self.app.use("/", self.router);
    self.server = self.app.listen(self.options.port || 3000, function(){
        console.log("Test server live at port " + (self.options.port || 3000));
    });
}

MediaRestTest.prototype.scrapTargets = function() {
    var self = this;
    return self.request({path : "/scrapttargets", method : "GET", responseType : "json"});
}

MediaRestTest.prototype.close = function (cb) {
    var self = this;
    self.server.close(cb);
}

MediaRestTest.prototype.keys = function () {
    var self = this;
    return self.request({path : "/keys", method : "GET", responseType:"json"});
}

MediaRestTest.prototype.count = function () {
    var self = this;
    return self.request({path : "/count", method : "GET", responseType:"json"});
}

MediaRestTest.prototype.get = function (memo, pick) {
    var self = this;
    memo = memo || "";
    pick = pick && pick.join("|") || "";
    return self.request({path : "/get/" + memo + "/" + pick, method : "GET", responseType:"json"});
}

MediaRestTest.prototype.create = function (memo) {
    var self = this;
    return self.request({path : "/create", data:{memo:memo}, method : "POST", responseType:"json"});
}




/////////////
// TESTCASES : MediaRestTest
///////

describe.only("mediamemo.rest", function() {
    var mrt;

    before(function(done) {
        mrt = new MediaRestTest({ urlbase : "localhost", port:5005 });
        done();
    });

    after(function(done){
        mrt.close(done);
    });

    beforeEach(function(done) { 
        mrt.mediadb.removeAll()
        .then(function() {
            return Promise.all([
                
            ]);
        })
        .then(function() {done();})
        .catch(done);
    });

    afterEach(function(done) { 
        mrt.mediadb.removeAll()
        .then(function() {done();})
        .catch(done); 
    });

    describe("scraptTargets", function() {
        
        it("must return a valid registered memo with it's all properties even if the pick is an empty array", function(done) {
            return mrt.scrapTargets("test1", [])
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(500);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.ok;
                expect(response.data.status).to.be.equal("SUCCESS");
                expect(response.data.memo).to.be.ok;
                expect(response.data.memo.id).to.be.equal("test1");
                expect(response.data.memo.author).to.be.equal("rbl");
                expect(response.data.memo.content).to.be.equal("RRR");
                done();
            })
            .catch(function(err) { 
                done(err); 
            });
        });
    });
});