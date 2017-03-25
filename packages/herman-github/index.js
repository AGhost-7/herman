
const app = require('express')
const fs = require('fs')
const yaml = require('js-yaml')

const createApp = (config, amqp) => {
	app.post('/github-events', (req, res, next) => {
		console.log('req.body', JSON.stringify(req.body, null, 2))
		res.send(200)
	})
	app.listen(config.github.port || 4567)
}

const initHook = () => {

}

// https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
const loadConfig = () => {
	const filePath = process.env.HERMAN_CONFIG || '/etc/herman/config.yml'
	return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'))
}

const main = () => {
	const config = loadConfig()
	const amqp = require('amqp').createConnection(config.amqp)

	amqp.on('error', (err) => {
		console.error(err, err.stack)
	})

	amqp.on('ready', () => {
		createApp(config, amqp)
		initHook()
	})

}
