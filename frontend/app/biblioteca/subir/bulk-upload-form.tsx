'use client'

import { useCopyrightEnabled } from '../_components/copyright-provider'

import { BulkUploadFormClassic } from './bulk-upload-form-classic'
import { BulkUploadFormInstitutional } from './bulk-upload-form-institutional'

export function BulkUploadForm() {
  const copyrightEnabled = useCopyrightEnabled()
  return copyrightEnabled ? <BulkUploadFormInstitutional /> : <BulkUploadFormClassic />
}
