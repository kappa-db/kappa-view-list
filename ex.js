var memdb = require('memdb')
var kappa = require('kappa-core')
var ram = require('random-access-memory')
var list = require('.')

var core = kappa(ram, { valueEncoding: 'json' })
var idx = memdb()

var listIdx = list(idx, function (msg, next) {
  if (!msg.value.timestamp) return next()
  next(null, [msg.value.timestamp])
})
core.use('timestamp', listIdx)

core.feed('local', function (err, feed) {
  var docs = [
    { timestamp: '2018-11-04T17:45:55.524Z', id: 'foo' },
    { timestamp: '2017-11-04T12:15:00.524Z', id: 'foo', n: 3 },
    { timestamp: '2018-12-04T07:00:00.524Z', id: 'foo', n: 12 }
  ]
  feed.append(docs, function (err, seq) {
    core.api.timestamp.read({ limit: 2 }, function (err, values) {
      console.log('values', values)
    })
  })

  core.api.timestamp.onInsert(function (msg) {
    console.log('update', msg.seq)
  })
})

