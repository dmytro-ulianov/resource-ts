import {
  alt,
  AnyResource,
  bimap,
  chain,
  failed,
  initial,
  is,
  map,
  mapError,
  pending,
  Resource,
  resource,
  succeded,
} from '../src'
// import {pipe} from 'fp-ts/lib/pipeable'

describe('type constructors', () => {
  test('of', () => {
    const value = 42
    const expected = {_tag: 'succeded', value}
    expect(resource.of(42)).toEqual(expected)
  })

  test('initial', () => {
    const expected = {_tag: 'initial'}
    expect(initial).toEqual(expected)
    expect(resource.initial).toEqual(expected)
  })

  test('pending', () => {
    const expected = {_tag: 'pending'}
    expect(pending).toEqual(expected)
    expect(resource.pending).toEqual(expected)
  })

  test('failed', () => {
    const error = new Error('oops')
    const expected = {_tag: 'failed', error}
    expect(failed(error)).toEqual(expected)
    expect(resource.failed(error)).toEqual(expected)
  })

  test('succeded', () => {
    const value = 42
    const expected = {_tag: 'succeded', value}
    expect(succeded(value)).toEqual(expected)
    expect(resource.succeded(value)).toEqual(expected)
  })
})

describe('type guards', () => {
  test('initial', () => {
    expect(is.initial(initial)).toBeTruthy()
    expect(is.pending(initial)).toBeFalsy()
    expect(is.failed(initial)).toBeFalsy()
    expect(is.succeded(initial)).toBeFalsy()
  })

  test('pending', () => {
    expect(is.initial(pending)).toBeFalsy()
    expect(is.pending(pending)).toBeTruthy()
    expect(is.failed(pending)).toBeFalsy()
    expect(is.succeded(pending)).toBeFalsy()
  })

  test('failed', () => {
    expect(is.initial(failed(0))).toBeFalsy()
    expect(is.pending(failed(0))).toBeFalsy()
    expect(is.failed(failed(0))).toBeTruthy()
    expect(is.succeded(failed(0))).toBeFalsy()
  })

  test('succeded', () => {
    expect(is.initial(succeded(0))).toBeFalsy()
    expect(is.pending(succeded(0))).toBeFalsy()
    expect(is.failed(succeded(0))).toBeFalsy()
    expect(is.succeded(succeded(0))).toBeTruthy()
  })
})

const makeRs = <D, E>(d: D, e: E) => {
  return {
    initialR: resource.initial as Resource<D, E>,
    pendingR: resource.pending as Resource<D, E>,
    failedR: resource.failed(e) as Resource<D, E>,
    succededR: resource.succeded(d) as Resource<D, E>,
  }
}

describe('resource.map()', () => {
  describe('laws', () => {
    test('identity', () => {
      const rs = makeRs(42, new Error())
      const id = jest.fn(a => a)
      expect(resource.map(rs.initialR, id)).toEqual(rs.initialR)
      expect(resource.map(rs.pendingR, id)).toEqual(rs.pendingR)
      expect(resource.map(rs.failedR, id)).toEqual(rs.failedR)
      expect(resource.map(rs.succededR, id)).toEqual(rs.succededR)
    })

    test('composition', () => {
      const rs = makeRs(42, new Error())

      const f = jest.fn((n: number) => n * 2)
      const g = jest.fn((n: number) => n + 8)

      const chainWith = (r: AnyResource) => map(f)(map(g)(r))
      const composeWith = map((a: any) => f(g(a)))

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })
  })

  test('map over value', () => {
    const value = 10
    const rs = makeRs(value, new Error())
    const double = jest.fn((n: number) => n + 8)

    expect(resource.map(rs.initialR, double)).toEqual(rs.initialR)
    expect(resource.map(rs.pendingR, double)).toEqual(rs.pendingR)
    expect(resource.map(rs.failedR, double)).toEqual(rs.failedR)
    expect(resource.map(rs.succededR, double)).toEqual(
      resource.succeded(double(value)),
    )
  })
})

describe('resource.mapError()', () => {
  describe('laws', () => {
    test('identity', () => {
      const rs = makeRs(42, new Error())
      const id = jest.fn(a => a)
      expect(resource.mapError(rs.initialR, id)).toEqual(rs.initialR)
      expect(resource.mapError(rs.pendingR, id)).toEqual(rs.pendingR)
      expect(resource.mapError(rs.failedR, id)).toEqual(rs.failedR)
      expect(resource.mapError(rs.succededR, id)).toEqual(rs.succededR)
    })

    test('composition', () => {
      const rs = makeRs(42, new Error('oops'))

      const f = jest.fn((m: string) => m.length)
      const g = jest.fn((e: Error) => e.message)

      const chainWith = (r: AnyResource) => mapError(f)(mapError(g)(r))
      const composeWith = mapError((a: any) => f(g(a)))

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })
  })

  test('map over error', () => {
    const error = new Error('oops')
    const rs = makeRs(42, error)
    const getMessage = jest.fn((e: Error) => e.message)

    expect(resource.mapError(rs.initialR, getMessage)).toEqual(rs.initialR)
    expect(resource.mapError(rs.pendingR, getMessage)).toEqual(rs.pendingR)
    expect(resource.mapError(rs.failedR, getMessage)).toEqual(
      resource.failed(getMessage(error)),
    )
    expect(resource.mapError(rs.succededR, getMessage)).toEqual(rs.succededR)
  })
})

describe('resource.alt()', () => {
  describe('laws', () => {
    test('associativity', () => {
      const rs = makeRs('any', new Error())

      const b = () => pending
      const c = () => succeded('pending')

      const chainWith = (r: AnyResource) => alt(c)(alt(b)(r))
      const composeWith = alt(() => alt(c)(b()))

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })

    test('distributivity', () => {
      const rs = makeRs(1, new Error())

      const b = () => succeded(42)
      const f = (n: number) => n * 2

      const chainWith = (r: AnyResource) => map(f)(alt(b)(r))
      const composeWith = (r: AnyResource) => alt(() => map(f)(b()))(map(f)(r))

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })
  })

  test('alt over states except success', () => {
    const rs = makeRs(42, new Error())

    const r1 = succeded(100)
    const b = () => r1

    expect(resource.alt(rs.initialR, b)).toEqual(r1)
    expect(resource.alt(rs.pendingR, b)).toEqual(r1)
    expect(resource.alt(rs.failedR, b)).toEqual(r1)
    expect(resource.alt(rs.succededR, b)).toEqual(rs.succededR)
  })
})

describe('resource.bimap()', () => {
  describe('laws', () => {
    test('identity', () => {
      const rs = makeRs(42, new Error())
      const id = jest.fn(a => a)
      expect(resource.bimap(rs.initialR, id, id)).toEqual(rs.initialR)
      expect(resource.bimap(rs.pendingR, id, id)).toEqual(rs.pendingR)
      expect(resource.bimap(rs.failedR, id, id)).toEqual(rs.failedR)
      expect(resource.bimap(rs.succededR, id, id)).toEqual(rs.succededR)
    })

    test('composition', () => {
      const rs = makeRs(42, 0)

      const f = jest.fn((n: number) => n * 2)
      const g = jest.fn((n: number) => n + 8)

      const fg = (n: number) => f(g(n))

      const chainWith = (r: AnyResource) => bimap(f, f)(bimap(g, g)(r))
      const composeWith = bimap(fg, fg)

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })
  })

  test('map over value and error', () => {
    const value = 10
    const rs = makeRs(value, new Error())
    const double = jest.fn((n: number) => n + 8)

    expect(resource.map(rs.initialR, double)).toEqual(rs.initialR)
    expect(resource.map(rs.pendingR, double)).toEqual(rs.pendingR)
    expect(resource.map(rs.failedR, double)).toEqual(rs.failedR)
    expect(resource.map(rs.succededR, double)).toEqual(
      resource.succeded(double(value)),
    )
  })
})

describe('resource.chain()', () => {
  describe('laws', () => {
    test('associativity', () => {
      const rs = makeRs(42, new Error())

      const f = jest.fn((n: number) => succeded(n * 2))
      const g = jest.fn((n: number) => succeded(n + 8))

      const chainWith = (r: AnyResource) => chain(f)(chain(g)(r))
      const composeWith = chain<number, Error, number>(x => chain(f)(g(x)))

      expect(chainWith(rs.initialR)).toEqual(composeWith(rs.initialR))
      expect(chainWith(rs.pendingR)).toEqual(composeWith(rs.pendingR))
      expect(chainWith(rs.failedR)).toEqual(composeWith(rs.failedR))
      expect(chainWith(rs.succededR)).toEqual(composeWith(rs.succededR))
    })
  })

  test('chain over value', () => {
    const value = 50
    const rs = makeRs(value, new Error())

    const double = (n: number) => n * 2
    const doubleR = (n: number) => succeded(double(n))

    expect(resource.chain(rs.initialR, doubleR)).toEqual(rs.initialR)
    expect(resource.chain(rs.pendingR, doubleR)).toEqual(rs.pendingR)
    expect(resource.chain(rs.failedR, doubleR)).toEqual(rs.failedR)
    expect(resource.chain(rs.succededR, doubleR)).toEqual(
      resource.succeded(double(value)),
    )
  })
})

describe('resource.fold()', () => {
  test('fold', () => {
    const value = 42
    const error = new Error('oops')
    const rs = makeRs(value, error)
    const fs = {
      initial: 'initial',
      pending: 'pending',
      failed: (e: Error) => `failed ${e.message}`,
      succeded: (n: number) => `succeded ${n}`,
    }

    const foldR = (r: AnyResource) =>
      resource.fold(
        r,
        () => fs.initial,
        () => fs.pending,
        e => fs.failed(e),
        n => fs.succeded(n),
      )

    expect(foldR(rs.initialR)).toEqual(fs.initial)
    expect(foldR(rs.pendingR)).toEqual(fs.pending)
    expect(foldR(rs.failedR)).toEqual(fs.failed(error))
    expect(foldR(rs.succededR)).toEqual(fs.succeded(value))
  })
})
