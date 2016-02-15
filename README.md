# node-waterline-lighter
Simple Waterline bootstraper for loading all the models in a given directory

## Introduction
How many times have you written/copy&pasted this code for initing your waterline
instace?
```node
fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = require(path.join(__dirname, file));
    orm.loadCollection(model);
  });
```
I found myself writing it more than once, so I decided to write this, hopefully
it will save some time to someone else apart from me in the future.

## How it works
This module exposes a function that accepts a config object or a string pointing
to the directory where the models are at and an optional callback function.
It returns a promise that will be fullfiled when the waterline instance is
correctly initialized.

## waterlineLighter(config, [cb])
### config
Config can be either a *String* or an *Object*.
* If a *String*, it is assumed it points to the directory where waterline should
load the models from.
* If an *Object*:
	* *directory*: String pointing to the directory where the model definitions are at.
	* [*target*]: Object where to store `models` and `connections` after orm is
	inited. This is useful when used with an `Express` instance. By default, `models`
	and `connections` are injected into `global` object. If you want to *disable* this
	feature and dont inject it anywhere, set `target` to *false*.
	* Any option else will be passed to the `Waterline#initialize` function.

### cb
Standard node finish callback with `err` and `result` as arguments passed.
Check the return section for knowing about `result`. This is suplied as an
alternate way of using this module, but we *strongly recomend adopting promises*.

### returns
A promise that will be fullfilled to an object with the following attributes:
* *orm*: Waterline instance created and initialized.
* *config*: Compiled config used for on `Waterline#initialize`.
* *models*: Models object returned by `Waterline#initialize`.
* *connections*: Connections object returned by `Waterline#initialize`.

## Examples
Lets assume we have a project structure as follows
```
.
├── models
│   ├── pet.js
│   ├── pet-food.js
│   └── owner.js
├── app.js
├── index.js
└── package.json
```

### Basic
```node
var waterlineLighter = require('waterline-lighter')
waterlineLighter('./models')
.then(function(waterline) {
	waterline.orm 			// would be waterline instance created by `new Waterline()`
	waterline.config 		// config passed to orm.initialize (with some extra opts)
	waterline.models 		// models loaded on the orm after inited
	waterline.connections 	// connections used by the orm after inited
	// The module also loads the models and collections into the global object
	global.models 			// same as waterline.models
	global.connections 		// same as waterline.connections
})
.then(function() {
	require('./app.js')
})
```

### Express
*TODO*