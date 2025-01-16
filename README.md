# int_s3

Basic S3 Integration for SFCC B2C Commerce.

## Installation

1. Import cartridge `int_s3`
2. Import Service and Service Metadata from `meta/`
3. Create Job from `custom.s3.export`

## Usage

### Library

See `scripts/services/aws/s3.js` for method details

```javascript
const S3 = require('*/cartridge/scripts/services/aws/s3')

S3.generateAWSSignatureV4(...)
S3.getFile()
S3.putFile()
S3.getString()
S3.putString()
```

### Jobs

Create other jobs using library methods

- `custom.s3.export` - Export files from SFCC to S3 Bucket

## Testing

Controller `S3Testing-Start` has some integration tests

### Support

**This project should not be treated as Salesforce Product.** It is a tool and strategy for B2C project data and
instance Management. Customers and partners implement this at-will with no expectation of roadmap, technical support,
defect resolution, production-style SLAs.

This project is maintained by the **Salesforce Community**. Salesforce Commerce Cloud or Salesforce Platform Technical
Support do not support this project or its setup.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
