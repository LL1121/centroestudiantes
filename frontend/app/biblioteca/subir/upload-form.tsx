'use client'

import { useCopyrightEnabled } from '../_components/copyright-provider'

import { UploadFormClassic } from './upload-form-classic'
import { UploadFormInstitutional } from './upload-form-institutional'

export function UploadForm() {
  const copyrightEnabled = useCopyrightEnabled()
  return copyrightEnabled ? <UploadFormInstitutional /> : <UploadFormClassic />
}
