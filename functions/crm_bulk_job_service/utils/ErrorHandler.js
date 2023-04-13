const AppError = require('./AppError')

class ErrorHandler {
  processError = (err) => {
    if (err instanceof AppError) {
      return {
        status: 'failure',
        statusCode: err.statusCode,
        message: err.message
      }
    } else {
      console.log('Error :::', err?.message || err)
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
