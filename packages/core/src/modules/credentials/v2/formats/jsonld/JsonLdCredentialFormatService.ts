import { AttachmentFormats, CredentialFormatService } from '../CredentialFormatService'
import { V2CredentialFormatSpec } from '../V2CredentialFormat'
import { Attachment } from 'packages/core/src/decorators/attachment/Attachment'
import { ProposeCredentialOptions } from '../../interfaces'
import { V2CredentialRecord } from '../../V2CredentialRecord'

export class JsonLdCredentialFormatService extends CredentialFormatService {
  save(proposal: ProposeCredentialOptions, credentialRecord: V2CredentialRecord): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getCredentialProposeAttachFormats(proposal: ProposeCredentialOptions, messageType: string): AttachmentFormats {
    throw new Error('Method not implemented.')
  }

  getFormatIdentifier(messageType: string): V2CredentialFormatSpec {
    throw new Error('Method not implemented.')
  }
  getFormatData(messageType: string, data: ProposeCredentialOptions): Attachment {
    throw new Error('Method not implemented.')
  }
}