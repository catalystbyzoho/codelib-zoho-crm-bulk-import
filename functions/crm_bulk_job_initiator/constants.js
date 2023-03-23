class AppConstants {
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

  static ZohoCrm = {
    MaxRecords: 25000,
    CrmFileUpload: 'https://upload.zoho.com/crm/v3/upload',
    BulkJobSchedule: 'https://www.zohoapis.com/crm/bulk/v3/write'
  }
}

module.exports = AppConstants
