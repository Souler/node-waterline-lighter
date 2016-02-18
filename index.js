'use strict'
const fs        = require('fs')
  ,   path      = require('path')
  ,   _         = require('lodash')
  ,   Promise   = require('bluebird')
  ,   Waterline = require('waterline')
  ,   readdir   = Promise.promisify(fs.readdir)

// Optional dependencies
const peer   = require('codependency').register(module)
  ,   disk   = peer('sails-disk', { optional: true })
  ,   memory = peer('sails-memory', { optional: true })

const defaultConfig = {
    directory: null,
    target: global,
    adapters: {},
    connections: {
        default: {
            adapter: null
        }
    }
}

if (memory != null) {
    defaultConfig.adapters['memory'] = memory
    defaultConfig.connections.default.adapter = 'memory'
}

if (disk != null) {
    defaultConfig.adapters['disk'] = disk
    defaultConfig.connections.default.adapter = 'disk'
}

Waterline.Lighter = function(_config, cb) {
    if (_.isString(_config))
        _config = { directory: _config }

    if (!_config.directory) {
        let err = TypeError('First argument must be the path to the models directory or an object with a directory attribute')
        if (_.isFunction(cb))
            return cb(err)
        else
            return Promise.reject(err)
    }

    let orm = new Waterline()
    let config = _.assign({}, defaultConfig, _config)
    let ormConfig = _.omit(config, [ 'directory', 'target' ])
    let ormInitialize = Promise.promisify(orm.initialize, { context: orm })
    let dir = path.join(path.dirname(module.parent.filename), config.directory)

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
                model.identity = name
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

        if (_.isFunction(cb))
            return cb(null, result)
        else
            return result
    })
}

module.exports = Waterline.Lighter