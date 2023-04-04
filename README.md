
# Zoho CRM Bulk Import

The Zoho CRM Bulk Import CodeLib enables you to import data in bulk to any standard modules in Zoho CRM.

**Note:** You can get more detailed information on the steps to install and configure the Zoho CRM Bulk Import CodeLib from your Catalyst console. You must navigate to the bottom of your Catalyst console where you will find the **_Catalyst CodeLib_** section. You can click on the **Zoho****CRM Bulk Import CodeLib** tile to access the steps.

**How does the CodeLib work?**

Upon installing this CodeLib, pre-defined Catalyst components specific to the CodeLib will be automatically configured in your [project](https://console.catalyst.zoho.com/baas/index). These include two [Catalyst Serverless functions](https://catalyst.zoho.com/help/functions.html) ([Event](https://catalyst.zoho.com/help/event-functions.html) and [Advanced I/O](https://catalyst.zoho.com/help/advancedio-functions.html)) in Node.js, a rule in the default [Catalyst Event Listener](https://catalyst.zoho.com/help/event-listeners.html), a folder in the [Catalyst Cloud Scale File Store](https://catalyst.zoho.com/help/file-store.html) components and a cache segment in the [Catalyst Cloud Scale Cache](https://catalyst.zoho.com/help/cache.html) component.

To authenticate and access the resources of your Zoho CRM account securely, firstly you will need to register a self-client application from [Zoho&#39;s API console](https://api-console.zoho.com/). Please ensure to note down the generated client id and client secret credentials for accessing your Zoho CRM account. You can refer to [this](https://catalyst.zoho.com/help/api/introduction/access-and-refresh.html) page for the steps to generate access and refresh tokens. You will need to configure these credentials as constant values in the functions component after the CodeLib is installed. You will also need to configure a key named **CODELIB_SECRET_KEY** in the functions, and pass this in the request header every time you try to access any endpoints of the pre-configured functions in the CodeLib. This key allows you to access the Catalyst resources of the CodeLib securely.

When you have the file to be uploaded to Zoho CRM ready (in a **_.csv_** format), you can invoke the **/job** endpoint of the **crm_bulk_job_service([Advanced I/O](https://catalyst.zoho.com/help/advancedio-functions.html))** function as a _cURL_ request. You will need to pass the local file path, the organization ID of your Zoho CRM account and the name of the Zoho CRM module to which you need to upload your data, in the request payload. You can upload files up to a maximum size of **80 MB**. The **crm_bulk_job_service** function handles the logic to extract the file from your local system and upload it to the **CrmFiles** folder in the File Store. This folder will be auto-created as a part of the CodeLib.

After the file is uploaded to the **CrmFiles** folder, an entry is made in the cache segment(**CrmFiles**). An event rule is auto-configured to check for entries in this segment. Whenever there is data insertion in the segment, it invokes the **crm_bulk_job_initiator([Event](https://catalyst.zoho.com/help/event-functions.html))** function. This function handles the logic to download a copy of the ._csv_ file from the **CrmFiles** folder into a temporary folder inside the function's directory. This folder will also be pre-configured in the function's directory upon the installation of the CodeLib.

We have used Zoho CRM's [Bulk File Upload](https://www.zoho.com/crm/developer/docs/api/v3/bulk-write/upload-file.html) API in the event function, which takes the file input from the temporary folder and uploads it to the Zoho CRM server. Also note that you will need to configure the **CLIENT_ID**, **CLIENT_SECRET** and **REFRESH_TOKEN** credentials you generated while creating the self-client application previously, in the event function to securely access the resources in your Zoho CRM account. For more details on the configurations to be made, please refer to the **How to use** section in the console.

The maximum data limit that can be uploaded to Zoho CRM during a single upload is configured as **25K rows**. If your file contains records greater than the configured limit, the file will be split and processed in batches. You can check the number of records processed in the [Catalyst DevOps Logs](https://catalyst.zoho.com/help/logs.html) and also make a note of the assigned **jobID**. In order to check the status of the Bulk Upload job, you can then invoke the **/status** endpoint and pass the **jobID** in the request payload.

The split files are zipped together and the zip is passed to the Bulk File Upload API. The API returns a **FileID** as response. This File ID denotes the location of the file when it is uploaded to Zoho CRM servers initially. The File ID is then passed to the [Bulk Write](https://www.zoho.com/crm/developer/docs/api/v3/bulk-write/create-job.html) API, to write the file data to the specified module in Zoho CRM. Also note that, once the file is uploaded to Zoho CRM modules, the copy of the original file will be permanently deleted from Catalyst end in the File Store, the temporary folder and also from the cache segment.

**Note :**

- You can leverage the [HIPAA compliance](https://catalyst.zoho.com/help/hipaa-compliance.html) feature while working with Catalyst components, if required. This ensures to follow all applicable privacy and data protection laws while working with ePHI and other sensitive user data.
- You can get more detailed information on the steps to install and configure the Zoho CRM Bulk Import CodeLib from the **_Catalyst CodeLib_** section in your Catalyst console.

**Resources Involved:**

The following Catalyst resources are auto-configured and used as a part of the Zoho CRM Bulk Import CodeLib :

**1.[Catalyst Serverless Functions](https://catalyst.zoho.com/help/functions.html) :**

This **crm_bulk_job_service([Advanced I/O](https://catalyst.zoho.com/help/advancedio-functions.html))** function handles the logic to upload the file from user's local system to a pre-configured folder(**CrmFiles**) in the File Store.

The **crm_bulk_job_initiator([Event](https://catalyst.zoho.com/help/event-functions.html)**) function is invoked when the Advanced I/O function uploads the file to the **CrmFiles** folder and an entry is made in the pre-configured cache segment(**CrmFiles**). This function handles the logic to upload the file to CRM servers using the [Bulk File Upload API](https://www.zoho.com/crm/developer/docs/api/v3/bulk-write/upload-file.html) and then write the file to the specific CRM module using the [Bulk Write](https://www.zoho.com/crm/developer/docs/api/v3/bulk-write/create-job.html) API.

**2.[Catalyst Cloud Scale File Store](https://catalyst.zoho.com/help/file-store.html) :**

We have used the Catalyst File Store component in the Zoho CRM Bulk Import CodeLib for the purpose of storing the files uploaded from the user's local system and then uploading it to the Zoho CRM module.

**3.[Catalyst Cloud Scale Event Listener](https://catalyst.zoho.com/help/event-listeners.html) :**

An rule in the default Event Listener is pre-configured to execute the event function(**crm_bulk_job_initiator)** whenever data insertion operation happens in the cache segment(**CrmFiles**).

**4.[Catalyst Cloud Scale Cache](https://catalyst.zoho.com/help/cache.html) :** The cache segment(**CrmFiles**) is used to temporarily store the file data and is configured with an event rule to invoke the corresponding event function.
