// Setup Logging
const logger = require("log4js").getLogger("LunarDownloader");
logger.level = "debug";
logger.info("Loading libraries...")

// Load Libraries
const axios = require('axios');
const cliProgress = require('cli-progress');
const fs = require('fs');
const webp = require('webp-converter');

// Global Variables
var indexUrl;
var baseUrl;

// Lunar Download request
let requestJson = `{"hwid":"${Date.now()}","os":"win32","arch":"x64","launcher_version":"12.0.2","version":"1.8","branch":"master","launch_type":"OFFLINE","classifier":"optifine"}`

async function createFolders() {
    var dir = './images';

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Request the endpoint urls
 */
async function requestEndpoints() {
    logger.info("Request endpoints...")
    await axios.post('https://api.lunarclientprod.com/launcher/launch', requestJson).then((response) => {
        logger.info("Obtained endpoints.")
        indexUrl = response.data.textures.indexUrl
        baseUrl = response.data.textures.baseUrl
    }).catch((error) => {
        logger.error("Obtaining endpoints failed.")
        logger.error(error);
    })
}

/**
 * Request the asssets
 */
async function downloadAssets() {
    logger.info("Obtaining asset names...")
    let assetResponse = await axios.get(indexUrl)
    .then((response) => { return response.data.split("\n") })
    .catch((error) => {
        logger.error("Obtaining asset names failed.")
        logger.error(error);
        return;
    })

    logger.info("Obtained asset names.")

    //Get the total/downloaded values
    assetResponse = assetResponse.filter(value => value.includes("assets/lunar/cosmetics/cloaks") && !value.includes(".mcmeta"));
    let totalCapes = assetResponse.length;
    let downloadedCape = 0;

    //Setup the progress bar
    logger.info("Downloading capes, this can take a long time...")
    const progressBar = new cliProgress.SingleBar({
        stopOnComplete: true
    }, cliProgress.Presets.shades_classic);
    progressBar.on('stop', () => {
        logger.info("Downloaded Capes")
    })
    progressBar.start(totalCapes, downloadedCape);

    //Loop through each line
    for(assetLine of assetResponse) {
        let asset = assetLine.split(" ");
        if(asset[0].includes("assets/lunar/cosmetics/cloaks/")) {

            //Set some variables
            let capeName = asset[0].replaceAll("assets/lunar/cosmetics/cloaks/", "");
            let capeHash = asset[1];

            //We don't want mcmeta files
            if(capeName.includes(".mcmeta")) continue;
            if(fs.existsSync(`./images/${capeName.replaceAll(".webp", ".png")}`)) {
                progressBar.increment();
                continue;
            }

            //Write to a file
            let writer = fs.createWriteStream(`./images/${capeName}`);
            axios.get(`${baseUrl}${capeHash}`, {
                timeout: 10000,
                responseType: 'stream',
            }).then((response) => {
                //Pipe to a file
                let stream = response.data.pipe(writer);

                //Wait for the pipe to finish then convert to a png
                stream.on('finish', () => {
                    webp.dwebp(`./images/${capeName}`, `./images/${capeName.replaceAll(".webp", ".png")}`, "-o",logging="-v").then(() => {
                        fs.unlinkSync(`./images/${capeName}`)
                    }).catch(error => {
                        logging.error(error);
                    });
                });
            }).catch((error) => {
                progressBar.stop();
                logger.error(`${error.toJSON().message} - ${baseUrl}${capeHash} Failed to download`)
                return;
            }).finally(() => {
                //Update the progress bar
                progressBar.increment();
            })
        }
    }
}

/**
 * Start all requires functions
 */
async function start() {
    await createFolders();
    await requestEndpoints();
    await downloadAssets();
}

start();