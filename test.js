const should           = require('should')
const Waterline        = require('waterline')
const WaterlineLighter = require('../lib')

describe('WaterlineLighter', () => {
    it('should be a function', () => {
        should(WaterlineLighter).be.a.Function()
    })

    it('should be available via Waterline.Lighter', () => {
        should(Waterline.Lighter).be.a.Function()
            .and.be.equal(WaterlineLighter)
    })

    it('should be available via Waterline.initialize', () => {
        should(Waterline.initialize).be.a.Function()
            .and.be.equal(WaterlineLighter)
    })

    describe('#middleware', () => {
        it('should be a function', () => {
            should(WaterlineLighter.middleware).be.a.Function()
        })

        it('should return a function', () => {
            should(WaterlineLighter.middleware()).be.a.Function()
        })
    })
})