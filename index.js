'use strict'

const fs        = require('fs')
  ,   path      = require('path')
  ,   _         = require('lodash')
  ,   objHash   = require('object-hash')
  ,   case      = require('snake-case')
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
.forEach((name) => {
    let adapter = peer('sails-' + name, { optional: true })
    if (adapter != null)
        defaultConfig.adapters[name] = adapter
})

const ormCache = {}

const buildConfig = function(_config) {
    if (_.isString(_config))
        _config = { dir: _config }

    if (!_config.dir) {
        throw TypeError('First argument must be the path to the models directory or an object with a dir attribute')

    let config = _.assign({}, defaultConfig, _config)

    if (config.connection) {
        if (config.connections.default)
            throw Error('connections.default and connection should not be both defined')
        config.connections.default = config.connection
        config.connection = undefined
    }

    if (_.isEmpty(config.connections)) {
        config.connections.default = { adapter: 'memory' }
    }

    _.values(config.connections).each((c) => {
        if (!c.adapter)
            throw TypeError('connection must contain an adapter field')
        if (!defaultConfig.adapters[c.adapter])
            throw Error('Default sails-memory adapter could\'t be loaded. Run "npm i sails-' + c.adapter + '"')
    })

    // config.orm is what will be passed to Waterline#initialize
    // so keep it clean
    config.orm = _.omit(config, [ 'dir', 'target', 'connection' ])

    return config
}

const WaterlineLighter = function(_config, cb) {

    let hash = objHash(_config)
    let cached = ormCache[hash]

    if (cached)
        return Promise.resolve(cached)

    let config = null;

    try {
        config = buildConfig(_config)
    } catch(err) {
        return Promise.reject(err)
    }

    let orm = new Waterline()
    let ormInitialize = Promise.promisify(orm.initialize, { context: orm })
    let dir = path.join(path.dirname(module.parent.filename), config.dir)

    return readdir(dir)
    .then((files) => {
        let p = files
        .filter((f) => (/\.js$/.test(f)))
        .map((f) => {
            let file = path.join(dir, f)
            let name = path.basename(file, '.js')
            let model = require(file)
            if (!model.connection)
                model.connection = 'default'
            if (!model.identity)
                model.identity = case(name)
            return model
        })
        .map((m) => (Waterline.Collection.extend(m)))
        .map((m) => (orm.loadCollection(m)))

        return Promise.all(p)
    })
    .then(() => (ormInitialize(config.orm)))
    .then((models) => {
        let result = _.assign({ orm, config }, models)

        if (config.target !== false) // Inject in the target if available
            _.assign(config.target, _.pick(result, [ 'models', 'connections' ]))

        ormCache[hash] = result

        if (_.isFunction(cb))
            return cb(null, result)
        else
            return result
    })
    .catch((error) => {
        if (_.isFunction(cb))
            return cb(error)
        else
            throw error
    })
}

WaterlineLighter.middleware = function(config) {
    return function(req, res, next) {
        let app = req.app
        if (!app.models && !app.connections) {
            WaterlineLighter(_.assign({}, config, { target: app }))
            .then(() => next)
            .catch(next)
        } else
            next()
    }
}

module.exports = WaterlineLighter
Waterline.Lighter = WaterlineLighter
Waterline.initialize = WaterlineLighter