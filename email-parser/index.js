const marketVulture = (dom) => {
	const moves = []

	dom("td:contains('Stock Picks')").each((index, elem) => {
		const textQueries = [
			{
				text: "we purchased the stock",
				isBuy: true
			},
			{
				text: "we doubled down on the stock",
				isBuy: true
			},
			{
				text: "we sold the stock",
				isBuy: false
			}
		]

		const message = dom(elem).next().text().toLowerCase()
		const foundTextQuery = textQueries.filter(textQuery => message.indexOf(textQuery.text) !== -1)[0]
		const symbol = (message.split(foundTextQuery ? foundTextQuery.text : "")[1] || "").trim().split(" ")[0].toUpperCase()

		if (foundTextQuery && symbol.length) {
			moves.push({symbol, isBuy: foundTextQuery.isBuy})
		}
	})

	return moves
}

module.exports = {marketVulture}
