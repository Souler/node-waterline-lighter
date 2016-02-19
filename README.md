![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# node-waterline-lighter
Simple Waterline bootstraper for loading all the models in a given directory

## Introduction
How many times have you written/copy&pasted this code for initing your waterline
instace?
```js
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
Config can be either a **String** or an **Object**.
* If a **String**, it is assumed it points to the directory where waterline should
load the models from.
* If an **Object**:
    * **dir** [*String*]: pointing to the directory where the model definitions are at.
    * [**target**] [*Object*]: *Optional*. where to store `models` and `connections` after orm is
        inited. This is useful when used with an `Express` instance. Defaults to `global`.
        If you want to **disable** this feature and dont inject it anywhere, set `target`
        to **false**.
    * [**connection**] [*Object*]: *Optional*. Waterline connection to be used as default for
        all the model definitions that don't have a `connection` field specified. See sections
        **Defining Models** and **Defining Connections** for more information.
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

## Defining Models
When using `WaterlineLighter` your models **must** export the configuration that
will be passed to `Waterline.Collection.extend` (instead of the return value
of that function).
  
Also when using `WaterlineLighter` you can simplify your models a little bit. The
following configurations can be not set and the module will take care of them.
* **identity**: If no identity field is given to the model, the module will use
    the filename **converted to sanke_case**.
* **connection**: If no connection is defined, `'default'` will be assigned.
    Read more about the *default* connection in the **Defining Connections** section.

## Defining Connections
When using `WaterlineLighter` defining connections is a little bit easier.

It's important that you define a `default` connection inside `connections` (or
use the `connection` attribute instead). Default connection will be used on 
modelsthad don't have a `connection` defined (or it is strcitly set to 
`default`).

When defining the adapter to use by a connection config you can specifiy it
directly by using the string you would normally use to define it, (`'mysql'`,
`'redis'`, `'postgresql'`, ...) as long as the associated adapter to that value
is installed in the current project (*sails-mysql*, *sails-redis*,
*sails-postgresql*, ...). If it is not available an error will be raised letting
you know you should probably install it.

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
#### index.js
```js
var WaterlineLighter = require('waterline-lighter')
WaterlineLighter('./models')
.then(function(waterline) {
    waterline.orm           // waterline instance created by `new Waterline()`
    waterline.config        // config passed to orm.initialize (with some extra opts)
    waterline.models        // models loaded on the orm after inited
    waterline.connections   // connections used by the orm after inited
    // The module also loads the models and collections into the global object
    global.models           // same as waterline.models
    global.connections      // same as waterline.connections
})
.then(function() {
    require('./app.js')
})
```

#### app.js
```js
var express = require('express')
var app = expres()

var Pet = global.models.pet
var PetFood = global.models.pet_food
var Owner = global.models.owner

app.get('/pets', function(req, res, next) {
    Pet.find()
    .then(res.json)
    .catch(next) // Don't forget to handle possible errors and pass them to express
})
```

This is a typical dev/fast config. It will load the models at `./models` into
the global object and the memory adapter will be used if available. If the memory
adapter is not available at the initialization will fail, so you know you need to
install it

### Express
#### app.js
```js
var express = require('express')
var WaterlineLighter = require('waterline-lighter')
var app = expres()

app.use(WaterlineLighter.middleware({
    dir: './models',
    connection: {
        adapter: 'mysql',
        url: 'mysql2://root:root@localhost:3306/database'
    }
}))

app.get('/pets', function(req, res, next) {
    var Pet = req.app.models.pet // req.app === app
    var PetFood = req.app.models.pet_food
    var Owner = req.app.models.owner

    Pet.find()
    .then(res.json)
    .catch(next) // Don't forget to handle possible errors and pass them to express
})
```