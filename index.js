var EventEmitter = require('events').EventEmitter
var collect = require('collect-stream')
var through = require('through2')

module.exports = List

function List (db, mapFn, opts) {
  var events = new EventEmitter()
  opts = opts || {}

  var idx = {
    maxBatch: opts.maxBatch || 100,

    map: function (msgs, next) {
      var allOps = []
      var pending = msgs.length + 1
      for (var i = 0; i < msgs.length; i++) {
        var msg = msgs[i]
        mapFn(msg, function (err, ops) {
          ops = ops.map(function (op) {
            return {
              type: 'put',
              key: 'k!' + op,
              value: msg.key + '@' + msg.seq
            }
          })
          done(err, ops)
        })
      }
      done(null, [])

      function done (err, ops) {
        if (err) {
          pending = Infinity
          return next(err)
        }
        allOps.push.apply(allOps, ops)
        if (!--pending) db.batch(allOps, next)
      }
    },

    indexed: function (msgs) {
      for (var i = 0; i < msgs.length; i++) {
        mapFn(msgs[i], function (err, ops) {
          if (err) return
          events.emit('insert', msgs[i])
        })
      }
    },

    api: {
      read: function (core, opts, cb) {
        if (typeof opts === 'function' && !cb) {
          cb = opts
          opts = {}
        }
        opts = opts || {}

        var t = through.obj(function (entry, _, next) {
          var id = entry.value
          var feed = core._logs.feed(id.split('@')[0])
          var seq = Number(id.split('@')[1])
          feed.get(seq, function (err, value) {
            if (err) return next(err)
            next(null, {
              key: feed.key.toString('hex'),
              seq: seq,
              value: value
            })
          })
        })

        this.ready(function () {
          db.createReadStream({gt:'k!!', lt:'k!~', limit: opts.limit}).pipe(t)
        })

        if (cb) collect(t, cb)
        else return readonly(t)
      },

      onInsert: function (core, cb) {
        events.on('insert', cb)
      }
    },

    storeState: function (state, cb) {
      db.put('state', state, cb)
    },

    fetchState: function (cb) {
      db.get('state', function (err, state) {
        if (err && err.notFound) cb()
        else if (err) cb(err)
        else cb(null, state)
      })
    },
  }
  return idx
}

