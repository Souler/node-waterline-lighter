'use strict'

const fs        = require('fs')
  ,   path      = require('path')
  ,   _         = require('lodash')
  ,   objHash   = require('object-hash')
  ,   sCase     = require('snake-case')
  ,   Promise   = require('bluebird')
  ,   Waterline = require('waterline')
  ,   peer      = require('codependency').register(module)
  ,   readdir   = Promise.promisify(fs.readdir)

const defaultConfig = {
    dir: null,
    target: global,
    adapters: {},
    connections: {}
}

const adapters = [
    'postgresql',
    'mysql',
    'mongo',
    'memory',
    'disk',
    'sqlserver',
    'redis',
    'riak',
    'irc',
    'twitter',
    'jsdom',
    'neo4j',
    'orientdb',
    'arangodb',
    'cassandra',
    'graphql',
    'solr'
]
.forEach(function(name) {
    let adapter = peer('sails-' + name, { optional: true })
    if (adapter != null)
        defaultConfig.adapters[name] = adapter
})

const ormCache = {}

const buildConfig = function(_config) {

    if (_.isString(_config))
        _config = { dir: _config }

    if (!_config || !_config.dir)
        throw TypeError('First argument must be the path to the models directory or an object with a dir attribute')

    let config = _.assign({}, defaultConfig, _config)

    if (config.connection) {
        if (config.connections.default)
            throw Error('connections.default and connection should not be both defined')
        config.connections.default = config.connection
        config.connection = undefined
    }

    if (_.isEmpty(config.connections)) {
        if (!defaultConfig.adapters.memory)
            throw Error('Default sails-memory adapter could\'t be loaded. Run "npm i sails-memory"')
        config.connections.default = { adapter: 'memory' }
    }

    _.values(config.connections).forEach(function(c) {
        if (!c.adapter)
            throw TypeError('connection must contain an adapter field')
        if (!defaultConfig.adapters[c.adapter])
            throw Error('sails-memory adapter could\'t be loaded. Run "npm i sails-' + c.adapter + '"')
    })

    // config.orm is what will be passed to Waterline#initialize
    // so keep it clean
    config.orm = _.omit(config, [ 'dir', 'target', 'connection' ])

    return config
}

const WaterlineLighter = function(_config, cb) {

    let config = null;

    try {
        config = buildConfig(_config)
    } catch(err) {
        return Promise.reject(err)
    }

    let hash = objHash(_config)
    let cached = ormCache[hash]

    if (cached)
        return Promise.resolve(cached)

    let orm = new Waterline()
    let ormInitialize = Promise.promisify(orm.initialize, { context: orm })
    let dir = path.join(path.dirname(module.parent.filename), config.dir)

    return readdir(dir)
    .then(function(files) {
        let p = files
        .filter(function(f) { return /\.js$/.test(f) })
        .map(function(f) {
            let file = path.join(dir, f)
            let name = path.basename(file, '.js')
            let model = require(file)
            if (!model.connection)
                model.connection = 'default'
            if (!model.identity)
                model.identity = sCase(name)
            return model
        })
        .map(function(m) { return Waterline.Collection.extend(m) })
        .map(function(m) { return orm.loadCollection(m) })

        return Promise.all(p)
    })
    .then(function() { return ormInitialize(config.orm) })
    .then(function(models) {
        let result = _.assign({ orm, config }, models)

        if (config.target !== false) // Inject in the target if available
            _.assign(config.target, _.pick(result, [ 'collections', 'connections' ]))

        ormCache[hash] = result

        if (_.isFunction(cb))
            return cb(null, result)
        else
            return result
    })
    .catch(function(error) {
        if (_.isFunction(cb))
            return cb(error)
        else
            throw error
    })
}

WaterlineLighter.middleware = function(config) {
    return function(req, res, next) {
        let app = req.app
        if (!app.collections && !app.connections) {
            WaterlineLighter(_.assign({}, config, { target: app }))
            .then(function() { next() })
            .catch(next)
        } else
            next()
    }
}

module.exports = WaterlineLighter
Waterline.Lighter = WaterlineLighter
Waterline.initialize = WaterlineLighter