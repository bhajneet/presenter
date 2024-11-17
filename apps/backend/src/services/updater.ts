import { rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { getLogger, isProductionElectron, UPDATE_TMP_FOLDER } from '@presenter/node'
import { knex } from '@shabados/database'
import { EventEmitter } from 'eventemitter3'
import importFresh from 'import-fresh'
import pacote from 'pacote'
import type { PackageJson } from 'type-fest'

import { DATABASE_FOLDER } from '#~/helpers/consts'
import { readJSON } from '#~/helpers/files'

import { dependencies } from '../../package.json'
import { GlobalSettings } from './global-settings'
import ipc from './ipc'

const log = getLogger( 'updater' )

const databasePackage = `@shabados/database@${dependencies[ '@shabados/database' ]}`

const checkApplication = () => new Promise<void>( ( resolve ) => {
  ipc.once( 'electron-update:checked', () => {
    log.info( 'Checked for updates' )
    resolve()
  } )

  ipc.send( 'electron-update:check', undefined )
} )

const isLatestDatabase = async () => {
  const [ remotePackage, localPackage ] = await Promise.all( [
    pacote.manifest( databasePackage ),
    readJSON<PackageJson>( join( DATABASE_FOLDER, 'package.json' ) ),
  ] )

  const { version: local } = localPackage
  const { version: remote } = remotePackage

  log.info( 'Local Database Version:', local )
  log.info( 'Remote Database Version:', remote )

  return localPackage.version === remotePackage.version
}

export type UpdateEvent = 'database:updating'
| 'database:updated'
| 'application:updating'
| 'application:updated'

type UpdaterOptions = {
  tempFolder?: string,
  interval?: number,
  globalSettings: GlobalSettings,
}

const createUpdater = ( {
  globalSettings,
  tempFolder = UPDATE_TMP_FOLDER,
  interval = 1000 * 60 * 5,
}: UpdaterOptions ) => {
  const emitter = new EventEmitter<UpdateEvent>()

  ipc.on( 'electron-update:available', () => emitter.emit( 'application:updating' ) )
  ipc.on( 'electron-update:downloaded', () => emitter.emit( 'application:updated' ) )

  const updateDatabase = async () => {
    log.info( `Downloading database update to ${tempFolder}` )
    await rm( tempFolder, { force: true, recursive: true } )
    await pacote.extract( databasePackage, tempFolder )

    log.info( 'Hot-patching database module' )
    await knex.destroy()

    await rm( DATABASE_FOLDER, { force: true, recursive: true } )
    await rename( tempFolder, DATABASE_FOLDER )

    //! Reimport database - Relies on knex being reinitialised globally
    //! Does not hot-reload code
    importFresh( '@shabados/database' )
  }

  const checkDatabase = async () => {
    log.info( `Checking for database updates satisfying ${databasePackage}` )

    // Exit if there aren't any updates
    if ( await isLatestDatabase() ) {
      log.info( 'No database updates available' )
      return
    }

    emitter.emit( 'database:updating' )
    await updateDatabase()

    emitter.emit( 'database:updated' )
    log.info( 'Database successfully updated' )
  }

  const updateLoop = async ( updateFunction: () => Promise<void> ) => {
    const enabled = globalSettings.get().system.automaticUpdates

    const fn = enabled ? updateFunction : () => Promise.resolve()

    await fn().catch( ( error ) => log.error( error ) )

    setTimeout( () => void updateLoop( updateFunction ), interval )
  }

  const start = () => {
    if ( !isProductionElectron ) return

    updateLoop( checkDatabase ).catch( ( err: Error ) => log.error( { err }, 'Database update failed' ) )
    updateLoop( checkApplication ).catch( ( err: Error ) => log.error( { err }, 'Application update failed' ) )
  }

  const on = ( event: UpdateEvent, fn: () => void ) => emitter.on( event, fn )

  return { start, on }
}

export type Updater = ReturnType<typeof createUpdater>

export default createUpdater
