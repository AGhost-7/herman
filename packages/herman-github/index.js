#!/usr/bin/env node

const helmet = require('helmet')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const express = require('express')
const common = require('herman-common')

const validateRequest = exports.validateRequest = (config) => (req, res, next) => {

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

const onEvent = exports.onEvent = (config, channel) => (req, res, next) => {
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

		const message = {
			type: 'git',
			url: url,
			image: imageMatches[0].name,
			tag: body.release.tag_name
		}

		console.log('Event for repository %s with tag %s', repositoryName, message.tag)
		channel.sendToQueue('herman-git', new Buffer(JSON.stringify(message)), { presistent: true })
	} else {
		console.log('Event %s ignored', event)
	}
	res.sendStatus(200)
}

const createApp = exports.createApp = (config, channel) => {
	const app = express()
	app.use(helmet.hidePoweredBy())
	app.use(bodyParser.raw({ type: 'application/json' }))
	app.post('/github-events', validateRequest(config), onEvent(config, channel))
	const port = config.github.port || 4567 
	app.listen(port)
	console.log('Listening on port %s', port)
}

// https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip

const main = exports.main = () => {
	const config = common.loadConfig()
	common.createChannel(config, 'herman-git', (channel) => {
		createApp(config, channel)
	})
}

if(require.main === module) {
	main()
}
