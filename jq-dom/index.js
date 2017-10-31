const jqFactory = require("jquery")
const jsDOM = require("jsdom")

module.exports = html => jqFactory.call(null, (new jsDOM.JSDOM(html)).window)