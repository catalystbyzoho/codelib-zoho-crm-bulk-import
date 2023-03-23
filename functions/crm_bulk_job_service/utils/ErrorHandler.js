const AppError = require('./AppError')

class ErrorHandler {
  processError = (error) => {
    if (error instanceof AppError) {
      return {
        status: 'failure',
        statusCode: error.statusCode,
        message: error.message
      }
    } else {
      console.log('Error ::: ', error)
      return {
        status: 'failure',
        statusCode: 500,
        message: "We're unable to process your request. Kindly check logs to know more details."
      }
    }
  }

  static getInstance = () => {
    return new ErrorHandler()
  }
}
module.exports = ErrorHandler
