'use strict'

const path = require('path')

const inflight = require('promise-inflight')
const {google} = require('googleapis')
const {auth: nodeAuth} = require('google-auth-library')

const log = require('./logger')

let authClient = null

// In local development, look for an auth.json file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'test') {
  log.warn('GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./auth.json credentials file...')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '.auth.json')
}

// only public method, returns the authClient that can be used for making other requests
exports.getAuth = async () => {
  if (authClient && process.env.NODE_ENV !== 'test') return authClient
  return setAuthClient()
}

// configures the auth client if we don't already have one
async function setAuthClient() {
  return inflight('auth', async () => {
    // In Heroku environment, set GOOGLE_APPLICATION_CREDENTIALS as auth json object to be parsed
    try {
      const keys = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      authClient = nodeAuth.fromJSON(keys)
    } catch (err) {
      log.info('Couldn\'t get auth client credentials', err.message)
      const {credential} = await google.auth.getApplicationDefault()
      authClient = credential
    }

    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      authClient = authClient.createScoped([
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/datastore'
      ])
    }
    google.options({auth: authClient})
    log.info('Google API auth successfully retrieved.')

    return authClient
  })
}
