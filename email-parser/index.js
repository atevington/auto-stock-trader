const symbolAfterQuery = (message, textQuery) => {
	const part = (message.split(textQuery)[1] || "").trim()
	return part.split(" ")[0].toUpperCase()
}


const symbolBeforeQuery = (message, textQuery) => {
	const part = (message.split(textQuery)[0] || "").trim()
	return part.split(" ")[part.split(" ").length - 1].toUpperCase()
}

const marketVulture = (dom) => {
	const moves = []
	
	const textQueries = [
		{
			text: "we purchased the stock",
			isBuy: true,
			parse: symbolAfterQuery
		},
		{
			text: "we doubled down on the stock",
			isBuy: true,
			parse: symbolAfterQuery
		},
		{
			text: "we sold the stock",
			isBuy: false,
			parse: symbolAfterQuery
		},
		{
			text: "has spoiled and we sold it",
			isBuy: false,
			parse: symbolBeforeQuery
		}
	]

	dom("td:contains('Stock Picks')").each((index, elem) => {
		const message = dom(elem).next().text().toLowerCase()
		const foundTextQuery = textQueries.filter(textQuery => message.indexOf(textQuery.text) !== -1)[0]
		const symbol = foundTextQuery ? foundTextQuery.parse(message, foundTextQuery.text) : ""

		if (foundTextQuery && symbol.length) {
			moves.push({symbol, isBuy: foundTextQuery.isBuy})
		}
	})

	return moves
}

module.exports = {marketVulture}
