var test = require('tape')
var memdb = require('memdb')
var ram = require('random-access-memory')
var kappa = require('kappa-core')
var collect = require('collect-stream')
var list = require('..')

test('timestamp', function (t) {
  t.plan(5)

  var core = kappa(ram, { valueEncoding: 'json' })
  var idx = memdb()

  var listIdx = list(idx, function (msg, next) {
    if (!msg.value.timestamp) return next()
    next(null, [msg.value.timestamp])
  })
  core.use('timestamp', listIdx)

  var docs = [
    { timestamp: '2018-11-04T17:45:55.524Z', id: 'foo' },
    { timestamp: '2017-11-04T12:15:00.524Z', id: 'foo', n: 3 },
    { timestamp: '2018-12-04T07:00:00.524Z', id: 'foo', n: 12 }
  ]

  core.feed('local', function (err, feed) {
    feed.append(docs, function (err, seq) {
      core.api.timestamp.read({ limit: 2 }, function (err, values) {
        t.error(err)
        values = values.map(v => v.value)
        t.deepEquals(values, [docs[1], docs[0]])
      })
    })
  })

  var n = 0
  core.api.timestamp.onInsert(function (msg) {
    t.deepEquals(msg.value, docs[n], 'update ok')
    n++
  })
})
