import colors from 'chalk'
import { parseArgs } from 'node:util'
import { willow } from './index'

const printHelp = () => `
${colors.bold('Usage:')}
  willow [options]

${colors.bold('Repository:')}
  https://github.com/escapace/willow

${colors.bold('Options:')}
  --entry           Path to input file to the bundling algorithm (default: "src/index.ts")
  --tsconfig        Path to a tsconfig.json file
  --sourcemap       Emit a source map
  -i, --include     Packages to include in the bundle
  -h, --help        Display this message
`

const help = (message?: string): never => {
  console.log(printHelp())

  if (message !== undefined) {
    console.error(message)

    process.exit(1)
  } else {
    process.exit(0)
  }
}

const { values: options } = parseArgs({
  options: {
    entry: {
      type: 'string'
    },
    include: {
      type: 'string',
      short: 'i',
      multiple: true
    },
    sourcemap: {
      type: 'boolean'
    },
    tsconfig: {
      type: 'string'
    },
    help: {
      type: 'boolean',
      short: 'h'
    }
  }
})

const run = async () => {
  if (options.help === true) {
    help()
  } else {
    try {
      await willow(options)
    } catch (e) {
      if (e instanceof Error) {
        console.error(`${colors.red('Error:')} ${e.message}`)
        process.exit(1)
      }
      console.error('Unknown Error')
      process.exit(1)
    }
  }
}

void run()
