import process from 'process'
import assert from 'static-type-assert'
import Splitter from 'split-shell-buffer'

assert.compare<Splitter.Data, Buffer>('broaderLeft')
assert.compare<Splitter.Data, ReadonlyArray<Splitter.Code>>('broaderLeft')
assert.compare<Splitter.Data, Splitter.Code[]>('broaderLeft')
assert.compare<Splitter.Sequence, Buffer>('broaderLeft')
assert.compare<Splitter.Sequence, ReadonlyArray<Splitter.Code>>('broaderLeft')
assert.compare<Splitter.Sequence, Splitter.Code[]>('broaderLeft')
assert.compare<Splitter.Writable, typeof process.stdout>('broaderLeft')
assert.compare<Splitter.Writable, typeof process.stderr>('broaderLeft')

const splitter = new Splitter({ data: [] })
splitter.write(process.stdout)
splitter.writeln(process.stdout)

new Splitter({ data: Buffer.from('') })
new Splitter({ data: Buffer.from(''), prefix: Buffer.from(''), suffix: Buffer.from('') })
new Splitter({ data: [0, 1, 2, 3] })
new Splitter({ data: [0, 1], prefix: [2, 3], suffix: [4, 5] })
