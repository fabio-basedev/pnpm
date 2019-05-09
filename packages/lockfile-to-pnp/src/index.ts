import pnp = require('@berry/pnp')
import { Lockfile } from '@pnpm/lockfile-file'
import {
  nameVerFromPkgSnapshot,
  packageIdFromSnapshot,
} from '@pnpm/lockfile-utils'
import pkgIdToFilename from '@pnpm/pkgid-to-filename'
import { Registries } from '@pnpm/types'
import { refToRelative } from 'dependency-path'
import path = require('path')
import R = require('ramda')

export function lockfileToPackageRegistry (
  lockfile: Lockfile,
  opts: {
    importerNames: { [importerId: string]: string },
    lockfileDirectory: string,
    storeDirectory: string,
    registries: Registries,
  },
) {
  const packageRegistry = new Map()
  for (const importerId of Object.keys(lockfile.importers)) {
    const importer = lockfile.importers[importerId]
    if (importerId === '.') {
      const packageStore = new Map([
        [
          null,
          {
            packageDependencies: new Map([
              ...(importer.dependencies && toPackageDependenciesMap(lockfile, importer.dependencies) || []),
              ...(importer.optionalDependencies && toPackageDependenciesMap(lockfile, importer.optionalDependencies) || []),
              ...(importer.devDependencies && toPackageDependenciesMap(lockfile, importer.devDependencies) || []),
            ]),
            packageLocation: './',
          },
        ],
      ])
      packageRegistry.set(null, packageStore)
    } else {
      const name = opts.importerNames[importerId]
      const packageStore = new Map([
        [
          importerId,
          {
            packageDependencies: new Map([
              [name, importerId],
              ...(importer.dependencies && toPackageDependenciesMap(lockfile, importer.dependencies, importerId) || []),
              ...(importer.optionalDependencies && toPackageDependenciesMap(lockfile, importer.optionalDependencies, importerId) || []),
              ...(importer.devDependencies && toPackageDependenciesMap(lockfile, importer.devDependencies, importerId) || []),
            ]),
            packageLocation: importerId,
          },
        ],
      ])
      packageRegistry.set(name, packageStore)
    }
  }
  for (const [relDepPath, pkgSnapshot] of R.toPairs(lockfile.packages || {})) {
    const { name, version } = nameVerFromPkgSnapshot(relDepPath, pkgSnapshot)
    let packageStore = packageRegistry.get(name)
    if (!packageStore) {
      packageStore = new Map()
      packageRegistry.set(name, packageStore)
    }

    const packageId = packageIdFromSnapshot(relDepPath, pkgSnapshot, opts.registries)
    // TODO: what about packages that are built?
    // Also, storeController has .getPackageLocation()
    const packageLocation = path.join(
      opts.storeDirectory,
      pkgIdToFilename(packageId, opts.lockfileDirectory),
      'node_modules',
      name,
    )
    packageStore.set(version, {
      packageDependencies: new Map([
        [name, version],
        ...(pkgSnapshot.dependencies && toPackageDependenciesMap(lockfile, pkgSnapshot.dependencies) || []),
        ...(pkgSnapshot.optionalDependencies && toPackageDependenciesMap(lockfile, pkgSnapshot.optionalDependencies) || []),
      ]),
      packageLocation,
    })
  }

  return packageRegistry
}

function toPackageDependenciesMap (
  lockfile: Lockfile,
  deps: {
    [depAlias: string]: string,
  },
  importerId?: string
): Array<[string, string | [string, string]]> {
  return R.toPairs(deps).map(([depAlias, ref]) => {
    if (importerId && ref.startsWith('link:')) {
      return [depAlias, path.join(importerId, ref.substr(5))]
    }
    if (ref[0] !== '/') return [depAlias, ref]
    const relDepPath = refToRelative(ref, depAlias)
    if (!relDepPath) return [depAlias, ref]
    const { name, version } = nameVerFromPkgSnapshot(relDepPath, lockfile.packages![relDepPath])
    return [depAlias, [name, version]]
  })
}
