class AppConstants {
  static JobName = 'CRM_BULK_JOB'
  static File = {
    MaxFiles: 1,
    MaxSize: 50 * 1000 * 1000
  }

  static Catalyst = {
    Connectors: {
      User: 'User'
    },
    Folders: {
      CrmFiles: 'CrmFiles'
    },
    Segment: {
      CrmFiles: 'CrmFiles'
    }
  }

  static Headers = {
    CodelibSecretKey: 'x-codelib-secret-key'
  }

  static Env = {
    CodelibSecretKey: 'CODELIB_SECRET_KEY'
  }

  static ZohoCrm = {
    MaxRecords: 25000,
    CrmBulkStatus: 'https://www.zohoapis.com/crm/bulk/v3/write'
  }
}

module.exports = AppConstants
