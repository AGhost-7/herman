#!/usr/bin/env node
'use strict'

const uuid = require('uuid')
const common = require('herman-common')
const amqplib = require('amqplib')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const rmrf = require('rimraf')

const spawnProcess = (command, args, done) => {
	const proc = spawn(
		command,
		args,
		{ stdio: 'inherit' }
	)

	let exited = false

	proc.on('exit', (code) => {
		if(exited) return
		exited = true
		if(code !== 0) {
			done(code)
		} else {
			done(null)
		}
	})

	proc.on('error', (err) => {
		if(exited) return
		exited = true
		done(err)
	})

}

const fetchRepository = (config, message, done) => {
	const buildId = uuid.v4()
	const buildPath = path.join(config.git.dir, buildId)
	// Based on how travis fetches repositories
	spawnProcess(
		'git',
		['clone', '--depth=50', message.url, buildPath],
		(err) => {
			if(err) return done(err)
			spawnProcess(
				'git',
				['-C', buildPath, 'fetch', 'origin', 'tags/' + message.tag],
				(err) => {
					if(err) return done(err)
					spawnProcess(
						'git',
						['-C', buildPath, 'checkout', '--force', '--quiet', 'FETCH_HEAD'],
						(err) => {
							done(err, buildPath)
						})
				})
		})
}

const buildImage = (config, message, directory, done) => {
	const imageName = config.docker && config.docker.registry
		? config.docker.registry + '/' + message.image + ':' + message.tag
		: message.image + ':' + message.tag

	const contextPath = message.path
		? path.join(directory, message.path)
		: directory

	spawnProcess(
		'docker',
		['build', '--tag', imageName, contextPath],
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

const removeRepository = (directory, done) => {
	console.log('Removing build directory %s', directory)
	rmrf(directory, done)
}

const cleanImage = (image, done) => {
	console.log('Removing image %s', image)
	spawnProcess(
		'docker',
		['rmi', image],
		done
	)
}

const cleanProject = (directory, image, done) => {
	removeRepository(directory, (err) => {
		cleanImage(image, (rmiErr) => {
			done(err || rmiErr)
		})
	})
}

const nack = (channel, message) => {
	setTimeout(() => {
		channel.nack(message)
	}, 10000)
}

const onEvent = (config, channel, message, body) => {
	fetchRepository(config, body, (err, directory) => {
		if(err) {
			return nack(channel, message)
		}
		buildImage(config, body, directory, (err, image) => {
			if(err) {
				removeRepository(directory, () => {})
				// If we fail to build the image then we should
				// remove it from the queue as it will probably
				// not work even if we move to another server.
				return channel.ack(message)
			}
			pushImage(config, body, image, (err) => {
				cleanProject(directory, image, () => {
					if(err) {
						return nack(channel, message)
					}
					channel.ack(message)
				})
			})
		})
	})
}

const main = () => {
	let config = common.loadConfig()
	common.watchConfig((changed) => {
		config = changed
	})
	common.createChannel(config, 'herman-git', (channel) => {
		channel.consume('herman-git', (message) => {
			const body = JSON.parse(message.content)
			onEvent(config, channel, message, body)
		}, { noAck: false })
	})
}

if(require.main === module) {
	main()
}

