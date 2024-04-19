import { safeReadPackageJson } from '@pnpm/read-package-json'
import archiver from 'archiver'
import assert from 'node:assert'
import builtinModules from 'builtin-modules'
import { build } from 'esbuild'
import { execa } from 'execa'
import { createWriteStream } from 'node:fs'
import fse from 'fs-extra'
import { mkdir } from 'node:fs/promises'
import { mapValues, pickBy, uniq } from 'lodash-es'
import path from 'node:path'
import semver from 'semver'
import temporaryDirectory from 'temp-dir'
import { v4 as uuidv4 } from 'uuid'
import { prefixChildProcess } from './prefix-child-process'

export interface Options {
  cwd?: string
  entry?: string
  include?: string[]
  sourcemap?: boolean
  tsconfig?: string
}

export const NODE_SEMVER = '>=18'

export const willow = async (options: Options = {}) => {
  const cwd = options.cwd ?? process.cwd()
  const tsconfig = path.resolve(
    cwd,
    options.tsconfig ?? path.join(cwd, 'tsconfig.json')
  )
  const entry = path.resolve(
    cwd,
    options.entry ?? path.join(cwd, 'src', 'index.ts')
  )
  const noExternal = options.include ?? []
  const outdir = path.join(temporaryDirectory, uuidv4())

  const sourcemap = options.sourcemap === true ? 'linked' : false

  let error: unknown

  try {
    const packageJSONPath = path.join(cwd, 'package.json')
    const packageJSON = await safeReadPackageJson(packageJSONPath)

    assert.ok(packageJSON !== null, `Unable to read '${packageJSONPath}'.`)

    const dependencies = packageJSON.dependencies ?? {}
    const nodeMinVersion = semver.minVersion(NODE_SEMVER)?.version
    const nodeVersion = semver.minVersion(
      typeof packageJSON.engines?.node === 'string'
        ? semver.validRange(packageJSON.engines.node) ?? NODE_SEMVER
        : NODE_SEMVER
    )?.version

    assert.ok(typeof nodeMinVersion === 'string')
    assert.ok(typeof nodeVersion === 'string')

    const external = uniq([
      ...Object.keys(dependencies),
      ...builtinModules,
      ...builtinModules.map((value) => `node:${value}`),
      'node:assert/strict'
    ]).filter((value) => !noExternal.includes(value))
    const zip = path.join(cwd, 'lib', 'lambda.zip')

    assert.ok(
      semver.satisfies(nodeVersion, NODE_SEMVER),
      `Minumum target version is ${nodeMinVersion}.`
    )

    assert.ok(await fse.exists(entry))

    process.umask(0o022)
    process.chdir(cwd)

    await fse.remove(outdir)
    await fse.remove(zip)
    await mkdir(outdir, { recursive: true })
    await mkdir(path.dirname(zip), { recursive: true })

    await build({
      bundle: true,
      entryPoints: [entry],
      external,
      format: 'esm',
      logLevel: 'warning',
      mainFields: ['module', 'main'],
      minify: true,
      outdir,
      outExtension: { '.js': '.mjs' },
      platform: 'node',
      sourcemap,
      target: `node${nodeVersion}`,
      tsconfig
    })

    await fse.writeJson(path.join(outdir, 'package.json'), {
      dependencies: pickBy(
        mapValues(dependencies, (value) => semver.clean(value)),
        (_, key) => external.includes(key)
      ),
      main: 'index.mjs',
      name: packageJSON.name,
      type: 'module',
      version: packageJSON.version
    })

    const instance = execa(
      'npm',
      ['install', '--no-fund', '--no-package-lock', '--omit=dev', '--no-audit'],
      { cleanup: true, cwd: outdir }
    )

    prefixChildProcess(instance, process.stdout, process.stderr)

    await instance

    const output = createWriteStream(zip)

    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    archive.on('error', (error) => {
      throw error
    })

    // await fse.remove(path.join(outdir, 'package.json'))
    // await fse.remove(path.join(outdir, 'package-lock.json'))
    archive.directory(outdir, false)
    archive.pipe(output)
    await archive.finalize()
  } catch (error_) {
    error = error_
  }

  await fse.remove(outdir)

  if (error !== undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error
  }
}
