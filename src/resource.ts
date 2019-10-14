import {pipe} from 'fp-ts/lib/pipeable'
import {Option} from 'fp-ts/lib/Option'
import {
  AnyResource,
  Failed,
  Initial,
  Pending,
  Resource,
  Succeded,
  Tag,
} from './types'

export const tags: {[T in Tag]: T} = {
  failed: 'failed',
  initial: 'initial',
  pending: 'pending',
  succeded: 'succeded',
}

export const initial: AnyResource = {_tag: tags.initial}
export const pending: AnyResource = {_tag: tags.pending}
export const failed = <E>(e: E): Resource<any, E> => ({
  _tag: tags.failed,
  error: e,
})
export const succeded = <D>(d: D): Resource<D, any> => ({
  _tag: tags.succeded,
  value: d,
})

export const of = <D, E = any>(a: D): Resource<D, E> => succeded(a)

/**
 * Helpers that ensures current state of resource
 */
export const is = {
  /**
   * Returns true if resource is initial
   */
  initial: (r: AnyResource): r is Initial => r._tag === tags.initial,
  /**
   * Returns true if resource is pending
   */
  pending: (r: AnyResource): r is Pending => r._tag === tags.pending,
  /**
   * Returns true if resource is failed
   */
  failed: (r: AnyResource): r is Failed<any> => r._tag === tags.failed,
  /**
   * Returns true if resource is succeded
   */
  succeded: (r: AnyResource): r is Succeded<any> => r._tag === tags.succeded,
}

export const map = <D, E, R>(f: (d: D) => R) => (
  r: Resource<D, E>,
): Resource<R, E> => {
  return is.succeded(r) ? succeded(f(r.value)) : r
}

export const mapError = <D, E, R>(f: (e: E) => R) => (
  r: Resource<D, E>,
): Resource<D, R> => {
  return is.failed(r) ? failed(f(r.error)) : r
}

export const alt = <D, E>(r1: () => Resource<D, E>) => (r: Resource<D, E>) => {
  return is.succeded(r) ? r : r1()
}

export const bimap = <D, E, R, E1>(
  onSucceded: (d: D) => R,
  onFailed: (e: E) => E1,
) => (r: Resource<D, E>): Resource<R, E1> => {
  if (is.succeded(r)) return succeded(onSucceded(r.value))
  if (is.failed(r)) return failed(onFailed(r.error))
  return r
}

export const chain = <D, E, R>(f: (d: D) => Resource<R, E>) => (
  r: Resource<D, E>,
): Resource<R, E> => {
  return is.succeded(r) ? f(r.value) : r
}

export const fold = <D, E, R>(
  onInitial: () => R,
  onPending: () => R,
  onFailed: (e: E) => R,
  onSucceded: (d: D) => R,
) => (r: Resource<D, E>) => {
  if (is.initial(r)) return onInitial()
  if (is.pending(r)) return onPending()
  if (is.failed(r)) return onFailed(r.error)
  return onSucceded(r.value)
}

const noop = () => undefined

export const cata = <D, E, R>(
  fs: {
    [tags.initial]?: () => R
    [tags.pending]?: () => R
    [tags.failed]?: (e: E) => R
    [tags.succeded]?: (v: D) => R
  } = {},
) => (r: Resource<D, E>) => {
  switch (r._tag) {
    case tags.initial:
      return (fs[tags.initial] || noop)()
    case tags.pending:
      return (fs[tags.pending] || noop)()
    case tags.failed:
      return (fs[tags.failed] || noop)(r.error)
    case tags.succeded:
      return (fs[tags.succeded] || noop)(r.value)
  }
}

export const tap = <D, E>(
  fs: {
    [tags.initial]?: () => void
    [tags.pending]?: () => void
    [tags.failed]?: (e: E) => void
    [tags.succeded]?: (v: D) => void
  } = {},
) => (r: Resource<D, E>) => {
  cata(fs)(r)
  return r
}

export const ap = <D, E1, R, E2>(r: Resource<D, E2>) => (
  rf: Resource<(d: D) => R, E1>,
): Resource<R, E1 | E2> => {
  // failed > pending > initial > succeded

  if (is.failed(rf)) return rf

  if (is.pending(rf)) {
    if (is.failed(r)) return r
    return rf
  }

  if (is.initial(rf)) {
    if (is.failed(r) || is.pending(r)) return r
    return rf
  }

  return map(rf.value)(r) as Resource<R, E1 | E2>
}

export const eq = (a: Resource<any, any>, b: Resource<any, any>) => {
  if (is.failed(a) && is.failed(b)) return a.error === b.error
  if (is.initial(a) && is.initial(b)) return true
  if (is.pending(a) && is.pending(b)) return true
  if (is.succeded(a) && is.succeded(b)) return a.value === b.value
  return false
}

export const lift2 = <A, B, C, E1, E2>(
  f: (a: A) => (b: B) => C,
  a: Resource<A, E1>,
  b: Resource<B, E2>,
): Resource<C, E1 | E2> => {
  return pipe(
    a,
    map(f),
    ap(b),
  )
}

export const lift3 = <A, B, C, D, E1, E2, E3>(
  f: (a: A) => (b: B) => (c: C) => D,
  a: Resource<A, E1>,
  b: Resource<B, E2>,
  c: Resource<C, E3>,
): Resource<D, E1 | E2 | E3> => {
  return pipe(
    a,
    map(f),
    ap(b),
    ap(c),
  )
}

export const lift4 = <A, B, C, D, G, E1, E2, E3, E4>(
  f: (a: A) => (b: B) => (c: C) => (d: D) => G,
  a: Resource<A, E1>,
  b: Resource<B, E2>,
  c: Resource<C, E3>,
  d: Resource<D, E4>,
): Resource<G, E1 | E2 | E3 | E4> => {
  return pipe(
    a,
    map(f),
    ap(b),
    ap(c),
    ap(d),
  )
}

export const concat = <D, R, E1, E2>(r2: Resource<R, E2>) => (
  r1: Resource<D, E1>,
): Resource<[D, R], E1 | E2> => {
  return lift2(a => b => [a, b], r1, r2)
}

export const concat3 = <D, R, L, E1, E2, E3>(
  r2: Resource<R, E2>,
  r3: Resource<L, E3>,
) => (r1: Resource<D, E1>): Resource<[D, R, L], E1 | E2 | E3> => {
  return lift3(a => b => c => [a, b, c], r1, r2, r3)
}

export const concat4 = <D, R, L, P, E1, E2, E3, E4>(
  r2: Resource<R, E2>,
  r3: Resource<L, E3>,
  r4: Resource<P, E4>,
) => (r1: Resource<D, E1>): Resource<[D, R, L, P], E1 | E2 | E3 | E4> => {
  return lift4(a => b => c => d => [a, b, c, d], r1, r2, r3, r4)
}

export const fromNullable = <D = any, E = any>(
  d: D | null | undefined,
): Resource<D, E> => {
  return d == null ? initial : succeded(d)
}

export const toNullable = <D, E>(r: Resource<D, E>): D | null => {
  return is.succeded(r) ? r.value : null
}

export const toUndefined = <D, E>(r: Resource<D, E>): D | undefined => {
  return is.succeded(r) ? r.value : undefined
}

export const getOrElse = <D, E>(f: () => D) => (r: Resource<D, E>) => {
  return is.succeded(r) ? r.value : f()
}

export const recover = <D, E>(onError: (e: E) => Option<D>) => (
  r: Resource<D, E>,
) => {
  const self = () => r
  return cata({
    initial: self,
    pending: self,
    succeded: self,
    failed: (e: E) => {
      const option = onError(e)
      return option._tag === 'Some' ? succeded(option.value) : r
    },
  })(r)
}

export const resource = {
  failed,
  fromNullable,
  initial,
  is,
  of,
  pending,
  succeded,
  toNullable,
  toUndefined,
  ap: <D, E1, R, E2>(
    rf: Resource<(d: D) => R, E1>,
    r: Resource<D, E2>,
  ): Resource<R, E1 | E2> => ap<D, E1, R, E2>(r)(rf),
  map: <D, E, R>(fa: Resource<D, E>, f: (d: D) => R) => map<D, E, R>(f)(fa),
  mapError: <D, E, R>(fa: Resource<D, E>, f: (e: E) => R) => mapError(f)(fa),
  alt: <D, E>(r: Resource<D, E>, r1: () => Resource<D, E>) => alt(r1)(r),
  bimap: <D, E, R, E1>(
    r: Resource<D, E>,
    onSucceded: (d: D) => R,
    onFailed: (e: E) => E1,
  ): Resource<R, E1> => bimap(onSucceded, onFailed)(r),
  chain: <D, E, R>(fa: Resource<D, E>, f: (d: D) => Resource<R, E>) =>
    chain(f)(fa),
  fold: <D, E, R>(
    fa: Resource<D, E>,
    onInitial: () => R,
    onPending: () => R,
    onFailed: (e: E) => R,
    onSucceded: (d: D) => R,
  ) => fold(onInitial, onPending, onFailed, onSucceded)(fa),
  concat: <D, R, E1, E2>(r1: Resource<D, E1>, r2: Resource<R, E2>) =>
    concat<D, R, E1, E2>(r2)(r1),
  concat3: <D, R, L, E1, E2, E3>(
    r1: Resource<D, E1>,
    r2: Resource<R, E2>,
    r3: Resource<L, E3>,
  ) => concat3<D, R, L, E1, E2, E3>(r2, r3)(r1),
  concat4: <D, R, L, P, E1, E2, E3, E4>(
    r1: Resource<D, E1>,
    r2: Resource<R, E2>,
    r3: Resource<L, E3>,
    r4: Resource<P, E4>,
  ) => concat4<D, R, L, P, E1, E2, E3, E4>(r2, r3, r4)(r1),
  cata: <D, E, R>(
    r: Resource<D, E>,
    fs: {
      [tags.initial]?: () => R
      [tags.pending]?: () => R
      [tags.failed]?: (e: E) => R
      [tags.succeded]?: (v: D) => R
    } = {},
  ) => cata(fs)(r),
  tap: <D, E>(
    r: Resource<D, E>,
    fs: {
      [tags.initial]?: () => void
      [tags.pending]?: () => void
      [tags.failed]?: (e: E) => void
      [tags.succeded]?: (v: D) => void
    } = {},
  ) => tap(fs)(r),
  recover: <D, E>(r: Resource<D, E>, onError: (e: E) => Option<D>) => {
    return recover(onError)(r)
  },
  getOrElse: <D, E>(r: Resource<D, E>, f: () => D) => {
    return getOrElse(f)(r)
  },
}
