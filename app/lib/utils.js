/**
 * Collection of utility functions.
 * @ignore
 */

import { hostname, networkInterfaces } from 'os'
import { reverse } from 'dns'
import { ensureDir, readdir } from 'fs-extra'
import { promisify } from 'util'
import { extname } from 'path'
import notifier from 'node-notifier'

import { CUSTOM_THEMES_FOLDER, DATA_FOLDER, HISTORY_FOLDER, TMP_FOLDER, LOG_FOLDER, APP_FOLDER, CUSTOM_OVERLAY_THEMES_FOLDER } from './consts'

const asyncReverse = promisify( reverse )

/**
 * Returns the hostname for the IP, if found, else the IP.
 * @param {string} hybridIP The IP address to resolve the hostname for.
 * @async
 * @returns {string} The resolved hostname.
 */
export const getHost = async hybridIP => {
  // Remove the IPv6 compoonent, if the address is a hybrid v4-v6
  const ip = hybridIP.replace( /^.*:/, '' )

  if ( ip === '127.0.0.1' || ip === '1' ) return hostname()

  try {
    const [ hostname ] = await asyncReverse( hybridIP )
    return hostname || ip
  } catch ( err ) {
    return ip
  }
}

/**
 * Retrieves all networked interface IPv4 addersses.
 *! Assumes that networked interfaces always have Ethernet, Wifi, en, eth, wlan.
 */
export const getNetworkedAddresses = () => Object.entries( networkInterfaces() )
  .filter( ( [ name ] ) => name.match( /^(ethernet|wifi|en|eth|wlan)/i ) )
  .reduce( ( interfaces, [ name, addresses ] ) => {
    const { address } = addresses.find( ( { family, internal } ) => !internal && family === 'IPv4' ) || {}

    return address ? { ...interfaces, [ name ]: address } : interfaces
  }, {} )


/**
 * Lists all CSS files in the given path.
 * @param {string} path The path to list all CSS files in.
 * @returns {Promise} An array of the listed CSS files.
 */
export const listCSSFiles = async path => {
  const files = await readdir( path )
  return files.filter( file => extname( file ) === '.css' )
}

/*
 * Creates required filesystem directories for the app to work.
 */
export const ensureRequiredDirs = async () => {
  const dirPerms = { mode: 0o2775 }

  // Create top-level folder first
  await ensureDir( DATA_FOLDER )

  await Promise.all( [
    LOG_FOLDER,
    CUSTOM_THEMES_FOLDER,
    CUSTOM_OVERLAY_THEMES_FOLDER,
    HISTORY_FOLDER,
    TMP_FOLDER,
  ].map( dir => ensureDir( dir, dirPerms ) ) )
}

/**
 * Posts an OS toast notification.
 * @param {string} message The message to send.
 */
export const notify = message => notifier.notify( {
  appID: 'com.shabados.desktop',
  title: 'Shabad OS',
  message,
  icon: `${APP_FOLDER}/lib/logo.png`,
  contentImage: `${APP_FOLDER}/lib/logo.png`,
  wait: true,
} )

/**
 * Sends an IPC message to the electron instance, if exists.
 * @param {string} name The name of the event.
 * @param {*} payload The payload to send.
 */
export const sendToElectron = ( event, payload ) => process.send && process.send( {
  event,
  payload,
} )
