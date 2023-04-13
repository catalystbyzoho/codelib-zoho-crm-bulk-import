const Fs = require('fs')
const Path = require('path')
const Request = require('request')
const Archiver = require('archiver')
const CatalystSDK = require('zcatalyst-sdk-node')

const AppConstants = require('./constants')
const { CsvProccessor } = require('./utils')
const { FileService } = require('./services')

module.exports = async (event, context) => {
  try {
    const data = event.data

    const catalyst = CatalystSDK.initialize(context)

    const { orgId, fileId, moduleName } = JSON.parse(data.cache_value)

    const folder = catalyst
      .filestore()
      .folder(AppConstants.Catalyst.Folders.CrmFiles)

    const segment = await catalyst
      .cache()
      .getSegmentDetails(AppConstants.Catalyst.Segment.CrmFiles)

    const file = await folder.getFileDetails(fileId)

    const fileService = new FileService()

    const fileStream = await folder.getFileStream(file.id)

    const localFileStream = fileService.createLocalFileWriteStream(
      file.file_name
    )

    await new Promise((resolve, reject) => {
      fileStream.pipe(localFileStream).on('error', reject).on('close', resolve)
    })

    const localFile = await fileService.getLocalFile(file.file_name)

    if (!localFile) {
      throw new Error('Unable to get the local file')
    }

    const csvProcessor = new CsvProccessor(localFile)

    const splitFiles = await csvProcessor.splitIntoChunks(
      AppConstants.ZohoCrm.MaxRecords
    )

    await fileService.deleteLocalFile(file.file_name)

    const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN_URL, REFRESH_TOKEN } = process.env

    const accessToken = await catalyst
      .connection({
        [AppConstants.Catalyst.Connectors.User]: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          auth_url: REFRESH_TOKEN_URL,
          refresh_url: REFRESH_TOKEN_URL,
          refresh_token: REFRESH_TOKEN
        }
      })
      .getConnector(AppConstants.Catalyst.Connectors.User)
      .getAccessToken()

    for (const file of splitFiles) {
      const archive = Archiver('zip', {
        zlib: { level: 9 }
      })

      archive.append(Fs.createReadStream(file.path), {
        name: file.name
      })

      await archive.finalize()

      const localZipFileStream = fileService.createLocalFileWriteStream(
        Path.parse(file.name).name + '.zip'
      )

      await new Promise((resolve, reject) => {
        archive
          .pipe(localZipFileStream)
          .on('close', resolve)
          .on('error', reject)
      })

      const localZipFile = await fileService.getLocalFile(
        Path.parse(file.name).name + '.zip'
      )

      const uploadedZipFileId = await new Promise((resolve, reject) => {
        Request(
          {
            method: 'POST',
            url: AppConstants.ZohoCrm.CrmFileUpload,
            headers: {
              'X-CRM-ORG': orgId,
              'Content-type': 'multipart/formdata',
              feature: 'bulk-write',
              Authorization: `Zoho-oauthtoken ${accessToken}`
            },
            formData: {
              file: {
                value: Fs.createReadStream(Path.join(localZipFile.path)),
                options: {
                  filename: localZipFile.name
                }
              }
            }
          },

          (error, response, body) => {
            try {
              if (error || response.statusCode !== 200) {
                console.log('Response ::: ', body)
                throw new Error(
                  'Uploading file in zoho crm request failed with statusCode ' + response.statusCode
                )
              }

              const { status, details } = JSON.parse(body)

              if (status.toLowerCase() !== 'success') {
                console.log('Response ::: ', body)
                throw new Error(
                  'Uploading file in zoho crm request failed with statusCode ' + response.statusCode
                )
              }

              resolve(details.file_id)
            } catch (err) {
              reject(err)
            }
          }
        )
      })

      await fileService.deleteLocalFile(file.name)
      await fileService.deleteLocalFile(localZipFile.name)

      const jobId = await new Promise((resolve, reject) => {
        Request(
          {
            method: 'POST',
            url: AppConstants.ZohoCrm.BulkJobSchedule,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Zoho-oauthtoken ${accessToken}`
            },
            body: JSON.stringify({
              operation: 'insert',
              resource: [
                {
                  type: 'data',
                  module: {
                    api_name: moduleName
                  },
                  file_id: uploadedZipFileId
                }
              ]
            })
          },
          (error, response, body) => {
            try {
              if (error || response.statusCode !== 201) {
                console.log('Response ::: ', body)
                throw new Error(
                  'Creating job in zoho crm request failed with statusCode ' + response.statusCode
                )
              }

              const { status, details } = JSON.parse(body)

              if (status.toLowerCase() !== 'success') {
                console.log('Response ::: ', body)
                throw new Error(
                  'Creating job in zoho crm request failed with statusCode ' + response.statusCode
                )
              }

              resolve(details.id)
            } catch (err) {
              reject(err)
            }
          }
        )
      })

      console.log('Zoho CRM bulk write job has been scheduled with ::: ', file.records, ' records and job id for the same is :::', jobId)
    }

    await segment.delete(data.cache_name)
    await folder.deleteFile(fileId)

    console.log('Total Records Scheduled For Processing ::: ', csvProcessor.totalRecords)

    context.closeWithSuccess()
  } catch (err) {
    console.log('Error :::', err?.message || err)
    context.closeWithFailure()
  }
}
