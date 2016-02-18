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

const adapters = [
    'sails-postgresql',
    'sails-mysql',
    'sails-mongo',
    'sails-memory',
    'sails-disk',
    'sails-sqlserver',
    'sails-redis',
    'sails-riak',
    'sails-irc',
    'sails-twitter',
    'sails-jsdom',
    'sails-neo4j',
    'sails-orientdb',
    'sails-arangodb',
    'sails-cassandra',
    'sails-graphql',
    'sails-solr'
]

adapters.forEach((a) => {
    let adapter = peer(a, { optional: true })
    let name = a.replace(/^sails\-/, '')
    if (adapter != null)
        defaultConfig.adapters[name] = adapter
})

if (memory != null) {
    defaultConfig.adapters['memory'] = memory
    defaultConfig.connections.default.adapter = 'memory'
}

const ormCache = {}

const WaterlineLighter = function(_config, cb) {
    if (_.isString(_config))
        _config = { directory: _config }

    if (!_config.directory) {
        let err = TypeError('First argument must be the path to the models directory or an object with a directory attribute')
        if (_.isFunction(cb))
            return cb(err)
        else
            return Promise.reject(err)
    }

    let hash = objHash(_config)
    let cached = ormCache[hash]

    if (cached)
        return Promise.resolve(cached)

    let orm = new Waterline()
    let config = _.assign({}, defaultConfig, _config)
    let ormConfig = _.omit(config, [ 'dir', 'directory', 'target', 'adapter' ])
    let ormInitialize = Promise.promisify(orm.initialize, { context: orm })
    let dir = path.join(path.dirname(module.parent.filename), config.directory || config.dir)

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
    .then(() => (ormInitialize(ormConfig)))
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