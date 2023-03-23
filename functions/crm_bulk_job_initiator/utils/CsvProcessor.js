const Os = require('os')
const Fs = require('fs')
const Path = require('path')
const Readline = require('readline')

const FileService = require('../services/FileService')

class CsvProccessor {
  #file = {
    name: '',
    path: '',
    size: 0
  }

  totalRecords = 0

  constructor (file) {
    this.#file = file
    this.totalRecords = 0
  }

  splitIntoChunks = async (limit = 10000) => {
    let header = ''
    let fileIdentifier = 0

    const fileService = new FileService()
    const fileNameWithoutExtn = Path.parse(this.#file.name).name

    this.totalRecords = 0

    const masterFileStream = Readline.createInterface({
      input: Fs.createReadStream(this.#file.path)
    })

    const files = []

    await new Promise((resolve, reject) =>
      masterFileStream
        .on('line', (line) => {
          if (!header) {
            header = line
          } else {
            this.totalRecords++

            if (files.length !== fileIdentifier + 1) {
              const chunkFileName = fileNameWithoutExtn + '_' + (fileIdentifier + 1) + '.csv'
              const chunkFilePath = fileService.createLocalFilePath(chunkFileName)

              const stream = fileService.createLocalFileWriteStream(chunkFileName)
              stream.write(header + Os.EOL)
              files.push({
                stream,
                path: chunkFilePath,
                name: chunkFileName,
                size: 0,
                records: 0
              })
            }

            files[fileIdentifier].stream.write(line + Os.EOL)
            files[fileIdentifier].records++

            if (this.totalRecords % limit === 0) {
              fileIdentifier++
            }
          }
        })
        .on('error', reject)
        .on('close', resolve)
    )

    for (const file of files) {
      file.stream.close()
      file.size = await Fs.promises.stat(file.path).then((stats) => stats.size)
    }

    return files.map((item) => ({
      path: item.path,
      name: item.name,
      size: item.size,
      records: item.records
    }))
  }

  static getInstance = (file) => {
    return new CsvProccessor(file)
  }
}

module.exports = CsvProccessor
