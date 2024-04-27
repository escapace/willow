import colors from 'chalk'
import type { ExecaChildProcess } from 'execa'
import { EOL } from 'node:os'
import split from 'split2'
import { Transform } from 'node:stream'

class PrefixStream extends Transform {
  private readonly _prefix: string

  constructor(prefix: string) {
    super()

    this._prefix = prefix
  }

  _transform(chunk: Buffer, _: string, done: Function) {
    done(null, `${this._prefix}${chunk.toString()}${EOL}`)
  }
}

export const prefixChildProcess = (
  // eslint-disable-next-line typescript/no-explicit-any
  value: ExecaChildProcess<any>,
  stdout?: NodeJS.Process['stdout'],
  stderr?: NodeJS.Process['stderr'],
) => {
  const icon = '░'

  if (value.stdout !== null && stdout !== undefined) {
    value.stdout
      .pipe(split(/\r?\n/))
      .pipe(new PrefixStream(colors.dim(`${icon} `)))
      .pipe(stdout)
  }

  if (value.stderr !== null && stderr !== undefined) {
    value.stderr
      .pipe(split(/\r?\n/))
      .pipe(new PrefixStream(colors.red(`${icon} `)))
      .pipe(stderr)
  }
}
