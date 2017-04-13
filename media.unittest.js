global.ROOT_DIR = process.cwd() || __dirname;

var expect = require("chai").expect;
var assert = require("chai").assert;
var MemoCache = require("memocache");
var MediaExt = require("mediaext");
var MediaDB = require("./media");

describe("unit.mediadb", function() {
    var mcache;
    var mediadb;

    before(function() { 
        mcache = new MemoCache({maxSize:5000});
        mediadb = new MediaDB({mcache:mcache, memopath:ROOT_DIR + "/test/media"});
    });

    after(function() { delete(mcache); });

    describe("scrapdir", function() {
        beforeEach(function(done) { 
            mediadb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        afterEach(function(done) { 
            mediadb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("null", function(done) {
            mediadb.scrapdir()
            .then(function() {
                done(new Error("should not pass here, because the operation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MediaDB.ERROR.MISSING_PARAMS);
                done();
            })
            .catch(done);
        });

        it("nodir", function(done) {
            mediadb.scrapdir(__dirname + "/test/media-nodir")
            .then(function() {
                done(new Error("should not pass here, because the operation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MediaExt.ERROR.NODIR);
                done();
            })
            .catch(done);
        });

        it("empty", function(done) {
            mediadb.scrapdir(__dirname + "/test/media-empty")
            .then(function(files) {
                expect(files).to.be.ok;
                expect(files.length).to.be.equal(0);
                done();
            })
            .catch(done);
        });

        it("must read images without set the output", function(done) {
            mediadb.scrapdir(__dirname + "/test/images/web")
            .then(function(files) {
                expect(files).to.be.ok;
                expect(files.length).to.be.equal(6);
                done();
            })
            .catch(done);
        });

        it("must read images with set the output and generate versions", function(done) {
            mediadb.scrapdir(__dirname + "/test/images/web", __dirname + "/test/images/")
            .then(function(files) {
                expect(files).to.be.ok;
                expect(files.length).to.be.equal(6);
                done();
            })
            .catch(done);
        });
    });

    describe("getVersion", function() {
        beforeEach(function(done) { 
            mediadb.removeAll()
            .then(function() {
                return mediadb.scrapdir(__dirname + "/test/images/web", __dirname + "/test/images/");
            })
            .then(function(medias) { done(); })
            .catch(done); 
        });

        afterEach(function(done) { 
            mediadb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

       it("must to get a json version of RBUAS20150310-0052", function(done) {
            mediadb.getVersion("RBUAS20150310-0052")
            .then(function(formatedMedia) {
                expect(formatedMedia).to.be.ok;
                expect(formatedMedia).to.be.instanceof(Object);
                expect(formatedMedia.id).to.be.equal("RBUAS20150310-0052");
                done();
            })
            .catch(done);
       });

       it("must to get a web version of RBUAS20150310-0052", function(done) {
            mediadb.getVersion("RBUAS20150310-0052", "web")
            .then(function(formatedMedia) {
                expect(formatedMedia).to.be.ok;
                expect(formatedMedia).to.be.string("web");
                done();
            })
            .catch(done);
       });
    });
});