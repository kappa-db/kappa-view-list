# kappa-view-list

> General purpose sorted list view for [kappa-core][kappa-core].

This view models a sorted list materialized view, on top of a set of
append-only logs. It allows for reading subsets of entries from that sorted
list, and tailing the end of it.

## Usage

Let's build a view that orders messages by their ISO timestamp:

```js
var memdb = require('memdb')
var kappa = require('kappa-core')
var ram = require('random-access-memory')
var list = require('kappa-view-list')

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

```

outputs

```
update 0
update 1
update 2
values [ { key: 'c068a25f1579c6094b41849df3e11bf0db0a36c0c9567605f5f60a4af3ad121a',
    seq: 1,
    value: { timestamp: '2017-11-04T12:15:00.524Z', id: 'foo', n: 3 } },
  { key: 'c068a25f1579c6094b41849df3e11bf0db0a36c0c9567605f5f60a4af3ad121a',
    seq: 0,
    value: { timestamp: '2018-11-04T17:45:55.524Z', id: 'foo' } } ]
```

The list is in ascending order by default.

## API

```js
var list = require('kappa-view-list')
```

### var view = list(lvl, mapFn)

Creates a new kappa view, `view`, using the LevelUP/LevelDOWN storage `lvl` and
a mapping function `mapFn`.

Here's how `mapFn` works:

```js
// here, msg.value.timestamp is the field to sort on
function mapMsgToSortFields (msg, next) {
  next(null, [msg.value.timestamp])
}
```

The callback `next` is called as `next(error?, [field])`.

From here, you can use `core.use(name, view)` to install it into a
[kappa-core][kappa-core]. What follows are the APIs that get exposed if you did
`core.use('list', view)`:

### [var rs = ]core.list.read([opts,] [cb])

Returns a subset of the list. If no callback `cb` is given, a Readable stream
`rs` is returned. Otherwise, results are given as a list via the callback `cb`.

Each result has the form

```js
{
  key: 'hexadecimal_feed_key',
  seq: Number,
  value: { user: 'data' }
}
```

`opts` can be Level-like parameters for controlling the results. Some examples are:

- `limit` (Number): maximum number of results to return
- `gt`: the value of the lowest field to return
- `lt`: the value of the highest field to return

Fetching all entries with timestamps between 2017 and 2018 could look like this:

```js
var stream = core.api.timestamp.read({gte: '2017-00-00T00:00:000Z', lt: '2018-00-00T00:00:000Z'})
```

### core.list.tail(size, fn)

Listen for updates to the upper end of the list, a window of size `size`. `fn`
is called with a list of messages.

### core.list.onInsert(fn)

Subscribe to updates to every list insertion. The function `fn` is called as `fn(key, value)`.

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install kappa-view-list
```

## License

ISC

[kappa-core]: https://github.com/noffle/kappa-core

