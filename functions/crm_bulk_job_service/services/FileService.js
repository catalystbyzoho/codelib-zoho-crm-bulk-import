const fs = require('fs')
const os = require('os')
const path = require('path')

class FileService {
  tempDir = path.join(os.tmpdir(), 'CrmFiles')

  constructor () {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, {
        recursive: true
      })
    }
  }

  createLocalFileWriteStream = (fileName) => {
    return fs.createWriteStream(path.join(this.tempDir, fileName), {
      flags: 'w'
    })
  }

  createLocalFileWithBuffer = async (fileName, buffer) => {
    await fs.promises.writeFile(this.createLocalFilePath(fileName), buffer)

    return this.getLocalFile(fileName)
  }

  createLocalFilePath = (fileName) => {
    return path.join(this.tempDir, fileName)
  }

  getLocalFile = async (fileName) => {
    if (fs.existsSync(path.join(this.tempDir, fileName))) {
      const size = await fs.promises
        .stat(path.join(this.tempDir, fileName))
        .then((stats) => stats.size)
      return {
        name: fileName,
        path: path.join(this.tempDir, fileName),
        size
      }
    } else {
      return null
    }
  }

  deleteLocalFile = async (fileName) => {
    if (fs.existsSync(path.join(this.tempDir, fileName))) {
      await fs.promises.rm(path.join(this.tempDir, fileName))

      return true
    }

    return false
  }
}

module.exports = FileService
