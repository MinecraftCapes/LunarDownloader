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
let requestJson = '{"hwid":"0","os":"win32","arch":"x64","launcher_version":"12.0.2","version":"1.8","branch":"master","launch_type":"OFFLINE","classifier":"optifine"}'

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
    .then((response) => { return response.data })
    .catch((error) => {
        logger.error("Obtaining asset names failed.")
        logger.error(error);
        return;
    })

    logger.info("Obtained asset names.")

    //Get the total/downloaded values
    let totalCapes = (assetResponse.match(/assets\/lunar\/cosmetics\/cloaks/g) ||[]).length;
    let downloadedCape = 0;

    //Setup the progress bar
    logger.info("Downloading capes...")
    const progressBar = new cliProgress.SingleBar({
        stopOnComplete: true
    }, cliProgress.Presets.shades_classic);
    progressBar.on('stop', () => {
        logger.info("Downloaded Capes")
    })
    progressBar.start(totalCapes, downloadedCape);

    //Split the response into an array by lines
    let assetData = assetResponse.split("\n");

    //Loop through each line
    for(assetLine of assetData) {
        let asset = assetLine.split(" ");
        if(asset[0].includes("assets/lunar/cosmetics/cloaks/")) {

            //Set some variables
            let capeName = asset[0].replaceAll("assets/lunar/cosmetics/cloaks/", "");
            let capeHash = asset[1];

            let writer = fs.createWriteStream(`./images/${capeName}`);
            axios.get(`${baseUrl}${capeHash}`, {
                timeout: 300000,
                responseType: 'stream',
            }).then((response) => {
                response.data.pipe(writer);
                convertFile(capeName);
            }).catch(() => {
                logger.error(`${baseUrl}${capeHash} Failed to download`)
            }).finally(() => {
                //Update the progress bar
                progressBar.increment();
            })
        }
    }
}

/**
 * Convert all files to png
 */
function convertFile(capeName) {
    fs.readdirSync("./images/").forEach((capeName) => {
        if(capeName.includes(".mcmeta")) return;

        webp.dwebp(`./images/${capeName.replaceAll(".webp", ".png")}`, `./images/${capeName}`, "-o",logging="-v").then((response) => {
            fs.unlinkSync(`./images/${capeName}`)
        }).finally(() => {
            progressBar.increment();
        });
    });
}

async function start() {
    await createFolders();
    await requestEndpoints();
    await downloadAssets();
}

start();