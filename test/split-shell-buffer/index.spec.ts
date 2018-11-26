import EventEmitter from 'events'
import { normalText, styledText } from './.lib/data'

import {
  create,
  fromIterable,
  fromString,
  fromEventedStream,
  fromIterableStream,
  fromChildProcess,
  toString,
  write,
  writeln,
  SplitterObject,
  EventedStream,
  ChildProcess
} from 'split-shell-buffer'

const mkemit = (emitter: EventEmitter) => (timeout: number, event: string, ...args: any[]) => {
  setTimeout(() => emitter.emit(event, ...args), timeout)
}

class EventedStreamObject extends EventEmitter implements EventedStream {}

class ChildProcessObject extends EventEmitter implements ChildProcess {
  public readonly stdout = new EventedStreamObject()
  public readonly stderr = new EventedStreamObject()
}

describe('create()', () => {
  describe('constructs an object', () => {
    const splitter = create({
      data: Buffer.from(normalText)
    })

    it('which is an instance of SplitterObject', () => {
      expect(splitter).toBeInstanceOf(SplitterObject)
    })

    it('which has desired properties', () => {
      expect(splitter).toMatchObject({
        prefix: [],
        suffix: [],
        data: Buffer.from(normalText)
      })
    })
  })
})

describe('fromIterable()', () => {
  it('constructs correct object', () => {
    expect(
      fromIterable(Buffer.from(normalText))
    ).toEqual(
      create({
        data: Buffer.from(normalText)
      })
    )
  })
})

describe('fromEventedStream()', () => {
  class Init {
    public readonly stream = new EventedStreamObject()
    public readonly splitter = fromEventedStream(this.stream)
    public readonly emit = mkemit(this.stream)
  }

  it('when provided stream emits all data at once', async () => {
    const { splitter, emit } = new Init()

    emit(100, 'data', Buffer.from(normalText))
    emit(200, 'close')

    expect(await toString(splitter)).toBe(normalText)
  })

  it('when provided stream emits data line by line', async () => {
    const { splitter, emit } = new Init()

    normalText.split('\n')
      .map(line => line + '\n')
      .map(line => Buffer.from(line))
      .forEach((line, index) => emit(index, 'data', line))

    emit(100, 'close')

    expect(await toString(splitter)).toBe(normalText + '\n')
  })

  it('when provided stream emits data character by character', async () => {
    const { splitter, emit } = new Init()

    Array
      .from(normalText)
      .map(char => Buffer.from(char))
      .forEach((char, index) => emit(index, 'data', char))

    emit(normalText.length, 'close')

    expect(await toString(splitter)).toBe(normalText)
  })

  it('when provided stream emits data as string', async () => {
    const { splitter, emit } = new Init()

    emit(100, 'data', normalText)
    emit(200, 'close')

    expect(await toString(splitter)).toBe(normalText)
  })

  it('when provided stream emits an error', () => {
    const error = new Error('Expected')
    const { splitter, emit } = new Init()

    emit(100, 'error', error)

    // tslint:disable-next-line:no-floating-promises
    expect(toString(splitter)).rejects.toBe(error)
  })
})

describe('fromIterableStream()', () => {
  it('when provided stream yields instances of Buffer', async () => {
    async function * iterate () {
      for (const chunk of normalText.split('\n')) {
        yield Buffer.from(chunk + '\n')
      }
    }

    const stream = {
      [Symbol.asyncIterator]: iterate
    }

    expect(
      await toString(fromIterableStream(stream))
    ).toBe(normalText + '\n')
  })

  it('when provided stream yields strings', async () => {
    async function * iterate () {
      for (const chunk of normalText.split('\n')) {
        yield chunk + '\n'
      }
    }

    const stream = {
      [Symbol.asyncIterator]: iterate
    }

    expect(
      await toString(fromIterableStream(stream))
    ).toBe(normalText + '\n')
  })
})

describe('fromChildProcess()', () => {
  class Init {
    public readonly process = new ChildProcessObject()
    public readonly splitter = fromChildProcess(this.process)
    public readonly emitProcess = mkemit(this.process)
    public readonly emitStdOut = mkemit(this.process.stdout)
    public readonly emitStdErr = mkemit(this.process.stderr)
  }

  it('when provided child process yields output through stdout', async () => {
    const { splitter, emitProcess, emitStdOut } = new Init()

    emitStdOut(100, 'data', Buffer.from(normalText))
    emitStdOut(200, 'close')
    emitProcess(200, 'close')

    expect(await toString(splitter)).toBe(normalText)
  })

  it('when provided child process yields output through stderr', async () => {
    const { splitter, emitProcess, emitStdErr } = new Init()

    emitStdErr(100, 'data', Buffer.from(normalText))
    emitProcess(200, 'close')

    expect(await toString(splitter)).toBe(normalText)
  })

  it('when provided child process yields output through both stdout and stderr', async () => {
    const { splitter, emitProcess, emitStdOut, emitStdErr } = new Init()

    emitStdOut(10, 'data', Buffer.from('out 0\n'))
    emitStdErr(20, 'data', Buffer.from('err 0\n'))
    emitStdOut(30, 'data', Buffer.from('out 1\n'))
    emitStdOut(40, 'data', Buffer.from('out 2\n'))
    emitStdErr(50, 'data', Buffer.from('err 1\n'))
    emitStdErr(60, 'data', Buffer.from('err 2\n'))
    emitProcess(100, 'close')

    expect(await toString(splitter)).toBe([
      'out 0',
      'err 0',
      'out 1',
      'out 2',
      'err 1',
      'err 2',
      ''
    ].join('\n'))
  })
})

describe('fromString()', () => {
  it('constructs correct object', () => {
    expect(
      fromString(normalText)
    ).toEqual(
      create({
        data: Buffer.from(normalText)
      })
    )
  })
})

describe('toString()', () => {
  describe('with default options', () => {
    it('with normal text', async () => {
      expect(
        await toString(fromString(normalText))
      ).toEqual(
        await toString(
          fromString(normalText),
          { finalNewLine: false, encoding: 'utf8' }
        )
      )
    })

    it('with styled text', async () => {
      expect(
        await toString(fromString(styledText))
      ).toMatchSnapshot()
    })
  })

  describe('preserves normal text', () => {
    it('without options', async () => {
      expect(
        await toString(fromString(normalText))
      ).toEqual(normalText)
    })

    it('with finalNewLine = true', async () => {
      expect(
        await toString(
          fromString(normalText),
          { finalNewLine: true }
        )
      ).toEqual(normalText + '\n')
    })

    it('with encoding = "hex"', async () => {
      expect(
        await toString(
          fromString(normalText),
          { encoding: 'hex' }
        )
      ).toEqual(
        Buffer.from(normalText).toString('hex')
      )
    })
  })
})

describe('write()', () => {
  describe('with normal text', () => {
    const splitter = fromString(normalText)

    it('passes instances of Buffer to writable.write', async () => {
      await write({
        write (instance) {
          expect(instance).toBeInstanceOf(Buffer)
        }
      }, splitter)
    })

    it('passes buffers by line to writable.write', async () => {
      let count = 0

      await write({
        write () {
          count += 1
        }
      }, splitter)

      expect(count).toBe(normalText.split('\n').length)
    })

    it('passes buffers that resemble original text to writable.write', async () => {
      let text = ''

      await write({
        write (buffer) {
          text += buffer.toString()
        }
      }, splitter)

      expect(text).toBe(normalText)
    })
  })

  describe('with styled text', () => {
    const splitter = fromString(styledText)

    it('passes instances of Buffer to writable.write', async () => {
      await write({
        write (instance) {
          expect(instance).toBeInstanceOf(Buffer)
        }
      }, splitter)
    })

    it('passes buffers by line to writable.write', async () => {
      let count = 0

      await write({
        write () {
          count += 1
        }
      }, splitter)

      expect(count).toBe(styledText.split('\n').length)
    })

    it('passes buffers that resemble toString() to writable.write', async () => {
      let text = ''

      await write({
        write (buffer) {
          text += buffer.toString()
        }
      }, splitter)

      expect(text).toBe(await toString(splitter))
    })
  })
})

describe('writeln()', () => {
  describe('with normal text', () => {
    const splitter = fromString(normalText)

    it('passes instances of Buffer to writable.write', async () => {
      await writeln({
        write (instance) {
          expect(instance).toBeInstanceOf(Buffer)
        }
      }, splitter)
    })

    it('passes buffers by line to writable.write', async () => {
      let count = 0

      await writeln({
        write () {
          count += 1
        }
      }, splitter)

      expect(count).toBe(normalText.split('\n').length)
    })

    it('passes buffers that resemble original text with trailing eol to writable.write', async () => {
      let text = ''

      await writeln({
        write (buffer) {
          text += buffer.toString()
        }
      }, splitter)

      expect(text).toBe(normalText + '\n')
    })
  })

  describe('with styled text', () => {
    const splitter = fromString(styledText)

    it('passes instances of Buffer to writable.write', async () => {
      await writeln({
        write (instance) {
          expect(instance).toBeInstanceOf(Buffer)
        }
      }, splitter)
    })

    it('passes buffers by line to writable.write', async () => {
      let count = 0

      await writeln({
        write () {
          count += 1
        }
      }, splitter)

      expect(count).toBe(styledText.split('\n').length)
    })

    it('passes buffers that resemble toString() with trailing eol to writable.write', async () => {
      let text = ''

      await writeln({
        write (buffer) {
          text += buffer.toString()
        }
      }, splitter)

      expect(text).toBe(await toString(splitter) + '\n')
    })
  })
})

describe('SplitterObject::withPrefix()', () => {
  it('creates a new instance', () => {
    const a = fromIterable([])
    const b = a.withPrefix([])
    expect(b).not.toBe(a)
  })

  it('creates an instance with modified prefix', () => {
    const prefix = Buffer.from('prefix')

    expect(
      fromIterable([])
        .withPrefix(prefix)
    ).toEqual(
      create({ data: [], prefix })
    )
  })
})

describe('SplitterObject::withSuffix()', () => {
  it('creates a new instance', () => {
    const a = fromIterable([])
    const b = a.withSuffix([])
    expect(b).not.toBe(a)
  })

  it('creates an instance with modified suffix', () => {
    const suffix = Buffer.from('prefix')

    expect(
      fromIterable([])
        .withSuffix(suffix)
    ).toEqual(
      create({ data: [], suffix })
    )
  })
})

describe('SplitterObject::withIndent()', () => {
  it('calls withPrefix()', () => {
    expect(
      fromIterable([])
        .withIndent(4)
    ).toEqual(
      fromIterable([])
        .withPrefix(Buffer.from(' '.repeat(4)))
    )
  })
})
