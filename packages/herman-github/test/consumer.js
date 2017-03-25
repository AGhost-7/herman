
const amqplib = require('amqplib/callback_api')
const panic = (err) => {
	console.error(err, err.stack)
	process.exit(1)
}

amqplib.connect('amqp://rabbitmq', (err, connection) => {
	if(err) return panic(err)
	connection.createChannel((err, channel) => {
		if(err) return panic(err)
		channel.assertQueue('herman-git', { durable: true })
		channel.prefetch(1)
		channel.consume('herman-git', (message) => {
			const body = JSON.parse(message.content)
			console.log('message:', body)
			setTimeout(() => {
				console.log('sending ack')
				channel.ack(message)
			}, 2000)
		})
	})
})
