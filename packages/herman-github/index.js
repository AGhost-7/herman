#!/usr/bin/env node

const helmet = require('helmet')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const express = require('express')
const fs = require('fs')
const yaml = require('js-yaml')
const amqplib = require('amqplib/callback_api')

const panic = (err) => {
	console.error(err, err.stack)
	process.exit(1)
}

const validateRequest = (config) => (req, res, next) => {

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

const onEvent = (config, channel) => (req, res, next) => {
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
			repositoryName: repositoryName,
			image: imageMatches[0],
			tag: body.release.tag_name
		}

		console.log('Event for repository %s with tag %s', repositoryName, message.tag)
		channel.sendToQueue('herman-git', new Buffer(JSON.stringify(message)), { presistent: true })
	} else {
		console.log('Event %s ignored', event)
	}
	res.sendStatus(200)
}

const createApp = (config, channel) => {
	const app = express()
	app.use(helmet.hidePoweredBy())
	app.use(bodyParser.raw({ type: 'application/json' }))
	app.post('/github-events', validateRequest(config), onEvent(config, channel))
	const port = config.github.port || 4567 
	app.listen(port)
	console.log('Listening on port %s', port)
}

const mergeEnv = (config) => {
	for(var k in config) {
		const val = config[k]
		if(Array.isArray(val)) {
			val.forEach(mergeEnv)
		} else if(val !== null && typeof val === 'object') {
			mergeEnv(val)
		} else if(typeof val === 'string') {
			const match = val.match(/^\s*\$\{(.+)\}\s*$/)
			if(match) {
				const envName = match[1]
				config[k] = process.env[envName]
			}
		}
	}
	return config
}

const loadConfig = () => {
	const filePath = process.env.HERMAN_CONFIG || '/etc/herman/config.yml'
	const config = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'))
	return mergeEnv(config)
}

// https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip

const main = () => {
	const config = loadConfig()
	const onConnected = (err, connection) => {
		if(err) return panic(err)
		console.log('Connected to message broker')
		connection.createChannel((err, channel) => {
			if(err) return panic(err)
			console.log('Channel created')
			channel.assertQueue('herman-git', { durable: true })
			createApp(config, channel)
		})
	}

	if(config.amqp.socket) {
		amqplib.connect(config.amqp.url, config.amqp.socket, onConnected)
	} else {
		amqplib.connect(config.amqp.url, onConnected)
	}
}

if(require.main === module) {
	main()
}
