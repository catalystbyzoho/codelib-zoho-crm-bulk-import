const FS = require('fs')
const Request = require('request')
const Multer = require('multer')
const Express = require('express')
const CatalystSDK = require('zcatalyst-sdk-node')

const AppConstants = require('./constants')
const { AppError, ErrorHandler } = require('./utils')
const { AuthService, FileService } = require('./services')

const app = Express()
const upload = Multer({
  limits: {
    files: AppConstants.File.MaxFiles,
    fileSize: AppConstants.File.MaxSize
  }
}).single('file')

app.use(Express.json())

app.use((req, res, next) => {
  try {
    if (
      !AuthService.getInstance().isValidRequest(
        req.get(AppConstants.Headers.CodelibSecretKey)
      )
    ) {
      throw new AppError(
        401,
        "You don't have permission to perform this operation. Kindly contact your administrator for more details."
      )
    }

    next()
  } catch (err) {
    const { statusCode, ...others } = ErrorHandler.getInstance().processError(err)

    res.status(statusCode).send(others)
  }
})

app.post('/job', async (req, res) => {
  try {
    // Upload file validation
    await new Promise((resolve, reject) => {
      upload(req, res, function (err) {
        if (err instanceof Multer.MulterError) {
          if (err.code === 'LIMIT_FILE_COUNT') {
            reject(
              new AppError(
                400, `'file' should contain a maximum of ${AppConstants.File.MaxFiles} files.`
              )
            )
          } else if (err.code === 'LIMIT_FILE_SIZE') {
            reject(
              new AppError(400, "'file' should be a maximum size of 50 MB.")
            )
          } else {
            reject(new AppError(400, "We're unable to process your request."))
          }
        } else if (err) {
          reject(new AppError(500, err.message))
        }
        resolve()
      })
    })

    const file = req.file
    const orgId = req.body.org_id
    const moduleName = req.body.module_name

    if (!file) {
      throw new AppError(400, "'file' cannot be empty.")
    } else if (file.mimetype !== 'text/csv') {
      throw new AppError(400, "'file' should be a csv file.")
    } else if (!moduleName) {
      throw new AppError(400, "'module_name' cannot be empty.")
    } else if (!orgId) {
      throw new AppError(400, "'org_id' cannot be empty.")
    }

    const catalyst = CatalystSDK.initialize(req)

    const fileService = new FileService()

    const localFile = await fileService.createLocalFileWithBuffer(
      file.originalname,
      file.buffer
    )

    const folder = catalyst
      .filestore()
      .folder(AppConstants.Catalyst.Folders.CrmFiles)

    const segment = await catalyst
      .cache()
      .getSegmentDetails(AppConstants.Catalyst.Segment.CrmFiles)

    const { id: fileId } = await folder
      .uploadFile({
        code: FS.createReadStream(localFile.path),
        name: localFile.name
      })
      .catch((err) => {
        console.log(err)
        throw err
      })

    await segment.put(
      AppConstants.JobName + '_' + fileId,
      JSON.stringify({
        orgId,
        fileId,
        moduleName
      })
    )

    res.status(200).send({
      status: 'success',
      message: 'Zoho-Crm bulk write will be scheduled in a while.'
    })
  } catch (err) {
    const { statusCode, ...others } = ErrorHandler.getInstance().processError(err)
    res.status(statusCode).send(others)
  }
})

app.get('/status/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId

    const catalyst = CatalystSDK.initialize(req)

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

    const data = await new Promise((resolve, reject) =>
      Request(
        {
          method: 'GET',
          url: `https://www.zohoapis.com/crm/bulk/v3/write/${jobId}`,
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`
          },
          json: true
        },
        (error, response, body) => {
          if (error) {
            reject(new Error(error))
          } else if (response.statusCode !== 200) {
            reject(new AppError(response.statusCode, body.message))
          } else {
            resolve(body)
          }
        }
      )
    )

    res.status(200).send({
      status: 'success',
      data
    })
  } catch (err) {
    const { statusCode, ...others } = ErrorHandler.getInstance().processError(err)
    res.status(statusCode).send(others)
  }
})

app.all('*', function (_req, res) {
  res.status(404).send({
    status: 'failure',
    message: "We couldn't find the requested url."
  })
})

module.exports = app
