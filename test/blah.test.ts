import {resource} from '../src/resource'

describe('resource constructor', () => {
  it('works', () => {
    expect(resource.of(42)._tag).toEqual('succeded')
  })
})
