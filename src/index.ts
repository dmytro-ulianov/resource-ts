import {pipe} from 'fp-ts/lib/pipeable'
import * as R from './resource'
export * from './resource'

// const biggerThan10 = (n: number): Resource<boolean, Error> => {
//   // return
// }

pipe(
  R.of<number, Error>(42),
  R.chain((n: number) => R.succeded(n > 10)),
)
