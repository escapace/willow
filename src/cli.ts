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
    help: {
      short: 'h',
      type: 'boolean'
    },
    include: {
      multiple: true,
      short: 'i',
      type: 'string'
    },
    sourcemap: {
      type: 'boolean'
    },
    tsconfig: {
      type: 'string'
    }
  }
})

const run = async () => {
  if (options.help === true) {
    help()
  } else {
    try {
      await willow(options)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`${colors.red('Error:')} ${error.message}`)
        process.exit(1)
      }
      console.error('Unknown Error')
      process.exit(1)
    }
  }
}

void run()
