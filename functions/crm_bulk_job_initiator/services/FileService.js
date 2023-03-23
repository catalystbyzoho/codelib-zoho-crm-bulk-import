const Fs = require('fs')
const Os = require('os')
const Path = require('path')

class FileService {
  tempDir = Path.join(Os.tmpdir(), 'CrmFiles')

  constructor () {
    if (!Fs.existsSync(this.tempDir)) {
      Fs.mkdirSync(this.tempDir, {
        recursive: true
      })
    }
  }

  createLocalFileWriteStream = (fileName) => {
    return Fs.createWriteStream(Path.join(this.tempDir, fileName), {
      flags: 'w'
    })
  }

  createLocalFilePath = (fileName) => {
    return Path.join(this.tempDir, fileName)
  }

  getLocalFile = async (fileName) => {
    if (Fs.existsSync(Path.join(this.tempDir, fileName))) {
      const size = await Fs.promises
        .stat(Path.join(this.tempDir, fileName))
        .then((stats) => stats.size)
      return {
        name: fileName,
        path: Path.join(this.tempDir, fileName),
        size
      }
    } else {
      return null
    }
  }

  deleteLocalFile = async (fileName) => {
    if (Fs.existsSync(Path.join(this.tempDir, fileName))) {
      await Fs.promises.rm(Path.join(this.tempDir, fileName))

      return true
    }

    return false
  }
}

module.exports = FileService
