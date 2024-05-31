const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const command = process.argv[2];

switch (command) {
    case "init":
        createGitDirectory();
        break;
    case "cat-file":
        catFileHash(process.argv[4]);
        break;
    case "hash-file":
        hashBlobFile(process.argv[4]);
        break;
    case "ls-tree":
        listTreeObject(process.argv[4])
        break;
    case "write-tree":
        writeTreeObject(__dirname)
        break;
    default:
        throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
    fs.mkdirSync(path.join(__dirname, ".git"), { recursive: true });
    fs.mkdirSync(path.join(__dirname, ".git", "objects"), { recursive: true });
    fs.mkdirSync(path.join(__dirname, ".git", "refs"), { recursive: true });

    fs.writeFileSync(path.join(__dirname, ".git", "HEAD"), "ref: refs/heads/main\n");
    console.log("Initialized git directory");
}

async function catFileHash(hash) {

    const content = await fs.readFileSync(path.join(__dirname, ".git", "objects", hash.slice(0, 2), hash.slice(2)))
    const dataUnzipped = zlib.inflateSync(content);

    const res = dataUnzipped.toString().split('\0')[1];

    process.stdout.write(res)
}

async function hashBlobFile(filePath) {
    const content = fs.readFileSync(filePath);
    const contentLength = content.length
    const header = Buffer.from('blob ' + contentLength)
    const dataWithHeader = Buffer.concat([header, Buffer.from([0x00]), content])
    const dataZipped = zlib.deflateSync(dataWithHeader);

    const hash = crypto.createHash("sha1");
    hash.update(dataZipped)
    const hashValue = hash.digest('hex')
    //console.log(hashValue)

    fs.mkdirSync(path.join(__dirname, '.git', 'objects', hashValue.slice(0, 2)), { recursive: true })
    fs.writeFileSync(path.join(__dirname, '.git', 'objects', hashValue.slice(0, 2), hashValue.slice(2)), dataZipped)
    return hashValue;
}

async function listTreeObject(hash) {
    const flag = process.argv[3]

    if (flag == '--name-only') {

        const content = await fs.readFileSync(path.join(__dirname, ".git", "objects", hash.slice(0, 2), hash.slice(2)))
        const dataUnzipped = zlib.inflateSync(content);

        const [header, data] = dataUnzipped.toString().split('\0');
        //console.log(data)
        data.split('\n').forEach(line => {
            const items = line.split(' ')
            //console.log(items[items.length - 1])
            process.stdout.write(items[items.length - 1] + '\n')
        });
    }
}

async function writeTreeObject(treePath) {
    let content = "";
    const items = fs.readdirSync(treePath)
    for (const item of items) {
        if (item === ".git") {
            continue
        }
        const itemPath = treePath + "/" + item
        const itemDescription = fs.lstatSync(itemPath)
        let hash = ""

        if (itemDescription.isFile()) {
            hash = await hashBlobFile(itemPath)
            content += `\n100644 ${item} ${hash}`
        } else if (itemDescription.isDirectory()) {
            hash = await writeTreeObject(itemPath)
            content += `\n040000 ${item} ${hash}`
        }
    }
    content = content.substring(1)
    const contentLength = content.length
    const dataWithHeader = Buffer.from('tree ' + contentLength + '\0' + content)
    const dataZipped = zlib.deflateSync(dataWithHeader);

    const hash = crypto.createHash("sha1");
    hash.update(dataZipped)
    const hashValue = hash.digest('hex')

    fs.mkdirSync(path.join(__dirname, '.git', 'objects', hashValue.slice(0, 2)), { recursive: true })
    fs.writeFileSync(path.join(__dirname, '.git', 'objects', hashValue.slice(0, 2), hashValue.slice(2)), dataZipped)

    if (__dirname === treePath) {
        console.log(hashValue)
    }
    return hashValue;
}