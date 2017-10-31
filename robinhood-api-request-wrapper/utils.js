const getFirstActiveAccount = (api) => (
	new Promise((resolve, reject) => {
		Promise.resolve()
			.then(() => api.getAccounts())
			.then(response => {
				const account = response.results.filter(result => !result.deactivated)[0] || null
				
				if (account) {
					resolve(account)
				} else {
					reject({error: "Account not found."})
				}
			})
			.catch(reject)
	})
)

const getInstrument = (api, symbol) => (
	new Promise((resolve, reject) => {
		Promise.resolve()
			.then(() => api.searchInstruments(symbol))
			.then(response => {
				const instrument = response.results.filter(result => result.symbol === symbol)[0] || null
				
				if (instrument) {
					resolve(instrument)
				} else {
					reject({error: `Symbol '${symbol}' not found.`})
				}
			})
			.catch(reject)
	})
)

const getMarketOrderConfig = (api, symbol, quantity) => (
	new Promise((resolve, reject) => {
		let account, instrument
		
		Promise.resolve()
			.then(() => getFirstActiveAccount(api))
			.then(foundAccount => {
				account = foundAccount
				
				return getInstrument(api, symbol)
			})
			.then(foundInstrument => {
				instrument = foundInstrument
				
				return api.getQuote(symbol)
			})
			.then(quote => {
				const ask = parseFloat(quote.ask_price), bid = parseFloat(quote.bid_price), last = parseFloat(quote.last_trade_price)
				
				resolve({
					account: account.url,
					instrument: instrument.url,
					symbol,
					type: "market",
					time_in_force: "gfd",
					trigger: "immediate",
					price: quantity > 0 ? Math.max(ask, last) : Math.min(bid, last),
					quantity: Math.abs(quantity),
					side: quantity > 0 ? "buy" : "sell"
				})
			})
			.catch(reject)
	})
)

const getPositionForSymbol = (api, symbol) => (
	new Promise((resolve, reject) => {
		let account, instrument

		Promise.resolve()
			.then(() => getFirstActiveAccount(api))
			.then(foundAccount => {
				account = foundAccount
				
				return getInstrument(api, symbol)
			})
			.then(foundInstrument => {
				instrument = foundInstrument
				
				return account.$positions()
			})
			.then(response => {
				const position = response.results.filter(result => (
					result.instrument === instrument.url
				))[0] || null
				
				resolve(position)
			})
			.catch(reject)
	})
)

const placeOrderAtMarket = (api, symbol, quantity) => (
	new Promise((resolve, reject) => {
		if (quantity !== 0) {
			Promise.resolve()
				.then(() => getMarketOrderConfig(api, symbol, quantity))
				.then(config => api.placeOrder(config))
				.then(status => {
					resolve(status)
				})
				.catch(reject)	
		} else {
			reject({error: "Quantity must be non-zero."})
		}
	})
)

const sellAllAtMarket = (api, symbol) => (
	new Promise((resolve, reject) => {
		Promise.resolve()
			.then(() => getPositionForSymbol(api, symbol))
			.then(position => placeOrderAtMarket(api, symbol, position ? parseFloat(position.quantity) * -1 : 0))
			.then(status => {
				resolve(status)
			})
			.catch(reject)
	})
)

const buyAtMarketByTarget = (api, symbol, purchaseTarget) => (
	new Promise((resolve, reject) => {
		Promise.resolve()
			.then(() => api.getQuote(symbol))
			.then(quote => {
				const buyPrice = Math.max(parseFloat(quote.ask_price), parseFloat(quote.last_trade_price))
				
				return placeOrderAtMarket(api, symbol, buyPrice === 0 ? 0 : (Math.round(purchaseTarget / buyPrice) || 1))
			})
			.then(status => {
				resolve(status)
			})
			.catch(reject)
	})
)

module.exports = {
	getFirstActiveAccount,
	getInstrument,
	getMarketOrderConfig,
	getPositionForSymbol,
	placeOrderAtMarket,
	sellAllAtMarket,
	buyAtMarketByTarget
}
