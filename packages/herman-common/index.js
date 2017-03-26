
const fs = require('fs')
const yaml = require('js-yaml')
const amqplib = require('amqplib/callback_api')

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

exports.loadConfig = () => {
	const filePath = process.env.HERMAN_CONFIG || '/etc/herman/config.yml'
	const config = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'))
	return mergeEnv(config)
}

const panic = exports.panic = (err) => {
	console.error(err, err.stack)
	process.exit(1)
}

exports.createChannel = (config, queue, done) => {
	const onConnected = (err, connection) => {
		if(err) return panic(err)
		console.log('Connected to message broker')
		connection.createChannel((err, channel) => {
			if(err) return panic(err)
			console.log('Channel created')
			channel.assertQueue(queue, { durable: true })
			channel.prefetch(1)
			done(channel)
		})
	}

	if(config.amqp.socket) {
		amqplib.connect(config.amqp.url, config.amqp.socket, onConnected)
	} else {
		amqplib.connect(config.amqp.url, onConnected)
	}
}

