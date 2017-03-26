#!/usr/bin/env node

'use strict'

const helmet = require('helmet')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const express = require('express')
const common = require('herman-common')

const validateRequest = exports.validateRequest = (req, res, next) => {

	const config = req.app.get('config')

	const signature = req.get('X-Hub-Signature')
	if(!signature) {
		return res.sendStatus(401)
	}

	const hmac = crypto.createHmac('sha1', config.github.secret)
	hmac.update(req.body)
	const digest = 'sha1=' + hmac.digest('hex')

	if(signature !== digest) {
		console.error('Invalid signature %s', signature)
		return res.sendStatus(401)
	}

	next()
}
const onEvent = exports.onEvent = (req, res, next) => {
	const channel = req.app.get('channel')
	const config = req.app.get('config')
	const body = JSON.parse(req.body)
	const event = req.get('X-Github-Event')
	if(event === 'release') {
		const url = body.repository.ssh_url
		const imageMatches = config.github.images.filter((image) => image.url === url)
		const repositoryName = body.repository.full_name

		if(imageMatches.length < 1) {
			console.log('Ignoring release for repository %s', repositoryName)
			return res.sendStatus(200)
		}
		const tag = body.release.tag_name

		imageMatches.forEach((image) => {
			const message = {
				type: 'git',
				url: url,
				image: image.name,
				tag: body.release.tag_name
			}
			if(image.path) message.path = image.path
			channel.sendToQueue(
				'herman-git',
				new Buffer(JSON.stringify(message)),
				{ presistent: true }
			)
		})

		console.log(
			'Event %s for repository %s with tag %s',
			event,
			repositoryName,
			tag
		)

	} else {
		console.log('Event %s ignored', event)
	}
	res.sendStatus(200)
}

const createApp = exports.createApp = (config, channel) => {
	const app = express()
	app.use(helmet.hidePoweredBy())
	app.use(bodyParser.raw({ type: 'application/json' }))
	app.set('channel', channel)
	app.set('config', config)
	app.post('/github-events', validateRequest, onEvent)
	const port = config.github.port || 4567 
	app.listen(port)
	console.log('Listening on port %s', port)
	return app
}

const listenConfig = (onChange) => {
}

// https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip

const main = exports.main = () => {
	let config = common.loadConfig()
	common.createChannel(config, 'herman-git', (channel) => {
		const app = createApp(config, channel)
		common.watchConfig((changed) => {
			app.set('config', changed)
		})
	})
}

if(require.main === module) {
	main()
}
