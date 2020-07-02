const fs = require("fs");
const path = require("path");
const readline = require("readline");
const colors = require("colors");
const os = require("os");
const asar = require("asar");
const { exit } = require("process");

// console io
/*
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});*/

// disclaimer
console.log("\nOS: Only Windows is supported.".blue);
console.log("This script does not work with Microsoft Store App\n".yellow);

wapp_path =
	"C:\\Users\\" + os.userInfo().username + "\\AppData\\Local\\WhatsApp";

fs.exists(wapp_path, function (exists) {
	if (!exists) {
		console.log("E: WhatsApp Desktop not installed.".red);
	} else {
		// check if path exists
		dir_exists = fs.existsSync(wapp_path);
		if (!dir_exists) {
			console.log("E: Entered path does not exist.\n".red);
			cleanUpAndTerminate();
		} else {
			// check if path is directory
			dir_stats = fs.statSync(wapp_path);
			if (!dir_stats.isDirectory()) {
				console.log("E: Entered path is not a directory.\n".red);
				cleanUpAndTerminate();
			} else {
                // find app-xxx folder
                app_dir = "";
				files = fs.readdirSync(wapp_path);
				files.forEach(function(file) {
                    if (file.includes("app-")) {
                        // this must be the folder unless tampering is done already
                        app_dir = file;
                        return;
                    }
                });

                // get resources/app.asar path
                asar_path = path.join(wapp_path, app_dir, "resources", "app.asar");

				// check if working directories exists
				checkWorkingDirectories(patchResource);
			}
		} 
	}
});

function checkWorkingDirectories(_callback) {
	// check if asar working directory exists
	wd_exists = fs.existsSync(path.join(__dirname, "asar_workdir"));
	if (!wd_exists) {
		fs.mkdirSync((path.join(__dirname, "asar_workdir")));
	}

	// check if unpacked working directory exists
	wd_exists = fs.existsSync(path.join(__dirname, "asar_workdir", "unpacked"));
	if (!wd_exists) {
		fs.mkdirSync(path.join(__dirname, "asar_workdir", "unpacked"));
	}

	// check if packed working directory exists
	wd_exists = fs.existsSync(path.join(__dirname, "asar_workdir", "packed"));
	if (!wd_exists) {
		fs.mkdirSync(path.join(__dirname, "asar_workdir", "packed"));
	}

	// check if backup working directory exists
	wd_exists = fs.existsSync(path.join(__dirname, "asar_workdir", "backups"));
	if (!wd_exists) {
		fs.mkdirSync(path.join(__dirname, "asar_workdir", "backups"));
	}

	_callback();
}

function patchResource() {
	// copy app.asar to backups folder
	console.log("Creating a backup of original resource file...");
	fs.copyFileSync(asar_path, path.join(__dirname, "asar_workdir", "backups", "app.asar"))
	console.log("Backup created.".green);

	// extract app.asar to work on it
	console.log("Unpacking resource file...");
	asar_unpacked_path = path.join(__dirname, "asar_workdir", "unpacked");
	asar.extractAll(asar_path, asar_unpacked_path);
	console.log("Unpacking done.".green);

	// load renderer.js
	rendererjs_path = path.join(__dirname, "asar_workdir", "unpacked", "renderer.js");
	rendererjs = fs.readFileSync(rendererjs_path, 'utf-8');
	
	// find whether DARK_MODE flag exists and replace flag.
	if (rendererjs.includes("DARK_MODE: true")) {
		console.log("Resource file is already patched.".green);
		cleanUpAndTerminate();
	} else if (rendererjs.includes("DARK_MODE:")) {
		console.log("Finding flags for enforcing dark mode...");
		rendererjs = rendererjs.replace(/^.*DARK_MODE:.*$/mg, "  DARK_MODE: true,");
		fs.writeFileSync(rendererjs_path, rendererjs);
		console.log("File patched to force enable dark mode.".green);
	} else {
		console.log("E: DARK_MODE flag doesn't exist! Unknown error.".red);
		cleanUpAndTerminate();
	}

	// pack app.asar again
	console.log("Packing resource file with modifications...");
	asar_packed_path = path.join(__dirname, "asar_workdir", "packed", "app.asar");
	packed_promise = asar.createPackage(asar_unpacked_path, asar_packed_path);
	packed_promise.then( function(val) {
		console.log("Packing done.".green);

		// copy the file back again.
		console.log("Replacing resource file with modified resource file...");
		try {
			fs.copyFileSync(asar_packed_path, asar_path);
			console.log("Resources replaced successfully.".green)
		} catch(err) {
			console.log("E: Unable to replace resources. Check whether WhatsApp Desktop is properly closed.".red);
			cleanUpAndTerminate();
		}
		

		console.log("\nEnjoy WhatsApp Dark Mode! Thanks for using this tool.\n".cyan);
		cleanUpAndTerminate();
	});
}

function cleanUpAndTerminate() {
	console.log("Cleaning up...")
	fs.rmdirSync(path.join(__dirname, "asar_workdir", "unpacked"), { recursive: true });
	fs.rmdirSync(path.join(__dirname, "asar_workdir", "packed"), { recursive: true });
	console.log("Temporary files cleaned.".green)
	console.log("\nThe backup resource file is kept inside asar_workdir/backups.\n".yellow);
	process.exit();
}