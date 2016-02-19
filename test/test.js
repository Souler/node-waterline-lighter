const should           = require('should')
const Waterline        = require('waterline')
const WaterlineLighter = require('../')

describe('WaterlineLighter', function() {
    it('should be a function', function() {
        should(WaterlineLighter).be.a.Function()
    })

    it('should be available via Waterline.Lighter', function() {
        should(Waterline.Lighter).be.a.Function()
            .and.be.equal(WaterlineLighter)
    })

    it('should be available via Waterline.initialize', function() {
        should(Waterline.initialize).be.a.Function()
            .and.be.equal(WaterlineLighter)
    })

    it('should be rejected if no arguments given', function() {
        WaterlineLighter().should.be
            .rejectedWith(TypeError, {
                message: 'First argument must be the path to the models directory or an object with a dir attribute'
            })
    })

    describe('when using a String as first argument', function() {

        it('should be rejected if the directory doesn\'t exist', function() {
            WaterlineLighter('./models-ne').should.be.rejected()
        })

        it('should be fullfilled if a valid path', function() {
            return WaterlineLighter('./models')
            .then(function(wl) {
                should.exist(wl)
                should.exist(wl.orm)
                should.exist(wl.config)
                should.exist(wl.collections)
                should.exist(wl.connections)
            })
        })

        it('collections and connections should be available in global object', function() {
            return WaterlineLighter('./models')
            .then(function(wl) {
                should.exist(global.collections)
                global.collections.should.be.equal(wl.collections)
                should.exist(global.connections)
                global.connections.should.be.equal(wl.connections)
            })
        })
    })

    describe('when using an Object as first argument', function() {
        it('should be rejected if no dir attribute', function() {
            WaterlineLighter({}).should.be
                .rejectedWith(TypeError, {
                    message: 'First argument must be the path to the models directory or an object with a dir attribute'
                })
        })
    })

    describe('#middleware', function() {
        it('should be a function', function() {
            should(WaterlineLighter.middleware).be.a.Function()
        })

        it('should return a function', function() {
            should(WaterlineLighter.middleware()).be.a.Function()
        })
    })
})