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

  core.writer('local', function (err, feed) {
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

test('tail', function (t) {
  t.plan(4)

  var core = kappa(ram, { valueEncoding: 'json' })
  var idx = memdb()

  var listIdx = list(idx, function (msg, next) {
    if (!msg.value.timestamp) return next()
    next(null, [msg.value.timestamp])
  })
  core.use('timestamp', listIdx)

  var docs = [
    { timestamp: '2017' },
    { timestamp: '2018' },
    { timestamp: '2019' },
    { timestamp: '2010' }
  ]

  var n = 0
  var feed

  core.api.timestamp.tail(2, function (msgs) {
    msgs = msgs.map(msg => msg.value)
    switch (n) {
      case 0: t.deepEquals(msgs, [{timestamp:'2017'}]); break;
      case 1: t.deepEquals(msgs, [{timestamp:'2017'},{timestamp:'2018'}]); break;
      case 2: t.deepEquals(msgs, [{timestamp:'2018'},{timestamp:'2019'}]); break;
      case 3: t.deepEquals(msgs, [{timestamp:'2018'},{timestamp:'2019'}]); break;
      default: t.fail('bad case')
    }
    ++n
    write()
  })

  core.writer('local', function (err, theFeed) {
    feed = theFeed
    write()
  })

  function write () {
    if (n >= docs.length) return
    feed.append(docs[n], function (err, seq) {
      console.log('wrote', seq)
    })
  }
})
