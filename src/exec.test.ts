import type {ExecOptions} from '@actions/exec'

import exec from './exec.js'

const {execImpl} = vi.hoisted(() => {
  return {execImpl: vi.fn()}
})

vi.mock(import('@actions/exec'), () => {
  return {exec: execImpl} as never
})

describe('exec', () => {
  it('accumulates stdout and stderr and returns them with the exit code', async () => {
    execImpl.mockImplementation(
      async (_commandLine: string, _args?: string[], options?: ExecOptions) => {
        options?.listeners?.stdout?.(Buffer.from('out-one '))
        options?.listeners?.stdout?.(Buffer.from('out-two'))
        options?.listeners?.stderr?.(Buffer.from('err-one '))
        options?.listeners?.stderr?.(Buffer.from('err-two'))
        return 0
      }
    )

    const result = await exec('git', ['status'])

    expect(result).toEqual({
      code: 0,
      stdout: 'out-one out-two',
      stderr: 'err-one err-two'
    })
  })

  it('passes the command and args through and reports a non-zero exit code', async () => {
    execImpl.mockResolvedValue(1)

    const result = await exec('git', ['diff', 'HEAD'])

    expect(execImpl).toHaveBeenCalledWith('git', ['diff', 'HEAD'], expect.anything())
    expect(result).toEqual({code: 1, stdout: '', stderr: ''})
  })

  it('preserves caller-supplied options while installing its own listeners', async () => {
    execImpl.mockResolvedValue(0)

    await exec('git', ['status'], {cwd: '/somewhere', silent: true})

    const options = execImpl.mock.calls[0][2] as ExecOptions
    expect(options.cwd).toEqual('/somewhere')
    expect(options.silent).toEqual(true)
    expect(options.listeners?.stdout).toBeTypeOf('function')
    expect(options.listeners?.stderr).toBeTypeOf('function')
  })
})
