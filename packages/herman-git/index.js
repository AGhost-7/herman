#!/usr/bin/env node

const uuid = require('uuid')
const common = require('herman-common')
const amqplib = require('amqplib')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const spawnProcess = (command, args, done) => {
	const proc = spawn(
		command,
		args,
		{ stdio: 'inherit' }
	)

	proc.on('error', (err) => {
		done(err)
	})

	proc.on('close', () => {
		done()
	})
}

const fetchRepository = (config, message, done) => {
	const buildId = uuid.v4()
	const buildPath = path.join(config.git.dir, message.source, buildId)

	// Based on how travis fetches repositories
	spawnProcess(
		'git',
		['clone', '--depth=50', message.url, buildPath],
		(err) => {
			if(err) return done(err)
			done(null, buildPath)
		})
}

const buildImage = (config, message, directory, done) => {

	console.log('message:', JSON.stringify(message, null, 2))
	const imageName = config.docker.registry
		? config.docker.registry + '/' + message.image + ':' + message.tag
		: message.image + message.tag

	spawnProcess(
		'docker',
		['build', '--tag', imageName, directory],
		(err) => {
			if(err) return done(err)
			done(null, imageName)
		})
}

const pushImage = (config, message, image, done) => {
	spawnProcess(
		'docker',
		['push', image],
		done
	)
}

const onEvent = (config, channel, message, body) => {
	fetchRepository(config, body, (err, directory) => {
		if(err) {
			console.error('Error fetching repository', err)
			return channel.nack(message)
		}
		buildImage(config, body, directory, (err, image) => {
			if(err) {
				// If we fail to build the image then we should
				// remove it from the queue as it will probably
				// not work even if we move to another server.
				console.error('Error building image:', err)
				return channel.ack(message)
			}
			pushImage(config, body, image, (err) => {
				if(err) {
					console.error('Error pushing image to repository', err)
					return channel.nack(message)
				}
				channel.ack(message)
			})
		})
	})
}

const main = () => {
	const config = common.loadConfig()
	common.createChannel(config, 'herman-git', (channel) => {
		channel.consume('herman-git', (message) => {
			const body = JSON.parse(message.content)
			console.log('body:', body)
			onEvent(config, channel, message, body)
		}, { noAck: false })
	})
}

if(require.main === module) {
	main()
}

