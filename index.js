require("dotenv").config()

const jqDOM = require("./jq-dom")
const emailParser = require("./email-parser")
const mailgun = require("mailgun-js")({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN})
const sendEmail = require("./send-email")(mailgun)
const notificationConfig = {from: process.env.MAILGUN_EMAIL_FROM, to: process.env.MAILGUN_EMAIL_TO, subject: process.env.MAILGUN_EMAIL_SUBJECT}

const RobinhoodWrapper = require("./robinhood-api-request-wrapper")
const rhUtils = RobinhoodWrapper.Utils
const rhAPI = new RobinhoodWrapper.Request(process.env.RH_USER, process.env.RH_PASSWORD)
const purchaseTarget = parseFloat(process.env.RH_PURCHASE_TARGET || 0)

const port = process.env.PORT || 3000
const bodyParser = require("body-parser")
const express = require("express")
const app = express()

rhUtils.setOrderLogger((data, done) => {
	const orderNotificationConfig = Object.assign({}, notificationConfig, {text: JSON.stringify(data, null, 2)})
	
	sendEmail(orderNotificationConfig)
		.then(done)
		.catch(done)
})

app.set("etag", false)

app.post("/inbound-parse/*", bodyParser.urlencoded({extended: false}), (req, res, next) => {
	if (!mailgun.validateWebhook(req.body.timestamp, req.body.token, req.body.signature)) {
		res.status(401).send({error: "Invalid webhook signature."})
	} else {
		next()
	}
})

app.post("/inbound-parse/place-stock-order/:source", (req, res) => {
	const html = req.body["body-html"] || ""
	const dom = jqDOM(html)
	const source = req.params.source
	const moves = emailParser[source] ? emailParser[source](dom) : []

	Promise.resolve()
		.then(() => {
			Promise.all(moves.map(move => move.isBuy ? rhUtils.buyAtMarketByTarget(rhAPI, move.symbol, purchaseTarget) : rhUtils.sellAllAtMarket(rhAPI, move.symbol)))
				.then(() => {
					res.status(200).send({status: "Processing is complete."})
				})
				.catch(() => {
					res.status(406).send({error: "Some orders could not be processed."})
				})
		})
		.catch(() => {
			res.status(500).send({error: "Error sending order notification."})
		})
})

app.use("*", (req, res) => {
	res.status(404).send({error: "The requested resource was not found."})
})

app.listen(port, () => {
	console.log(`Listening on port ${port}...`)
})