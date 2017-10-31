const path = require("path")
const Service = require("node-windows").Service
const svc = new Service({name: "Auto Stock Trader", description: "Auto Stock Trader Web Server", script: path.join(__dirname, "index.js")})
const install = (process.argv[2] || "").trim().toLowerCase() !== "-u"

if (install) {
	svc.on("install", () => {
		svc.start()
		console.log("Installed and started.")
	})

	svc.install()
} else {
	try {
		svc.uninstall()
		console.log("Stopped and uninstalled.")
	} catch(e) {}
}