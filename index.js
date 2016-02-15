const fs        = require('fs')
  ,   path      = require('path')
  ,   _         = require('lodash')
  ,   Promise   = require('bluebird')
  ,   Waterline = require('waterline')
  ,   readdir   = Promise.promisify(fs.readdir)

// Optional dependencies
try {
    const memory = require('sails-memory')
      ,   disk   = require('sails-disk')
}

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

module.exports = function(config, cb) {
    if (_.isString(config))
        config = { directory: config }

    if (!config.directory) {
        let err = TypeError('First argument must be the path to the models directory or an object with a directory attribute')
        if (_.isFunction(cb))
            return cb(err)
        else
            return Promise.reject(err)
    }

    let orm = new Waterline()
    let conf = _.assign({}, defaultConfig, config)
    let ormConfig = _.omit(conf, [ 'directory', 'target' ])
    let ormInitialize = Promise.promisify(orm.initialize)

    return readdir(conf.directory)
    .then((files) => (
        files
        .filter((f) => (/\.js$/.test(f)))
        .map((f) => {
            let file = path.join(conf.directory, f)
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
    )
    .then(() => (ormInitialize(ormConfig)))
    .then((models) => {
        if (conf.target !== false) // Inject in the target if available
            _.assign(conf.target, _.pick(models, [ 'models', 'connections' ]))

        if (_.isFunction(cb))
            return cb(null, models)
        else
            return models
    })
}
