import { generateInlinedScript } from '@berry/pnp'
import { Lockfile } from '@pnpm/lockfile-file'
import readImporterManifest from '@pnpm/read-importer-manifest'
import { nameVerFromPkgSnapshot } from '@pnpm/lockfile-utils'
import path = require('path')
import R = require('ramda')

export function lockfileToPlugAndPlay (lockfile: Lockfile) {
  const loaderFile = generateInlinedScript()
}

async function lockfileToPackageRegistry (lockfileDirectory: string, lockfile: Lockfile) {
  const packageRegistry = new Map()
  for (const importerId of Object.keys(lockfile.importers)) {
    const importer = lockfile.importers[importerId]
    if (importerId === '.') {
      const packageStore = new Map([
        [
          null,
          {
            packageLocation: './',
            packageDependencies: new Map(
              R.toPairs({
                ...importer.dependencies,
                ...importer.optionalDependencies,
                ...importer.devDependencies,
              }),
            ),
          },
        ],
      ])
      packageRegistry.set(null, packageStore)
    } else {
      // This info should be passed in
      const { manifest } = await readImporterManifest(path.join(lockfileDirectory, importerId))
      const packageStore = new Map([
        [
          importerId,
          {
            packageLocation: importerId,
            packageDependencies: new Map(
              R.toPairs({
                ...importer.dependencies,
                ...importer.optionalDependencies,
                ...importer.devDependencies,
              }),
            ),
          },
        ],
      ])
      packageRegistry.set(manifest.name, packageStore)
    }
  }
  for (const [relDepPath, pkgSnapshot] of R.toPairs(lockfile.packages || {})) {
    const { name, version } = nameVerFromPkgSnapshot(relDepPath, pkgSnapshot)
    let packageStore = packageRegistry.get(name)
    if (!packageStore) {
      packageStore = new Map()
      packageRegistry.set(name, packageStore)
    }

    packageStore.set(version, )
  }
}
