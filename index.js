'use strict'
const fs        = require('fs')
  ,   path      = require('path')
  ,   _         = require('lodash')
  ,   Promise   = require('bluebird')
  ,   Waterline = require('waterline')
  ,   memory    = null
  ,   disk      = null
  ,   readdir   = Promise.promisify(fs.readdir)

// Optional dependencies
try {
    memory = require('sails-memory')
    disk   = require('sails-disk')
} catch(e) {}

const defaultConfig = {
    directory: null,
    target: global,
    adapters: {
        memory: memory ? memory : undefined,
        disk: disk ? disk : undefined,
    },
    connections: {
        default: {
            adapter: 'memory'
        }
    }
}

module.exports = function(_config, cb) {
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
    let ormInitialize = Promise.promisify(orm.initialize)

    return readdir(config.directory)
    .then((files) => (
        files
        .filter((f) => (/\.js$/.test(f)))
        .map((f) => {
            let file = path.join(config.directory, f)
            let name = path.basename(file, '.js')
            let model = require(file)
            if (!model.connection)
                model.connection = 'default'
            if (!model.identity)
                model.identity = name
            return model
        })
        .map(Waterline.Collection.extend)
        .map(orm.loadCollection)        
    ))
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
