const _ = require("lodash")
const request = require("request")
const baseUrl = "https://api.robinhood.com"

const usernameStore = new WeakMap()
const passwordStore = new WeakMap()
const tokenStore = new WeakMap()

class RobinHoodRequestConfig {
	constructor(needsAuth, method, url, queryKeys, dataKeys) {
		this.needsAuth = needsAuth
		this.method = method
		this.compileUrl = _.template(url.startsWith(baseUrl) ? url : `${baseUrl}${url}`)
		this.queryKeys = queryKeys
		this.dataKeys = dataKeys
	}
	
	buildUrl(data) {
		return this.compileUrl(_.pick(data || {}, this.queryKeys || []))
	}
	
	buildBody(data) {
		return _.pick(data || {}, this.dataKeys || [])
	}
}

const resourceConfig = {
	getUser: new RobinHoodRequestConfig(true, "GET", "/user/"),
	getAccounts: new RobinHoodRequestConfig(true, "GET", "/accounts/"),
	getAllInstruments: new RobinHoodRequestConfig(false, "GET", "/instruments/"),
	searchInstruments: new RobinHoodRequestConfig(false, "GET", "/instruments/?query=${query}", ["query"]),
	getMarkets: new RobinHoodRequestConfig(false, "GET", "/markets/"),
	getMarket: new RobinHoodRequestConfig(false, "GET", "/markets/${mic}/", ["mic"]),
	getMarketHours: new RobinHoodRequestConfig(false, "GET", "/markets/${mic}/hours/${date}", ["mic", "date"]),
	getQuote: new RobinHoodRequestConfig(false, "GET", "/quotes/${symbols}/", ["symbols"]),
	getQuotes: new RobinHoodRequestConfig(false, "GET", "/quotes/?symbols=${symbols}", ["symbols"]),
	getOrder: new RobinHoodRequestConfig(true, "GET", "/orders/${orderId}", ["orderId"]),
	getOrders: new RobinHoodRequestConfig(true, "GET", "/orders/"),
	cancelOrder: new RobinHoodRequestConfig(true, "POST", "/orders/${orderId}/cancel/", ["orderId"]),
	placeOrder: new RobinHoodRequestConfig(true, "POST", "/orders/", null, [
		"account",
		"instrument",
		"symbol",
		"type",
		"time_in_force",
		"trigger",
		"price",
		"stop_price",
		"quantity",
		"side",
		"client_id",
		"extended_hours",
		"override_day_trade_checks",
		"override_dtbp_checks"
	])
}

const getToken = (instance) => (
	new Promise((resolve, reject) => {
		const username = usernameStore.get(instance)
		const password = passwordStore.get(instance)
		const token = tokenStore.get(instance)
		
		const requestConfig = {form: {username, password}, headers: {Accept: "application/json"}}
		
		if (token) {
			resolve(token)
		} else {
			request.post(`${baseUrl}/api-token-auth/`, requestConfig, (error, response, body) => {
				const jsonResponse = body ? JSON.parse(body) : undefined

				if (!error && response.statusCode >= 200 && response.statusCode < 300) {
					tokenStore.set(instance, jsonResponse.token)
					resolve(jsonResponse.token)
				} else {
					reject(error || jsonResponse)
				}
			})
		}
	})
)

const makeApiRequest = (instance, config, data) => (
	new Promise((resolve, reject) => {
		const baseConfig = {
			method: config.method,
			url: `${config.buildUrl(data)}`,
			form: data ? config.buildBody(data) : undefined,
			headers: {Accept: "application/json"}
		}

		const proceedWithRequest = requestConfig => {
			request(requestConfig, (error, response, body) => {
				const returnValue = body ? JSON.parse(body) : undefined
				
				activateResponseLinks(instance, config, returnValue)

				if (!error && response.statusCode >= 200 && response.statusCode < 300) {
					resolve(returnValue)
				} else {
					reject(error || returnValue)
				}
			})
		}
		
		if (config.needsAuth) {
			getToken(instance).then(
				token => {
					baseConfig.headers.Authorization = `Token ${token}`
					proceedWithRequest(baseConfig)
				},
				error => {
					reject(error)
				}
			)
		} else {
			proceedWithRequest(baseConfig)
		}
	})
)

const activateResponseLinks = (instance, config, response) => {
	Object.keys(response || {}).map(key => {
		if (typeof(response[key]) === "string" && response[key].startsWith(baseUrl)) {
			response[`$${key}`] = (methodOverride) => (
				makeApiRequest(instance, new RobinHoodRequestConfig(config.needsAuth, methodOverride || "GET", response[key]))
			)
		} else if (typeof(response[key]) === "object") {
			activateResponseLinks(instance, config, response[key])
		}
	})
}

class RobinHoodRequest {
	constructor(username, password) {
		usernameStore.set(this, username)
		passwordStore.set(this, password)
		tokenStore.set(this, null)
	}

	getUser() {
		return makeApiRequest(this, resourceConfig.getUser)
	}
	
	getAccounts() {
		return makeApiRequest(this, resourceConfig.getAccounts)
	}
	
	getAllInstruments() {
		return makeApiRequest(this, resourceConfig.getAllInstruments)
	}
	
	searchInstruments(query) {
		return makeApiRequest(this, resourceConfig.searchInstruments, {query: encodeURIComponent(query)})
	}
	
	getMarkets() {
		return makeApiRequest(this, resourceConfig.getMarkets)
	}
	
	getMarket(mic) {
		return makeApiRequest(this, resourceConfig.getMarket, {mic})
	}
	
	getMarketHours(mic, date) {
		return makeApiRequest(this, resourceConfig.getMarketHours, {mic, date})
	}
	
	getQuote(symbols) {
		if (Array.isArray(symbols)) {
			return makeApiRequest(this, resourceConfig.getQuotes, {symbols: symbols.join(",")})
		}
		
		return makeApiRequest(this, resourceConfig.getQuote, {symbols})
	}
	
	getOrder(orderId) {
		return makeApiRequest(this, resourceConfig.getOrder, {orderId})
	}
	
	getOrders() {
		return makeApiRequest(this, resourceConfig.getOrders)
	}
	
	cancelOrder(orderId) {
		return makeApiRequest(this, resourceConfig.cancelOrder, {orderId})
	}
	
	placeOrder(config) {
		return makeApiRequest(this, resourceConfig.placeOrder, config)
	}
}

module.exports = RobinHoodRequest