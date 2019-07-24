import {failed, initial, is, pending, resource, succeded} from '../src/resource'

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

describe('resource.map()', () => {
  test('identity', () => {
    const r = resource.of(42)
    const id = jest.fn(a => a)
    expect(resource.map(r, id)).toEqual(r)
    expect(id).toBeCalledTimes(1)
  })

  test('composition', () => {
    const r = resource.of(42)
    const f = jest.fn((n: number) => n * 2)
    const g = jest.fn((n: number) => n + 8)

    const chained = resource.map(resource.map(r, g), f)
    const composed = resource.map(r, a => f(g(a)))

    expect(chained).toEqual(composed)
    expect(f).toBeCalledTimes(2)
    expect(g).toBeCalledTimes(2)
  })

  test('only map when succeded (skip other states)', () => {
    const f = jest.fn((n: number) => n + 8)
    const resources = [initial, pending, failed(0), succeded(42)]
    resources.forEach(r => resource.map(r, f))
    expect(f).toBeCalledTimes(1)
  })
})
