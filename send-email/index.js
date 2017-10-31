const sendEmail = mailgun => (
	config => (
		new Promise((resolve, reject) => {
			mailgun.messages().send(config, (error, body) => {
				if (!error) {
					resolve(body)
				} else {
					reject(error)
				}
			})
		})
	)
)

module.exports = sendEmail